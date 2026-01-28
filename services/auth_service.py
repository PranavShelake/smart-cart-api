
# # ============================================================================
# # FILE: services/auth_service.py
# # ============================================================================
# from datetime import datetime, timedelta
# from typing import Optional, Dict
# from fastapi import HTTPException, status
# from database import execute_query, execute_update, execute_insert_returning
# from utils.security import hash_password, verify_password, create_access_token, generate_verification_token
# from services.email_service import send_verification_email, send_password_reset_email, send_welcome_email
# from schemas.auth_schemas import SignupRequest, LoginRequest

# class AuthService:
    
#     @staticmethod
#     def signup(signup_data: SignupRequest) -> Dict:
#         """Register new user"""
#         # Check if email exists
#         existing_user = execute_query(
#             "SELECT id FROM users WHERE email = %s",
#             (signup_data.email,),
#             fetch_one=True
#         )
        
#         if existing_user:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Email already registered"
#             )
        
#         # Hash password
#         password_hash = hash_password(signup_data.password)
        
#         # Create user
#         new_user = execute_insert_returning(
#             """
#             INSERT INTO users (email, password_hash, first_name, last_name, phone, date_of_birth, is_active, soft_delete)
#             VALUES (%s, %s, %s, %s, %s, %s, TRUE, FALSE)
#             RETURNING id, email, first_name, last_name, created_at
#             """,
#             (signup_data.email, password_hash, signup_data.first_name, signup_data.last_name, 
#              signup_data.phone, signup_data.date_of_birth)
#         )
        
#         if not new_user:
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail="Failed to create user"
#             )
        
#         # Assign default user role
#         default_role = execute_query(
#             "SELECT id FROM roles WHERE name = %s",
#             ("user",),
#             fetch_one=True
#         )
        
#         if default_role:
#             execute_update(
#                 "INSERT INTO user_role (user_id, role_id, is_active) VALUES (%s, %s, TRUE)",
#                 (new_user['id'], default_role['id'])
#             )
        
#         # Generate verification token
#         token = generate_verification_token()
#         expires_at = datetime.now() + timedelta(hours=24)
        
#         execute_update(
#             """
#             INSERT INTO email_verification_tokens (user_id, token, expires_at, is_used)
#             VALUES (%s, %s, %s, FALSE)
#             """,
#             (new_user['id'], token, expires_at)
#         )
        
#         # Send verification email
#         send_verification_email(new_user['email'], token, new_user['first_name'])
        
#         return {
#             "success": True,
#             "message": "Registration successful! Please check your email to verify your account.",
#             "user": {
#                 "id": new_user['id'],
#                 "email": new_user['email'],
#                 "first_name": new_user['first_name'],
#                 "last_name": new_user['last_name']
#             }
#         }
    
#     @staticmethod
#     def login(login_data: LoginRequest) -> Dict:
#         """User login"""
#         # Fetch user
#         user = execute_query(
#             "SELECT * FROM users WHERE email = %s AND soft_delete = FALSE",
#             (login_data.email,),
#             fetch_one=True
#         )
        
#         if not user:
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="Invalid email or password"
#             )
        
#         # Verify password
#         if not verify_password(login_data.password, user['password_hash']):
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="Invalid email or password"
#             )
        
#         # Check if account is active
#         if not user['is_active']:
#             raise HTTPException(
#                 status_code=status.HTTP_403_FORBIDDEN,
#                 detail="Account is deactivated. Please contact support."
#             )
        
#         # Check email verification
#         is_verified = execute_query(
#             """
#             SELECT EXISTS(
#                 SELECT 1 FROM email_verification_tokens 
#                 WHERE user_id = %s AND is_used = TRUE
#             ) as verified
#             """,
#             (user['id'],),
#             fetch_one=True
#         )
        
#         if not is_verified or not is_verified['verified']:
#             raise HTTPException(
#                 status_code=status.HTTP_403_FORBIDDEN,
#                 detail="Please verify your email first. Check your inbox for verification link."
#             )
        
#         # Update last login
#         execute_update(
#             "UPDATE users SET last_login = %s, updated_at = %s WHERE id = %s",
#             (datetime.now(), datetime.now(), user['id'])
#         )
        
#         # Get user roles
#         roles = execute_query(
#             """
#             SELECT r.name FROM roles r
#             INNER JOIN user_role ur ON r.id = ur.role_id
#             WHERE ur.user_id = %s AND ur.is_active = TRUE
#             """,
#             (user['id'],)
#         )
        
#         role_names = [role['name'] for role in roles] if roles else []
        
#         # Generate token
#         access_token = create_access_token({
#             "user_id": user['id'],
#             "email": user['email'],
#             "roles": role_names
#         })
        
#         return {
#             "success": True,
#             "message": "Login successful",
#             "access_token": access_token,
#             "token_type": "bearer",
#             "user": {
#                 "id": user['id'],
#                 "email": user['email'],
#                 "first_name": user['first_name'],
#                 "last_name": user['last_name'],
#                 "phone": user['phone'],
#                 "roles": role_names
#             }
#         }
    
#     @staticmethod
#     def verify_email(token: str) -> Dict:
#         """Verify user email"""
#         # Find token
#         token_record = execute_query(
#             """
#             SELECT * FROM email_verification_tokens 
#             WHERE token = %s AND is_used = FALSE
#             """,
#             (token,),
#             fetch_one=True
#         )
        
#         if not token_record:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Invalid or already used verification token"
#             )
        
#         # Check expiration
#         if datetime.now() > token_record['expires_at']:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Verification token has expired. Please request a new one."
#             )
        
#         # Mark token as used
#         execute_update(
#             "UPDATE email_verification_tokens SET is_used = TRUE WHERE id = %s",
#             (token_record['id'],)
#         )
        
#         # Get user details
#         user = execute_query(
#             "SELECT email, first_name FROM users WHERE id = %s",
#             (token_record['user_id'],),
#             fetch_one=True
#         )
        
#         # Send welcome email
#         if user:
#             send_welcome_email(user['email'], user['first_name'])
        
#         return {
#             "success": True,
#             "message": "Email verified successfully! You can now log in."
#         }
    
#     @staticmethod
#     def resend_verification(email: str) -> Dict:
#         """Resend verification email"""
#         user = execute_query(
#             "SELECT * FROM users WHERE email = %s AND soft_delete = FALSE",
#             (email,),
#             fetch_one=True
#         )
        
#         if not user:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="User not found"
#             )
        
#         # Check if already verified
#         is_verified = execute_query(
#             """
#             SELECT EXISTS(
#                 SELECT 1 FROM email_verification_tokens 
#                 WHERE user_id = %s AND is_used = TRUE
#             ) as verified
#             """,
#             (user['id'],),
#             fetch_one=True
#         )
        
#         if is_verified and is_verified['verified']:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Email is already verified"
#             )
        
#         # Invalidate old tokens
#         execute_update(
#             "UPDATE email_verification_tokens SET is_used = TRUE WHERE user_id = %s",
#             (user['id'],)
#         )
        
#         # Generate new token
#         token = generate_verification_token()
#         expires_at = datetime.now() + timedelta(hours=24)
        
#         execute_update(
#             """
#             INSERT INTO email_verification_tokens (user_id, token, expires_at, is_used)
#             VALUES (%s, %s, %s, FALSE)
#             """,
#             (user['id'], token, expires_at)
#         )
        
#         # Send email
#         send_verification_email(user['email'], token, user['first_name'])
        
#         return {
#             "success": True,
#             "message": "Verification email sent! Please check your inbox."
#         }
    
#     @staticmethod
#     def forgot_password(email: str) -> Dict:
#         """Request password reset"""
#         user = execute_query(
#             "SELECT * FROM users WHERE email = %s AND soft_delete = FALSE",
#             (email,),
#             fetch_one=True
#         )
        
#         # Always return success to prevent email enumeration
#         if not user:
#             return {
#                 "success": True,
#                 "message": "If your email is registered, you will receive a password reset link."
#             }
        
#         # Invalidate old tokens
#         execute_update(
#             "UPDATE password_reset_tokens SET is_used = TRUE WHERE user_id = %s",
#             (user['id'],)
#         )
        
#         # Generate reset token
#         token = generate_verification_token()
#         expires_at = datetime.now() + timedelta(hours=1)
        
#         execute_update(
#             """
#             INSERT INTO password_reset_tokens (user_id, token, expires_at, is_used)
#             VALUES (%s, %s, %s, FALSE)
#             """,
#             (user['id'], token, expires_at)
#         )
        
#         # Send email
#         send_password_reset_email(user['email'], token, user['first_name'])
        
#         return {
#             "success": True,
#             "message": "If your email is registered, you will receive a password reset link."
#         }
    
#     @staticmethod
#     def reset_password(token: str, new_password: str) -> Dict:
#         """Reset password using token"""
#         # Find token
#         token_record = execute_query(
#             """
#             SELECT * FROM password_reset_tokens 
#             WHERE token = %s AND is_used = FALSE
#             """,
#             (token,),
#             fetch_one=True
#         )
        
#         if not token_record:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Invalid or already used reset token"
#             )
        
#         # Check expiration
#         if datetime.now() > token_record['expires_at']:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Reset token has expired. Please request a new one."
#             )
        
#         # Hash new password
#         password_hash = hash_password(new_password)
        
#         # Update password
#         execute_update(
#             "UPDATE users SET password_hash = %s, updated_at = %s WHERE id = %s",
#             (password_hash, datetime.now(), token_record['user_id'])
#         )
        
#         # Mark token as used
#         execute_update(
#             "UPDATE password_reset_tokens SET is_used = TRUE WHERE id = %s",
#             (token_record['id'],)
#         )
        
#         return {
#             "success": True,
#             "message": "Password reset successfully! You can now log in with your new password."
#         }
    
#     @staticmethod
#     def change_password(user_id: int, old_password: str, new_password: str) -> Dict:
#         """Change password for authenticated user"""
#         user = execute_query(
#             "SELECT password_hash FROM users WHERE id = %s AND soft_delete = FALSE",
#             (user_id,),
#             fetch_one=True
#         )
        
#         if not user:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="User not found"
#             )
        
#         # Verify old password
#         if not verify_password(old_password, user['password_hash']):
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail="Current password is incorrect"
#             )
        
#         # Hash new password
#         password_hash = hash_password(new_password)
        
#         # Update password
#         execute_update(
#             "UPDATE users SET password_hash = %s, updated_at = %s WHERE id = %s",
#             (password_hash, datetime.now(), user_id)
#         )
        
#         return {
#             "success": True,
#             "message": "Password changed successfully!"
#         }




# ============================================================================
# FILE: services/auth_service.py
# ============================================================================
from datetime import datetime, timedelta
from typing import Dict
from fastapi import HTTPException, status
from database import execute_query, execute_update, execute_insert_returning
from utils.security import hash_password, verify_password, create_access_token, generate_verification_token
from schemas.auth_schemas import SignupRequest, LoginRequest

class AuthService:
    
    @staticmethod
    def signup(signup_data: SignupRequest) -> Dict:
        """Register new user"""
        # Check if email exists
        existing_user = execute_query(
            "SELECT id FROM users WHERE email = %s",
            (signup_data.email,),
            fetch_one=True
        )
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        password_hash = hash_password(signup_data.password)
        
        # Create user
        new_user = execute_insert_returning(
            """
            INSERT INTO users (email, password_hash, first_name, last_name, phone, date_of_birth, is_active, soft_delete)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE, FALSE)
            RETURNING id, email, first_name, last_name, created_at
            """,
            (signup_data.email, password_hash, signup_data.first_name, signup_data.last_name, 
             signup_data.phone, signup_data.date_of_birth)
        )
        
        if not new_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        # Assign default user role
        default_role = execute_query(
            "SELECT id FROM roles WHERE name = %s",
            ("user",),
            fetch_one=True
        )
        
        if default_role:
            execute_update(
                "INSERT INTO user_role (user_id, role_id, is_active) VALUES (%s, %s, TRUE)",
                (new_user['id'], default_role['id'])
            )
        
        # TODO: Email verification will be implemented later
        # When implementing:
        # 1. Generate verification token
        # 2. Store token in email_verification_tokens table
        # 3. Send OTP/verification email
        
        return {
            "success": True,
            "message": "Registration successful! You can now log in.",
            "user": {
                "id": new_user['id'],
                "email": new_user['email'],
                "first_name": new_user['first_name'],
                "last_name": new_user['last_name']
            }
        }
    
    @staticmethod
    def login(login_data: LoginRequest) -> Dict:
        """User login"""
        # Fetch user
        user = execute_query(
            "SELECT * FROM users WHERE email = %s AND soft_delete = FALSE",
            (login_data.email,),
            fetch_one=True
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not verify_password(login_data.password, user['password_hash']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if account is active
        if not user['is_active']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Please contact support."
            )
        
        # TODO: Email verification check will be added later
        # When implementing:
        # Check if email is verified from email_verification_tokens table
        
        # Update last login
        execute_update(
            "UPDATE users SET last_login = %s, updated_at = %s WHERE id = %s",
            (datetime.now(), datetime.now(), user['id'])
        )
        
        # Get user roles
        roles = execute_query(
            """
            SELECT r.name FROM roles r
            INNER JOIN user_role ur ON r.id = ur.role_id
            WHERE ur.user_id = %s AND ur.is_active = TRUE
            """,
            (user['id'],)
        )
        
        role_names = [role['name'] for role in roles] if roles else []
        
        # Generate token
        access_token = create_access_token({
            "user_id": user['id'],
            "email": user['email'],
            "roles": role_names
        })
        
        return {
            "success": True,
            "message": "Login successful",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user['id'],
                "email": user['email'],
                "first_name": user['first_name'],
                "last_name": user['last_name'],
                "phone": user['phone'],
                "roles": role_names
            }
        }
    
    @staticmethod
    def forgot_password(email: str) -> Dict:
        """Request password reset"""
        user = execute_query(
            "SELECT * FROM users WHERE email = %s AND soft_delete = FALSE",
            (email,),
            fetch_one=True
        )
        
        # Always return success to prevent email enumeration
        if not user:
            return {
                "success": True,
                "message": "If your email is registered, you will receive a password reset link."
            }
        
        # TODO: Password reset email will be implemented later
        # When implementing:
        # 1. Invalidate old tokens
        # 2. Generate reset token
        # 3. Store in password_reset_tokens table
        # 4. Send reset email with OTP/link
        
        return {
            "success": True,
            "message": "Password reset functionality will be available soon."
        }
    
    @staticmethod
    def reset_password(token: str, new_password: str) -> Dict:
        """Reset password using token"""
        # TODO: Password reset will be implemented later
        # When implementing:
        # 1. Verify token from password_reset_tokens table
        # 2. Check expiration
        # 3. Update password
        # 4. Mark token as used
        
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Password reset functionality will be available soon."
        )
    
    @staticmethod
    def change_password(user_id: int, old_password: str, new_password: str) -> Dict:
        """Change password for authenticated user"""
        user = execute_query(
            "SELECT password_hash FROM users WHERE id = %s AND soft_delete = FALSE",
            (user_id,),
            fetch_one=True
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify old password
        if not verify_password(old_password, user['password_hash']):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Hash new password
        password_hash = hash_password(new_password)
        
        # Update password
        execute_update(
            "UPDATE users SET password_hash = %s, updated_at = %s WHERE id = %s",
            (password_hash, datetime.now(), user_id)
        )
        
        return {
            "success": True,
            "message": "Password changed successfully!"
        }
