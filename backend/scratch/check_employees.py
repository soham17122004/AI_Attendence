from app.core.database import SessionLocal
from app.models.employee import Employee

db = SessionLocal()
emps = db.query(Employee).all()
print("Employees in DB:")
for e in emps:
    print(f"ID: {e.id}, Code: {e.employee_id}, Name: {e.first_name} {e.last_name}")
db.close()
