from requests import Session
from controllers.auth_controller import verify_token
from fastapi import APIRouter, FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from database import get_db
from models.user_model import *

security = HTTPBearer()

auth_router = APIRouter(prefix="/api/auth", tags=["user"])

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


# ============= GET PROFILE (PROTECTED) =============

@auth_router.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": str(user.created_at),
        "last_login": str(user.last_login) if user.last_login else None
    }

# ============= VERIFY TOKEN =============
@auth_router.get("/verify-token")
def verify_token_endpoint(current_user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "message": "Token is valid",
        "user_id": current_user["user_id"],
        "email": current_user["email"]
    }
