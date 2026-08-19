from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ============================================================
# DATABASE
# ============================================================

from app.core.database import Base, engine


# ============================================================
# MODELS
# Import all models so SQLAlchemy knows about all tables
# ============================================================

from app.models.department import Department
from app.models.employee import Employee
from app.models.face_profile import FaceProfile
from app.models.attendance import Attendance
from app.models.leave_request import LeaveRequest
from app.models.user import User
from app.models.kiosk_device import KioskDevice


# ============================================================
# ROUTERS
# ============================================================

from app.auth.router import router as auth_router

from app.employees.router import router as employee_router

from app.departments.router import router as department_router

from app.attendance.router import router as attendance_router

from app.leaves.router import router as leave_router

from app.face_profiles.router import router as face_profile_router

from app.attendance.recognition_router import (
    router as recognition_attendance_router
)

from app.recognition.router import (
    router as recognition_router
)

from app.dashboard.router import (
    router as dashboard_router
)

from app.payroll.router import (
    router as payroll_router
)


# ============================================================
# CREATE DATABASE TABLES
# ============================================================

Base.metadata.create_all(
    bind=engine
)

# Self-healing migration for PostgreSQL: Add intervals column if missing
try:
    from sqlalchemy import text
    with engine.connect() as conn:
        res = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='attendance' AND column_name='intervals'"
        )).fetchone()
        if not res:
            print("Migration: Adding column 'intervals' to table 'attendance'")
            conn.execute(text("ALTER TABLE attendance ADD COLUMN intervals TEXT"))
            conn.commit()
except Exception as e:
    print(f"Migration warning: {e}")


# ============================================================
# CREATE FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="SmartAttend AI",
    description="AI-powered attendance management system",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=False,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# AUTHENTICATION
# ============================================================

app.include_router(
    auth_router
)


# ============================================================
# EMPLOYEE MANAGEMENT
# ============================================================

app.include_router(
    employee_router
)


# ============================================================
# DEPARTMENT MANAGEMENT
# ============================================================

app.include_router(
    department_router
)


# ============================================================
# ATTENDANCE MANAGEMENT
# ============================================================

app.include_router(
    attendance_router
)


# ============================================================
# LEAVE MANAGEMENT
# ============================================================

app.include_router(
    leave_router
)


# ============================================================
# FACE PROFILE MANAGEMENT
# ============================================================

app.include_router(
    face_profile_router
)


# ============================================================
# FACE RECOGNITION
# ============================================================

app.include_router(
    recognition_router
)


# ============================================================
# FACE RECOGNITION ATTENDANCE
# ============================================================

app.include_router(
    recognition_attendance_router
)


# ============================================================
# DASHBOARD
# ============================================================

app.include_router(
    dashboard_router
)


# ============================================================
# PAYROLL & SALARY CALCULATION
# ============================================================

app.include_router(
    payroll_router
)


from sqlalchemy import text
from app.core.database import get_db
from sqlalchemy.orm import Session
from fastapi import WebSocket, WebSocketDisconnect, Depends
from app.core.ws_manager import ws_manager

# ============================================================
# WEBSOCKET REAL-TIME ATTENDANCE STREAM
# ============================================================

@app.websocket("/ws/attendance")
async def websocket_attendance_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "SmartAttend AI API is running",
        "status": "success"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Health check database ping failed: {e}")
        db_status = "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status
    }


# ============================================================
# DATABASE TEST
# ============================================================

@app.get("/database-test")
def database_test():
    return {
        "database": "PostgreSQL",
        "database_name": "smart_attend",
        "status": "connected"
    }