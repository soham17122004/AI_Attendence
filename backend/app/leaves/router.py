from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.leave_request import LeaveRequest
from app.models.employee import Employee

from app.leaves.schemas import (
    LeaveCreate,
    LeaveResponse,
    LeaveStatusUpdate
)

router = APIRouter(
    prefix="/leaves",
    tags=["Leave Management"]
)


# Create Leave Request
@router.post(
    "",
    response_model=LeaveResponse,
    status_code=status.HTTP_201_CREATED
)
def create_leave(
    leave_data: LeaveCreate,
    db: Session = Depends(get_db)
):
    # Check employee exists
    employee = (
        db.query(Employee)
        .filter(Employee.id == leave_data.employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    # Validate dates
    if leave_data.end_date < leave_data.start_date:
        raise HTTPException(
            status_code=400,
            detail="End date cannot be before start date"
        )

    # Create leave request
    new_leave = LeaveRequest(
        employee_id=leave_data.employee_id,
        leave_type=leave_data.leave_type,
        start_date=leave_data.start_date,
        end_date=leave_data.end_date,
        reason=leave_data.reason,
        status="pending"
    )

    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)

    return new_leave


# Get all leave requests
@router.get(
    "",
    response_model=list[LeaveResponse]
)
def get_leaves(
    employee_id: int | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(LeaveRequest)
    if employee_id is not None:
        query = query.filter(LeaveRequest.employee_id == employee_id)
    leaves = (
        query.order_by(LeaveRequest.id.desc())
        .all()
    )

    return leaves


# Get leave request by ID
@router.get(
    "/{leave_id}",
    response_model=LeaveResponse
)
def get_leave(
    leave_id: int,
    db: Session = Depends(get_db)
):
    leave = (
        db.query(LeaveRequest)
        .filter(LeaveRequest.id == leave_id)
        .first()
    )

    if not leave:
        raise HTTPException(
            status_code=404,
            detail="Leave request not found"
        )

    return leave


# Update leave status
@router.put(
    "/{leave_id}",
    response_model=LeaveResponse
)
def update_leave_status(
    leave_id: int,
    status_data: LeaveStatusUpdate,
    db: Session = Depends(get_db)
):
    leave = (
        db.query(LeaveRequest)
        .filter(LeaveRequest.id == leave_id)
        .first()
    )

    if not leave:
        raise HTTPException(
            status_code=404,
            detail="Leave request not found"
        )

    allowed_statuses = [
        "pending",
        "approved",
        "rejected"
    ]

    if status_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid status"
        )

    leave.status = status_data.status

    if status_data.status == "rejected":
        leave.rejection_reason = status_data.rejection_reason
    else:
        leave.rejection_reason = None

    if status_data.status == "approved":
        leave.approved_at = datetime.now(timezone.utc)
    else:
        leave.approved_at = None

    db.commit()
    db.refresh(leave)

    return leave