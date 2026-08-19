import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { 
  attendanceService, 
  leaveService, 
  employeeService, 
  departmentService 
} from '../services/services';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  AlertCircle, 
  User, 
  Mail, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  Briefcase
} from 'lucide-react';
import './EmployeeDashboardPage.css';

export default function EmployeeDashboardPage({ user }) {
  const [employee, setEmployee] = useState(null);
  const [departmentName, setDepartmentName] = useState('General');
  const [logs, setLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Leave Apply Modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [activeEmployeeId, setActiveEmployeeId] = useState(user?.employee_id || null);

  const fetchData = async () => {
    try {
      setLoading(true);
      let resolvedEmpId = user?.employee_id || activeEmployeeId;

      // If missing, refresh profile from /auth/me
      if (!resolvedEmpId) {
        try {
          const freshUser = await authService.getCurrentUser();
          if (freshUser?.employee_id) {
            resolvedEmpId = freshUser.employee_id;
            setActiveEmployeeId(resolvedEmpId);
          }
        } catch (e) {
          console.warn("Could not refresh current user:", e);
        }
      }

      // If still missing, try matching employee list by email
      if (!resolvedEmpId) {
        try {
          const allEmps = await employeeService.getAll();
          if (Array.isArray(allEmps)) {
            const matched = allEmps.find(e => 
              (e.email && user?.email && e.email.toLowerCase() === user.email.toLowerCase()) ||
              (e.employee_id && user?.username && e.employee_id.toLowerCase() === user.username.toLowerCase())
            );
            if (matched) {
              resolvedEmpId = matched.id;
              setActiveEmployeeId(resolvedEmpId);
            }
          }
        } catch (e) {
          console.warn("Could not query employees list:", e);
        }
      }

      if (!resolvedEmpId) {
        setLoading(false);
        return;
      }

      // Fetch employee, logs, leaves, and departments
      const [empData, logsData, leavesData, deptsData] = await Promise.all([
        employeeService.getById(resolvedEmpId).catch(() => null),
        attendanceService.getByEmployee(resolvedEmpId).catch(() => []),
        leaveService.getAll(resolvedEmpId).catch(() => []),
        departmentService.getAll().catch(() => [])
      ]);

      if (empData) {
        setEmployee(empData);
        if (deptsData && Array.isArray(deptsData)) {
          const dept = deptsData.find(d => d.id === empData.department_id);
          if (dept) setDepartmentName(dept.name);
        }
      }

      setLogs(Array.isArray(logsData) ? logsData : []);
      setLeaves(Array.isArray(leavesData) ? leavesData : []);
    } catch (error) {
      console.error("Error fetching employee dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.employee_id) {
      setActiveEmployeeId(user.employee_id);
    }
    fetchData();
  }, [user]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      alert("Please fill in all fields.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      alert("End date cannot be earlier than start date.");
      return;
    }

    try {
      setSubmittingLeave(true);
      const payload = {
        employee_id: activeEmployeeId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim()
      };

      await leaveService.create(payload);
      alert("Leave request submitted successfully!");
      setShowLeaveModal(false);
      setReason('');
      setStartDate('');
      setEndDate('');
      // Reload leaves list
      const updatedLeaves = await leaveService.getAll(activeEmployeeId).catch(() => []);
      setLeaves(updatedLeaves);
    } catch (error) {
      alert("Failed to submit leave request: " + (error.response?.data?.detail || error.message));
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Helper calculation
  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'In Progress';
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end - start;
    if (diffMs <= 0) return '0 hrs';
    const hours = (diffMs / (1000 * 60 * 60)).toFixed(1);
    return `${hours} hrs`;
  };

  // Statistics summaries
  const totalDays = logs.length;
  const presentDays = logs.filter(l => (l.status || '').toLowerCase() === 'present').length;
  const lateDays = logs.filter(l => (l.status || '').toLowerCase() === 'late').length;
  const halfDays = logs.filter(l => (l.status || '').toLowerCase() === 'half_day' || (l.status || '').toLowerCase() === 'half day').length;
  const pendingLeavesCount = leaves.filter(l => (l.status || '').toLowerCase() === 'pending').length;
  const attendanceRate = totalDays > 0 ? Math.round(((presentDays + lateDays + (halfDays * 0.5)) / totalDays) * 100) : 100;

  // Pagination logs
  const totalPages = Math.ceil(logs.length / itemsPerPage) || 1;
  const paginatedLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <div className="employee-dashboard-container loading-state">
        <div className="loader-spinner" />
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  if (!activeEmployeeId && !employee) {
    return (
      <div className="employee-dashboard-container error-state p-30">
        <div className="ai-card p-30 text-center">
          <AlertCircle size={40} className="text-danger mb-10" />
          <h3>Access Configuration Required</h3>
          <p className="text-muted">Your account is not linked to any Employee profile. Please contact an administrator to bind your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-dashboard-container">
      <PageHeader 
        title={`Welcome back, ${employee?.first_name || user?.username}`}
        subtitle="View your daily logs, track attendance rates, and request time-off."
        user={user}
      />

      <div className="employee-dashboard-content">
        {/* Profile Card & Stats Row */}
        <div className="dashboard-summary-grid">
          {/* Employee Details Card */}
          <div className="ai-card profile-details-card">
            <div className="profile-details-header">
              <div className="profile-avatar">
                {((employee?.first_name?.[0] || '') + (employee?.last_name?.[0] || '')).toUpperCase() || 'EM'}
              </div>
              <div>
                <h3 className="profile-name">{employee?.first_name} {employee?.last_name}</h3>
                <span className="profile-id-tag">#{employee?.employee_id}</span>
              </div>
            </div>
            <div className="profile-details-body">
              <div className="profile-info-item">
                <Briefcase size={14} className="info-icon" />
                <span><strong>Department:</strong> {departmentName}</span>
              </div>
              <div className="profile-info-item">
                <Mail size={14} className="info-icon" />
                <span><strong>Email:</strong> {employee?.email}</span>
              </div>
              <div className="profile-info-item">
                <Clock size={14} className="info-icon" />
                <span><strong>Status:</strong> <span className={`badge ${employee?.is_active ? 'badge-success' : 'badge-danger'}`}>{employee?.is_active ? 'Active' : 'Inactive'}</span></span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="metrics-grid">
            <div className="ai-card metric-card hover-glow">
              <div className="metric-icon rate-icon">
                <Clock size={18} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Attendance Rate</span>
                <h2 className="metric-value">{attendanceRate}%</h2>
                <span className="metric-desc">Based on logged days</span>
              </div>
            </div>

            <div className="ai-card metric-card hover-glow">
              <div className="metric-icon present-icon">
                <CheckCircle2 size={18} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Present Days</span>
                <h2 className="metric-value">{presentDays + lateDays}</h2>
                <span className="metric-desc">{lateDays} late entries</span>
              </div>
            </div>

            <div className="ai-card metric-card hover-glow">
              <div className="metric-icon pending-icon">
                <Calendar size={18} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Pending Leaves</span>
                <h2 className="metric-value">{pendingLeavesCount}</h2>
                <span className="metric-desc">Awaiting admin review</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Log Table & Leave Tracker Split */}
        <div className="dashboard-details-split">
          
          {/* LEFT: Attendance logs */}
          <div className="ai-card attendance-history-card">
            <div className="ai-card-header">
              <div>
                <h3 className="ai-card-title">Recent Attendance Logs</h3>
                <p className="ai-card-subtitle">Your latest face-scanning attendance history</p>
              </div>
            </div>
            
            <div className="ai-card-body p-0">
              {logs.length === 0 ? (
                <div className="empty-state p-30 text-center">
                  <Clock size={36} color="#94a3b8" className="mb-10" />
                  <h4>No logs recorded</h4>
                  <p className="text-muted">Once your face scanner verify checking-in, records will display here.</p>
                </div>
              ) : (
                <>
                  <div className="ai-table-container">
                    <table className="ai-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Check-in</th>
                          <th>Check-out</th>
                          <th>Working Hours</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedLogs.map((log) => {
                          const status = (log.status || 'Present').toLowerCase();
                          return (
                            <tr key={log.id}>
                              <td>{log.attendance_date}</td>
                              <td>{log.check_in ? new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                              <td>{log.check_out ? new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                              <td>{calculateHours(log.check_in, log.check_out)}</td>
                              <td>
                                <span className={`badge ${
                                  status === 'present' ? 'badge-success' :
                                  status === 'late' ? 'badge-warning' : 'badge-danger'
                                }`}>
                                  {log.status || 'Present'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination footer */}
                  {totalPages > 1 && (
                    <div className="pagination-footer">
                      <button 
                        className="btn btn-secondary btn-sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-sm">Page {currentPage} of {totalPages}</span>
                      <button 
                        className="btn btn-secondary btn-sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Leaves tracker */}
          <div className="ai-card leaves-tracker-card">
            <div className="ai-card-header flex-header">
              <div>
                <h3 className="ai-card-title">My Leaves Tracker</h3>
                <p className="ai-card-subtitle">Manage and track your leave request statuses</p>
              </div>
              <button 
                onClick={() => setShowLeaveModal(true)} 
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} />
                <span>Apply Leave</span>
              </button>
            </div>

            <div className="ai-card-body">
              {leaves.length === 0 ? (
                <div className="empty-state p-30 text-center">
                  <Calendar size={36} color="#94a3b8" className="mb-10" />
                  <h4>No leave requests</h4>
                  <p className="text-muted">Click "Apply Leave" above to apply for a sick or casual leave.</p>
                </div>
              ) : (
                <div className="leaves-list-scroll">
                  {leaves.map((leave) => {
                    const status = (leave.status || 'Pending').toLowerCase();
                    return (
                      <div key={leave.id} className="leave-row-item hover-glow">
                        <div className="leave-row-header">
                          <span className="badge badge-info">{leave.leave_type}</span>
                          <span className={`badge ${
                            status === 'approved' ? 'badge-success' :
                            status === 'rejected' ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {leave.status || 'Pending'}
                          </span>
                        </div>
                        <div className="leave-row-details">
                          <span className="leave-dates">
                            <Calendar size={12} className="inline-icon" /> 
                            {leave.start_date} to {leave.end_date}
                          </span>
                          <p className="leave-reason">
                            <FileText size={12} className="inline-icon" />
                            {leave.reason || 'No reason provided'}
                          </p>
                          {leave.rejection_reason && (
                            <div className="rejection-note text-danger">
                              <strong>Rejection Reason:</strong> {leave.rejection_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* LEAVE REQUEST MODAL */}
      {showLeaveModal && (
        <div className="modal-backdrop">
          <div className="ai-card modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Apply for Time-Off</h3>
              <button 
                className="close-modal-btn" 
                onClick={() => setShowLeaveModal(false)}
              >
                <XCircle size={18} />
              </button>
            </div>
            
            <form onSubmit={handleApplyLeave} className="modal-form">
              <div className="form-group">
                <label className="input-label">Leave Type</label>
                <select 
                  className="input-field" 
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Earned">Earned Leave</option>
                  <option value="Maternity/Paternity">Maternity/Paternity</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="input-label">Start Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">End Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Reason</label>
                <textarea 
                  className="input-field" 
                  rows="3" 
                  placeholder="Explain reason for leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submittingLeave}
                >
                  {submittingLeave ? "Submitting..." : "Submit Request"}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowLeaveModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
