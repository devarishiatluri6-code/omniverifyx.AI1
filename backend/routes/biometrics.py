import os
import shutil
from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session
from database import SessionLocal
from services import voice_service
from ai.face_enrollment import enroll_face
from ai.face_verification import verify_face
from ai.liveness_blink import run_blink_liveness

router = APIRouter(prefix="/biometrics", tags=["Biometrics"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/face/enroll")
def face_enroll(
    user_id: str = Form(...),
    image: UploadFile = File(...)
):
    image_path = f"{UPLOAD_DIR}/{user_id}_enroll.jpg"

    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    result = enroll_face(image_path, user_id)

    return result


@router.post("/face/verify")
def face_verify(
    user_id: str = Form(...),
    image: UploadFile = File(...)
):
    image_path = f"{UPLOAD_DIR}/{user_id}_verify.jpg"

    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    result = verify_face(image_path, user_id)

    return result


@router.get("/liveness")
def liveness_check():
    result = run_blink_liveness(duration=10)
    return result


@router.post("/voice/enroll")
def voice_enroll(
    user_id: str = Form(...),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    os.makedirs("voice_samples", exist_ok=True)
    
    # Extract original extension
    _, ext = os.path.splitext(audio.filename or "")
    if not ext:
        ext = ".webm"
        
    temp_path = f"voice_samples/{user_id}_temp{ext}"
    audio_path = f"voice_samples/{user_id}.wav"

    try:
        # Save upload to temp file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        # Preprocess audio (WAV, mono, 16kHz, noise/silence removed)
        audio_np = voice_service.preprocess_audio(temp_path)
        
        # Save preprocessed audio to the final WAV location
        import soundfile as sf
        sf.write(audio_path, audio_np, voice_service.SAMPLE_RATE)
        
        # Extract embedding
        embedding, engine_used = voice_service.get_voice_embedding(audio_np)
        
        # Save to database
        voice_service.save_voice_embedding(db, user_id, embedding, engine_used)
        
        # Update user's voice_path in the users table
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
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"Voice enrollment error: {str(e)}",
            "audio_path": audio_path
        }
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass