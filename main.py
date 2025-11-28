from dotenv import load_dotenv
load_dotenv()  # Load .env first

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# DB imports
from database import Base, engine, SessionLocal

# Controllers
# from controllers import (
#     auth_controller,
#     user_controller
# )
from controllers.auth_controller import auth_controller
from controllers.user_controller import user_controller

#models
from models.user_model import User
from models.auth_model import OTP, ResetToken

app = FastAPI(title="Authentication API", version="2.0.0")

# Create Database Tables
Base.metadata.create_all(bind=engine)

# Include Routers
app.include_router(auth_controller)
# app.include_router(user_controller)

# CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "Authentication API with Email Verification", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
