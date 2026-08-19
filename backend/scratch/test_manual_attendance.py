import json
import urllib.request

def test():
    base_url = "http://localhost:8000"
    
    payload = {
        "employee_id": 24,
        "attendance_date": "2026-08-14",
        "status": "present",
        "check_in_time": "09:15",
        "check_out_time": "18:15",
        "notes": "New employee manual attendance punch"
    }

    req = urllib.request.Request(
        f"{base_url}/attendance/manual-record",
        data=json.dumps(payload).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("Manual Record Status Code:", resp.status)
        print("Recorded Record ID:", data.get("id"))
        print("Employee ID:", data.get("employee_id"))
        print("Status:", data.get("status"))
        print("Check In:", data.get("check_in"))
        print("Check Out:", data.get("check_out"))
        print("Method:", data.get("recognition_method"))
        print("Notes:", data.get("notes"))

if __name__ == "__main__":
    test()
