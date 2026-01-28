# from dotenv import load_dotenv
# import os
# from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# from passlib.context import CryptContext
# from datetime import datetime, timedelta
# from jose import jwt, JWTError
# from email.mime.text import MIMEText
# import random
# import string
# import secrets
# from typing import Optional
# import smtplib
# from fastapi import APIRouter, Depends, HTTPException
# from schemas.auth_schema import *
# from database import execute_query, execute_insert, execute_update

# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# security = HTTPBearer()

# auth_controller = APIRouter(prefix="/api/auth", tags=["Auth"])

# load_dotenv()

# # Configuration
# GMAIL_USER = os.getenv("GMAIL_USER")
# GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
# SECRET_KEY = os.getenv("SECRET_KEY")
# ALGORITHM = os.getenv("ALGORITHM", "HS256")
# ACCESS_TOKEN_EXPIRE_MINUTES = 30
# OTP_LENGTH = 6
# OTP_EXPIRY_MINUTES = 5
# RESET_TOKEN_EXPIRE_HOURS = 1

# def hash_password(password: str) -> str:
#     return pwd_context.hash(password)

# def verify_password(plain_password: str, hashed_password: str) -> bool:
#     return pwd_context.verify(plain_password, hashed_password)

# def create_access_token(data: dict) -> str:
#     to_encode = data.copy()
#     expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     to_encode.update({"exp": expire, "iat": datetime.utcnow()})
#     return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# def verify_token(token: str) -> Optional[dict]:
#     try:
#         return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#     except JWTError:
#         return None

# def generate_otp() -> str:
#     return ''.join(random.choices(string.digits, k=OTP_LENGTH))

# def generate_reset_token() -> str:
#     return secrets.token_urlsafe(32)

# def send_email(recipient: str, subject: str, body: str) -> bool:
#     try:
#         message = MIMEText(body)
#         message["Subject"] = subject
#         message["From"] = GMAIL_USER
#         message["To"] = recipient
        
#         with smtplib.SMTP("smtp.gmail.com", 587) as server:
#             server.starttls()
#             server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
#             server.sendmail(GMAIL_USER, recipient, message.as_string())
#         return True
#     except Exception as e:
#         print(f"❌ Email sending failed: {e}")
#         return False


# # ============= SIGNUP (STEP 1: Send OTP) =============
# @auth_controller.post("/signup")
# def signup(request: SignupRequest):
#     # Check if user exists
#     existing_user = execute_query(
#         "SELECT * FROM users WHERE email = %(email)s",
#         {"email": request.email},
#         fetch_one=True
#     )
    
#     if existing_user:
#         if existing_user['is_verified']:
#             raise HTTPException(status_code=400, detail="Email already registered and verified")
#         else:
#             # Update existing unverified user
#             execute_update(
#                 """UPDATE users 
#                    SET password_hash = %(password_hash)s, 
#                        full_name = %(full_name)s,
#                        updated_at = %(updated_at)s
#                    WHERE email = %(email)s""",
#                 {
#                     "password_hash": hash_password(request.password_hash),
#                     "full_name": request.full_name,
#                     "email": request.email,
#                     "updated_at": datetime.now()
#                 }
#             )
#             user_id = existing_user['id']
#     else:
#         # Create new user
#         result = execute_insert(
#             """INSERT INTO users (email, password_hash, full_name, is_active, is_verified, created_at)
#                VALUES (%(email)s, %(password_hash)s, %(full_name)s, %(is_active)s, %(is_verified)s, %(created_at)s)
#                RETURNING id, email""",
#             {
#                 "email": request.email,
#                 "password_hash": hash_password(request.password_hash),
#                 "full_name": request.full_name,
#                 "is_active": False,
#                 "is_verified": False,
#                 "created_at": datetime.now()
#             }
#         )
#         user_id = result['id']
    
#     # Generate OTP
#     otp = generate_otp()
#     expiry = datetime.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
#     # Save OTP
#     execute_insert(
#         """INSERT INTO otp (user_id, otp, otp_type, expiry_time, is_verified, created_at)
#            VALUES (%(user_id)s, %(otp)s, %(otp_type)s, %(expiry_time)s, %(is_verified)s, %(created_at)s)""",
#         {
#             "user_id": user_id,
#             "otp": otp,
#             "otp_type": "signup",
#             "expiry_time": expiry,
#             "is_verified": False,
#             "created_at": datetime.now()
#         },
#         return_id=False
#     )
    
#     # Send verification email
#     body = f"""Welcome to Our Platform!

# Your verification code is: {otp}

# This code will expire in {OTP_EXPIRY_MINUTES} minutes.

# Please verify your email to complete registration.

# If you didn't create this account, please ignore this email."""
    
#     email_sent = send_email(request.email, "Verify Your Email - OTP Code", body)
    
#     if not email_sent:
#         raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again.")
    
#     return {
#         "success": True,
#         "message": f"Verification code sent to {request.email}. Please check your email.",
#         "email": request.email,
#         "requires_verification": True
#     }


# # ============= VERIFY SIGNUP OTP (STEP 2) =============
# @auth_controller.post("/verify-signup")
# def verify_signup(request: VerifySignupRequest):
#     # Get user
#     user = execute_query(
#         "SELECT * FROM users WHERE email = %(email)s",
#         {"email": request.email},
#         fetch_one=True
#     )
    
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")
    
#     if user['is_verified']:
#         raise HTTPException(status_code=400, detail="Email already verified. Please login.")
    
#     # Get latest signup OTP
#     otp = execute_query(
#         """SELECT * FROM otp 
#            WHERE user_id = %(user_id)s AND otp_type = %(otp_type)s
#            ORDER BY created_at DESC LIMIT 1""",
#         {"user_id": user['id'], "otp_type": "signup"},
#         fetch_one=True
#     )
    
#     if not otp:
#         raise HTTPException(status_code=404, detail="No verification code found. Please request a new one.")
    
#     if datetime.now() > otp['expiry_time']:
#         raise HTTPException(status_code=400, detail="Verification code expired. Please request a new one.")
    
#     if otp['is_verified']:
#         raise HTTPException(status_code=400, detail="Code already used. Please request a new one.")
    
#     if otp['otp'] != request.otp:
#         raise HTTPException(status_code=400, detail="Invalid verification code")
    
#     # Activate user
#     execute_update(
#         """UPDATE otp SET is_verified = TRUE WHERE id = %(otp_id)s""",
#         {"otp_id": otp['id']}
#     )
    
#     execute_update(
#         """UPDATE users 
#            SET is_verified = TRUE, is_active = TRUE, last_login = %(last_login)s
#            WHERE id = %(user_id)s""",
#         {"user_id": user['id'], "last_login": datetime.now()}
#     )
    
#     # Generate access token
#     access_token = create_access_token({"user_id": user['id'], "email": user['email']})
    
#     return {
#         "success": True,
#         "message": "Email verified successfully! Registration complete.",
#         "access_token": access_token,
#         "user": {
#             "id": user['id'],
#             "email": user['email'],
#             "full_name": user['full_name'],
#             "is_verified": True
#         }
#     }


# # ============= LOGIN =============
# @auth_controller.post("/login")
# def login(request: LoginRequest):
#     # Fetch user
#     user = execute_query(
#         "SELECT * FROM users WHERE email = %s",
#         {request.email},
#         fetch_one=True
#     )

#     if not user or not user['password_hash']:
#         raise HTTPException(status_code=401, detail="Invalid email or password")

#     # Verify password
#     if not verify_password(request.password, user['password_hash']):
#         raise HTTPException(status_code=401, detail="Invalid email or password")

#     if not user['is_active']:
#         raise HTTPException(status_code=401, detail="Account is deactivated")
    
#     if not user['is_verified']:
#         raise HTTPException(status_code=401, detail="Email not verified. Please verify your email first.")

#     # Update last login
#     execute_update(
#         "UPDATE users SET last_login = %s WHERE id = %s",
#         {datetime.now(), user['id']}
#     )

#     # Generate token
#     access_token = create_access_token({"user_id": user['id'], "email": user['email']})

#     return {
#         "success": True,
#         "message": "Login successful",
#         "access_token": access_token,
#         "user": {
#             "id": user['id'],
#             "email": user['email'],
#             "full_name": user['full_name']
#         }
#     }


# # ============= SEND OTP (for OTP-based login) =============
# @auth_controller.post("/send-otp")
# def send_otp(request: OTPRequest):
#     user = execute_query(
#         "SELECT * FROM users WHERE email = %(email)s",
#         {"email": request.email},
#         fetch_one=True
#     )
    
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found. Please signup first.")
    
#     if not user['is_verified']:
#         raise HTTPException(
#             status_code=403,
#             detail="Email not verified. Please complete signup verification first."
#         )
    
#     # Generate OTP
#     otp = generate_otp()
#     expiry = datetime.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
#     execute_insert(
#         """INSERT INTO otp (user_id, otp, otp_type, expiry_time, is_verified, created_at)
#            VALUES (%(user_id)s, %(otp)s, %(otp_type)s, %(expiry_time)s, %(is_verified)s, %(created_at)s)""",
#         {
#             "user_id": user['id'],
#             "otp": otp,
#             "otp_type": "login",
#             "expiry_time": expiry,
#             "is_verified": False,
#             "created_at": datetime.now()
#         },
#         return_id=False
#     )
    
#     # Send email
#     body = f"""Your login OTP code is: {otp}

# This code will expire in {OTP_EXPIRY_MINUTES} minutes.

# If you didn't request this, please ignore this email."""
    
#     email_sent = send_email(request.email, "Your Login OTP Code", body)
    
#     if not email_sent:
#         raise HTTPException(status_code=500, detail="Failed to send OTP")
    
#     return {
#         "success": True,
#         "message": "OTP sent successfully to your email"
#     }


# # ============= VERIFY OTP (for OTP-based login) =============
# @auth_controller.post("/verify-otp")
# def verify_otp(request: VerifyOTPRequest):
#     user = execute_query(
#         "SELECT * FROM users WHERE email = %(email)s",
#         {"email": request.email},
#         fetch_one=True
#     )
    
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")
    
#     if not user['is_verified']:
#         raise HTTPException(status_code=403, detail="Email not verified")
    
#     # Get latest login OTP
#     otp = execute_query(
#         """SELECT * FROM otp 
#            WHERE user_id = %(user_id)s AND otp_type = %(otp_type)s
#            ORDER BY created_at DESC LIMIT 1""",
#         {"user_id": user['id'], "otp_type": "login"},
#         fetch_one=True
#     )
    
#     if not otp:
#         raise HTTPException(status_code=404, detail="No OTP found. Please request a new OTP")
    
#     if datetime.now() > otp['expiry_time']:
#         raise HTTPException(status_code=400, detail="OTP expired. Please request a new OTP")
    
#     if otp['is_verified']:
#         raise HTTPException(status_code=400, detail="OTP already used. Please request a new OTP")
    
#     if otp['otp'] != request.otp:
#         raise HTTPException(status_code=400, detail="Invalid OTP")
    
#     # Mark as verified
#     execute_update(
#         "UPDATE otp SET is_verified = TRUE WHERE id = %(otp_id)s",
#         {"otp_id": otp['id']}
#     )
    
#     execute_update(
#         "UPDATE users SET last_login = %(last_login)s WHERE id = %(user_id)s",
#         {"user_id": user['id'], "last_login": datetime.now()}
#     )
    
#     # Generate token
#     access_token = create_access_token({"user_id": user['id'], "email": user['email']})
    
#     return {
#         "success": True,
#         "message": "Login successful",
#         "access_token": access_token,
#         "user": {
#             "id": user['id'],
#             "email": user['email'],
#             "full_name": user['full_name']
#         }
#     }


# # ============= FORGOT PASSWORD =============
# @auth_controller.post("/forgot-password")
# def forgot_password(request: ForgotPasswordRequest):
#     user = execute_query(
#         "SELECT * FROM users WHERE email = %(email)s",
#         {"email": request.email},
#         fetch_one=True
#     )
    
#     if not user:
#         return {
#             "success": True,
#             "message": "If email exists, password reset instructions have been sent"
#         }
    
#     # Generate reset token
#     reset_token = generate_reset_token()
#     expiry = datetime.now() + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
    
#     execute_insert(
#         """INSERT INTO reset_tokens (user_id, token, expiry_time, is_used, created_at)
#            VALUES (%(user_id)s, %(token)s, %(expiry_time)s, %(is_used)s, %(created_at)s)""",
#         {
#             "user_id": user['id'],
#             "token": reset_token,
#             "expiry_time": expiry,
#             "is_used": False,
#             "created_at": datetime.now()
#         },
#         return_id=False
#     )
    
#     # Send email
#     body = f"""Password Reset Request

# Your password reset token: {reset_token}

# This token will expire in {RESET_TOKEN_EXPIRE_HOURS} hour(s).

# Use this token with the reset-password API endpoint.

# If you didn't request this, please ignore this email."""
    
#     send_email(request.email, "Password Reset Request", body)
    
#     return {
#         "success": True,
#         "message": "Password reset instructions sent to your email"
#     }


# # ============= RESET PASSWORD =============
# @auth_controller.post("/reset-password")
# def reset_password(request: ResetPasswordRequest):
#     user = execute_query(
#         "SELECT * FROM users WHERE email = %(email)s",
#         {"email": request.email},
#         fetch_one=True
#     )
    
#     if not user:
#         raise HTTPException(status_code=400, detail="Invalid reset token")
    
#     token = execute_query(
#         """SELECT * FROM reset_tokens 
#            WHERE user_id = %(user_id)s AND token = %(token)s
#            ORDER BY created_at DESC LIMIT 1""",
#         {"user_id": user['id'], "token": request.reset_token},
#         fetch_one=True
#     )
    
#     if not token:
#         raise HTTPException(status_code=400, detail="Invalid reset token")
    
#     if datetime.now() > token['expiry_time']:
#         raise HTTPException(status_code=400, detail="Reset token has expired")
    
#     if token['is_used']:
#         raise HTTPException(status_code=400, detail="Reset token already used")
    
#     # Update password
#     execute_update(
#         "UPDATE users SET password_hash = %(password_hash)s WHERE id = %(user_id)s",
#         {"password_hash": hash_password(request.new_password_hash), "user_id": user['id']}
#     )
    
#     execute_update(
#         "UPDATE reset_tokens SET is_used = TRUE WHERE id = %(token_id)s",
#         {"token_id": token['id']}
#     )
    
#     return {
#         "success": True,
#         "message": "Password reset successful"
#     }


# # ============= RESEND VERIFICATION CODE =============
# @auth_controller.post("/resend-verification")
# def resend_verification(request: OTPRequest):
#     user = execute_query(
#         "SELECT * FROM users WHERE email = %(email)s",
#         {"email": request.email},
#         fetch_one=True
#     )
    
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")
    
#     if user['is_verified']:
#         raise HTTPException(status_code=400, detail="Email already verified. Please login.")
    
#     # Generate new OTP
#     otp = generate_otp()
#     expiry = datetime.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
#     execute_insert(
#         """INSERT INTO otp (user_id, otp, otp_type, expiry_time, is_verified, created_at)
#            VALUES (%(user_id)s, %(otp)s, %(otp_type)s, %(expiry_time)s, %(is_verified)s, %(created_at)s)""",
#         {
#             "user_id": user['id'],
#             "otp": otp,
#             "otp_type": "signup",
#             "expiry_time": expiry,
#             "is_verified": False,
#             "created_at": datetime.now()
#         },
#         return_id=False
#     )
    
#     # Send email
#     body = f"""Your new verification code is: {otp}

# This code will expire in {OTP_EXPIRY_MINUTES} minutes.

# If you didn't request this, please ignore this email."""
    
#     email_sent = send_email(request.email, "New Verification Code", body)
    
#     if not email_sent:
#         raise HTTPException(status_code=500, detail="Failed to send email")
    
#     return {
#         "success": True,
#         "message": "New verification code sent to your email"
#     }


# ============================================================================
# FILE: controllers/auth_controller.py
# ============================================================================
from fastapi import APIRouter, Depends, status
from schemas.auth_schemas import (
    SignupRequest, LoginRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    ChangePasswordRequest
)
from services.auth_service import AuthService
from utils.dependencies import get_current_user

auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@auth_router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(request: SignupRequest):
    """Register a new user"""
    return AuthService.signup(request)

@auth_router.post("/login")
def login(request: LoginRequest):
    """User login"""
    return AuthService.login(request)

@auth_router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    """Request password reset (Not implemented yet)"""
    return AuthService.forgot_password(request.email)

@auth_router.post("/reset-password")
def reset_password(request: ResetPasswordRequest):
    """Reset password with token (Not implemented yet)"""
    return AuthService.reset_password(request.token, request.new_password)

@auth_router.post("/change-password")
def change_password(request: ChangePasswordRequest, current_user = Depends(get_current_user)):
    """Change password for authenticated user"""
    return AuthService.change_password(current_user['id'], request.old_password, request.new_password)

@auth_router.get("/me")
def get_current_user_info(current_user = Depends(get_current_user)):
    """Get current user information"""
    return {
        "success": True,
        "user": {
            "id": current_user['id'],
            "email": current_user['email'],
            "first_name": current_user['first_name'],
            "last_name": current_user['last_name'],
            "phone": current_user['phone'],
            "date_of_birth": current_user['date_of_birth'],
            "is_active": current_user['is_active'],
            "last_login": current_user['last_login'],
            "created_at": current_user['created_at']
        }
    }

@auth_router.post("/logout")
def logout(current_user = Depends(get_current_user)):
    """Logout user (client should delete token)"""
    return {
        "success": True,
        "message": "Logged out successfully"
    }
