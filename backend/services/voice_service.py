import os
import json
import numpy as np
import librosa
import torch
import torch.nn.functional as F
from pydub import AudioSegment
from sqlalchemy.orm import Session
from models import Biometric

SAMPLE_RATE = 16000
SPEECHBRAIN_THRESHOLD = 0.85
MFCC_THRESHOLD = 0.85

# Lazy-loaded SpeechBrain classifier
_classifier = None
_speechbrain_error = None

def get_classifier():
    global _classifier, _speechbrain_error
    if _classifier is None and _speechbrain_error is None:
        try:
            print("[VOICE SERVICE] Initializing SpeechBrain ECAPA-TDNN model on CPU...")
            from speechbrain.inference.speaker import EncoderClassifier
            _classifier = EncoderClassifier.from_hparams(
                source="speechbrain/spkrec-ecapa-voxceleb",
                run_opts={"device": "cpu"}
            )
            print("[VOICE SERVICE] SpeechBrain model loaded successfully.")
        except Exception as e:
            _speechbrain_error = str(e)
            print(f"[VOICE SERVICE] WARNING: Failed to load SpeechBrain model: {e}")
            print("[VOICE SERVICE] Falling back to MFCC + Cosine Similarity.")
    return _classifier

def preprocess_audio(audio_path: str) -> np.ndarray:
    """
    Converts audio file to WAV format (16kHz, mono) and removes silence/noise.
    """
    print(f"[VOICE SERVICE] Preprocessing audio file: {audio_path}")
    ext = os.path.splitext(audio_path)[1].lower()
    
    # 1. Convert to WAV mono 16kHz if not already
    wav_path = audio_path
    if ext != ".wav":
        wav_path = audio_path.rsplit(".", 1)[0] + "_converted.wav"
        print(f"[VOICE SERVICE] Converting {ext} to WAV mono 16kHz: {wav_path}")
        audio = AudioSegment.from_file(audio_path)
        audio = audio.set_channels(1).set_frame_rate(SAMPLE_RATE)
        audio.export(wav_path, format="wav")
    
    # Load audio array
    y, sr = librosa.load(wav_path, sr=SAMPLE_RATE)
    
    # Clean up converted file if created
    if wav_path != audio_path and os.path.exists(wav_path):
        try:
            os.remove(wav_path)
        except Exception:
            pass
            
    # 2. Silence/noise removal: split by non-silent intervals and concatenate
    print("[VOICE SERVICE] Trimming silence/noise...")
    intervals = librosa.effects.split(y, top_db=25)
    if len(intervals) > 0:
        y_clean = np.concatenate([y[start:end] for start, end in intervals])
    else:
        y_clean, _ = librosa.effects.trim(y, top_db=20)
        
    duration = len(y_clean) / SAMPLE_RATE
    print(f"[VOICE SERVICE] Clean audio duration: {duration:.2f}s (original: {len(y)/SAMPLE_RATE:.2f}s), sample rate: {sr}")
    
    if duration < 3.0:
        raise ValueError("Voice sample is too short (minimum 3 seconds of active speech required)")
        
    # Check loudness
    rms = np.sqrt(np.mean(y_clean ** 2))
    if rms < 0.002:
        raise ValueError("Voice sample is empty or silent")
        
    # Normalize amplitude
    max_val = np.max(np.abs(y_clean))
    if max_val > 0:
        y_clean = y_clean / max_val
        
    return y_clean

def get_voice_embedding(audio_np: np.ndarray) -> tuple:
    """
    Extracts voice embedding.
    Returns:
        embedding (list of floats)
        engine_used (str)
    """
    classifier = get_classifier()
    if classifier is not None:
        try:
            print("[VOICE SERVICE] Extracting embedding using SpeechBrain ECAPA-TDNN...")
            signal = torch.tensor(audio_np).unsqueeze(0)  # shape (1, T)
            with torch.no_grad():
                embeddings = classifier.encode_batch(signal)
                embedding = embeddings.squeeze(0).squeeze(0).cpu().numpy().tolist()
            return embedding, "SpeechBrain ECAPA-TDNN"
        except Exception as e:
            print(f"[VOICE SERVICE] Error during SpeechBrain extraction: {e}. Falling back to MFCC.")
            
    # Fallback to MFCC
    print("[VOICE SERVICE] Extracting embedding using MFCC fallback...")
    # Extract 20-dimensional MFCCs and average them over time frames
    mfccs = librosa.feature.mfcc(y=audio_np, sr=SAMPLE_RATE, n_mfcc=20)
    embedding = np.mean(mfccs, axis=1).tolist()
    return embedding, "MFCC Fallback"

def save_voice_embedding(db: Session, user_id: str, embedding: list, engine_used: str):
    """
    Saves or updates user's voice embedding in SQLite database.
    """
    embedding_str = json.dumps(embedding)
    biometric = db.query(Biometric).filter(
        Biometric.user_id == user_id, 
        Biometric.biometric_type == "voice"
    ).first()
    
    if biometric:
        biometric.embedding = embedding_str
    else:
        biometric = Biometric(
            user_id=user_id,
            biometric_type="voice",
            embedding=embedding_str
        )
        db.add(biometric)
    db.commit()
    print(f"[VOICE SERVICE] Saved voice embedding to SQLite table for user: {user_id} using {engine_used}")

def verify_voice_samples(
    db: Session,
    user_id: str,
    verification_audio_path: str
) -> dict:
    """
    Verifies a new voice sample against the enrolled sample in the SQLite table.
    """
    print(f"[VOICE SERVICE] Starting voice verification for user: {user_id}")
    
    # 1. Fetch enrolled embedding from SQLite
    biometric = db.query(Biometric).filter(
        Biometric.user_id == user_id,
        Biometric.biometric_type == "voice"
    ).first()
    
    if not biometric:
        print(f"[VOICE SERVICE] Verification failed: Enrolled embedding not found in database for {user_id}")
        return {
            "success": False,
            "match": False,
            "similarity": 0.0,
            "matchPercentage": 0.0,
            "thresholdUsed": 0.0,
            "reason": "Enrolled voice sample not found in database",
            "engine": "Unknown"
        }
        
    enrolled_embedding = json.loads(biometric.embedding)
    
    # 2. Preprocess and extract verification embedding
    try:
        verification_audio = preprocess_audio(verification_audio_path)
        verification_embedding, engine_used = get_voice_embedding(verification_audio)
    except Exception as e:
        print(f"[VOICE SERVICE] Verification preprocessing/extraction error: {e}")
        return {
            "success": False,
            "match": False,
            "similarity": 0.0,
            "matchPercentage": 0.0,
            "thresholdUsed": 0.0,
            "reason": f"Audio processing error: {str(e)}",
            "engine": "Unknown"
        }
        
    # Determine threshold based on vector length (SpeechBrain is 192, MFCC is 20)
    enrolled_len = len(enrolled_embedding)
    verify_len = len(verification_embedding)
    
    # If there's a mismatch in lengths (e.g. enrolled was SpeechBrain but verification is fallback or vice versa),
    # recalculate the enrolled embedding if the raw enrolled WAV is available
    if enrolled_len != verify_len:
        print(f"[VOICE SERVICE] Mismatch in embedding lengths ({enrolled_len} vs {verify_len}). Recalculating enrolled...")
        enrolled_wav_path = f"voice_samples/{user_id}.wav"
        if os.path.exists(enrolled_wav_path):
            try:
                enrolled_audio = preprocess_audio(enrolled_wav_path)
                enrolled_embedding, engine_used = get_voice_embedding(enrolled_audio)
            except Exception as e:
                print(f"[VOICE SERVICE] Failed to recalculate enrolled audio: {e}")
                return {
                    "success": False,
                    "match": False,
                    "similarity": 0.0,
                    "matchPercentage": 0.0,
                    "thresholdUsed": 0.0,
                    "reason": f"Mismatched embedding formats and failed to rebuild enrolled sample",
                    "engine": engine_used
                }
        else:
            return {
                "success": False,
                "match": False,
                "similarity": 0.0,
                "matchPercentage": 0.0,
                "thresholdUsed": 0.0,
                "reason": "Mismatched embedding formats (raw enrolled audio missing)",
                "engine": engine_used
            }
            
    # 3. Compute cosine similarity
    emb1 = np.array(enrolled_embedding)
    emb2 = np.array(verification_embedding)
    
    dot_product = np.dot(emb1, emb2)
    norm_emb1 = np.linalg.norm(emb1)
    norm_emb2 = np.linalg.norm(emb2)
    
    if norm_emb1 == 0 or norm_emb2 == 0:
        similarity = 0.0
    else:
        similarity = float(dot_product / (norm_emb1 * norm_emb2))
        
    # Threshold & Percentage matching
    if len(enrolled_embedding) == 192:
        threshold = SPEECHBRAIN_THRESHOLD
        engine = "SpeechBrain ECAPA-TDNN"
        # Map cosine similarity [-1.0, 1.0] -> [0, 100]%
        match_percentage = round((max(-1.0, min(1.0, similarity)) + 1.0) / 2.0 * 100.0, 2)
    else:
        threshold = MFCC_THRESHOLD
        engine = "MFCC Fallback"
        # Cosine similarity for MFCCs usually sits in 0.8 - 1.0 range for same speaker
        # Let's map [0.7, 1.0] -> [0, 100]% linearly
        scaled = (similarity - 0.7) / 0.3
        match_percentage = round(max(0.0, min(1.0, scaled)) * 100.0, 2)
        
    match = similarity >= threshold
    reason = "Voice match successful" if match else f"Voice mismatch (similarity {similarity:.4f} is below threshold {threshold:.2f})"
    
    # Detailed logging
    print("=" * 60)
    print(f"[VOICE SERVICE VERIFICATION RESULTS]")
    print(f"User ID: {user_id}")
    print(f"Engine Used: {engine}")
    print(f"Enrolled length: {len(enrolled_embedding)}, Verification length: {len(verification_embedding)}")
    print(f"Similarity Score: {similarity:.4f}")
    print(f"Threshold: {threshold}")
    print(f"Match Percentage: {match_percentage}%")
    print(f"Verdict: {'MATCH' if match else 'MISMATCH'}")
    print("=" * 60)
    
    return {
        "success": True,
        "match": bool(match),
        "similarity": round(similarity, 4),
        "matchPercentage": match_percentage,
        "thresholdUsed": threshold,
        "reason": reason,
        "engine": engine
    }
