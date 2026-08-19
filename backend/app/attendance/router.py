from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.attendance import Attendance
from app.models.employee import Employee
from app.models.leave_request import LeaveRequest
from app.models.kiosk_device import KioskDevice
from pydantic import BaseModel

from app.attendance.schemas import (
    AttendanceResponse,
    ManualCheckInRequest,
    ManualCheckOutRequest,
    ManualRecordRequest,
)


router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)


# ============================================================
# GET ALL ATTENDANCE
# ============================================================

@router.get(
    "",
    response_model=list[AttendanceResponse]
)
def get_all_attendance(
    db: Session = Depends(get_db)
):
    attendance = (
        db.query(Attendance)
        .order_by(Attendance.id.desc())
        .all()
    )

    return attendance


# ============================================================
# GET TODAY'S ATTENDANCE
# ============================================================

@router.get(
    "/today",
    response_model=list[AttendanceResponse]
)
def get_today_attendance(
    db: Session = Depends(get_db)
):
    today = date.today()

    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.attendance_date == today
        )
        .order_by(Attendance.id.desc())
        .all()
    )

    return attendance


# ============================================================
# GET TODAY'S ATTENDANCE SUMMARY
# WITH LEAVE INTEGRATION
# ============================================================

@router.get(
    "/summary/today"
)
def get_today_attendance_summary(
    db: Session = Depends(get_db)
):
    today = date.today()

    # --------------------------------------------------------
    # 1. Total employees
    # --------------------------------------------------------

    total_employees = (
        db.query(Employee)
        .count()
    )

    # --------------------------------------------------------
    # 2. Get today's attendance
    # --------------------------------------------------------

    today_attendance = (
        db.query(Attendance)
        .filter(
            Attendance.attendance_date == today
        )
        .all()
    )

    # --------------------------------------------------------
    # 3. Get unique employees who are present
    # --------------------------------------------------------

    present_employee_ids = {
        attendance.employee_id
        for attendance in today_attendance
    }

    present = len(present_employee_ids)

    # --------------------------------------------------------
    # 4. Checked in
    # --------------------------------------------------------

    checked_in = sum(
        1
        for attendance in today_attendance
        if attendance.check_in is not None
    )

    # --------------------------------------------------------
    # 5. Checked out
    # --------------------------------------------------------

    checked_out = sum(
        1
        for attendance in today_attendance
        if attendance.check_out is not None
    )

    # --------------------------------------------------------
    # 6. Get approved leaves for today
    #
    # A leave is active today when:
    #
    # start_date <= today
    # AND
    # end_date >= today
    # AND
    # status = approved
    # --------------------------------------------------------

    approved_leaves = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.status == "approved",
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today
        )
        .all()
    )

    # --------------------------------------------------------
    # 7. Unique employees on approved leave
    # --------------------------------------------------------

    leave_employee_ids = {
        leave.employee_id
        for leave in approved_leaves
    }

    # --------------------------------------------------------
    # 8. If an employee has attendance today,
    #    count them as present instead of leave.
    # --------------------------------------------------------

    leave_employee_ids = (
        leave_employee_ids - present_employee_ids
    )

    on_leave = len(leave_employee_ids)

    # --------------------------------------------------------
    # 9. Calculate absent
    #
    # Total employees
    # - Present
    # - On leave
    # --------------------------------------------------------

    absent = max(
        total_employees - present - on_leave,
        0
    )

    # --------------------------------------------------------
    # 10. Return summary
    # --------------------------------------------------------

    return {
        "date": str(today),
        "total_employees": total_employees,
        "present": present,
        "absent": absent,
        "on_leave": on_leave,
        "checked_in": checked_in,
        "checked_out": checked_out
    }


# ============================================================
# GET ATTENDANCE BY EMPLOYEE
# ============================================================

@router.get(
    "/employee/{employee_id}",
    response_model=list[AttendanceResponse]
)
def get_employee_attendance(
    employee_id: int,
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Check employee exists
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
    # Get employee attendance
    # --------------------------------------------------------

    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id
        )
        .order_by(
            Attendance.attendance_date.desc()
        )
        .all()
    )

    return attendance


# ============================================================
# KIOSK DEVICES CRUD
# ============================================================

class KioskDeviceCreate(BaseModel):
    name: str
    location: str
    ip: str

class KioskDeviceUpdate(BaseModel):
    name: str
    location: str
    ip: str
    status: str
    camera_status: str
    engine_status: str
    last_seen: str

@router.get("/kiosks")
def get_kiosks(db: Session = Depends(get_db)):
    kiosks = db.query(KioskDevice).order_by(KioskDevice.id).all()
    if not kiosks:
        k1 = KioskDevice(
            name='Office Control PC',
            location='Admin Desk',
            status='online',
            last_seen='Active',
            camera_status='Connected',
            engine_status='Active',
            ip='127.0.0.1 (Localhost)'
        )
        k2 = KioskDevice(
            name='Mobile Scanner Device',
            location='Field Phone (LTE / Tunnel)',
            status='online',
            last_seen='Just now',
            camera_status='Connected',
            engine_status='Active',
            ip='trycloudflare.com (SSL Tunnel)'
        )
        db.add(k1)
        db.add(k2)
        db.commit()
        db.refresh(k1)
        db.refresh(k2)
        kiosks = [k1, k2]
    return kiosks

@router.post("/kiosks")
def create_kiosk(request: KioskDeviceCreate, db: Session = Depends(get_db)):
    device = KioskDevice(
        name=request.name,
        location=request.location,
        status="online",
        last_seen="Just registered",
        camera_status="Connected",
        engine_status="Active",
        ip=request.ip
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device

@router.put("/kiosks/{kiosk_id}")
def update_kiosk(kiosk_id: int, request: KioskDeviceUpdate, db: Session = Depends(get_db)):
    device = db.query(KioskDevice).filter(KioskDevice.id == kiosk_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Kiosk device not found")
    
    device.name = request.name
    device.location = request.location
    device.ip = request.ip
    device.status = request.status
    device.camera_status = request.camera_status
    device.engine_status = request.engine_status
    device.last_seen = request.last_seen
    
    db.commit()
    db.refresh(device)
    return device

@router.delete("/kiosks/{kiosk_id}")
def delete_kiosk(kiosk_id: int, db: Session = Depends(get_db)):
    device = db.query(KioskDevice).filter(KioskDevice.id == kiosk_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Kiosk device not found")
    
    db.delete(device)
    db.commit()
    return {"detail": "Kiosk device deleted successfully"}


# ============================================================
# MANUAL CHECK-IN
# ============================================================

@router.post(
    "/manual-checkin",
    response_model=AttendanceResponse
)
def manual_checkin(
    request: ManualCheckInRequest,
    db: Session = Depends(get_db)
):
    # Check employee exists
    employee = (
        db.query(Employee)
        .filter(Employee.id == request.employee_id)
        .first()
    )
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    # Check today's attendance
    today = date.today()
    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == request.employee_id,
            Attendance.attendance_date == today
        )
        .first()
    )

    if attendance:
        if attendance.check_in and attendance.check_out is None:
            raise HTTPException(
                status_code=400,
                detail="Employee is already checked in. Please check out first."
            )
        elif attendance.check_in and attendance.check_out:
            raise HTTPException(
                status_code=400,
                detail="Employee has already checked in and out for today."
            )

    now_dt = datetime.now()
    is_late = now_dt.time() > time(10, 0, 0)
    calc_status = "present"
    
    shift_hours = 4 if date.today().weekday() == 5 else 8
    calc_notes = f"Manual Late Check-in after 10:00 AM ({shift_hours}h shift required)" if is_late else "Manual Check-in"
    if request.notes:
        calc_notes += f" - Note: {request.notes}"

    new_attendance = Attendance(
        employee_id=request.employee_id,
        attendance_date=today,
        check_in=now_dt,
        status=calc_status,
        recognition_method="manual",
        notes=calc_notes
    )

    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance)

    return new_attendance


# ============================================================
# MANUAL CHECK-OUT
# ============================================================

@router.post(
    "/manual-checkout",
    response_model=AttendanceResponse
)
def manual_checkout(
    request: ManualCheckOutRequest,
    db: Session = Depends(get_db)
):
    # Check employee exists
    employee = (
        db.query(Employee)
        .filter(Employee.id == request.employee_id)
        .first()
    )
    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    # Check today's attendance
    today = date.today()
    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == request.employee_id,
            Attendance.attendance_date == today
        )
        .first()
    )

    if not attendance or not attendance.check_in:
        raise HTTPException(
            status_code=400,
            detail="Employee must check in first before checking out."
        )

    if attendance.check_out:
        raise HTTPException(
            status_code=400,
            detail="Employee has already checked out for today."
        )

    now_dt = datetime.now()
    attendance.check_out = now_dt
    attendance.recognition_method = "manual"

    # Shift calculations
    check_in_dt = attendance.check_in.replace(tzinfo=None) if hasattr(attendance.check_in, 'tzinfo') and attendance.check_in.tzinfo else attendance.check_in
    now_dt_naive = now_dt.replace(tzinfo=None)
    shift_seconds = (now_dt_naive - check_in_dt).total_seconds()
    completed_hours = round(shift_seconds / 3600.0, 2)

    shift_hours_required = 4 if date.today().weekday() == 5 else 8
    shift_seconds_required = shift_hours_required * 3600

    if shift_seconds < shift_seconds_required: # less than required hours
        attendance.status = "half_day"
        attendance.notes = f"Manual Early Check-Out after {completed_hours} hrs (< {shift_hours_required}h shift required). Marked as Half Day."
    else:
        attendance.status = "present"
        attendance.notes = f"Manual Check-Out. Completed {completed_hours} hrs shift."

    if request.notes:
        attendance.notes += f" - Note: {request.notes}"

    db.commit()
    db.refresh(attendance)

    return attendance


# ============================================================
# FLEXIBLE MANUAL ATTENDANCE RECORD (FOR NEW EMPLOYEES / CORRECTIONS)
# ============================================================

@router.post(
    "/manual-record",
    response_model=AttendanceResponse
)
def manual_record_attendance(
    request: ManualRecordRequest,
    db: Session = Depends(get_db)
):
    employee = db.query(Employee).filter(Employee.id == request.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    target_date = request.attendance_date if request.attendance_date else date.today()
    status = (request.status or "present").lower()

    # Parse check-in datetime if provided
    check_in_dt = None
    if request.check_in_time:
        try:
            parts = request.check_in_time.split(":")
            h, m = int(parts[0]), int(parts[1])
            check_in_dt = datetime.combine(target_date, time(h, m))
        except Exception:
            check_in_dt = datetime.combine(target_date, time(9, 0))
    elif status in ["present", "half_day", "late"]:
        check_in_dt = datetime.combine(target_date, time(9, 0))

    # Parse check-out datetime if provided
    check_out_dt = None
    if request.check_out_time:
        try:
            parts = request.check_out_time.split(":")
            h, m = int(parts[0]), int(parts[1])
            check_out_dt = datetime.combine(target_date, time(h, m))
        except Exception:
            check_out_dt = datetime.combine(target_date, time(18, 0))
    elif status == "present":
        check_out_dt = datetime.combine(target_date, time(18, 0))
    elif status == "half_day":
        check_out_dt = datetime.combine(target_date, time(13, 30))

    notes = request.notes if request.notes else "Manual attendance entry by Admin"

    # Check if attendance record exists for that date
    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == request.employee_id,
            Attendance.attendance_date == target_date
        )
        .first()
    )

    if attendance:
        attendance.status = status
        attendance.check_in = check_in_dt
        attendance.check_out = check_out_dt
        attendance.recognition_method = "manual"
        attendance.notes = notes
    else:
        attendance = Attendance(
            employee_id=request.employee_id,
            attendance_date=target_date,
            check_in=check_in_dt,
            check_out=check_out_dt,
            status=status,
            recognition_method="manual",
            notes=notes
        )
        db.add(attendance)

    db.commit()
    db.refresh(attendance)

    return attendance


# ============================================================
# GET SINGLE ATTENDANCE
# ============================================================

@router.get(
    "/{attendance_id}",
    response_model=AttendanceResponse
)
def get_attendance(
    attendance_id: int,
    db: Session = Depends(get_db)
):

    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.id == attendance_id
        )
        .first()
    )

    if not attendance:
        raise HTTPException(
            status_code=404,
            detail="Attendance record not found"
        )

    return attendance