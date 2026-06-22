import uuid
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from datetime import datetime

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    candidate_uuid = Column(
        String,
        unique=True,
        nullable=False,
        default=lambda: str(uuid.uuid4())
    )

    user_id = Column(
        String,
        unique=True,
        nullable=True
    )

    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    role = Column(String, nullable=False)
    password_hash = Column(String, nullable=True)
    voice_path = Column(String, nullable=True)
    
    category = Column(String, default="OC")
    annual_income = Column(Float, default=0.0)
    uploaded_documents = Column(String, default="")
    document_verification_status = Column(String, default="PENDING_DOCUMENTS")
    candidate_aadhaar_number = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)
    mobile_number = Column(String, nullable=True)


class HallTicket(Base):
    __tablename__ = "hall_tickets"

    id = Column(Integer, primary_key=True, index=True)

    hall_ticket_number = Column(String, unique=True, nullable=False, index=True)

    candidate_uuid = Column(String, nullable=True)
    user_id = Column(String, nullable=True)

    exam_id = Column(String, nullable=False)

    candidate_name = Column(String, nullable=True)
    candidate_email = Column(String, nullable=True)

    exam_name = Column(String, nullable=True)
    exam_date = Column(String, nullable=True)
    start_time = Column(String, nullable=True)
    duration_minutes = Column(Integer, nullable=True)

    status = Column(String, default="active")

    generated_at = Column(DateTime, default=datetime.utcnow)


class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id = Column(Integer, primary_key=True, index=True)

    session_id = Column(String, unique=True, nullable=False)
    user_id = Column(String, nullable=False)

    candidate_uuid = Column(
        String,
        nullable=True
    )

    hall_ticket_number = Column(
        String,
        nullable=True
    )

    exam_id = Column(
        String,
        nullable=True
    )

    login_time = Column(DateTime, default=datetime.utcnow)
    logout_time = Column(DateTime, nullable=True)

    duration_seconds = Column(Integer, nullable=True)

    verification_status = Column(String, nullable=False)
    face_similarity = Column(Float, nullable=True)
    voice_similarity = Column(Float, nullable=True)
    blink_count = Column(Integer, nullable=True)

    exam_status = Column(String, default="active")

    # Score fields
    score = Column(Integer, nullable=True)
    total_questions = Column(Integer, nullable=True)
    percentage = Column(Float, nullable=True)
    pass_status = Column(String, nullable=True)
    risk_score = Column(Integer, default=0, nullable=True)


class ProctoringLog(Base):
    __tablename__ = "proctoring_logs"

    id = Column(Integer, primary_key=True, index=True)

    session_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)

    violation_type = Column(String, nullable=False)
    severity = Column(String, default="medium")

    timestamp = Column(DateTime, default=datetime.utcnow)


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(String, unique=True, nullable=False)
    exam_name = Column(String, nullable=False)
    exam_type = Column(String, nullable=False)  # government / university
    description = Column(String, nullable=True)
    exam_date = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    status = Column(String, default="draft")  # draft / published / closed
    created_at = Column(DateTime, default=datetime.utcnow)


class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(String, nullable=False, index=True)
    question_text = Column(String, nullable=False)
    option_a = Column(String, nullable=False)
    option_b = Column(String, nullable=False)
    option_c = Column(String, nullable=False)
    option_d = Column(String, nullable=False)
    correct_answer = Column(String, nullable=False) # A, B, C, D
    marks = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)


class ExamAnswer(Base):
    __tablename__ = "exam_answers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, nullable=False, index=True)
    question_id = Column(Integer, nullable=False, index=True)
    selected_answer = Column(String, nullable=True)
    is_correct = Column(Boolean, default=False)
    marks_awarded = Column(Integer, default=0)
    submitted_at = Column(DateTime, default=datetime.utcnow)


class CandidateDocument(Base):
    __tablename__ = "candidate_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)
    extracted_aadhaar_number = Column(String, nullable=True)
    name_match_score = Column(Float, nullable=True)
    aadhaar_match = Column(String, nullable=True)
    verification_status = Column(String, nullable=True)
    extracted_dob = Column(String, nullable=True)
    dob_match = Column(String, nullable=True)
    extracted_text = Column(String, nullable=True)

    # Caste Certificate fields
    caste_extracted_name = Column(String, nullable=True)
    caste_extracted_category = Column(String, nullable=True)
    caste_extracted_cert_number = Column(String, nullable=True)
    caste_name_match_score = Column(Float, nullable=True)
    caste_category_match = Column(String, nullable=True)
    caste_verification_status = Column(String, nullable=True)

    # Income Certificate fields
    income_extracted_name = Column(String, nullable=True)
    income_extracted_amount = Column(Float, nullable=True)
    income_name_match_score = Column(Float, nullable=True)
    income_amount_match = Column(String, nullable=True)
    income_verification_status = Column(String, nullable=True)


class Biometric(Base):
    __tablename__ = "biometrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)
    biometric_type = Column(String, nullable=False) # 'voice'
    embedding = Column(String, nullable=False) # JSON-serialized list of floats
    created_at = Column(DateTime, default=datetime.utcnow)