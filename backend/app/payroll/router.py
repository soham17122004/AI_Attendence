import calendar
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import extract, and_, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.employee import Employee
from app.models.department import Department
from app.models.attendance import Attendance
from app.models.leave_request import LeaveRequest
from app.payroll.schemas import (
    SalaryUpdateRequest,
    EmployeeSalaryItem,
    PayrollSummaryResponse,
)

router = APIRouter(
    prefix="/payroll",
    tags=["Payroll & Salary Calculation"]
)

@router.get("/calculate", response_model=PayrollSummaryResponse)
def calculate_payroll(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    today = date.today()
    target_month = month if month is not None else today.month
    target_year = year if year is not None else today.year

    if not (1 <= target_month <= 12):
        raise HTTPException(status_code=400, detail="Invalid month. Must be between 1 and 12.")

    days_in_month = calendar.monthrange(target_year, target_month)[1]
    month_name = calendar.month_name[target_month]

    employees = db.query(Employee).order_by(Employee.id.asc()).all()

    # Pre-fetch departments for mapping
    departments = db.query(Department).all()
    dept_map = {d.id: d.name for d in departments}

    items = []
    total_base_payroll = 0.0
    total_deductions_all = 0.0
    total_allowances_all = 0.0
    total_net_payable_all = 0.0

    for emp in employees:
        base_salary = float(emp.base_salary if emp.base_salary is not None else 30000.0)
        hourly_rate = float(emp.hourly_rate if emp.hourly_rate is not None else 150.0)
        allowances = float(emp.allowances if emp.allowances is not None else 0.0)

        daily_rate = round(base_salary / days_in_month, 2)

        # 1. Fetch attendance records for target month/year
        attendance_records = db.query(Attendance).filter(
            Attendance.employee_id == emp.id,
            extract('month', Attendance.attendance_date) == target_month,
            extract('year', Attendance.attendance_date) == target_year
        ).all()

        present_days = 0
        half_days = 0
        total_hours_worked = 0.0

        for att in attendance_records:
            if att.status == 'present':
                present_days += 1
            elif att.status == 'half_day':
                half_days += 1

            # Calculate actual worked hours if check-in and check-out exist
            if att.check_in and att.check_out:
                cin = att.check_in.replace(tzinfo=None) if hasattr(att.check_in, 'tzinfo') and att.check_in.tzinfo else att.check_in
                cout = att.check_out.replace(tzinfo=None) if hasattr(att.check_out, 'tzinfo') and att.check_out.tzinfo else att.check_out
                dur = (cout - cin).total_seconds() / 3600.0
                total_hours_worked += max(0.0, dur)
            elif att.status == 'present':
                total_hours_worked += 9.0
            elif att.status == 'half_day':
                total_hours_worked += 4.5

        # Passed working days calculation
        calc_end_date = min(date(target_year, target_month, days_in_month), today)
        passed_working_days = 0
        for day in range(1, days_in_month + 1):
            current_date = date(target_year, target_month, day)
            if current_date <= calc_end_date and current_date.weekday() < 5:
                passed_working_days += 1

        # 2. Fetch approved leaves overlapping with this month
        m_start = date(target_year, target_month, 1)
        m_end = date(target_year, target_month, days_in_month)

        approved_leaves_query = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == emp.id,
            LeaveRequest.status == 'approved',
            LeaveRequest.start_date <= m_end,
            LeaveRequest.end_date >= m_start
        ).all()

        paid_leaves = 0
        unpaid_leaves = 0
        paid_leaves_working = 0
        unpaid_leaves_working = 0

        for lreq in approved_leaves_query:
            # Overlap range
            l_start = lreq.start_date
            l_end = lreq.end_date
            if isinstance(l_start, str):
                # Try to parse string to date
                try:
                    l_start = datetime.strptime(l_start, '%Y-%m-%d').date()
                except ValueError:
                    # Try isoformat if strptime fails
                    l_start = date.fromisoformat(l_start.split('T')[0])
            if isinstance(l_end, str):
                try:
                    l_end = datetime.strptime(l_end, '%Y-%m-%d').date()
                except ValueError:
                    l_end = date.fromisoformat(l_end.split('T')[0])

            overlap_start = max(l_start, m_start)
            overlap_end = min(l_end, m_end)
            leave_days = max(0, (overlap_end - overlap_start).days + 1)
            
            leave_working_days = 0
            for i in range(leave_days):
                d = overlap_start + timedelta(days=i)
                if d <= calc_end_date and d.weekday() < 5:
                    leave_working_days += 1

            l_type = (lreq.leave_type or '').lower()
            if 'unpaid' in l_type or 'loss of pay' in l_type or 'lop' in l_type:
                unpaid_leaves += leave_days
                unpaid_leaves_working += leave_working_days
            else:
                paid_leaves += leave_days
                paid_leaves_working += leave_working_days

        # Unexcused absences are missed working days not covered by leaves
        unexcused_absent_days = max(0, passed_working_days - present_days - half_days - paid_leaves_working - unpaid_leaves_working)
        
        # Merge unexcused absences into unpaid leaves for deduction display
        unpaid_leaves += unexcused_absent_days

        # Deductions calculation:
        # Half days deduct 0.5 * daily_rate each
        half_day_deductions = round(half_days * (daily_rate * 0.5), 2)
        # Unpaid leaves deduct 1 * daily_rate each
        leave_deductions = round(unpaid_leaves * daily_rate, 2)
        total_deductions = round(half_day_deductions + leave_deductions, 2)

        net_salary = max(0.0, round(base_salary - total_deductions + allowances, 2))

        # Accumulate totals
        total_base_payroll += base_salary
        total_deductions_all += total_deductions
        total_allowances_all += allowances
        total_net_payable_all += net_salary

        dept_name = dept_map.get(emp.department_id, "General")

        items.append(EmployeeSalaryItem(
            employee_id=emp.id,
            employee_code=emp.employee_id,
            employee_name=f"{emp.first_name} {emp.last_name}",
            email=emp.email,
            department_name=dept_name,
            base_salary=base_salary,
            daily_rate=daily_rate,
            hourly_rate=hourly_rate,
            allowances=allowances,
            total_days=days_in_month,
            present_days=present_days,
            half_days=half_days,
            paid_leaves=paid_leaves,
            unpaid_leaves=unpaid_leaves,
            total_hours_worked=round(total_hours_worked, 1),
            half_day_deductions=half_day_deductions,
            leave_deductions=leave_deductions,
            total_deductions=total_deductions,
            net_salary=net_salary,
            status="Calculated"
        ))

    return PayrollSummaryResponse(
        month=target_month,
        year=target_year,
        month_name=month_name,
        total_days_in_month=days_in_month,
        total_employees=len(employees),
        total_base_payroll=round(total_base_payroll, 2),
        total_deductions=round(total_deductions_all, 2),
        total_allowances=round(total_allowances_all, 2),
        total_net_payable=round(total_net_payable_all, 2),
        items=items
    )

@router.put("/employee/{employee_id}/salary")
def update_employee_salary(
    employee_id: int,
    payload: SalaryUpdateRequest,
    db: Session = Depends(get_db)
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp.base_salary = payload.base_salary
    if payload.hourly_rate is not None:
        emp.hourly_rate = payload.hourly_rate
    if payload.allowances is not None:
        emp.allowances = payload.allowances

    db.commit()
    db.refresh(emp)

    return {
        "message": f"Salary updated successfully for {emp.first_name} {emp.last_name}",
        "employee_id": emp.id,
        "base_salary": emp.base_salary,
        "hourly_rate": emp.hourly_rate,
        "allowances": emp.allowances
    }
