from typing import List
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.employee import Employee
from app.models.user import User
from app.auth.router import get_current_user
from app.auth.security import hash_password

from app.employees.schemas import (
    EmployeeCreate,
    EmployeeResponse,
    EmployeeUpdate
)


router = APIRouter(
    prefix="/employees",
    tags=["Employees"]
)


@router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED
)
def create_employee(
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Check employee ID
    existing_employee = (
        db.query(Employee)
        .filter(Employee.employee_id == employee_data.employee_id)
        .first()
    )

    if existing_employee:
        raise HTTPException(
            status_code=400,
            detail="Employee ID already exists"
        )

    # Check email
    existing_email = (
        db.query(Employee)
        .filter(Employee.email == employee_data.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Employee email already exists"
        )

    new_employee = Employee(
        employee_id=employee_data.employee_id,
        first_name=employee_data.first_name,
        last_name=employee_data.last_name,
        email=employee_data.email,
        phone=employee_data.phone,
        department_id=employee_data.department_id,
        is_active=employee_data.is_active
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return new_employee


@router.get(
    "",
    response_model=List[EmployeeResponse]
)
def get_employees(
    db: Session = Depends(get_db)
):
    employees = (
        db.query(Employee)
        .order_by(Employee.id.desc())
        .all()
    )

    return employees


@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse
)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    employee = (
        db.query(Employee)
        .filter(Employee.id == employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    return employee


@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse
)
def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    employee = (
        db.query(Employee)
        .filter(Employee.id == employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    update_data = employee_data.model_dump(
        exclude_unset=True
    )

    # Check email uniqueness if email is being changed
    if "email" in update_data:
        existing_email = (
            db.query(Employee)
            .filter(
                Employee.email == update_data["email"],
                Employee.id != employee_id
            )
            .first()
        )

        if existing_email:
            raise HTTPException(
                status_code=400,
                detail="Employee email already exists"
            )

    for field, value in update_data.items():
        setattr(employee, field, value)

    db.commit()
    db.refresh(employee)

    return employee


@router.delete(
    "/{employee_id}"
)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    employee = (
        db.query(Employee)
        .filter(Employee.id == employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    db.delete(employee)
    db.commit()

    return {
        "message": "Employee deleted successfully",
        "employee_id": employee_id
    }


class EmployeeUserCredentials(BaseModel):
    username: str
    password: str


@router.get(
    "/{employee_id}/user"
)
def get_employee_user(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role.lower() not in ["admin", "administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage user credentials"
        )

    user = (
        db.query(User)
        .filter(User.employee_id == employee_id)
        .first()
    )

    if not user:
        return {"has_account": False}

    return {
        "has_account": True,
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active
    }


@router.post(
    "/{employee_id}/user"
)
def set_employee_user(
    employee_id: int,
    credentials: EmployeeUserCredentials,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role.lower() not in ["admin", "administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage user credentials"
        )

    employee = (
        db.query(Employee)
        .filter(Employee.id == employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    user = (
        db.query(User)
        .filter(User.employee_id == employee_id)
        .first()
    )

    # Validate username uniqueness
    existing_user_by_username = (
        db.query(User)
        .filter(User.username == credentials.username)
        .first()
    )

    if user:
        # Updating existing credentials
        if existing_user_by_username and existing_user_by_username.id != user.id:
            raise HTTPException(
                status_code=400,
                detail="Username already taken"
            )
        user.username = credentials.username
        if credentials.password:
            user.password_hash = hash_password(credentials.password)
        db.commit()
        db.refresh(user)
        return {
            "message": "User credentials updated successfully",
            "username": user.username
        }
    else:
        # Creating new credentials
        if existing_user_by_username:
            raise HTTPException(
                status_code=400,
                detail="Username already taken"
            )
        
        # Check email uniqueness in users table
        existing_user_by_email = (
            db.query(User)
            .filter(User.email == employee.email)
            .first()
        )
        if existing_user_by_email:
            raise HTTPException(
                status_code=400,
                detail="An account with this employee's email already exists"
            )

        new_user = User(
            username=credentials.username,
            email=employee.email,
            password_hash=hash_password(credentials.password),
            role="employee",
            employee_id=employee.id,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {
            "message": "User credentials created successfully",
            "username": new_user.username
        }


@router.delete(
    "/{employee_id}/user"
)
def delete_employee_user(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role.lower() not in ["admin", "administrator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage user credentials"
        )

    user = (
        db.query(User)
        .filter(User.employee_id == employee_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User credentials not found for this employee"
        )

    db.delete(user)
    db.commit()

    return {
        "message": "User credentials deleted successfully"
    }