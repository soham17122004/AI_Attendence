from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.department import Department

from app.auth.router import get_current_user
from app.models.user import User

from app.departments.schemas import (
    DepartmentCreate,
    DepartmentResponse
)


router = APIRouter(
    prefix="/departments",
    tags=["Departments"]
)


# GET ALL DEPARTMENTS
@router.get(
    "",
    response_model=list[DepartmentResponse]
)
def get_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    departments = (
        db.query(Department)
        .order_by(Department.id)
        .all()
    )

    return departments


# CREATE DEPARTMENT
@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED
)
def create_department(
    department_data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_department = (
        db.query(Department)
        .filter(Department.name == department_data.name)
        .first()
    )

    if existing_department:
        raise HTTPException(
            status_code=400,
            detail="Department already exists"
        )

    new_department = Department(
        name=department_data.name,
        description=department_data.description,
        is_active=department_data.is_active
    )

    db.add(new_department)
    db.commit()
    db.refresh(new_department)

    return new_department


# GET DEPARTMENT BY ID
@router.get(
    "/{department_id}",
    response_model=DepartmentResponse
)
def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    department = (
        db.query(Department)
        .filter(Department.id == department_id)
        .first()
    )

    if not department:
        raise HTTPException(
            status_code=404,
            detail="Department not found"
        )

    return department


# UPDATE DEPARTMENT
@router.put(
    "/{department_id}",
    response_model=DepartmentResponse
)
def update_department(
    department_id: int,
    department_data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    department = (
        db.query(Department)
        .filter(Department.id == department_id)
        .first()
    )

    if not department:
        raise HTTPException(
            status_code=404,
            detail="Department not found"
        )

    department.name = department_data.name
    department.description = department_data.description
    department.is_active = department_data.is_active

    db.commit()
    db.refresh(department)

    return department


# DELETE DEPARTMENT
@router.delete(
    "/{department_id}"
)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    department = (
        db.query(Department)
        .filter(Department.id == department_id)
        .first()
    )

    if not department:
        raise HTTPException(
            status_code=404,
            detail="Department not found"
        )

    db.delete(department)
    db.commit()

    return {
        "message": "Department deleted successfully",
        "department_id": department_id
    }   