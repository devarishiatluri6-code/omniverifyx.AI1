from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
import shutil
import os

from database import SessionLocal
from models import ProctoringLog
from ai.proctoring_detection import detect_face_count
from ai.object_detection import model

router = APIRouter(
    prefix="/proctoring",
    tags=["Live Proctoring"]
)

PROCTORING_UPLOAD_DIR = "proctoring_frames"
os.makedirs(PROCTORING_UPLOAD_DIR, exist_ok=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/analyze-frame")
def analyze_frame(
    session_id: str = Form(...),
    user_id: str = Form(...),
    frame: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    frame_path = f"{PROCTORING_UPLOAD_DIR}/{session_id}_{user_id}_frame.jpg"

    with open(frame_path, "wb") as buffer:
        shutil.copyfileobj(frame.file, buffer)

    face_result = detect_face_count(frame_path)

    if not face_result["success"]:
        return {
            "success": False,
            "message": face_result["message"],
            "face_count": 0,
            "detected_objects": [],
            "violations_logged": [],
            "risk_score": 0,
            "risk_level": "low",
            "violation_logged": False
        }

    face_count = face_result["face_count"]

    # Run YOLO object detection and extract labels with confidence
    detected_objects = []
    try:
        results = model(frame_path)
        target_classes = {"cell phone", "book", "laptop", "person"}
        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                label = model.names[cls_id]
                conf = float(box.conf[0])
                if label in target_classes:
                    detected_objects.append({
                        "label": label,
                        "confidence": round(conf, 2)
                    })
    except Exception as e:
        print(f"YOLO error: {e}")

    violations_to_log = []

    # Check face count violations
    # - If no face, log violation_type = "NO_FACE_DETECTED", severity = "high"
    # - If multiple faces, log violation_type = "MULTIPLE_FACES", severity = "critical"
    if face_count == 0:
        violations_to_log.append({
            "violation_type": "NO_FACE_DETECTED",
            "severity": "high"
        })
    elif face_count > 1:
        violations_to_log.append({
            "violation_type": "MULTIPLE_FACES",
            "severity": "critical"
        })

    # Check prohibited object violations
    # - If cell phone is detected, log violation_type = "PHONE_DETECTED", severity = "high"
    # - If book is detected, log violation_type = "BOOK_DETECTED", severity = "medium"
    # - If laptop is detected, log violation_type = "LAPTOP_DETECTED", severity = "medium"
    detected_labels = {obj["label"] for obj in detected_objects}
    object_violation_mapping = {
        "cell phone": ("PHONE_DETECTED", "high"),
        "book": ("BOOK_DETECTED", "medium"),
        "laptop": ("LAPTOP_DETECTED", "medium")
    }

    for label in detected_labels:
        if label in object_violation_mapping:
            v_type, sev = object_violation_mapping[label]
            violations_to_log.append({
                "violation_type": v_type,
                "severity": sev
            })

    logged_violations = []

    for v in violations_to_log:
        log = ProctoringLog(
            session_id=session_id,
            user_id=user_id,
            violation_type=v["violation_type"],
            severity=v["severity"]
        )
        db.add(log)
        db.commit()
        db.refresh(log)

        logged_violations.append({
            "violation_type": log.violation_type,
            "severity": log.severity,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None
        })

    # Risk score calculation based on all existing logs for the session
    all_logs = db.query(ProctoringLog).filter(ProctoringLog.session_id == session_id).all()
    score = 0
    for log in all_logs:
        sev = log.severity.lower() if log.severity else "medium"
        if sev == "low":
            score += 5
        elif sev == "medium":
            score += 10
        elif sev == "high":
            score += 20
        elif sev == "critical":
            score += 35

    if score <= 20:
        level = "low"
    elif score <= 50:
        level = "medium"
    elif score <= 80:
        level = "high"
    else:
        level = "critical"

    # Save risk score directly to the ExamSession table in the database
    from models import ExamSession
    session_obj = db.query(ExamSession).filter(ExamSession.session_id == session_id).first()
    if session_obj:
        session_obj.risk_score = score
        db.commit()

    message = "Normal proctoring frame"
    if logged_violations:
        types = [v["violation_type"] for v in logged_violations]
        message = f"Violations detected: {', '.join(types)}"
    elif detected_objects:
        labels = [obj["label"] for obj in detected_objects]
        message = f"Objects detected: {', '.join(labels)}"

    return {
        "success": True,
        "face_count": face_count,
        "detected_objects": detected_objects,
        "violations_logged": logged_violations,
        "risk_score": score,
        "risk_level": level,
        "message": message,
        "violation_logged": len(logged_violations) > 0,
        "violations": logged_violations,
        "violation": logged_violations[0] if logged_violations else None
    }


@router.post("/log")
def create_proctoring_log(
    session_id: str,
    user_id: str,
    violation_type: str,
    severity: str = "medium",
    db: Session = Depends(get_db)
):
    log = ProctoringLog(
        session_id=session_id,
        user_id=user_id,
        violation_type=violation_type,
        severity=severity
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "success": True,
        "message": "Violation logged successfully",
        "log": {
            "id": log.id,
            "session_id": log.session_id,
            "user_id": log.user_id,
            "violation_type": log.violation_type,
            "severity": log.severity,
            "timestamp": log.timestamp
        }
    }


@router.get("/session/{session_id}")
def get_session_logs(
    session_id: str,
    db: Session = Depends(get_db)
):
    logs = db.query(ProctoringLog).filter(
        ProctoringLog.session_id == session_id
    ).all()

    return {
        "success": True,
        "logs": [
            {
                "id": log.id,
                "session_id": log.session_id,
                "user_id": log.user_id,
                "violation_type": log.violation_type,
                "severity": log.severity,
                "timestamp": log.timestamp
            }
            for log in logs
        ]
    }


@router.get("/user/{user_id}")
def get_user_logs(
    user_id: str,
    db: Session = Depends(get_db)
):
    logs = db.query(ProctoringLog).filter(
        ProctoringLog.user_id == user_id
    ).all()

    return {
        "success": True,
        "logs": [
            {
                "id": log.id,
                "session_id": log.session_id,
                "user_id": log.user_id,
                "violation_type": log.violation_type,
                "severity": log.severity,
                "timestamp": log.timestamp
            }
            for log in logs
        ]
    }