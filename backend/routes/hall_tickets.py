import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import SessionLocal
from models import User, Exam, HallTicket

router = APIRouter(
    prefix="/hall-tickets",
    tags=["Hall Tickets"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class GenerateRequest(BaseModel):
    user_id: str
    exam_id: str


@router.post("/generate")
def generate_hall_ticket(req: GenerateRequest, db: Session = Depends(get_db)):
    # Find candidate
    user = db.query(User).filter((User.user_id == req.user_id) | (User.candidate_uuid == req.user_id)).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found"
        )

    # Find exam
    exam = db.query(Exam).filter(Exam.exam_id == req.exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=404,
            detail="Exam not found"
        )

    # Check if active ticket already exists for this candidate and exam
    existing = db.query(HallTicket).filter(
        HallTicket.user_id == user.user_id,
        HallTicket.exam_id == exam.exam_id,
        HallTicket.status == "active"
    ).first()
    if existing:
        return {
            "success": True,
            "message": "Active hall ticket already exists",
            "hall_ticket": {
                "hall_ticket_number": existing.hall_ticket_number,
                "user_id": existing.user_id,
                "candidate_uuid": existing.candidate_uuid,
                "candidate_name": existing.candidate_name,
                "candidate_email": existing.candidate_email,
                "exam_id": existing.exam_id,
                "exam_name": existing.exam_name,
                "exam_date": existing.exam_date,
                "start_time": existing.start_time,
                "duration_minutes": existing.duration_minutes,
                "status": existing.status
            }
        }

    # Generate ticket number
    exam_id_short = exam.exam_id.replace(" ", "").upper()[:8]
    candidate_id_short = user.user_id.replace(" ", "").upper()[:6]
    random4 = uuid.uuid4().hex[:4].upper()
    hall_ticket_number = f"OVX-{exam_id_short}-{candidate_id_short}-{random4}"

    ticket = HallTicket(
        hall_ticket_number=hall_ticket_number,
        candidate_uuid=user.candidate_uuid,
        user_id=user.user_id,
        exam_id=exam.exam_id,
        candidate_name=user.name,
        candidate_email=user.email,
        exam_name=exam.exam_name,
        exam_date=exam.exam_date,
        start_time=exam.start_time,
        duration_minutes=exam.duration_minutes,
        status="active"
    )

    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return {
        "success": True,
        "message": "Hall ticket generated successfully",
        "hall_ticket": {
            "hall_ticket_number": ticket.hall_ticket_number,
            "user_id": ticket.user_id,
            "candidate_uuid": ticket.candidate_uuid,
            "candidate_name": ticket.candidate_name,
            "candidate_email": ticket.candidate_email,
            "exam_id": ticket.exam_id,
            "exam_name": ticket.exam_name,
            "exam_date": ticket.exam_date,
            "start_time": ticket.start_time,
            "duration_minutes": ticket.duration_minutes,
            "status": ticket.status
        }
    }


@router.get("/")
def get_all_hall_tickets(db: Session = Depends(get_db)):
    tickets = db.query(HallTicket).all()
    return {
        "success": True,
        "hall_tickets": [
            {
                "hall_ticket_number": t.hall_ticket_number,
                "user_id": t.user_id,
                "candidate_uuid": t.candidate_uuid,
                "candidate_name": t.candidate_name,
                "candidate_email": t.candidate_email,
                "exam_id": t.exam_id,
                "exam_name": t.exam_name,
                "exam_date": t.exam_date,
                "start_time": t.start_time,
                "duration_minutes": t.duration_minutes,
                "status": t.status,
                "generated_at": t.generated_at
            }
            for t in tickets
        ]
    }


@router.get("/{hall_ticket_number}")
def get_hall_ticket(hall_ticket_number: str, db: Session = Depends(get_db)):
    ticket = db.query(HallTicket).filter(HallTicket.hall_ticket_number == hall_ticket_number).first()
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Hall ticket not found"
        )
    return {
        "success": True,
        "hall_ticket": {
            "hall_ticket_number": ticket.hall_ticket_number,
            "user_id": ticket.user_id,
            "candidate_uuid": ticket.candidate_uuid,
            "candidate_name": ticket.candidate_name,
            "candidate_email": ticket.candidate_email,
            "exam_id": ticket.exam_id,
            "exam_name": ticket.exam_name,
            "exam_date": ticket.exam_date,
            "start_time": ticket.start_time,
            "duration_minutes": ticket.duration_minutes,
            "status": ticket.status,
            "generated_at": ticket.generated_at
        }
    }


@router.get("/user/{user_id}")
def get_user_hall_tickets(user_id: str, db: Session = Depends(get_db)):
    tickets = db.query(HallTicket).filter(
        (HallTicket.user_id == user_id) | (HallTicket.candidate_uuid == user_id)
    ).all()
    return {
        "success": True,
        "hall_tickets": [
            {
                "hall_ticket_number": t.hall_ticket_number,
                "user_id": t.user_id,
                "candidate_uuid": t.candidate_uuid,
                "candidate_name": t.candidate_name,
                "candidate_email": t.candidate_email,
                "exam_id": t.exam_id,
                "exam_name": t.exam_name,
                "exam_date": t.exam_date,
                "start_time": t.start_time,
                "duration_minutes": t.duration_minutes,
                "status": t.status,
                "generated_at": t.generated_at
            }
            for t in tickets
        ]
    }


@router.put("/{hall_ticket_number}/cancel")
def cancel_hall_ticket(hall_ticket_number: str, db: Session = Depends(get_db)):
    ticket = db.query(HallTicket).filter(HallTicket.hall_ticket_number == hall_ticket_number).first()
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Hall ticket not found"
        )
    ticket.status = "cancelled"
    db.commit()
    db.refresh(ticket)
    return {
        "success": True,
        "message": "Hall ticket cancelled successfully",
        "hall_ticket": {
            "hall_ticket_number": ticket.hall_ticket_number,
            "status": ticket.status
        }
    }


@router.get("/{hall_ticket_number}/pdf")
def get_hall_ticket_pdf(hall_ticket_number: str, db: Session = Depends(get_db)):
    from fastapi.responses import FileResponse
    from services.hallticket_service import generate_hall_ticket_for_candidate
    import os

    ticket = db.query(HallTicket).filter(HallTicket.hall_ticket_number == hall_ticket_number).first()
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Hall ticket not found"
        )

    # Find candidate
    user = db.query(User).filter((User.user_id == ticket.user_id) | (User.candidate_uuid == ticket.candidate_uuid)).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Candidate associated with this ticket not found"
        )

    exam_details = {
        "exam_id": ticket.exam_id,
        "exam_name": ticket.exam_name,
        "exam_date": ticket.exam_date,
        "start_time": ticket.start_time,
        "duration_minutes": ticket.duration_minutes
    }

    _, pdf_path = generate_hall_ticket_for_candidate(db, user, exam_details)

    if not os.path.exists(pdf_path):
        raise HTTPException(
            status_code=500,
            detail="Failed to generate hall ticket PDF file"
        )

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"{hall_ticket_number}.pdf"
    )


