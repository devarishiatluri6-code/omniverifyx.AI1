from services import voice_service
from database import SessionLocal

VOICE_MATCH_THRESHOLD = 0.30

def verify_voice(
    user_id: str,
    verification_audio_path: str,
    threshold: float = None,
    db = None
):
    """
    Wrapper for voice verification delegating to voice_service.
    """
    db_created = False
    if db is None:
        db = SessionLocal()
        db_created = True
        
    try:
        result = voice_service.verify_voice_samples(
            db=db,
            user_id=user_id,
            verification_audio_path=verification_audio_path
        )
        return result
    finally:
        if db_created:
            db.close()