import sys
from datetime import date, datetime, timedelta
import json

sys.path.append(".")
from app.core.database import SessionLocal
from app.models.attendance import Attendance
from app.models.employee import Employee

db = SessionLocal()
emp = db.query(Employee).first()
if not emp:
    print("No employee found to test with.")
    sys.exit(0)

print(f"Testing intervals with Employee: {emp.first_name} {emp.last_name} (ID: {emp.id})")

# Clear today's attendance for a clean test
today = date.today()
db.query(Attendance).filter(Attendance.employee_id == emp.id, Attendance.attendance_date == today).delete()
db.commit()

# 1. First Check-in of the day
now_dt = datetime.now()
first_in = now_dt - timedelta(hours=11)  # Checked in 11 hours ago
attendance = Attendance(
    employee_id=emp.id,
    attendance_date=today,
    check_in=first_in,
    status="present",
    intervals=json.dumps([{"in": first_in.isoformat(), "out": None}])
)
db.add(attendance)
db.commit()
db.refresh(attendance)
print(f"Initial Check-in: check_in={attendance.check_in}, intervals={attendance.intervals}")

# 2. Check-out for break (2 hours after check-in)
break_out = first_in + timedelta(hours=2)
intervals = json.loads(attendance.intervals)
intervals[-1]["out"] = break_out.isoformat()
attendance.check_out = break_out
attendance.intervals = json.dumps(intervals)

# Recalculate working hours
total_seconds = 0.0
for interval in intervals:
    in_dt = datetime.fromisoformat(interval["in"])
    out_dt = datetime.fromisoformat(interval["out"])
    total_seconds += (out_dt.replace(tzinfo=None) - in_dt.replace(tzinfo=None)).total_seconds()
completed_hours = round(total_seconds / 3600.0, 2)
print(f"Check-out: check_out={attendance.check_out}, completed_hours={completed_hours}, intervals={attendance.intervals}")

# 3. Check-in back from break (1 hour after checking out)
return_in = break_out + timedelta(hours=1)
intervals.append({"in": return_in.isoformat(), "out": None})
attendance.check_out = None
attendance.intervals = json.dumps(intervals)
db.commit()
print(f"Return Check-in: check_out={attendance.check_out}, intervals={attendance.intervals}")

# 4. Final check-out (8 hours after return-in)
final_out = return_in + timedelta(hours=8)
intervals[-1]["out"] = final_out.isoformat()
attendance.check_out = final_out
attendance.intervals = json.dumps(intervals)

total_seconds = 0.0
for interval in intervals:
    in_dt = datetime.fromisoformat(interval["in"])
    out_dt = datetime.fromisoformat(interval["out"])
    total_seconds += (out_dt.replace(tzinfo=None) - in_dt.replace(tzinfo=None)).total_seconds()
completed_hours = round(total_seconds / 3600.0, 2)
if total_seconds < 32400:
    attendance.status = "half_day"
else:
    attendance.status = "present"
db.commit()
db.refresh(attendance)

print(f"Final Check-out: check_out={attendance.check_out}, total_hours={completed_hours}, status={attendance.status}, intervals={attendance.intervals}")
