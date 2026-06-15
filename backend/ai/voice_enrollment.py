import os
import json
import numpy as np
import sounddevice as sd
import soundfile as sf
import librosa

SAMPLE_RATE = 16000


def extract_voice_embedding(audio_path):
    audio, sr = librosa.load(audio_path, sr=SAMPLE_RATE)

    mfcc = librosa.feature.mfcc(
        y=audio,
        sr=sr,
        n_mfcc=20
    )

    embedding = np.mean(mfcc, axis=1)

    return embedding


def record_voice(user_id, duration=10):
    os.makedirs("voice_samples", exist_ok=True)
    os.makedirs("voice_embeddings", exist_ok=True)

    audio_path = f"voice_samples/{user_id}.wav"

    print("Recording started. Speak clearly...")
    recording = sd.rec(
        int(duration * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="float32"
    )
    sd.wait()

    sf.write(audio_path, recording, SAMPLE_RATE)

    embedding = extract_voice_embedding(audio_path)

    with open(f"voice_embeddings/{user_id}.json", "w") as f:
        json.dump(embedding.tolist(), f)

    return {
        "success": True,
        "message": "Voice enrolled successfully with MFCC",
        "audio_path": audio_path
    }