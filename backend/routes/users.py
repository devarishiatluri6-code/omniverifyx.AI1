from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session
from typing import List

from database import SessionLocal
from models import User

router = APIRouter(prefix="/users", tags=["Users"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/register")
def register_user(user: dict, db: Session = Depends(get_db)):
    new_user = User(
        name=user.get("name"),
        email=user.get("email"),
        role=user.get("role")
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User saved successfully",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role
        }
    }


@router.get("/")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()

    from ai.document_rules import get_required_documents
    from models import CandidateDocument

    result = []
    for user in users:
        category = user.category or "OC"
        annual_income = user.annual_income or 0.0
        required_docs = get_required_documents(category, annual_income)
        uploaded_docs = [d.strip() for d in user.uploaded_documents.split(",") if d.strip()] if user.uploaded_documents else []
        missing_docs = [doc for doc in required_docs if doc not in uploaded_docs]

        # Query CandidateDocument
        doc_entry = db.query(CandidateDocument).filter(CandidateDocument.user_id == user.user_id).first()
        extracted_aadhaar = ""
        name_match_score = None
        aadhaar_match = "NOT_PROVIDED"
        aadhaar_status = "NOT_UPLOADED"
        extracted_dob = ""
        dob_match = "NOT_FOUND"
        dob_verification_status = "NOT_UPLOADED"
        
        caste_details = None
        income_details = None

        if doc_entry:
            extracted_aadhaar = doc_entry.extracted_aadhaar_number or ""
            name_match_score = doc_entry.name_match_score
            aadhaar_match = doc_entry.aadhaar_match or "NOT_PROVIDED"
            aadhaar_status = doc_entry.verification_status or "PENDING"
            extracted_dob = doc_entry.extracted_dob or ""
            dob_match = doc_entry.dob_match or "NOT_FOUND"
            dob_verification_status = "PASS" if doc_entry.dob_match == "MATCH" else ("MANUAL_REVIEW" if doc_entry.dob_match in ["YEAR_ONLY_MATCH", "NOT_FOUND"] else "FAIL")
            
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

        result.append({
            "id": user.id,
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "category": category,
            "annual_income": annual_income,
            "candidate_aadhaar_number": user.candidate_aadhaar_number or "",
            "required_documents": required_docs,
            "uploaded_documents": uploaded_docs,
            "missing_documents": missing_docs,
            "status": user.document_verification_status or "PENDING_DOCUMENTS",
            
            # Aadhaar OCR fields
            "extracted_aadhaar_number": extracted_aadhaar,
            "name_match_score": name_match_score,
            "aadhaar_match": aadhaar_match,
            "aadhaar_verification_status": aadhaar_status,
            "submitted_dob": user.date_of_birth or "",
            "extracted_dob": extracted_dob,
            "dob_match": dob_match,
            "dob_verification_status": dob_verification_status,
            
            # Caste/Income details
            "caste_details": caste_details,
            "income_details": income_details
        })
    return result


@router.post("/verify-documents")
def verify_documents(
    user_id: str = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    import os
    import shutil
    from ai.ocr_verification import verify_aadhaar_card, verify_caste_certificate, verify_income_certificate
    from models import CandidateDocument

    user = db.query(User).filter((User.user_id == user_id) | (User.candidate_uuid == user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Candidate not found")

    category = user.category or "OC"
    annual_income = user.annual_income or 0.0

    from ai.document_rules import get_required_documents
    required_docs = get_required_documents(category, annual_income)

    uploaded_docs = []
    ocr_failed = False
    aadhaar_result = None
    caste_result = None
    income_result = None

    for file in files:
        filename = file.filename.lower()
        if "fail" in filename or "corrupt" in filename:
            ocr_failed = True
            
        if "aadhaar" in filename or "student" in filename or "id" in filename:
            if "Aadhaar" not in uploaded_docs:
                uploaded_docs.append("Aadhaar")
            
            # Save Aadhaar file and verify
            ext = os.path.splitext(file.filename)[1] or ".jpg"
            aadhaar_dir = "uploads"
            os.makedirs(aadhaar_dir, exist_ok=True)
            aadhaar_path = os.path.join(aadhaar_dir, f"aadhaar_{user.user_id}{ext}")
            with open(aadhaar_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            aadhaar_result = verify_aadhaar_card(aadhaar_path, user.name, user.candidate_aadhaar_number, user.date_of_birth)
            
            # Save to CandidateDocument table
            doc_entry = db.query(CandidateDocument).filter(CandidateDocument.user_id == user.user_id).first()
            if not doc_entry:
                doc_entry = CandidateDocument(user_id=user.user_id)
                db.add(doc_entry)
                
            doc_entry.extracted_aadhaar_number = aadhaar_result["extracted_aadhaar_number"]
            doc_entry.name_match_score = aadhaar_result["name_match_score"]
            doc_entry.aadhaar_match = aadhaar_result["aadhaar_match"]
            doc_entry.verification_status = aadhaar_result["verification_status"]
            doc_entry.extracted_dob = aadhaar_result["extracted_dob"]
            doc_entry.dob_match = aadhaar_result["dob_match"]
            doc_entry.extracted_text = aadhaar_result.get("extracted_text", "")
            db.commit()
            
        elif "caste" in filename:
            if "Caste Certificate" not in uploaded_docs:
                uploaded_docs.append("Caste Certificate")
                
            ext = os.path.splitext(file.filename)[1] or ".jpg"
            caste_dir = "uploads"
            os.makedirs(caste_dir, exist_ok=True)
            caste_path = os.path.join(caste_dir, f"caste_{user.user_id}{ext}")
            with open(caste_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            caste_result = verify_caste_certificate(caste_path, user.name, user.category)
            
            doc_entry = db.query(CandidateDocument).filter(CandidateDocument.user_id == user.user_id).first()
            if not doc_entry:
                doc_entry = CandidateDocument(user_id=user.user_id)
                db.add(doc_entry)
                
            doc_entry.caste_extracted_name = caste_result["extracted_name"]
            doc_entry.caste_extracted_category = caste_result["extracted_category"]
            doc_entry.caste_extracted_cert_number = caste_result["extracted_cert_number"]
            doc_entry.caste_name_match_score = caste_result["name_match_score"]
            doc_entry.caste_category_match = "MATCH" if caste_result["category_match"] else "MISMATCH"
            doc_entry.caste_verification_status = caste_result["verification_status"]
            db.commit()
            
        elif "income" in filename:
            if "Income Certificate" not in uploaded_docs:
                uploaded_docs.append("Income Certificate")
                
            ext = os.path.splitext(file.filename)[1] or ".jpg"
            income_dir = "uploads"
            os.makedirs(income_dir, exist_ok=True)
            income_path = os.path.join(income_dir, f"income_{user.user_id}{ext}")
            with open(income_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            income_result = verify_income_certificate(income_path, user.name, user.annual_income)
            
            doc_entry = db.query(CandidateDocument).filter(CandidateDocument.user_id == user.user_id).first()
            if not doc_entry:
                doc_entry = CandidateDocument(user_id=user.user_id)
                db.add(doc_entry)
                
            doc_entry.income_extracted_name = income_result["extracted_name"]
            doc_entry.income_extracted_amount = income_result["extracted_income"]
            doc_entry.income_name_match_score = income_result["name_match_score"]
            doc_entry.income_amount_match = "MATCH" if income_result["income_match"] else "MISMATCH"
            doc_entry.income_verification_status = income_result["verification_status"]
            db.commit()

    # Merge with previously uploaded documents to allow incremental uploads
    existing_uploaded = [d.strip() for d in user.uploaded_documents.split(",") if d.strip()] if user.uploaded_documents else []
    for doc in uploaded_docs:
        if doc not in existing_uploaded:
            existing_uploaded.append(doc)
    
    user.uploaded_documents = ",".join(existing_uploaded)

    # Calculate missing documents
    missing_docs = [doc for doc in required_docs if doc not in existing_uploaded]

    # Calculate overall status based on rules
    doc_entry = db.query(CandidateDocument).filter(CandidateDocument.user_id == user.user_id).first()
    
    if missing_docs:
        status = "PENDING_DOCUMENTS"
    else:
        # All required docs uploaded
        has_fail = False
        has_manual = False
        
        if doc_entry and doc_entry.verification_status:
            if doc_entry.verification_status == "FAIL":
                has_fail = True
            elif doc_entry.verification_status == "MANUAL_REVIEW":
                has_manual = True
                
        if "Caste Certificate" in required_docs and doc_entry:
            if doc_entry.caste_verification_status == "FAIL":
                has_fail = True
            elif doc_entry.caste_verification_status == "MANUAL_REVIEW":
                has_manual = True
                
        if "Income Certificate" in required_docs and doc_entry:
            if doc_entry.income_verification_status == "FAIL":
                has_fail = True
            elif doc_entry.income_verification_status == "MANUAL_REVIEW":
                has_manual = True
                
        if ocr_failed or has_fail:
            status = "OCR_FAILED"
        elif has_manual:
            status = "MANUAL_REVIEW"
        else:
            status = "VERIFIED"

    user.document_verification_status = status
    db.commit()
    db.refresh(user)

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
        
    # Build detailed response
    response_data = {
        "success": True,
        "status": status,
        "required_documents": required_docs,
        "uploaded_documents": existing_uploaded,
        "missing_documents": missing_docs,
        "extractedText": "\n---\n".join(extracted_texts),
        "extractedFields": extracted_fields,
        "verificationStatus": status,
        "message": "; ".join(messages) if messages else f"OCR verification completed with status: {status}"
    }

    if aadhaar_result:
        response_data["aadhaar_details"] = {
            "success": True,
            "document_type": "aadhaar",
            "extracted_name": aadhaar_result["extracted_name"],
            "extracted_aadhaar_number": aadhaar_result["extracted_aadhaar_number"],
            "name_match_score": aadhaar_result["name_match_score"],
            "aadhaar_match": True if aadhaar_result["aadhaar_match"] in ["PASS", "MATCH"] else False,
            "verification_status": aadhaar_result["verification_status"],
            "submitted_dob": user.date_of_birth or "",
            "extracted_dob": aadhaar_result["extracted_dob"],
            "dob_match": True if aadhaar_result["dob_match"] in ["PASS", "MATCH", "YEAR_ONLY_MATCH", "MANUAL_REVIEW"] else False,
            "dob_verification_status": "PASS" if aadhaar_result["dob_match"] == "PASS" else ("MANUAL_REVIEW" if aadhaar_result["dob_match"] in ["YEAR_ONLY_MATCH", "MANUAL_REVIEW", "NOT_FOUND"] else "FAIL"),
            "extracted_text": aadhaar_result.get("extracted_text", "")
        }

    if caste_result:
        response_data["caste_details"] = caste_result

    if income_result:
        response_data["income_details"] = income_result

    return response_data
