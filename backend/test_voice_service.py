import os
import json
import numpy as np
import soundfile as sf
from database import SessionLocal, Base, engine
from services import voice_service

# Ensure SQLite tables exist
Base.metadata.create_all(bind=engine)

def generate_test_audio(filename, frequency, duration=4.0, sample_rate=16000, is_noise=False):
    """
    Generates a synthetic audio signal (sine wave with harmonics and noise or pure noise)
    to represent a speaker's unique voice.
    """
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    if is_noise:
        signal = 0.5 * np.random.randn(len(t))
    else:
        # Base frequency + harmonics + noise
        signal = 0.5 * np.sin(2 * np.pi * frequency * t)
        signal += 0.25 * np.sin(2 * np.pi * 2 * frequency * t)
        signal += 0.1 * np.sin(2 * np.pi * 3 * frequency * t)
        signal += 0.02 * np.random.randn(len(t)) # subtle noise
    
    # Add brief silence at the beginning and end to test silence trimming
    silence = np.zeros(int(sample_rate * 0.5))
    full_signal = np.concatenate([silence, signal, silence])
    
    os.makedirs(os.path.dirname(filename) or ".", exist_ok=True)
    sf.write(filename, full_signal, sample_rate)
    print(f"Generated test audio: {filename} (Freq: {frequency}Hz, IsNoise: {is_noise})")

def main():
    print("=" * 60)
    print("STARTING VOICE SERVICE INTEGRATION TEST")
    print("=" * 60)
    
    # 1. Paths
    enroll_path = "voice_samples/test_speaker1_enroll.wav"
    verify_same_path = "voice_samples/test_speaker1_verify.wav"
    verify_diff_path = "voice_samples/test_speaker2_verify.wav"
    
    # 2. Generate Synthetic Audio
    generate_test_audio(enroll_path, frequency=150)       # Speaker 1 enrollment
    generate_test_audio(verify_same_path, frequency=150)  # Speaker 1 verification sample
    generate_test_audio(verify_diff_path, frequency=300, is_noise=True)  # Speaker 2 verification sample (noise)
    
    db = SessionLocal()
    user_id = "test_user_999"
    
    try:
        # Delete any existing enrollment
        from models import Biometric, User
        db.query(Biometric).filter(Biometric.user_id == user_id).delete()
        db.commit()
        
        # 3. Enroll Speaker 1
        print("\n--- Enrolling Speaker 1 ---")
        audio_np = voice_service.preprocess_audio(enroll_path)
        embedding, engine_used = voice_service.get_voice_embedding(audio_np)
        voice_service.save_voice_embedding(db, user_id, embedding, engine_used)
        
        # Keep raw enrolled audio in the standard path for verification recalculation
        standard_enroll_path = f"voice_samples/{user_id}.wav"
        sf.write(standard_enroll_path, audio_np, voice_service.SAMPLE_RATE)
        
        # 4. Verify Same Speaker
        print("\n--- Verifying Same Speaker ---")
        result_same = voice_service.verify_voice_samples(db, user_id, verify_same_path)
        print(f"Same Speaker Match: {result_same['match']} (Similarity: {result_same['similarity']}, Percent: {result_same['matchPercentage']}%)")
        
        # 5. Verify Different Speaker
        print("\n--- Verifying Different Speaker ---")
        result_diff = voice_service.verify_voice_samples(db, user_id, verify_diff_path)
        print(f"Different Speaker Match: {result_diff['match']} (Similarity: {result_diff['similarity']}, Percent: {result_diff['matchPercentage']}%)")
        
        # Assertions to validate behavior
        assert result_same["match"] is True, "Same speaker verification should pass!"
        assert result_diff["match"] is False, "Different speaker verification should fail!"
        
        print("\n" + "=" * 60)
        print("ALL TESTS PASSED SUCCESSFULLY!")
        print("=" * 60)
        
    except AssertionError as ae:
        print(f"\nTEST FAILURE: {ae}")
        exit(1)
    except Exception as e:
        print(f"\nUNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
    finally:
        # Clean up test files
        for p in [enroll_path, verify_same_path, verify_diff_path, f"voice_samples/{user_id}.wav"]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
        db.close()

if __name__ == "__main__":
    main()
