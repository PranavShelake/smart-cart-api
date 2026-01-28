# from dotenv import load_dotenv
# load_dotenv()  # Load .env first

# import os
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware

# # DB imports


# # Controllers
# # from controllers import (
# #     auth_controller,
# #     user_controller
# # )
# from controllers.auth_controller import auth_controller
# from controllers.user_controller import user_controller

# #models
# from models.user_model import User
# from models.auth_model import OTP, ResetToken

# app = FastAPI(title="Authentication API", version="2.0.0")

# # Create Database Tables
# # Include Routers
# app.include_router(auth_controller)
# app.include_router(user_controller)

# # CORS
# origins = [
#     "http://localhost:3000",
#     "http://127.0.0.1:3000"
# ]

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # DB Dependency
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()


# @app.get("/")
# def root():
#     return {"message": "Authentication API with Email Verification", "docs": "/docs"}


# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)



# ============================================================================
# main.py
# ============================================================================
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from controllers.auth_controller import auth_router

app = FastAPI(
    title="Smart Cart API",
    description="E-commerce API with Authentication",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Smart Cart API",
        "version": "1.0.0",
        "docs": "/docs"
    }
