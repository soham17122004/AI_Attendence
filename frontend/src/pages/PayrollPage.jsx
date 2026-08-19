import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { 
  IndianRupee, 
  ReceiptIndianRupee,
  Coins,
  CreditCard, 
  TrendingDown, 
  Users, 
  Calendar, 
  Search, 
  Filter, 
  Edit3, 
  FileText, 
  Printer, 
  Download,
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  X,
  Building2,
  ChevronDown
} from 'lucide-react';
import { payrollService } from '../services/services';
import './PayrollPage.css';

export default function PayrollPage({ user }) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Modals state
  const [activePayslipItem, setActivePayslipItem] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editForm, setEditForm] = useState({
    base_salary: 30000,
    hourly_rate: 150,
    allowances: 0
  });
  const [updating, setUpdating] = useState(false);

  const months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  const years = [2025, 2026, 2027];

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const data = await payrollService.calculate(selectedMonth, selectedYear);
      setPayrollData(data);
    } catch (err) {
      console.error('Failed to load payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [selectedMonth, selectedYear]);

  const handleEditClick = (item) => {
    setEditingEmployee(item);
    setEditForm({
      base_salary: item.base_salary,
      hourly_rate: item.hourly_rate,
      allowances: item.allowances
    });
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setUpdating(true);
    try {
      await payrollService.updateSalary(editingEmployee.employee_id, {
        base_salary: parseFloat(editForm.base_salary) || 0,
        hourly_rate: parseFloat(editForm.hourly_rate) || 0,
        allowances: parseFloat(editForm.allowances) || 0
      });
      setEditingEmployee(null);
      await fetchPayroll();
    } catch (err) {
      alert('Failed to update salary');
    } finally {
      setUpdating(false);
    }
  };

  const handlePrintPayslip = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!payrollData?.items?.length) {
      alert('No payroll data to export.');
      return;
    }

    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Email',
      'Billing Month',
      'Year',
      'Total Month Days',
      'Present Days',
      'Half Days',
      'Paid Leaves',
      'Unpaid Leaves',
      'Hours Worked',
      'Base Salary (INR)',
      'Daily Rate (INR)',
      'Allowances (INR)',
      'Half Day Deductions (INR)',
      'Leave Deductions (INR)',
      'Total Deductions (INR)',
      'Net Payable Salary (INR)',
      'Status'
    ];

    const rows = payrollData.items.map(item => [
      `"${item.employee_code}"`,
      `"${item.employee_name}"`,
      `"${item.department_name || ''}"`,
      `"${item.email}"`,
      `"${payrollData.month_name}"`,
      selectedYear,
      item.total_days,
      item.present_days,
      item.half_days,
      item.paid_leaves,
      item.unpaid_leaves,
      item.total_hours_worked,
      item.base_salary,
      item.daily_rate,
      item.allowances,
      item.half_day_deductions,
      item.leave_deductions,
      item.total_deductions,
      item.net_salary,
      `"${item.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Salary_Report_${payrollData.month_name}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter items
  const items = payrollData?.items || [];
  const departments = Array.from(new Set(items.map(i => i.department_name).filter(Boolean)));

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === 'ALL' || item.department_name === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  return (
    <div className="payroll-page">
      <PageHeader 
        title="Payroll & Salary Calculation" 
        subtitle="Automated monthly salary calculation based on attendance, shifts, and leave records"
        user={user}
      />

      <div className="payroll-content">
        {/* Filter & Toolbar */}
        <div className="payroll-toolbar">
          <div className="toolbar-left">
            <div className="select-group">
              <label>Billing Month:</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="custom-select"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="select-group">
              <label>Year:</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="custom-select"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="select-group">
              <label>Department:</label>
              <select 
                value={departmentFilter} 
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="custom-select"
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="toolbar-right">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search employee name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <button onClick={fetchPayroll} className="refresh-btn" title="Recalculate Payroll">
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
              <span>Refresh</span>
            </button>

            <button onClick={handleExportCSV} className="btn-export-csv" title="Download Salary Report as CSV">
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="payroll-kpi-grid">
          <div className="kpi-card-saas">
            <div className="saas-card-icon bg-blue-tint">
              <IndianRupee size={20} color="#2563eb" />
            </div>
            <div className="saas-card-content">
              <span className="saas-kpi-label">Total Base Payroll</span>
              <span className="saas-kpi-value font-heading">
                {formatCurrency(payrollData?.total_base_payroll)}
              </span>
              <span className="saas-kpi-subtext">Gross budget for {payrollData?.month_name || 'Month'}</span>
            </div>
          </div>

          <div className="kpi-card-saas">
            <div className="saas-card-icon bg-amber-tint">
              <TrendingDown size={20} color="#f59e0b" />
            </div>
            <div className="saas-card-content">
              <span className="saas-kpi-label">Total Deductions</span>
              <span className="saas-kpi-value font-heading text-danger">
                {formatCurrency(payrollData?.total_deductions)}
              </span>
              <span className="saas-kpi-subtext">Leaves & half-day deductions</span>
            </div>
          </div>

          <div className="kpi-card-saas">
            <div className="saas-card-icon bg-green-tint">
              <CreditCard size={20} color="#10b981" />
            </div>
            <div className="saas-card-content">
              <span className="saas-kpi-label">Net Payable Payroll</span>
              <span className="saas-kpi-value font-heading text-success">
                {formatCurrency(payrollData?.total_net_payable)}
              </span>
              <span className="saas-kpi-subtext">Disbursable amount</span>
            </div>
          </div>

          <div className="kpi-card-saas">
            <div className="saas-card-icon bg-purple-tint">
              <Users size={20} color="#8b5cf6" />
            </div>
            <div className="saas-card-content">
              <span className="saas-kpi-label">Active Employees</span>
              <span className="saas-kpi-value font-heading">
                {payrollData?.total_employees || 0}
              </span>
              <span className="saas-kpi-subtext">{payrollData?.total_days_in_month || 30} Days in Billing Month</span>
            </div>
          </div>
        </div>

        {/* Salary List Table */}
        <div className="payroll-table-container">
          <div className="table-header-title">
            <div className="title-left-group">
              <div className="title-icon-badge">
                <ReceiptIndianRupee size={22} color="#2563eb" />
              </div>
              <div>
                <h3>Employee Salary & Attendance Breakdown</h3>
                <p className="table-subtitle">Monthly automated calculation based on verified biometric shifts for {payrollData?.month_name} {selectedYear}</p>
              </div>
            </div>
            <div className="title-right-stats">
              <span className="badge-records">
                <Users size={14} /> {filteredItems.length} Employee{filteredItems.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="payroll-loading">
              <div className="loader-spinner" />
              <p>Calculating salaries & deductions from attendance records...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="payroll-empty">
              <AlertCircle size={36} color="#94a3b8" />
              <p>No employee records found matching your filters.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>EMPLOYEE</th>
                    <th>DEPARTMENT</th>
                    <th>BASE SALARY</th>
                    <th>DAILY RATE</th>
                    <th>ATTENDANCE & SHIFTS</th>
                    <th>DEDUCTIONS</th>
                    <th>NET PAYABLE</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.employee_id}>
                      <td>
                        <div className="emp-cell">
                          <div className="emp-avatar">
                            {item.employee_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="emp-info">
                            <span className="emp-name">{item.employee_name}</span>
                            <span className="emp-code">Code: #{item.employee_code}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="dept-tag">
                          <span className="dept-dot" />
                          {item.department_name || 'General'}
                        </span>
                      </td>
                      <td>
                        <span className="base-salary-text">{formatCurrency(item.base_salary)}</span>
                      </td>
                      <td>
                        <span className="daily-rate-text">{formatCurrency(item.daily_rate)}<span className="rate-unit">/day</span></span>
                      </td>
                      <td>
                        <div className="att-pills-row">
                          <span className="pill-att pill-present" title="Full shifts">
                            <span className="pill-dot dot-present" />
                            {item.present_days} Present
                          </span>
                          {item.half_days > 0 && (
                            <span className="pill-att pill-half" title="Half days (0.5 day deduction)">
                              <span className="pill-dot dot-half" />
                              {item.half_days} Half-Day
                            </span>
                          )}
                          {item.paid_leaves > 0 && (
                            <span className="pill-att pill-paid-leave" title="Approved paid leave">
                              <span className="pill-dot dot-paid" />
                              {item.paid_leaves} Paid Leave
                            </span>
                          )}
                          {item.unpaid_leaves > 0 && (
                            <span className="pill-att pill-unpaid-leave" title="Unpaid / Loss of Pay">
                              <span className="pill-dot dot-unpaid" />
                              {item.unpaid_leaves} Unpaid
                            </span>
                          )}
                          <span className="pill-hours">⏱️ {item.total_hours_worked}h logged</span>
                        </div>
                      </td>
                      <td>
                        {item.total_deductions > 0 ? (
                          <div className="deductions-cell">
                            <span className="deduction-total text-danger">-{formatCurrency(item.total_deductions)}</span>
                            <span className="deduction-breakdown">
                              {item.half_day_deductions > 0 ? `Half-days: -${formatCurrency(item.half_day_deductions)}` : ''}
                              {item.leave_deductions > 0 ? ` Leaves: -${formatCurrency(item.leave_deductions)}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="deduction-clean">₹0.00 (No Loss)</span>
                        )}
                      </td>
                      <td>
                        <div className="net-salary-pill">
                          {formatCurrency(item.net_salary)}
                        </div>
                      </td>
                      <td>
                        <span className="status-badge calculated">
                          <CheckCircle2 size={13} />
                          {item.status || 'Calculated'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-buttons-cell" style={{ justifyContent: 'flex-end' }}>
                          <button 
                            className="btn-action btn-payslip"
                            onClick={() => setActivePayslipItem(item)}
                            title="View & Print Payslip"
                          >
                            <FileText size={14} />
                            <span>Payslip</span>
                          </button>
                          <button 
                            className="btn-action btn-edit-sal"
                            onClick={() => handleEditClick(item)}
                            title="Edit Base Salary"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          EXECUTIVE OFFICIAL PAYSLIP MODAL
          ══════════════════════════════════════════ */}
      {activePayslipItem && (
        <div className="payslip-modal-backdrop" onClick={() => setActivePayslipItem(null)}>
          <div className="payslip-card" onClick={(e) => e.stopPropagation()}>
            <div className="payslip-header-bar">
              <div className="payslip-bar-left">
                <FileText size={18} color="#2563eb" />
                <h2>Official Salary Certificate</h2>
              </div>
              <div className="header-actions">
                <button onClick={handlePrintPayslip} className="btn-print">
                  <Printer size={16} />
                  <span>Print / Save PDF</span>
                </button>
                <button onClick={() => setActivePayslipItem(null)} className="btn-close-modal" title="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="payslip-printable-content" id="printable-payslip">
              {/* Corporate Letterhead */}
              <div className="payslip-letterhead">
                <div className="company-info-block">
                  <div className="company-logo-badge">
                    <Building2 size={24} color="#ffffff" />
                  </div>
                  <div>
                    <h1 className="payslip-company-name">Attend<span style={{ color: '#2563eb' }}>IQ</span> Technologies Pvt. Ltd.</h1>
                    <p className="payslip-subtitle">Workforce Intelligence & AI Biometric Attendance Systems</p>
                    <p className="company-meta-sub">Reg. No: ATN-IND-2026 • Electronic Payroll Division</p>
                  </div>
                </div>

                <div className="payslip-period-card">
                  <span className="period-badge-tag">PAYSLIP VOUCHER</span>
                  <h3 className="period-val">{payrollData?.month_name} {selectedYear}</h3>
                  <span className="payslip-voucher-no">Voucher: #PAY-{selectedYear}{String(selectedMonth).padStart(2, '0')}-{activePayslipItem.employee_code}</span>
                  <div className="payslip-status-pill">
                    <CheckCircle2 size={12} /> Disbursed & Verified
                  </div>
                </div>
              </div>

              <div className="payslip-gold-accent-line" />

              {/* Employee & Payroll Meta Details */}
              <div className="payslip-meta-grid">
                <div className="meta-item-box">
                  <span className="meta-lbl">EMPLOYEE NAME</span>
                  <strong className="meta-val-highlight">{activePayslipItem.employee_name}</strong>
                </div>

                <div className="meta-item-box">
                  <span className="meta-lbl">EMPLOYEE CODE</span>
                  <strong className="meta-val">#{activePayslipItem.employee_code}</strong>
                </div>

                <div className="meta-item-box">
                  <span className="meta-lbl">DEPARTMENT</span>
                  <span className="meta-val">{activePayslipItem.department_name || 'General Operations'}</span>
                </div>

                <div className="meta-item-box">
                  <span className="meta-lbl">OFFICIAL EMAIL</span>
                  <span className="meta-val">{activePayslipItem.email}</span>
                </div>

                <div className="meta-item-box">
                  <span className="meta-lbl">BILLING PERIOD</span>
                  <span className="meta-val">01 {payrollData?.month_name} – {activePayslipItem.total_days} {payrollData?.month_name} {selectedYear}</span>
                </div>

                <div className="meta-item-box">
                  <span className="meta-lbl">DISBURSAL METHOD</span>
                  <span className="meta-val">Direct Bank Transfer / NEFT</span>
                </div>
              </div>

              {/* Attendance Matrix Ribbon */}
              <div className="payslip-ribbon-title">
                <span>Biometric Shift & Attendance Summary ({activePayslipItem.total_days} Total Days)</span>
              </div>
              <div className="payslip-att-summary-grid">
                <div className="att-box att-box-present">
                  <span className="att-num">{activePayslipItem.present_days}</span>
                  <span className="att-txt">Full Days</span>
                </div>
                <div className="att-box att-box-half">
                  <span className="att-num">{activePayslipItem.half_days}</span>
                  <span className="att-txt">Half Days</span>
                </div>
                <div className="att-box att-box-paid">
                  <span className="att-num">{activePayslipItem.paid_leaves}</span>
                  <span className="att-txt">Paid Leaves</span>
                </div>
                <div className="att-box att-box-unpaid">
                  <span className="att-num">{activePayslipItem.unpaid_leaves}</span>
                  <span className="att-txt">Unpaid / LOP</span>
                </div>
                <div className="att-box att-box-hours">
                  <span className="att-num">{activePayslipItem.total_hours_worked}h</span>
                  <span className="att-txt">Logged Hours</span>
                </div>
              </div>

              {/* Dual Financial Ledger */}
              <div className="payslip-tables-row">
                {/* Earnings Table */}
                <div className="financial-col">
                  <div className="table-col-header header-earnings">
                    <span>EARNINGS & ALLOWANCES</span>
                    <span>AMOUNT (INR)</span>
                  </div>
                  <table className="financial-table">
                    <tbody>
                      <tr>
                        <td>Basic Monthly Wage</td>
                        <td className="text-right font-medium">{formatCurrency(activePayslipItem.base_salary)}</td>
                      </tr>
                      <tr>
                        <td>Calculated Daily Rate</td>
                        <td className="text-right font-medium text-muted">{formatCurrency(activePayslipItem.daily_rate)}/day</td>
                      </tr>
                      {activePayslipItem.allowances > 0 && (
                        <tr>
                          <td>Special Allowances / Stipend</td>
                          <td className="text-right font-medium text-success">+{formatCurrency(activePayslipItem.allowances)}</td>
                        </tr>
                      )}
                      <tr className="table-total-row">
                        <td><strong>Gross Total Earnings</strong></td>
                        <td className="text-right"><strong>{formatCurrency(activePayslipItem.base_salary + activePayslipItem.allowances)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Deductions Table */}
                <div className="financial-col">
                  <div className="table-col-header header-deductions">
                    <span>DEDUCTIONS & ADJUSTMENTS</span>
                    <span>AMOUNT (INR)</span>
                  </div>
                  <table className="financial-table">
                    <tbody>
                      <tr>
                        <td>Half-Day Shift Adjustment ({activePayslipItem.half_days} half days)</td>
                        <td className="text-right font-medium text-danger">
                          {activePayslipItem.half_day_deductions > 0 ? `-${formatCurrency(activePayslipItem.half_day_deductions)}` : '₹0.00'}
                        </td>
                      </tr>
                      <tr>
                        <td>Unpaid Leave / Absent ({activePayslipItem.unpaid_leaves} days)</td>
                        <td className="text-right font-medium text-danger">
                          {activePayslipItem.leave_deductions > 0 ? `-${formatCurrency(activePayslipItem.leave_deductions)}` : '₹0.00'}
                        </td>
                      </tr>
                      <tr className="table-total-row">
                        <td><strong>Total Deductions</strong></td>
                        <td className="text-right text-danger"><strong>-{formatCurrency(activePayslipItem.total_deductions)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net Disbursal Banner */}
              <div className="payslip-net-box">
                <div className="net-left">
                  <span className="net-title">NET DISBURSABLE SALARY</span>
                  <span className="net-sub">Net payout transferred to registered employee account</span>
                </div>
                <div className="net-right">
                  <span className="net-amount">{formatCurrency(activePayslipItem.net_salary)}</span>
                </div>
              </div>

              {/* Official Signatures & Seal Block */}
              <div className="payslip-signatures-row">
                <div className="signature-box">
                  <div className="sig-line" />
                  <span className="sig-title">Employee Signature</span>
                  <span className="sig-name">{activePayslipItem.employee_name}</span>
                </div>

                <div className="official-seal-box">
                  <div className="seal-badge">
                    <span className="seal-org">AttendIQ AI</span>
                    <span className="seal-auth">VERIFIED PAYROLL</span>
                    <span className="seal-date">{payrollData?.month_name} {selectedYear}</span>
                  </div>
                </div>

                <div className="signature-box text-right">
                  <div className="sig-line" />
                  <span className="sig-title">Authorized Signatory</span>
                  <span className="sig-name">Finance & HR Controller</span>
                </div>
              </div>

              <div className="payslip-footer-note">
                <p>This is an official system-generated salary slip verified by AttendIQ Biometric Facial Recognition AI Engine. All attendance punches and shift durations are mathematically authenticated.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          EDIT SALARY MODAL
          ══════════════════════════════════════════ */}
      {editingEmployee && (
        <div className="payslip-modal-backdrop" onClick={() => setEditingEmployee(null)}>
          <div className="edit-salary-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Configure Employee Salary</h2>
              <button onClick={() => setEditingEmployee(null)} className="btn-close-modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSalary}>
              <div className="modal-body">
                <div className="employee-preview-pill">
                  <div className="emp-avatar">{editingEmployee.employee_name.charAt(0)}</div>
                  <div>
                    <strong>{editingEmployee.employee_name}</strong>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>{editingEmployee.department_name} • Code: {editingEmployee.employee_code}</p>
                  </div>
                </div>

                <div className="form-group">
                  <label>Monthly Base Salary (₹):</label>
                  <input 
                    type="number"
                    step="500"
                    min="0"
                    required
                    value={editForm.base_salary}
                    onChange={(e) => setEditForm({ ...editForm, base_salary: e.target.value })}
                    className="modal-input"
                    placeholder="e.g. 35000"
                  />
                  <small style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px' }}>
                    Calculated daily rate: ₹{((parseFloat(editForm.base_salary) || 0) / (payrollData?.total_days_in_month || 30)).toFixed(2)}/day
                  </small>
                </div>

                <div className="form-group">
                  <label>Hourly Rate for Shifts (₹):</label>
                  <input 
                    type="number"
                    step="10"
                    min="0"
                    value={editForm.hourly_rate}
                    onChange={(e) => setEditForm({ ...editForm, hourly_rate: e.target.value })}
                    className="modal-input"
                    placeholder="e.g. 150"
                  />
                </div>

                <div className="form-group">
                  <label>Special Allowances / Stipend (₹):</label>
                  <input 
                    type="number"
                    step="100"
                    min="0"
                    value={editForm.allowances}
                    onChange={(e) => setEditForm({ ...editForm, allowances: e.target.value })}
                    className="modal-input"
                    placeholder="e.g. 2000"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setEditingEmployee(null)} 
                  className="btn-cancel"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-save"
                  disabled={updating}
                >
                  {updating ? 'Saving...' : 'Update & Recalculate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
