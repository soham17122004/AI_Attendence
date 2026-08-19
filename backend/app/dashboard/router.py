from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db

from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.leave_request import LeaveRequest
from app.models.face_profile import FaceProfile


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


# ============================================================
# DASHBOARD
# ============================================================

@router.get("")
def get_dashboard(
    db: Session = Depends(get_db)
):
    today = date.today()

    # ========================================================
    # EMPLOYEE STATISTICS
    # ========================================================

    total_employees = (
        db.query(Employee)
        .count()
    )

    # ========================================================
    # TODAY'S ATTENDANCE
    # ========================================================

    today_attendance = (
        db.query(Attendance)
        .filter(
            Attendance.attendance_date == today
        )
        .all()
    )

    # Unique employees present today
    present_employee_ids = {
        attendance.employee_id
        for attendance in today_attendance
    }

    present = len(present_employee_ids)

    # Checked in
    checked_in = sum(
        1
        for attendance in today_attendance
        if attendance.check_in is not None
    )

    # Checked out
    checked_out = sum(
        1
        for attendance in today_attendance
        if attendance.check_out is not None
    )

    # ========================================================
    # TODAY'S APPROVED LEAVES
    # ========================================================

    approved_leaves_today = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.status == "approved",
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today
        )
        .all()
    )

    leave_employee_ids = {
        leave.employee_id
        for leave in approved_leaves_today
    }

    # If employee is present, don't count them as on leave
    leave_employee_ids = (
        leave_employee_ids - present_employee_ids
    )

    on_leave = len(leave_employee_ids)

    # ========================================================
    # ABSENT
    # ========================================================

    absent = max(
        total_employees - present - on_leave,
        0
    )

    # ========================================================
    # LEAVE STATISTICS
    # ========================================================

    pending_leaves = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.status == "pending"
        )
        .count()
    )

    approved_leaves = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.status == "approved"
        )
        .count()
    )

    rejected_leaves = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.status == "rejected"
        )
        .count()
    )

    # ========================================================
    # FACE PROFILE STATISTICS
    # ========================================================

    total_face_profiles = (
        db.query(FaceProfile)
        .count()
    )

    registered_faces = (
        db.query(FaceProfile)
        .filter(
            FaceProfile.is_registered == True
        )
        .count()
    )

    not_registered_faces = max(
        total_employees - registered_faces,
        0
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "date": str(today),

        "employees": {
            "total": total_employees
        },

        "attendance": {
            "present": present,
            "absent": absent,
            "on_leave": on_leave,
            "checked_in": checked_in,
            "checked_out": checked_out
        },

        "leaves": {
            "pending": pending_leaves,
            "approved": approved_leaves,
            "rejected": rejected_leaves
        },

        "face_recognition": {
            "total_profiles": total_face_profiles,
            "registered": registered_faces,
            "not_registered": not_registered_faces
        }
    }