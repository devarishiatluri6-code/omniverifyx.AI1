from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

from database import SessionLocal
from models import ExamQuestion, ExamAnswer, ExamSession

router = APIRouter(
    prefix="/questions",
    tags=["Questions & Answers"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class CreateQuestionRequest(BaseModel):
    exam_id: str
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str  # A, B, C, D
    marks: Optional[int] = 1


class AnswerSubmit(BaseModel):
    question_id: int
    selected_answer: Optional[str] = None


class SubmitExamRequest(BaseModel):
    session_id: str
    answers: List[AnswerSubmit]


def seed_demo_questions(exam_id: str, db: Session):
    demo_qs = [
        {
            "exam_id": exam_id,
            "question_text": "Which of the following is a subset of Machine Learning focused on neural networks with many layers?",
            "option_a": "Deep Learning",
            "option_b": "Expert Systems",
            "option_c": "Genetic Algorithms",
            "option_d": "Linear Regression",
            "correct_answer": "A",
            "marks": 1
        },
        {
            "exam_id": exam_id,
            "question_text": "What is the output of print(type([])) in Python?",
            "option_a": "<class 'tuple'>",
            "option_b": "<class 'list'>",
            "option_c": "<class 'dict'>",
            "option_d": "<class 'set'>",
            "correct_answer": "B",
            "marks": 1
        },
        {
            "exam_id": exam_id,
            "question_text": "Which HTTP method is typically used to update an existing resource on a server?",
            "option_a": "GET",
            "option_b": "POST",
            "option_c": "PUT",
            "option_d": "DELETE",
            "correct_answer": "C",
            "marks": 1
        },
        {
            "exam_id": exam_id,
            "question_text": "What does SQL stand for?",
            "option_a": "Standard Query Language",
            "option_b": "Structured Query Language",
            "option_c": "Sequential Query Language",
            "option_d": "Simple Query Language",
            "correct_answer": "B",
            "marks": 1
        },
        {
            "exam_id": exam_id,
            "question_text": "Which function is used in OpenCV to read an image file?",
            "option_a": "cv2.imread()",
            "option_b": "cv2.show()",
            "option_c": "cv2.write()",
            "option_d": "cv2.load()",
            "correct_answer": "A",
            "marks": 1
        },
        {
            "exam_id": exam_id,
            "question_text": "What does the abbreviation YOLO stand for in computer vision?",
            "option_a": "You Only Look Once",
            "option_b": "You Only Live Once",
            "option_c": "You Only Localize Objects",
            "option_d": "Yellow Object Localization Outline",
            "correct_answer": "A",
            "marks": 1
        },
        {
            "exam_id": exam_id,
            "question_text": "Which protocol is used to secure data transmitted over the internet?",
            "option_a": "HTTP",
            "option_b": "HTTPS",
            "option_c": "FTP",
            "option_d": "SMTP",
            "correct_answer": "B",
            "marks": 1
        },
        {
            "exam_id": exam_id,
            "question_text": "What type of attack involves overwhelming a server with false traffic to make it unavailable?",
            "option_a": "Phishing",
            "option_b": "Man-in-the-Middle",
            "option_c": "SQL Injection",
            "option_d": "DDoS",
            "correct_answer": "D",
            "marks": 1
        },
        {
            "exam_id": exam_id,
            "question_text": "Which keyword is used to define a function in Python?",
            "option_a": "func",
            "option_b": "def",
            "option_c": "function",
            "option_d": "define",
            "correct_answer": "B",
            "marks": 1
        },
        {
            "exam_id": exam_id,
            "question_text": "Which SQL clause is used to filter query results?",
            "option_a": "WHERE",
            "option_b": "GROUP BY",
            "option_c": "ORDER BY",
            "option_d": "HAVING",
            "correct_answer": "A",
            "marks": 1
        }
    ]

    for q in demo_qs:
        db_q = ExamQuestion(**q)
        db.add(db_q)
    db.commit()


@router.post("/create")
def create_question(req: CreateQuestionRequest, db: Session = Depends(get_db)):
    db_q = ExamQuestion(
        exam_id=req.exam_id,
        question_text=req.question_text,
        option_a=req.option_a,
        option_b=req.option_b,
        option_c=req.option_c,
        option_d=req.option_d,
        correct_answer=req.correct_answer,
        marks=req.marks
    )
    db.add(db_q)
    db.commit()
    db.refresh(db_q)

    return {
        "success": True,
        "message": "Question created successfully",
        "question_id": db_q.id
    }


@router.get("/exam/{exam_id}")
def get_exam_questions(exam_id: str, db: Session = Depends(get_db)):
    questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).all()

    if not questions:
        seed_demo_questions(exam_id, db)
        questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).all()

    return {
        "success": True,
        "questions": [
            {
                "id": q.id,
                "exam_id": q.exam_id,
                "question_text": q.question_text,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "marks": q.marks
            }
            for q in questions
        ]
    }


@router.post("/submit")
def submit_exam(req: SubmitExamRequest, db: Session = Depends(get_db)):
    session = db.query(ExamSession).filter(ExamSession.session_id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")

    # If exam session is already completed, return its saved result
    if session.exam_status == "completed":
        return {
            "score": session.score or 0,
            "total_questions": session.total_questions or 0,
            "percentage": session.percentage or 0.0,
            "status": session.pass_status or "FAILED"
        }

    # Fetch all questions for this exam to calculate scoring accurately
    exam_id = session.exam_id or "AUTO-DEMO-EXAM"
    questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).all()
    
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this exam")

    questions_map = {q.id: q for q in questions}

    total_questions = len(questions)
    correct_count = 0
    total_marks = sum(q.marks for q in questions)
    score_marks = 0

    submitted_answers_ids = set()

    for ans in req.answers:
        q = questions_map.get(ans.question_id)
        if not q:
            continue

        submitted_answers_ids.add(ans.question_id)

        is_correct = (ans.selected_answer == q.correct_answer)
        marks_awarded = q.marks if is_correct else 0

        if is_correct:
            correct_count += 1
            score_marks += q.marks

        # Store answer
        db_ans = ExamAnswer(
            session_id=req.session_id,
            question_id=ans.question_id,
            selected_answer=ans.selected_answer,
            is_correct=is_correct,
            marks_awarded=marks_awarded
        )
        db.add(db_ans)

    # For any questions not submitted, store a blank answer
    for q_id, q in questions_map.items():
        if q_id not in submitted_answers_ids:
            db_ans = ExamAnswer(
                session_id=req.session_id,
                question_id=q_id,
                selected_answer=None,
                is_correct=False,
                marks_awarded=0
            )
            db.add(db_ans)

    # Calculate percentage
    percentage = (correct_count / total_questions) * 100.0 if total_questions > 0 else 0.0

    # Calculate final risk score based on proctoring logs
    from models import ProctoringLog
    logs = db.query(ProctoringLog).filter(ProctoringLog.session_id == req.session_id).all()
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

    # Determine status based on percentage and risk_score
    if risk_score > 70:
        status = "REVIEW REQUIRED"
    elif percentage >= 60.0:
        status = "PASSED"
    else:
        status = "FAILED"

    # Update Exam Session
    logout_time = datetime.utcnow()
    duration_seconds = int((logout_time - session.login_time).total_seconds())

    session.logout_time = logout_time
    session.duration_seconds = duration_seconds
    session.exam_status = "completed"
    session.score = correct_count
    session.total_questions = total_questions
    session.percentage = round(percentage, 2)
    session.pass_status = status
    session.risk_score = risk_score

    db.commit()
    db.refresh(session)

    return {
        "score": correct_count,
        "total_questions": total_questions,
        "percentage": round(percentage, 2),
        "status": status
    }
