
# ============================================================================
# FILE: services/email_service.py
# ============================================================================
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send email using Gmail SMTP"""
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = GMAIL_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Email error: {str(e)}")
        return False

def send_verification_email(to_email: str, token: str, first_name: str) -> bool:
    """Send verification email"""
    verification_link = f"{FRONTEND_URL}/verify-email?token={token}"
    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Welcome to Smart Cart, {first_name}!</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <a href="{verification_link}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Verify Email
            </a>
            <p>Or copy this link: {verification_link}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
        </body>
    </html>
    """
    return send_email(to_email, "Verify Your Email - Smart Cart", html)

def send_password_reset_email(to_email: str, token: str, first_name: str) -> bool:
    """Send password reset email"""
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Password Reset Request</h2>
            <p>Hi {first_name},</p>
            <p>We received a request to reset your password. Click the link below to proceed:</p>
            <a href="{reset_link}" style="background-color: #2196F3; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Reset Password
            </a>
            <p>Or copy this link: {reset_link}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        </body>
    </html>
    """
    return send_email(to_email, "Password Reset - Smart Cart", html)

def send_welcome_email(to_email: str, first_name: str) -> bool:
    """Send welcome email after verification"""
    html = f"""
    <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Welcome to Smart Cart!</h2>
            <p>Hi {first_name},</p>
            <p>Your email has been verified successfully. You can now enjoy all features of Smart Cart!</p>
            <p>Happy shopping!</p>
        </body>
    </html>
    """
    return send_email(to_email, "Welcome to Smart Cart!", html)

