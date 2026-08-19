import sys
from pathlib import Path

# Add backend directory to path
backend_path = Path(__file__).resolve().parents[1]
sys.path.append(str(backend_path))

from app.core.database import SessionLocal
from app.models.face_profile import FaceProfile
from app.models.employee import Employee

db = SessionLocal()
try:
    employees = db.query(Employee).all()
    print(f"Total employees in database: {len(employees)}")
    for emp in employees:
        emp_name = f"{emp.first_name} {emp.last_name}" if hasattr(emp, 'first_name') else getattr(emp, 'full_name', 'Unnamed')
        print(f"  - ID: {emp.id}, Name: {emp_name}, Email: {emp.email}")

    profiles = db.query(FaceProfile).all()
    print(f"\nTotal face profiles: {len(profiles)}")
    for prof in profiles:
        print(f"  - ID: {prof.id}, Employee ID: {prof.employee_id}, Registered: {prof.is_registered}, Path: {prof.face_encoding_path}")
finally:
    db.close()
