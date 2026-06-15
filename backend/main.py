from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.users import router as users_router
from routes.proctoring import router as proctoring_router
from database import engine, Base
from routes.exam import router as exam_router
from routes.biometrics import router as biometrics_router
from routes.exams import router as exams_router
from routes.hall_tickets import router as hall_tickets_router
from routes.questions import router as questions_router

from migrations.add_user_columns import run_migration
run_migration()

from migrations.add_exam_session_columns import run_exam_session_migration
run_exam_session_migration()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="OmniVerifyX AI POC")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(biometrics_router)
app.include_router(exam_router)
app.include_router(proctoring_router)
app.include_router(exams_router)
app.include_router(hall_tickets_router)
app.include_router(questions_router)

@app.get("/")
def home():
    return {"message": "OmniVerifyX AI POC Backend Running"}

@app.get("/health")
def health():
    return {"status": "ok", "backend": "running"}