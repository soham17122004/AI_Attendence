from pydantic import BaseModel
from typing import Optional, List

class SalaryUpdateRequest(BaseModel):
    base_salary: float
    hourly_rate: Optional[float] = 150.0
    allowances: Optional[float] = 0.0

class EmployeeSalaryItem(BaseModel):
    employee_id: int
    employee_code: str
    employee_name: str
    email: str
    department_name: Optional[str] = "General"
    base_salary: float
    daily_rate: float
    hourly_rate: float
    allowances: float
    total_days: int
    present_days: int
    half_days: int
    paid_leaves: int
    unpaid_leaves: int
    total_hours_worked: float
    half_day_deductions: float
    leave_deductions: float
    total_deductions: float
    net_salary: float
    status: str = "Calculated"

class PayrollSummaryResponse(BaseModel):
    month: int
    year: int
    month_name: str
    total_days_in_month: int
    total_employees: int
    total_base_payroll: float
    total_deductions: float
    total_allowances: float
    total_net_payable: float
    items: List[EmployeeSalaryItem]
