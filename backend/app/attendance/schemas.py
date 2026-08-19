from datetime import date, datetime
from pydantic import BaseModel
from typing import Optional


class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    attendance_date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: str
    recognition_method: Optional[str] = None
    confidence_score: Optional[str] = None
    notes: Optional[str] = None
    intervals: Optional[str] = None

    class Config:
        from_attributes = True


class ManualCheckInRequest(BaseModel):
    employee_id: int
    notes: Optional[str] = None


class ManualCheckOutRequest(BaseModel):
    employee_id: int
    notes: Optional[str] = None


class ManualRecordRequest(BaseModel):
    employee_id: int
    attendance_date: Optional[date] = None
    status: Optional[str] = "present"
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    notes: Optional[str] = None