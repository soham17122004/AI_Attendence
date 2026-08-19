import json
import urllib.request

def test():
    base_url = "http://localhost:8000"
    
    # 1. Test calculate
    req = urllib.request.Request(f"{base_url}/payroll/calculate?month=8&year=2026")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print(f"Calculated: {data['month_name']} {data['year']}")
        print(f"Total Base Payroll: Rs. {data['total_base_payroll']}")
        print(f"Total Net Payable: Rs. {data['total_net_payable']}")
        for it in data['items']:
            print(f" - {it['employee_name']} (Dept: {it['department_name']}): Base=Rs. {it['base_salary']}, Ded=Rs. {it['total_deductions']}, Net=Rs. {it['net_salary']}")

    # 2. Test update salary
    update_data = json.dumps({"base_salary": 45000.0, "hourly_rate": 200.0, "allowances": 2500.0}).encode('utf-8')
    req2 = urllib.request.Request(
        f"{base_url}/payroll/employee/22/salary",
        data=update_data,
        headers={"Content-Type": "application/json"},
        method="PUT"
    )
    with urllib.request.urlopen(req2) as resp2:
        print("Update salary response:", json.loads(resp2.read().decode()))

    # 3. Recalculate
    req3 = urllib.request.Request(f"{base_url}/payroll/calculate?month=8&year=2026")
    with urllib.request.urlopen(req3) as resp3:
        data3 = json.loads(resp3.read().decode())
        print("Recalculate with updated salary:")
        for it in data3['items']:
            print(f" - {it['employee_name']}: Base=Rs. {it['base_salary']}, Allowances=Rs. {it['allowances']}, Ded=Rs. {it['total_deductions']}, Net=Rs. {it['net_salary']}")

if __name__ == "__main__":
    test()
