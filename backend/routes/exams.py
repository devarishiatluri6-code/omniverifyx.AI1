import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import SessionLocal
from models import Exam

router = APIRouter(
    prefix="/exams",
    tags=["Exams Management"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ExamCreateSchema(BaseModel):
    exam_name: str
    exam_type: str
    description: Optional[str] = None
    exam_date: str
    start_time: str
    duration_minutes: int


@router.post("/create")
def create_exam(schema: ExamCreateSchema, db: Session = Depends(get_db)):
    exam_id = str(uuid.uuid4())
    new_exam = Exam(
        exam_id=exam_id,
        exam_name=schema.exam_name,
        exam_type=schema.exam_type,
        description=schema.description,
        exam_date=schema.exam_date,
        start_time=schema.start_time,
        duration_minutes=schema.duration_minutes,
        status="draft"
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)

    return {
        "success": True,
        "message": "Exam created successfully",
        "exam": {
            "id": new_exam.id,
            "exam_id": new_exam.exam_id,
            "exam_name": new_exam.exam_name,
            "exam_type": new_exam.exam_type,
            "description": new_exam.description,
            "exam_date": new_exam.exam_date,
            "start_time": new_exam.start_time,
            "duration_minutes": new_exam.duration_minutes,
            "status": new_exam.status,
            "created_at": new_exam.created_at
        }
    }


@router.get("/")
def get_exams(db: Session = Depends(get_db)):
    exams = db.query(Exam).all()
    return [
        {
            "id": exam.id,
            "exam_id": exam.exam_id,
            "exam_name": exam.exam_name,
            "exam_type": exam.exam_type,
            "description": exam.description,
            "exam_date": exam.exam_date,
            "start_time": exam.start_time,
            "duration_minutes": exam.duration_minutes,
            "status": exam.status,
            "created_at": exam.created_at
        }
        for exam in exams
    ]


@router.get("/{exam_id}")
def get_exam(exam_id: str, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return {
        "id": exam.id,
        "exam_id": exam.exam_id,
        "exam_name": exam.exam_name,
        "exam_type": exam.exam_type,
        "description": exam.description,
        "exam_date": exam.exam_date,
        "start_time": exam.start_time,
        "duration_minutes": exam.duration_minutes,
        "status": exam.status,
        "created_at": exam.created_at
    }


@router.put("/{exam_id}/publish")
def publish_exam(exam_id: str, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    exam.status = "published"
    db.commit()
    db.refresh(exam)
    return {
        "success": True,
        "message": "Exam published successfully",
        "exam": {
            "id": exam.id,
            "exam_id": exam.exam_id,
            "exam_name": exam.exam_name,
            "status": exam.status
        }
    }


@router.put("/{exam_id}/close")
def close_exam(exam_id: str, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    exam.status = "closed"
    db.commit()
    db.refresh(exam)
    return {
        "success": True,
        "message": "Exam closed successfully",
        "exam": {
            "id": exam.id,
            "exam_id": exam.exam_id,
            "exam_name": exam.exam_name,
            "status": exam.status
        }
    }
