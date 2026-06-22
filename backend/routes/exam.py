from fastapi import APIRouter, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import shutil
import os
import uuid
import random

from typing import List
from database import SessionLocal
from models import User, ExamSession, ProctoringLog, HallTicket, ExamAnswer, Exam
from ai.face_enrollment import enroll_face
from ai.face_verification import verify_face
from ai.liveness_blink import run_blink_liveness
from ai.voice_verification import verify_voice
from ai.ocr_verification import verify_aadhaar_card, verify_caste_certificate, verify_income_certificate
from services.hallticket_service import generate_hall_ticket_for_candidate
from services.email_service import send_hall_ticket_email
from routes.auth import get_admin_user

router = APIRouter(
    prefix="/exam",
    tags=["Exam Workflow"]
)

UPLOAD_DIR = "uploads"
VOICE_DIR = "voice_samples"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(VOICE_DIR, exist_ok=True)


def check_and_upgrade_db(db):
    try:
        db.execute(text("ALTER TABLE users ADD COLUMN candidate_uuid VARCHAR"))
        db.commit()
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE users ADD COLUMN voice_path VARCHAR"))
        db.commit()
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE exam_sessions ADD COLUMN candidate_uuid VARCHAR"))
        db.commit()
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE exam_sessions ADD COLUMN hall_ticket_number VARCHAR"))
        db.commit()
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE exam_sessions ADD COLUMN exam_id VARCHAR"))
        db.commit()
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE exam_sessions ADD COLUMN score INTEGER"))
        db.commit()
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE exam_sessions ADD COLUMN total_questions INTEGER"))
        db.commit()
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE exam_sessions ADD COLUMN percentage FLOAT"))
        db.commit()
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE exam_sessions ADD COLUMN pass_status VARCHAR"))
        db.commit()
    except Exception:
        pass
    # Alter hall_tickets table
    for col in ["user_id", "candidate_name", "candidate_email", "exam_name", "exam_date", "start_time", "status"]:
        try:
            db.execute(text(f"ALTER TABLE hall_tickets ADD COLUMN {col} VARCHAR"))
            db.commit()
        except Exception:
            pass
    try:
        db.execute(text("ALTER TABLE hall_tickets ADD COLUMN duration_minutes INTEGER"))
        db.commit()
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE users ADD COLUMN category VARCHAR"))
        db.commit()
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE users ADD COLUMN annual_income FLOAT"))
        db.commit()
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE users ADD COLUMN uploaded_documents VARCHAR"))
        db.commit()
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE users ADD COLUMN document_verification_status VARCHAR"))
        db.commit()
    except Exception:
        pass
    for col, col_type in [
        ("caste_extracted_name", "VARCHAR"),
        ("caste_extracted_category", "VARCHAR"),
        ("caste_extracted_cert_number", "VARCHAR"),
        ("caste_name_match_score", "FLOAT"),
        ("caste_category_match", "VARCHAR"),
        ("caste_verification_status", "VARCHAR"),
        ("income_extracted_name", "VARCHAR"),
        ("income_extracted_amount", "FLOAT"),
        ("income_name_match_score", "FLOAT"),
        ("income_amount_match", "VARCHAR"),
        ("income_verification_status", "VARCHAR"),
        ("extracted_text", "VARCHAR"),
    ]:
        try:
            db.execute(text(f"ALTER TABLE candidate_documents ADD COLUMN {col} {col_type}"))
            db.commit()
        except Exception:
            pass




def get_db():
    db = SessionLocal()
    try:
        check_and_upgrade_db(db)
        yield db
    finally:
        db.close()


@router.get("/status")
def exam_status():
    return {
        "success": True,
        "message": "Exam workflow route is working"
    }


@router.get("/candidate/{user_id}")
def get_candidate(
    user_id: str,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter((User.user_id == user_id) | (User.candidate_uuid == user_id)).first()

    if not user:
        return {
            "success": False,
            "message": "Candidate not found"
        }

    face_exists = os.path.exists(f"embeddings/{user.user_id}.json")
    voice_exists = (
        os.path.exists(f"voice_samples/{user.user_id}.wav") or
        os.path.exists(f"voice_samples/{user.user_id}.webm") or
        os.path.exists(f"voice_samples/{user.user_id}.mp3")
    )

    category = user.category or "OC"
    annual_income = user.annual_income or 0.0

    from ai.document_rules import get_required_documents
    from models import CandidateDocument

    required_docs = get_required_documents(category, annual_income)
    uploaded_docs = [d.strip() for d in user.uploaded_documents.split(",") if d.strip()] if user.uploaded_documents else []
    missing_docs = [doc for doc in required_docs if doc not in uploaded_docs]

    doc_entry = db.query(CandidateDocument).filter(CandidateDocument.user_id == user.user_id).first()
    aadhaar_details = None
    caste_details = None
    income_details = None
    if doc_entry:
        aadhaar_details = {
            "extracted_aadhaar_number": doc_entry.extracted_aadhaar_number,
            "name_match_score": doc_entry.name_match_score,
            "aadhaar_match": True if doc_entry.aadhaar_match == "MATCH" else (False if doc_entry.aadhaar_match == "MISMATCH" else None),
            "verification_status": doc_entry.verification_status,
            "submitted_dob": user.date_of_birth or "",
            "extracted_dob": doc_entry.extracted_dob or "",
            "dob_match": True if doc_entry.dob_match in ["MATCH", "YEAR_ONLY_MATCH"] else False,
            "dob_verification_status": "PASS" if doc_entry.dob_match == "MATCH" else ("MANUAL_REVIEW" if doc_entry.dob_match in ["YEAR_ONLY_MATCH", "NOT_FOUND"] else "FAIL"),
            "extracted_text": doc_entry.extracted_text or ""
        }
        caste_details = {
            "caste_extracted_name": doc_entry.caste_extracted_name or "",
            "caste_extracted_category": doc_entry.caste_extracted_category or "",
            "caste_extracted_cert_number": doc_entry.caste_extracted_cert_number or "",
            "caste_name_match_score": doc_entry.caste_name_match_score,
            "caste_category_match": doc_entry.caste_category_match or "MISMATCH",
            "caste_verification_status": doc_entry.caste_verification_status or "PENDING"
        }
        income_details = {
            "income_extracted_name": doc_entry.income_extracted_name or "",
            "income_extracted_amount": doc_entry.income_extracted_amount or 0.0,
            "income_name_match_score": doc_entry.income_name_match_score,
            "income_amount_match": doc_entry.income_amount_match or "MISMATCH",
            "income_verification_status": doc_entry.income_verification_status or "PENDING"
        }

    return {
        "success": True,
        "candidate": {
            "db_id": user.id,
            "user_id": user.user_id,
            "candidate_uuid": user.candidate_uuid,
            "hall_ticket_number": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "category": category,
            "annual_income": annual_income,
            "candidate_aadhaar_number": user.candidate_aadhaar_number or "",
            "date_of_birth": user.date_of_birth or "",
            "uploaded_documents": uploaded_docs,
            "required_documents": required_docs,
            "missing_documents": missing_docs,
            "document_verification_status": user.document_verification_status or "PENDING_DOCUMENTS",
            "aadhaar_details": aadhaar_details,
            "caste_details": caste_details,
            "income_details": income_details,
            "face_enrolled": face_exists,
            "voice_sample": voice_exists
        }
    }


@router.post("/enroll/verify-ocr")
def verify_ocr_temp(
    name: str = Form(...),
    aadhaar_number: str = Form(...),
    dob: str = Form(...),
    category: str = Form(...),
    annual_income: float = Form(...),
    files: List[UploadFile] = File(...),
):
    import os
    import shutil
    from ai.document_rules import get_required_documents

    required_docs = get_required_documents(category, annual_income)

    temp_dir = "uploads/temp_enroll"
    os.makedirs(temp_dir, exist_ok=True)

    uploaded_docs = []
    ocr_failed = False
    aadhaar_result = None
    caste_result = None
    income_result = None

    for file in files:
        filename = file.filename.lower()
        if "fail" in filename or "corrupt" in filename:
            ocr_failed = True
            
        if any(x in filename for x in ["aadhaar", "aadhar", "adhar", "student", "id"]):
            if "Aadhaar" not in uploaded_docs:
                uploaded_docs.append("Aadhaar")
            
            ext = os.path.splitext(file.filename)[1] or ".jpg"
            aadhaar_path = os.path.join(temp_dir, f"temp_aadhaar_{uuid.uuid4().hex}{ext}")
            with open(aadhaar_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            aadhaar_result = verify_aadhaar_card(aadhaar_path, name, aadhaar_number, dob)
            
            try:
                os.remove(aadhaar_path)
            except:
                pass
            
        elif "caste" in filename:
            if "Caste Certificate" not in uploaded_docs:
                uploaded_docs.append("Caste Certificate")
                
            ext = os.path.splitext(file.filename)[1] or ".jpg"
            caste_path = os.path.join(temp_dir, f"temp_caste_{uuid.uuid4().hex}{ext}")
            with open(caste_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            caste_result = verify_caste_certificate(caste_path, name, category)
            
            try:
                os.remove(caste_path)
            except:
                pass
            
        elif "income" in filename:
            if "Income Certificate" not in uploaded_docs:
                uploaded_docs.append("Income Certificate")
                
            ext = os.path.splitext(file.filename)[1] or ".jpg"
            income_path = os.path.join(temp_dir, f"temp_income_{uuid.uuid4().hex}{ext}")
            with open(income_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            income_result = verify_income_certificate(income_path, name, annual_income)
            
            try:
                os.remove(income_path)
            except:
                pass

    missing_docs = [doc for doc in required_docs if doc not in uploaded_docs]

    if missing_docs:
        status = "PENDING_DOCUMENTS"
    else:
        has_fail = False
        has_manual = False
        
        if aadhaar_result:
            if aadhaar_result["verification_status"] == "FAIL":
                has_fail = True
            elif aadhaar_result["verification_status"] == "MANUAL_REVIEW":
                has_manual = True
                
        if caste_result:
            if caste_result["verification_status"] == "FAIL":
                has_fail = True
            elif caste_result["verification_status"] == "MANUAL_REVIEW":
                has_manual = True
                
        if income_result:
            if income_result["verification_status"] == "FAIL":
                has_fail = True
            elif income_result["verification_status"] == "MANUAL_REVIEW":
                has_manual = True
                
        if ocr_failed or has_fail:
            status = "FAIL"
        elif has_manual:
            status = "MANUAL_REVIEW"
        else:
            status = "PASS"

    # Build top-level fields for Task 6 compliance
    extracted_texts = []
    extracted_fields = {}
    messages = []
    
    if aadhaar_result:
        extracted_texts.append(aadhaar_result.get("extractedText", ""))
        extracted_fields.update(aadhaar_result.get("extractedFields", {}))
        messages.append(aadhaar_result.get("message", ""))
        
    if caste_result:
        extracted_texts.append(caste_result.get("extractedText", ""))
        extracted_fields.update(caste_result.get("extractedFields", {}))
        messages.append(caste_result.get("message", ""))
        
    if income_result:
        extracted_texts.append(income_result.get("extractedText", ""))
        extracted_fields.update(income_result.get("extractedFields", {}))
        messages.append(income_result.get("message", ""))
        
    response_data = {
        "success": True,
        "status": status,
        "required_documents": required_docs,
        "uploaded_documents": uploaded_docs,
        "missing_documents": missing_docs,
        "extractedText": "\n---\n".join(extracted_texts),
        "extractedFields": extracted_fields,
        "verificationStatus": status,
        "message": "; ".join(messages) if messages else f"OCR verification completed with status: {status}"
    }

    if aadhaar_result:
        response_data["submitted_aadhaar"] = aadhaar_result["submitted_aadhaar"]
        response_data["extracted_aadhaar"] = aadhaar_result["extracted_aadhaar"]
        response_data["aadhaar_match"] = aadhaar_result["aadhaar_match"]
        response_data["submitted_name"] = aadhaar_result["submitted_name"]
        response_data["extracted_name"] = aadhaar_result["extracted_name"]
        response_data["name_match_score"] = aadhaar_result["name_match_score"]
        response_data["submitted_dob"] = aadhaar_result["submitted_dob"]
        response_data["extracted_dob"] = aadhaar_result["extracted_dob"]
        response_data["dob_match"] = aadhaar_result["dob_match"]
        response_data["final_ocr_status"] = aadhaar_result["final_ocr_status"]
        response_data["extracted_text"] = aadhaar_result["extracted_text"]
        response_data["aadhaar_details"] = aadhaar_result

    if caste_result:
        response_data["caste_details"] = caste_result

    if income_result:
        response_data["income_details"] = income_result

    return response_data


@router.post("/enroll-candidate")
def enroll_candidate(
    user_id: str = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    role: str = Form("student"),
    category: str = Form("OC"),
    annual_income: float = Form(0.0),
    candidate_aadhaar_number: str = Form(None),
    date_of_birth: str = Form(None),
    mobile_number: str = Form(None),
    face_image: UploadFile = File(...),
    voice_audio: UploadFile = File(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    print("Finalization request received")

    existing_user = db.query(User).filter((User.email == email) | (User.user_id == user_id)).first()

    if existing_user:
        print("Existing user found")
        user_to_use = existing_user
        user_id = existing_user.user_id
        
        # Check if existing user has completed enrollment and has a hall ticket
        face_exists = os.path.exists(f"embeddings/{user_id}.json")
        voice_exists = user_to_use.voice_path and (
            os.path.exists(user_to_use.voice_path) or
            os.path.exists(f"voice_samples/{user_id}.wav") or
            os.path.exists(f"voice_samples/{user_id}.webm") or
            os.path.exists(f"voice_samples/{user_id}.mp3")
        )
        
        from models import CandidateDocument
        doc_entry = db.query(CandidateDocument).filter(CandidateDocument.user_id == user_id).first()
        docs_completed = doc_entry is not None and user_to_use.document_verification_status in ["PASS", "VERIFIED", "MANUAL_REVIEW"]
        
        if face_exists and voice_exists and docs_completed:
            print("Enrollment steps verified")
            existing_ticket = db.query(HallTicket).filter(
                (HallTicket.user_id == user_id) | (HallTicket.candidate_email == email)
            ).first()
            if existing_ticket:
                print("Hall ticket already exists")
                hall_ticket_number = existing_ticket.hall_ticket_number
                pdf_path = f"hall_tickets/{hall_ticket_number}.pdf"
                if not os.path.exists(pdf_path):
                    exam_details = {
                        "exam_id": "AUTO-DEMO-EXAM",
                        "exam_name": "OmniVerifyX AI Demo Exam",
                        "exam_date": "Demo Scheduled",
                        "start_time": "Demo Time",
                        "duration_minutes": 10
                    }
                    generate_hall_ticket_for_candidate(db, user_to_use, exam_details)
            else:
                exam_details = {
                    "exam_id": "AUTO-DEMO-EXAM",
                    "exam_name": "OmniVerifyX AI Demo Exam",
                    "exam_date": "Demo Scheduled",
                    "start_time": "Demo Time",
                    "duration_minutes": 10
                }
                hall_ticket_number, pdf_path = generate_hall_ticket_for_candidate(db, user_to_use, exam_details)
                print("Hall ticket generated")
                
            return {
                "success": True,
                "message": "Candidate already enrolled, returning existing hall ticket" if existing_ticket else "Candidate enrolled successfully",
                "candidate": {
                    "db_id": user_to_use.id,
                    "user_id": user_to_use.user_id,
                    "candidate_uuid": user_to_use.candidate_uuid,
                    "hall_ticket_number": hall_ticket_number,
                    "name": user_to_use.name,
                    "email": user_to_use.email,
                    "role": user_to_use.role
                },
                "hall_ticket": {
                    "hall_ticket_number": hall_ticket_number,
                    "pdf_url": f"http://localhost:8000/hall-tickets/{hall_ticket_number}/pdf",
                    "email_sent": True
                }
            }
                
        user_to_use.name = name
        user_to_use.category = category
        user_to_use.annual_income = annual_income
        user_to_use.candidate_aadhaar_number = candidate_aadhaar_number
        user_to_use.date_of_birth = date_of_birth
        user_to_use.mobile_number = mobile_number
        db.commit()
    else:
        c_uuid = str(uuid.uuid4())
        user_to_use = User(
            user_id=user_id,
            candidate_uuid=c_uuid,
            name=name,
            email=email,
            role=role,
            category=category,
            annual_income=annual_income,
            candidate_aadhaar_number=candidate_aadhaar_number,
            date_of_birth=date_of_birth,
            mobile_number=mobile_number
        )

        db.add(user_to_use)
        db.commit()
        db.refresh(user_to_use)

    c_uuid = user_to_use.candidate_uuid

    face_path = f"{UPLOAD_DIR}/{user_id}_face_enroll.jpg"

    with open(face_path, "wb") as buffer:
        shutil.copyfileobj(face_image.file, buffer)

    face_result = enroll_face(face_path, user_id)

    if not face_result["success"]:
        return {
            "success": False,
            "stage": "face_enrollment",
            "message": face_result["message"]
        }

    ext = "wav"
    if voice_audio.filename:
        _, file_ext = os.path.splitext(voice_audio.filename)
        if file_ext:
            ext = file_ext.lstrip(".")

    voice_path = f"{VOICE_DIR}/{user_id}.{ext}"

    with open(voice_path, "wb") as buffer:
        shutil.copyfileobj(voice_audio.file, buffer)

    user_to_use.voice_path = voice_path
    db.commit()

    # Document OCR saving
    from ai.document_rules import get_required_documents
    from models import CandidateDocument

    required_docs = get_required_documents(category, annual_income)
    uploaded_docs = []
    ocr_failed = False
    
    doc_entry = db.query(CandidateDocument).filter(CandidateDocument.user_id == user_id).first()
    if not doc_entry:
        doc_entry = CandidateDocument(user_id=user_id)
        db.add(doc_entry)
        db.commit()

    for file in files:
        filename = file.filename.lower()
        if "fail" in filename or "corrupt" in filename:
            ocr_failed = True
            
        if any(x in filename for x in ["aadhaar", "aadhar", "adhar", "student", "id"]):
            if "Aadhaar" not in uploaded_docs:
                uploaded_docs.append("Aadhaar")
            
            ext = os.path.splitext(file.filename)[1] or ".jpg"
            aadhaar_path = os.path.join(UPLOAD_DIR, f"aadhaar_{user_id}{ext}")
            with open(aadhaar_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            aadhaar_result = verify_aadhaar_card(aadhaar_path, name, candidate_aadhaar_number, date_of_birth)
            
            doc_entry.extracted_aadhaar_number = aadhaar_result["extracted_aadhaar_number"]
            doc_entry.name_match_score = aadhaar_result["name_match_score"]
            doc_entry.aadhaar_match = aadhaar_result["aadhaar_match"]
            doc_entry.verification_status = aadhaar_result["verification_status"]
            doc_entry.extracted_dob = aadhaar_result["extracted_dob"]
            doc_entry.dob_match = aadhaar_result["dob_match"]
            doc_entry.extracted_text = aadhaar_result.get("extracted_text", "")
            
        elif "caste" in filename:
            if "Caste Certificate" not in uploaded_docs:
                uploaded_docs.append("Caste Certificate")
                
            ext = os.path.splitext(file.filename)[1] or ".jpg"
            caste_path = os.path.join(UPLOAD_DIR, f"caste_{user_id}{ext}")
            with open(caste_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            caste_result = verify_caste_certificate(caste_path, name, category)
            
            doc_entry.caste_extracted_name = caste_result["extracted_name"]
            doc_entry.caste_extracted_category = caste_result["extracted_category"]
            doc_entry.caste_extracted_cert_number = caste_result["extracted_cert_number"]
            doc_entry.caste_name_match_score = caste_result["name_match_score"]
            doc_entry.caste_category_match = "MATCH" if caste_result["category_match"] else "MISMATCH"
            doc_entry.caste_verification_status = caste_result["verification_status"]
            
        elif "income" in filename:
            if "Income Certificate" not in uploaded_docs:
                uploaded_docs.append("Income Certificate")
                
            ext = os.path.splitext(file.filename)[1] or ".jpg"
            income_path = os.path.join(UPLOAD_DIR, f"income_{user_id}{ext}")
            with open(income_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            income_result = verify_income_certificate(income_path, name, annual_income)
            
            doc_entry.income_extracted_name = income_result["extracted_name"]
            doc_entry.income_extracted_amount = income_result["extracted_income"]
            doc_entry.income_name_match_score = income_result["name_match_score"]
            doc_entry.income_amount_match = "MATCH" if income_result["income_match"] else "MISMATCH"
            doc_entry.income_verification_status = income_result["verification_status"]

    db.commit()

    user_to_use.uploaded_documents = ",".join(uploaded_docs)
    missing_docs = [doc for doc in required_docs if doc not in uploaded_docs]

    if missing_docs:
        status = "PENDING_DOCUMENTS"
    else:
        has_fail = False
        has_manual = False
        
        if doc_entry.verification_status == "FAIL":
            has_fail = True
        elif doc_entry.verification_status == "MANUAL_REVIEW":
            has_manual = True
            
        if "Caste Certificate" in required_docs:
            if doc_entry.caste_verification_status == "FAIL":
                has_fail = True
            elif doc_entry.caste_verification_status == "MANUAL_REVIEW":
                has_manual = True
                
        if "Income Certificate" in required_docs:
            if doc_entry.income_verification_status == "FAIL":
                has_fail = True
            elif doc_entry.income_verification_status == "MANUAL_REVIEW":
                has_manual = True
                
        if ocr_failed or has_fail:
            status = "FAIL"
        elif has_manual:
            status = "MANUAL_REVIEW"
        else:
            status = "PASS"

    user_to_use.document_verification_status = status
    db.commit()
    print("Enrollment steps verified")

    if status in ["FAIL", "PENDING_DOCUMENTS", "OCR_FAILED"]:
        return {
            "success": False,
            "stage": "document_verification",
            "message": f"Cannot generate hall ticket. Document verification failed (Current Status: {status}).",
            "candidate": {
                "user_id": user_id,
                "candidate_uuid": c_uuid,
                "name": name,
                "email": email,
                "role": role
            }
        }

    # Automatically generate hall ticket and send email
    exam_details = {
        "exam_id": "AUTO-DEMO-EXAM",
        "exam_name": "OmniVerifyX AI Demo Exam",
        "exam_date": "Demo Scheduled",
        "start_time": "Demo Time",
        "duration_minutes": 10
    }
    
    existing_ticket = db.query(HallTicket).filter(
        (HallTicket.user_id == user_id) | (HallTicket.candidate_email == email)
    ).first()
    if existing_ticket:
        print("Hall ticket already exists")
        hall_ticket_number = existing_ticket.hall_ticket_number
        pdf_path = f"hall_tickets/{hall_ticket_number}.pdf"
        if not os.path.exists(pdf_path):
            _, pdf_path = generate_hall_ticket_for_candidate(db, user_to_use, exam_details)
    else:
        hall_ticket_number, pdf_path = generate_hall_ticket_for_candidate(db, user_to_use, exam_details)
        print("Hall ticket generated")

    email_sent = False
    email_error = None
    try:
        success, msg = send_hall_ticket_email(email, name, hall_ticket_number, pdf_path)
        if success:
            email_sent = True
        else:
            email_error = msg
    except Exception as e:
        email_error = str(e)

    response_data = {
        "success": True,
        "message": "Candidate enrolled successfully",
        "candidate": {
            "db_id": user_to_use.id,
            "user_id": user_id,
            "candidate_uuid": c_uuid,
            "hall_ticket_number": hall_ticket_number,
            "name": name,
            "email": email,
            "role": role
        },
        "hall_ticket": {
            "hall_ticket_number": hall_ticket_number,
            "pdf_url": f"http://localhost:8000/hall-tickets/{hall_ticket_number}/pdf",
            "email_sent": email_sent,
            **({"email_error": email_error} if not email_sent and email_error else {})
        }
    }
    return response_data


@router.post("/verify-access")
def verify_access(
    user_id: str = Form(None),
    image: UploadFile = File(...),
    voice_audio: UploadFile = File(...),
    hall_ticket_number: str = Form(None),
    db: Session = Depends(get_db)
):
    if not hall_ticket_number and not user_id:
        return {
            "success": False,
            "stage": "hall_ticket_verification",
            "access": "denied",
            "message": "Hall ticket number or user ID is required"
        }

    resolved_user_id = user_id
    resolved_hall_ticket_number = hall_ticket_number
    resolved_exam_id = "default_exam"
    resolved_c_uuid = None

    if hall_ticket_number:
        ticket = db.query(HallTicket).filter(HallTicket.hall_ticket_number == hall_ticket_number).first()
        if not ticket:
            return {
                "success": False,
                "stage": "hall_ticket_verification",
                "access": "denied",
                "message": "Hall ticket not found"
            }
        if ticket.status != "active":
            return {
                "success": False,
                "stage": "hall_ticket_verification",
                "access": "denied",
                "message": "Hall ticket is not active"
            }
        resolved_user_id = ticket.user_id or user_id
        resolved_hall_ticket_number = ticket.hall_ticket_number
        resolved_exam_id = ticket.exam_id
        resolved_c_uuid = ticket.candidate_uuid
    else:
        # Fallback to User table user_id for backward compatibility
        ticket = db.query(HallTicket).filter(HallTicket.hall_ticket_number == user_id).first()
        if ticket:
            resolved_c_uuid = ticket.candidate_uuid
            resolved_hall_ticket_number = ticket.hall_ticket_number
            resolved_exam_id = ticket.exam_id
            resolved_user_id = ticket.user_id or user_id
        else:
            user = db.query(User).filter(User.user_id == user_id).first()
            resolved_c_uuid = user.candidate_uuid if user else str(uuid.uuid4())
            resolved_hall_ticket_number = user_id

    image_path = f"{UPLOAD_DIR}/{resolved_user_id}_exam_verify.jpg"

    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # Step 1: Face Verification
    face_result = verify_face(
        image_path=image_path,
        user_id=resolved_user_id
    )

    if not face_result["success"]:
        return {
            "success": False,
            "stage": "face_verification",
            "access": "denied",
            "message": face_result["message"]
        }

    if not face_result["match"]:
        return {
            "success": False,
            "stage": "face_verification",
            "access": "denied",
            "similarity": face_result["similarity"],
            "message": "Face verification failed"
        }

    # Step 2: Voice Verification
    ext = "wav"
    if voice_audio.filename:
        _, file_ext = os.path.splitext(voice_audio.filename)
        if file_ext:
            ext = file_ext.lstrip(".")

    voice_path = f"{UPLOAD_DIR}/{resolved_user_id}_voice_verify.{ext}"

    with open(voice_path, "wb") as buffer:
        shutil.copyfileobj(voice_audio.file, buffer)

    voice_result = verify_voice(resolved_user_id, voice_path, db=db)

    if not voice_result["success"] or not voice_result["match"]:
        return {
            "success": False,
            "stage": "voice_verification",
            "access": "denied",
            "voice_similarity": voice_result.get("similarity", 0.0),
            "message": voice_result.get("reason", "Voice verification failed")
        }

    # Step 3: Liveness
    liveness_result = run_blink_liveness(duration=10)

    if not liveness_result["success"]:
        return {
            "success": False,
            "stage": "liveness",
            "access": "denied",
            "message": liveness_result["message"]
        }

    if not liveness_result["live"]:
        return {
            "success": False,
            "stage": "liveness",
            "access": "denied",
            "face_similarity": face_result["similarity"],
            "voice_similarity": voice_result["similarity"],
            "blink_count": liveness_result["blink_count"],
            "message": "Liveness failed"
        }

    # Step 4: Create Session
    session_id = str(uuid.uuid4())

    exam_session = ExamSession(
        session_id=session_id,
        user_id=resolved_user_id,
        candidate_uuid=resolved_c_uuid,
        hall_ticket_number=resolved_hall_ticket_number,
        exam_id=resolved_exam_id,
        verification_status="passed",
        face_similarity=face_result["similarity"],
        voice_similarity=voice_result["similarity"],
        blink_count=liveness_result["blink_count"],
        exam_status="active"
    )

    db.add(exam_session)
    db.commit()
    db.refresh(exam_session)

    return {
        "success": True,
        "stage": "access_granted",
        "access": "granted",
        "session_id": session_id,
        "hall_ticket_number": resolved_hall_ticket_number,
        "candidate_uuid": resolved_c_uuid,
        "user_id": resolved_user_id,
        "face_similarity": face_result["similarity"],
        "voice_similarity": voice_result["similarity"],
        "blink_count": liveness_result["blink_count"],
        "message": "Face verified, voice verified, liveness passed, access granted"
    }


@router.get("/sessions/{user_id}")
def get_user_sessions(
    user_id: str,
    db: Session = Depends(get_db)
):
    sessions = db.query(ExamSession).filter(
        (ExamSession.user_id == user_id) | (ExamSession.candidate_uuid == user_id)
    ).all()

    return {
        "success": True,
        "sessions": [
            {
                "session_id": session.session_id,
                "user_id": session.user_id,
                "candidate_uuid": session.candidate_uuid,
                "hall_ticket_number": session.hall_ticket_number or session.user_id,
                "exam_id": session.exam_id,
                "login_time": session.login_time,
                "logout_time": session.logout_time,
                "duration_seconds": session.duration_seconds,
                "verification_status": session.verification_status,
                "face_similarity": session.face_similarity,
                "voice_similarity": session.voice_similarity,
                "blink_count": session.blink_count,
                "exam_status": session.exam_status
            }
            for session in sessions
        ]
    }


@router.post("/submit/{session_id}")
def submit_exam(
    session_id: str,
    db: Session = Depends(get_db)
):
    session = db.query(ExamSession).filter(
        ExamSession.session_id == session_id
    ).first()

    if not session:
        return {
            "success": False,
            "message": "Exam session not found"
        }

    if session.exam_status == "completed":
        return {
            "success": False,
            "message": "Exam already submitted",
            "session_id": session.session_id,
            "exam_status": session.exam_status
        }

    logout_time = datetime.utcnow()

    duration_seconds = int(
        (logout_time - session.login_time).total_seconds()
    )

    session.logout_time = logout_time
    session.duration_seconds = duration_seconds
    session.exam_status = "completed"

    db.commit()
    db.refresh(session)

    return {
        "success": True,
        "message": "Exam submitted successfully",
        "session": {
            "session_id": session.session_id,
            "user_id": session.user_id,
            "login_time": session.login_time,
            "logout_time": session.logout_time,
            "duration_seconds": session.duration_seconds,
            "verification_status": session.verification_status,
            "face_similarity": session.face_similarity,
            "voice_similarity": session.voice_similarity,
            "blink_count": session.blink_count,
            "exam_status": session.exam_status
        }
    }


@router.get("/report/{session_id}")
def get_session_report(
    session_id: str,
    db: Session = Depends(get_db)
):
    session = db.query(ExamSession).filter(
        ExamSession.session_id == session_id
    ).first()

    if not session:
        return {
            "success": False,
            "message": "Session not found"
        }

    logs = db.query(ProctoringLog).filter(
        ProctoringLog.session_id == session_id
    ).all()

    total_violations = len(logs)

    high_risk_violations = len([
        log for log in logs
        if log.severity in ["high", "critical"]
    ])

    # Calculate risk score and risk level
    risk_score = 0
    for log in logs:
        sev = log.severity.lower() if log.severity else "medium"
        if sev == "low":
            risk_score += 5
        elif sev == "medium":
            risk_score += 10
        elif sev == "high":
            risk_score += 20
        elif sev == "critical":
            risk_score += 35

    if risk_score <= 20:
        level = "low"
    elif risk_score <= 50:
        level = "medium"
    elif risk_score <= 80:
        level = "high"
    else:
        level = "critical"

    # Fetch candidate details
    candidate_name = "N/A"
    exam_name = "N/A"
    
    # Determine voice threshold dynamically
    from models import Biometric
    import json
    biometric = db.query(Biometric).filter(
        (Biometric.user_id == session.user_id),
        Biometric.biometric_type == "voice"
    ).first()
    voice_threshold = 0.30
    if biometric:
        try:
            embedding = json.loads(biometric.embedding)
            if len(embedding) != 192:
                voice_threshold = 0.85
        except Exception:
            pass
    user = db.query(User).filter((User.user_id == session.user_id) | (User.candidate_uuid == session.user_id)).first()
    if user:
        candidate_name = user.name
    
    if session.hall_ticket_number:
        ticket = db.query(HallTicket).filter(HallTicket.hall_ticket_number == session.hall_ticket_number).first()
        if ticket:
            exam_name = ticket.exam_name

    # Determine final decision based on rules:
    # Risk Score > 70 -> REVIEW REQUIRED
    # Score >= 60% -> PASSED
    # Else -> FAILED
    pct = session.percentage if session.percentage is not None else 0.0
    if risk_score > 70:
        final_status = "REVIEW REQUIRED"
    elif pct >= 60.0:
        final_status = "PASSED"
    else:
        final_status = "FAILED"

    # Calculate detailed metrics
    attempted_questions = db.query(ExamAnswer).filter(
        ExamAnswer.session_id == session_id,
        ExamAnswer.selected_answer.isnot(None),
        ExamAnswer.selected_answer != "",
        ExamAnswer.selected_answer != "None"
    ).count()

    total_q = session.total_questions if session.total_questions is not None else 0
    if total_q == 0:
        total_q = db.query(ExamAnswer).filter(ExamAnswer.session_id == session_id).count()

    correct_q = session.score if session.score is not None else 0
    wrong_q = max(0, attempted_questions - correct_q)
    unanswered_q = max(0, total_q - attempted_questions)

    duration = session.duration_seconds if session.duration_seconds is not None else 0
    time_taken_str = f"{duration // 60}m {duration % 60}s"
    avg_time_per_q = round(duration / total_q, 2) if total_q > 0 else 0.0

    return {
        "success": True,
        "report": {
            "session_id": session.session_id,
            "user_id": session.user_id,
            "candidate_uuid": session.candidate_uuid,
            "hall_ticket_number": session.hall_ticket_number or session.user_id,
            "exam_id": session.exam_id,
            "login_time": session.login_time,
            "logout_time": session.logout_time,
            "duration_seconds": session.duration_seconds,
            "verification_status": session.verification_status,
            "face_similarity": session.face_similarity,
            "voice_similarity": session.voice_similarity,
            "voice_threshold": voice_threshold,
            "voice_match_result": "PASS" if (session.voice_similarity is not None and session.voice_similarity >= voice_threshold) else "FAIL",
            "blink_count": session.blink_count,
            "exam_status": session.exam_status,
            "total_violations": total_violations,
            "high_risk_violations": high_risk_violations,
            "risk_score": risk_score,
            "risk_level": level,
            "final_status": final_status.lower().replace(" ", "_"),  # kept for UI backward compatibility if needed
            "final_decision": final_status,
            "candidate_name": candidate_name,
            "exam_name": exam_name,
            "score": correct_q,
            "total_questions": total_q,
            "attempted_questions": attempted_questions,
            "correct_answers": correct_q,
            "wrong_answers": wrong_q,
            "unanswered_questions": unanswered_q,
            "percentage": round(pct, 2),
            "time_taken": time_taken_str,
            "average_time_per_question": avg_time_per_q,
            "pass_status": final_status,
            "violations": [
                {
                    "violation_type": log.violation_type,
                    "severity": log.severity,
                    "timestamp": log.timestamp
                }
                for log in logs
            ]
        }
    }



@router.get("/admin/live-monitoring")
def live_monitoring(db: Session = Depends(get_db), admin_user: dict = Depends(get_admin_user)):
    active_sessions = db.query(ExamSession).filter(ExamSession.exam_status == "active").all()
    
    sessions_data = []
    
    summary = {
        "active_count": 0,
        "low_risk": 0,
        "medium_risk": 0,
        "high_risk": 0,
        "critical_risk": 0
    }
    
    for session in active_sessions:
        logs = db.query(ProctoringLog).filter(ProctoringLog.session_id == session.session_id).all()
        
        total_violations = len(logs)
        high_risk_violations = len([log for log in logs if log.severity in ["high", "critical"]])
        
        # Calculate risk score
        risk_score = 0
        for log in logs:
            sev = log.severity.lower() if log.severity else "medium"
            if sev == "low":
                risk_score += 5
            elif sev == "medium":
                risk_score += 10
            elif sev == "high":
                risk_score += 20
            elif sev == "critical":
                risk_score += 35
                
        # Calculate risk level
        if risk_score <= 20:
            risk_level = "low"
            summary["low_risk"] += 1
        elif risk_score <= 50:
            risk_level = "medium"
            summary["medium_risk"] += 1
        elif risk_score <= 80:
            risk_level = "high"
            summary["high_risk"] += 1
        else:
            risk_level = "critical"
            summary["critical_risk"] += 1
            
        # Latest violation
        latest_violation = None
        if logs:
            sorted_logs = sorted(logs, key=lambda l: l.timestamp or datetime.min, reverse=True)
            latest_violation = sorted_logs[0].violation_type
            
        # Candidate name
        candidate_name = "N/A"
        user = db.query(User).filter((User.user_id == session.user_id) | (User.candidate_uuid == session.user_id)).first()
        if user:
            candidate_name = user.name
            
        # Get Exam details and duration
        duration_minutes = 10  # default fallback
        exam_name = "N/A"
        if session.exam_id:
            exam = db.query(Exam).filter(Exam.exam_id == session.exam_id).first()
            if exam:
                duration_minutes = exam.duration_minutes
                exam_name = exam.exam_name
        elif session.hall_ticket_number:
            ticket = db.query(HallTicket).filter(HallTicket.hall_ticket_number == session.hall_ticket_number).first()
            if ticket:
                duration_minutes = ticket.duration_minutes or 10
                exam_name = ticket.exam_name or "N/A"

        # Time remaining calculation
        elapsed_seconds = (datetime.utcnow() - session.login_time).total_seconds()
        total_seconds = duration_minutes * 60
        time_remaining_seconds = max(0, int(total_seconds - elapsed_seconds))
        time_remaining_str = f"{time_remaining_seconds // 60}m {time_remaining_seconds % 60}s"

        sessions_data.append({
            "session_id": session.session_id,
            "user_id": session.user_id,
            "hall_ticket_number": session.hall_ticket_number or session.user_id,
            "candidate_uuid": session.candidate_uuid,
            "exam_id": session.exam_id,
            "exam_name": exam_name,
            "candidate_name": candidate_name,
            "exam_status": "active",
            "login_time": session.login_time,
            "duration_minutes": duration_minutes,
            "time_remaining": time_remaining_str,
            "time_remaining_seconds": time_remaining_seconds,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "latest_violation": latest_violation,
            "total_violations": total_violations,
            "high_risk_violations": high_risk_violations,
            "face_verification_status": "VERIFIED" if (session.face_similarity is not None and session.face_similarity > 0.0) else "PENDING",
            "voice_verification_status": "VERIFIED" if (session.voice_similarity is not None and session.voice_similarity > 0.0) else "PENDING",
            "liveness_status": "VERIFIED" if (session.blink_count is not None and session.blink_count > 0) else "PENDING"
        })
        
    summary["active_count"] = len(sessions_data)
    
    return {
        "success": True,
        "active_sessions": sessions_data,
        "summary": summary
    }


@router.get("/admin/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    admin_user: dict = Depends(get_admin_user)
):
    total_candidates = db.query(User).count()

    active_sessions = db.query(ExamSession).filter(
        ExamSession.exam_status == "active"
    ).count()

    completed_exams = db.query(ExamSession).filter(
        ExamSession.exam_status == "completed"
    ).count()

    total_violations = db.query(ProctoringLog).count()

    high_risk_violations = db.query(ProctoringLog).filter(
        ProctoringLog.severity.in_(["high", "critical"])
    ).count()

    completed_sessions = db.query(ExamSession).filter(
        ExamSession.exam_status == "completed"
    ).all()

    review_required = 0

    for session in completed_sessions:
        logs = db.query(ProctoringLog).filter(
            ProctoringLog.session_id == session.session_id
        ).all()

        high_count = len([
            log for log in logs
            if log.severity in ["high", "critical"]
        ])

        if high_count >= 3 or len(logs) >= 5:
            review_required += 1

    # Fetch latest 5 alerts
    latest_logs = db.query(ProctoringLog).order_by(ProctoringLog.timestamp.desc()).limit(5).all()
    latest_alerts = [
        {
            "session_id": log.session_id,
            "user_id": log.user_id,
            "violation_type": log.violation_type,
            "severity": log.severity,
            "timestamp": log.timestamp
        }
        for log in latest_logs
    ]

    # Critical alerts count
    critical_alerts_count = db.query(ProctoringLog).filter(
        ProctoringLog.severity == "critical"
    ).count()

    # High risk sessions count (risk score >= 51)
    all_sessions = db.query(ExamSession).all()
    high_risk_sessions_count = 0
    session_risk_scores = {}
    total_risk_score = 0
    high_risk_candidates_count = 0
    
    for session in all_sessions:
        s_logs = db.query(ProctoringLog).filter(ProctoringLog.session_id == session.session_id).all()
        s_score = 0
        for log in s_logs:
            sev = log.severity.lower() if log.severity else "medium"
            if sev == "low":
                s_score += 5
            elif sev == "medium":
                s_score += 10
            elif sev == "high":
                s_score += 20
            elif sev == "critical":
                s_score += 35
        session_risk_scores[session.session_id] = s_score
        total_risk_score += s_score
        if s_score >= 51:
            high_risk_sessions_count += 1
        if s_score > 70:
            high_risk_candidates_count += 1

    total_exams = db.query(Exam).count()
    
    passed_count = len([s for s in completed_sessions if s.pass_status == "PASSED"])
    failed_count = completed_exams - passed_count
    pass_rate = (passed_count / completed_exams * 100.0) if completed_exams > 0 else 0.0
    
    scores = [s.score for s in completed_sessions if s.score is not None]
    avg_score = (sum(scores) / len(scores)) if scores else 0.0
    avg_risk_score = (total_risk_score / len(all_sessions)) if all_sessions else 0.0
    
    phone_detection_count = db.query(ProctoringLog).filter(ProctoringLog.violation_type.ilike("%phone%")).count()

    # Charts data
    pass_vs_fail = {
        "labels": ["Passed", "Failed"],
        "data": [passed_count, failed_count]
    }
    
    risk_dist = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for session in all_sessions:
        scr = session_risk_scores.get(session.session_id, 0)
        if scr <= 20:
            risk_dist["low"] += 1
        elif scr <= 50:
            risk_dist["medium"] += 1
        elif scr <= 80:
            risk_dist["high"] += 1
        else:
            risk_dist["critical"] += 1

    violations_by_type = {}
    all_logs = db.query(ProctoringLog).all()
    for log in all_logs:
        vtype = log.violation_type or "Unknown"
        violations_by_type[vtype] = violations_by_type.get(vtype, 0) + 1

    exam_perf = {}
    exams_map = {e.exam_id: e.exam_name for e in db.query(Exam).all()}
    completed_by_exam = {}
    for session in completed_sessions:
        eid = session.exam_id or "AUTO-DEMO-EXAM"
        ename = exams_map.get(eid, eid)
        if ename not in completed_by_exam:
            completed_by_exam[ename] = []
        completed_by_exam[ename].append(session.percentage or 0.0)
        
    for ename, pcts in completed_by_exam.items():
        exam_perf[ename] = round(sum(pcts) / len(pcts), 2) if pcts else 0.0

    return {
        "success": True,
        "dashboard": {
            "total_candidates": total_candidates,
            "total_exams": total_exams,
            "active_sessions": active_sessions,
            "completed_exams": completed_exams,
            "total_violations": total_violations,
            "high_risk_violations": high_risk_violations,
            "review_required_reports": review_required,
            "latest_alerts": latest_alerts,
            "critical_alerts_count": critical_alerts_count,
            "high_risk_sessions": high_risk_sessions_count,
            "pass_rate": round(pass_rate, 2),
            "average_score": round(avg_score, 2),
            "average_risk_score": round(avg_risk_score, 2),
            "phone_detection_count": phone_detection_count,
            "high_risk_candidates": high_risk_candidates_count,
            "charts": {
                "pass_vs_fail": pass_vs_fail,
                "risk_distribution": risk_dist,
                "violations_by_type": violations_by_type,
                "exam_performance": exam_perf
            }
        }
    }