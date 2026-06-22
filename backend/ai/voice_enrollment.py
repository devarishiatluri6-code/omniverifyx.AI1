import os
from services import voice_service
from database import SessionLocal

def extract_voice_embedding(audio_path: str):
    """
    Loads, normalizes, resamples, and extracts speaker embedding.
    """
    audio_np = voice_service.preprocess_audio(audio_path)
    embedding, engine = voice_service.get_voice_embedding(audio_np)
    return embedding

def record_voice(user_id, duration=10):
    """
    Simulates or records voice, preprocesses it, and saves embedding.
    """
    import sounddevice as sd
    import soundfile as sf

    os.makedirs("voice_samples", exist_ok=True)
    audio_path = f"voice_samples/{user_id}.wav"

    print(f"Recording started for {duration} seconds. Speak clearly...")
    recording = sd.rec(
        int(duration * voice_service.SAMPLE_RATE),
        samplerate=voice_service.SAMPLE_RATE,
        channels=1,
        dtype="float32"
    )
    sd.wait()

    sf.write(audio_path, recording, voice_service.SAMPLE_RATE)

    db = SessionLocal()
    try:
        audio_np = voice_service.preprocess_audio(audio_path)
        embedding, engine_used = voice_service.get_voice_embedding(audio_np)
        voice_service.save_voice_embedding(db, user_id, embedding, engine_used)
        
        # Update user's voice_path
        from models import User
        user = db.query(User).filter((User.user_id == user_id) | (User.candidate_uuid == user_id)).first()
        if user:
            user.voice_path = audio_path
            db.commit()

        return {
            "success": True,
            "message": f"Voice enrolled successfully with {engine_used}",
            "audio_path": audio_path,
            "engine": engine_used
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Enrollment error: {str(e)}",
            "audio_path": audio_path
        }
    finally:
        db.close()