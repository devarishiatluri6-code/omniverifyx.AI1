import os
import hmac
import hashlib
import base64
import json
import time
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from dotenv import load_dotenv

from database import SessionLocal
from models import User

load_dotenv()

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Secure JWT configurations
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "omniverifyx_secret_default_key_123456")
security = HTTPBearer()

class LoginRequest(BaseModel):
    email: str
    password: str

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def create_jwt(payload: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(payload).encode('utf-8'))
    
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(JWT_SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def verify_jwt(token: str) -> dict:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        header_b64, payload_b64, signature_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        
        expected_signature = hmac.new(JWT_SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
        expected_signature_b64 = base64url_encode(expected_signature)
        
        if not hmac.compare_digest(signature_b64, expected_signature_b64):
            return None
            
        payload = json.loads(base64url_decode(payload_b64).decode('utf-8'))
        
        if "exp" in payload and payload["exp"] < time.time():
            return None
            
        return payload
    except Exception:
        return None

def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_jwt(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token or unauthorized access"
        )
    
    email = payload.get("sub")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or user.role not in ["admin", "candidate", "student"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token or unauthorized access"
            )
    finally:
        db.close()
        
    return payload

@router.post("/login")
def auth_login(payload: LoginRequest):
    import logging
    logger = logging.getLogger("auth")
    
    email = payload.email
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            logger.info(f"User not found: {email}")
            print(f"[AUTH AUDIT] User not found: {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Admin Credentials"
            )
        
        logger.info(f"User found: {email}")
        print(f"[AUTH AUDIT] User found: {email}")
        
        # Verify role is authorized
        if user.role not in ["admin", "candidate", "student"]:
            logger.info(f"User {email} has role {user.role}, not authorized")
            print(f"[AUTH AUDIT] User {email} has role {user.role}, not authorized")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Credentials"
            )
            
        # Verify hashed password using native bcrypt
        if not user.password_hash:
            logger.info(f"Password hash missing for user {email}")
            print(f"[AUTH AUDIT] Password hash missing for user {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Credentials"
            )
            
        pw_bytes = payload.password.encode('utf-8')
        hash_bytes = user.password_hash.encode('utf-8')
        
        if not bcrypt.checkpw(pw_bytes, hash_bytes):
            logger.info(f"Password match result: Failure for user {email}")
            print(f"[AUTH AUDIT] Password match result: Failure for user {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Credentials"
            )
            
        logger.info(f"Password match result: Success for user {email}")
        print(f"[AUTH AUDIT] Password match result: Success for user {email}")
        
        # Create JWT valid for 24 hours
        exp_time = time.time() + 86400
        token_payload = {
            "sub": user.email,
            "role": user.role,
            "exp": exp_time
        }
        token = create_jwt(token_payload)
        logger.info(f"JWT generated for user {email}")
        print(f"[AUTH AUDIT] JWT generated for user {email}")
        
        logger.info(f"Redirect executed: Redirecting user {email} to /dashboard")
        print(f"[AUTH AUDIT] Redirect executed: Redirecting user {email} to /dashboard")
        
        return {
            "success": True,
            "token": token,
            "role": user.role,
            "email": user.email
        }
    finally:
        db.close()

@router.get("/me")
def auth_me(admin_user: dict = Depends(get_admin_user)):
    return {
        "success": True,
        "email": admin_user.get("sub"),
        "role": admin_user.get("role")
    }
