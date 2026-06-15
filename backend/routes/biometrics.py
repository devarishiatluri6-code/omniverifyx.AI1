import os
import shutil
from fastapi import APIRouter, UploadFile, File, Form

from ai.face_enrollment import enroll_face
from ai.face_verification import verify_face
from ai.liveness_blink import run_blink_liveness

router = APIRouter(prefix="/biometrics", tags=["Biometrics"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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
    audio: UploadFile = File(...)
):
    os.makedirs("voice_samples", exist_ok=True)

    audio_path = f"voice_samples/{user_id}.wav"

    with open(audio_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)

    return {
        "success": True,
        "message": "Voice sample saved successfully",
        "audio_path": audio_path
    }