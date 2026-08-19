from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session

try:
    import cv2
except ImportError:
    cv2 = None

try:
    import numpy as np
except ImportError:
    np = None

from app.core.database import get_db
from app.models.face_profile import FaceProfile
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.kiosk_device import KioskDevice
from typing import Optional
from app.services.face_recognition_service import recognize_face
from app.core.ws_manager import ws_manager
import json


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/attendance",
    tags=["Face Recognition Attendance"]
)


# ============================================================
# FACE RECOGNITION ATTENDANCE
# ============================================================

@router.post("/recognize")
async def recognize_employee(
    file: UploadFile = File(...),
    terminal_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Recognize an employee from an uploaded face image
    and automatically create attendance.
    """

    # --------------------------------------------------------
    # 0. Check if terminal is disabled
    # --------------------------------------------------------
    target_id = terminal_id if terminal_id is not None else 1
    kiosk = db.query(KioskDevice).filter(KioskDevice.id == target_id).first()
    if kiosk and kiosk.status == "offline":
        raise HTTPException(
            status_code=403,
            detail=f"Terminal '{kiosk.name}' is currently switched OFF by administrator. Face scanning is disabled."
        )

    # --------------------------------------------------------
    # 1. Read uploaded image
    # --------------------------------------------------------

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Empty image file"
        )

    # --------------------------------------------------------
    # 2. Convert image bytes to NumPy array
    # --------------------------------------------------------

    image_array = np.frombuffer(
        contents,
        dtype=np.uint8
    )

    # --------------------------------------------------------
    # 3. Decode image
    # --------------------------------------------------------

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file"
        )

    # --------------------------------------------------------
    # 4. Convert BGR to RGB
    # --------------------------------------------------------

    image = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2RGB
    )

    # --------------------------------------------------------
    # 5. Get registered face profiles
    # --------------------------------------------------------

    profiles = (
        db.query(FaceProfile)
        .filter(
            FaceProfile.is_registered == True
        )
        .all()
    )

    if not profiles:
        raise HTTPException(
            status_code=404,
            detail="No registered face profiles found"
        )

    # --------------------------------------------------------
    # 6. Recognize face
    # --------------------------------------------------------

    try:

        result = recognize_face(
            image,
            profiles,
            threshold=0.78
        )

    except Exception as e:
        import traceback
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Face recognition failed: {str(e)}"
        )

    # --------------------------------------------------------
    # 7. Face not recognized
    # --------------------------------------------------------

    if not result.get("recognized"):

        raise HTTPException(
            status_code=404,
            detail=result.get(
                "message",
                "Face not recognized"
            )
        )

    # --------------------------------------------------------
    # 8. Get employee ID
    # --------------------------------------------------------

    employee_id = result.get(
        "employee_id"
    )

    if not employee_id:

        raise HTTPException(
            status_code=500,
            detail="Face recognized but employee ID is missing"
        )

    # --------------------------------------------------------
    # 9. Find employee
    # --------------------------------------------------------

    employee = (
        db.query(Employee)
        .filter(
            Employee.id == employee_id
        )
        .first()
    )

    if not employee:

        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    # --------------------------------------------------------
    # 10. Today's date
    # --------------------------------------------------------

    today = date.today()

    # --------------------------------------------------------
    # 11. Find today's attendance
    # --------------------------------------------------------

    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id,
            Attendance.attendance_date == today
        )
        .first()
    )

    import json
    now_dt = datetime.now()
    emp_name = f"{employee.first_name} {employee.last_name}" if hasattr(employee, 'first_name') else getattr(employee, "full_name", None)

    # ========================================================
    # 12. UPDATE ATTENDANCE (MULTIPLE IN/OUT BREAK STATE MACHINE)
    # ========================================================
    if attendance:
        # Load existing intervals or initialize from current check-in/out
        intervals = []
        if attendance.intervals:
            try:
                intervals = json.loads(attendance.intervals)
            except Exception:
                pass
        
        if not intervals and attendance.check_in:
            intervals = [{
                "in": attendance.check_in.isoformat(),
                "out": attendance.check_out.isoformat() if attendance.check_out else None
            }]

        # Check if the last interval is active (currently checked in)
        if intervals and intervals[-1].get("out") is None:
            # ── ACTION: CHECK-OUT (Personal Break or Final Checkout) ──
            intervals[-1]["out"] = now_dt.isoformat()
            attendance.check_out = now_dt
            attendance.intervals = json.dumps(intervals)
            attendance.recognition_method = "face_recognition"

            # Calculate total working hours summed over all completed intervals
            total_seconds = 0.0
            for interval in intervals:
                if interval.get("in") and interval.get("out"):
                    in_dt = datetime.fromisoformat(interval["in"])
                    out_dt = datetime.fromisoformat(interval["out"])
                    total_seconds += (out_dt.replace(tzinfo=None) - in_dt.replace(tzinfo=None)).total_seconds()
            
            completed_hours = round(total_seconds / 3600.0, 2)
            is_early_checkout = False
            if total_seconds < 32400:  # less than 9 hours
                is_early_checkout = True
                attendance.status = "half_day"
                attendance.notes = f"Checked out (break/early) after {completed_hours} hrs. Marked as Half Day."
            else:
                attendance.status = "present"
                attendance.notes = f"Completed {completed_hours} hrs shift via face recognition."

            db.commit()
            db.refresh(attendance)

            res_payload = {
                "success": True,
                "recognized": True,
                "action": "check_out",
                "message": (
                    f"Break/Check-Out logged. Total work: {completed_hours}h (9h shift required)."
                    if is_early_checkout else
                    f"Check-Out Successful! Shift completed ({completed_hours}h worked)."
                ),
                "employee_id": employee_id,
                "employee_name": emp_name,
                "attendance_id": attendance.id,
                "attendance_date": str(attendance.attendance_date),
                "check_in": attendance.check_in.isoformat() if attendance.check_in else None,
                "check_out": attendance.check_out.isoformat() if attendance.check_out else None,
                "status": attendance.status,
                "completed_hours": completed_hours,
                "is_early_checkout": is_early_checkout,
                "recognition_method": "face_recognition",
                "confidence": float(result.get("confidence", 0)),
                "distance": float(result.get("distance", 1)),
                "face_profile_id": result.get("face_profile_id")
            }
            try:
                await ws_manager.broadcast({"type": "attendance_event", "data": res_payload})
            except Exception:
                pass
            return res_payload
        else:
            # ── ACTION: CHECK-IN / RETURN FROM BREAK ──
            intervals.append({"in": now_dt.isoformat(), "out": None})
            attendance.check_out = None  # Clear check_out to mark currently in-office
            attendance.intervals = json.dumps(intervals)
            attendance.recognition_method = "face_recognition"

            # Calculate total working hours from completed intervals so far
            total_seconds = 0.0
            for interval in intervals:
                if interval.get("in") and interval.get("out"):
                    in_dt = datetime.fromisoformat(interval["in"])
                    out_dt = datetime.fromisoformat(interval["out"])
                    total_seconds += (out_dt.replace(tzinfo=None) - in_dt.replace(tzinfo=None)).total_seconds()
            completed_hours = round(total_seconds / 3600.0, 2)

            # Adjust expected check-out time based on completed work hours
            remaining_hours = max(9.0 - completed_hours, 0.0)
            expected_checkout = now_dt + timedelta(hours=remaining_hours)

            db.commit()
            db.refresh(attendance)

            res_payload = {
                "success": True,
                "recognized": True,
                "action": "check_in",
                "message": f"Welcome back! Check-in successful. Worked so far: {completed_hours}h.",
                "employee_id": employee_id,
                "employee_name": emp_name,
                "attendance_id": attendance.id,
                "attendance_date": str(attendance.attendance_date),
                "check_in": attendance.check_in.isoformat() if attendance.check_in else None,
                "check_out": None,
                "status": attendance.status,
                "expected_checkout": expected_checkout.strftime('%I:%M %p'),
                "is_late": False,
                "recognition_method": "face_recognition",
                "confidence": float(result.get("confidence", 0)),
                "distance": float(result.get("distance", 1)),
                "face_profile_id": result.get("face_profile_id")
            }
            try:
                await ws_manager.broadcast({"type": "attendance_event", "data": res_payload})
            except Exception:
                pass
            return res_payload

    # ========================================================
    # 13. CREATE NEW ATTENDANCE (FIRST CHECK-IN OF THE DAY)
    # ========================================================
    is_late = now_dt.time() > time(10, 0, 0)
    calc_status = "present"
    calc_notes = "Late Check-in after 10:00 AM (9h shift required)" if is_late else "Checked in using face recognition"

    new_attendance = Attendance(
        employee_id=employee_id,
        attendance_date=today,
        check_in=now_dt,
        status=calc_status,
        recognition_method="face_recognition",
        confidence_score=str(result.get("confidence", 0)),
        notes=calc_notes,
        intervals=json.dumps([{"in": now_dt.isoformat(), "out": None}])
    )

    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance)

    expected_checkout = now_dt + timedelta(hours=9)

    res_payload = {
        "success": True,
        "recognized": True,
        "action": "check_in",
        "message": (
            f"Late Check-In! Required 9h shift ends at {expected_checkout.strftime('%I:%M %p')}"
            if is_late else
            f"Check-In Successful! 9h shift ends at {expected_checkout.strftime('%I:%M %p')}"
        ),
        "employee_id": employee_id,
        "employee_name": emp_name,
        "attendance_id": new_attendance.id,
        "attendance_date": str(new_attendance.attendance_date),
        "check_in": new_attendance.check_in.isoformat() if new_attendance.check_in else None,
        "check_out": None,
        "status": new_attendance.status,
        "expected_checkout": expected_checkout.strftime('%I:%M %p'),
        "is_late": is_late,
        "recognition_method": "face_recognition",
        "confidence": float(result.get("confidence", 0)),
        "distance": float(result.get("distance", 1)),
        "face_profile_id": result.get("face_profile_id")
    }
    try:
        await ws_manager.broadcast({"type": "attendance_event", "data": res_payload})
    except Exception:
        pass
    return res_payload