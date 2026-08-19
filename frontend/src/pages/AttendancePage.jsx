import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { attendanceService, employeeService, departmentService } from '../services/services';
import { 
  Clock, 
  Calendar, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Users, 
  CheckSquare, 
  AlertTriangle,
  UserCheck,
  Plus,
  X,
  FileText
} from 'lucide-react';
import './AttendancePage.css';

export default function AttendancePage({ user }) {
  const [logs, setLogs] = useState([]);
  const [employeesMap, setEmployeesMap] = useState({});
  const [employeesList, setEmployeesList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Manual Attendance Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [manualSuccess, setManualSuccess] = useState('');
  const [manualError, setManualError] = useState('');
  const [manualForm, setManualForm] = useState({
    employee_id: '',
    attendance_date: new Date().toISOString().split('T')[0],
    status: 'present',
    check_in_time: '09:00',
    check_out_time: '18:00',
    notes: 'New employee / Manual verification entry'
  });

  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'administrator';

  const fetchLogsData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const [logsData, employeesData, deptsData] = await Promise.all([
        attendanceService.getAll().catch(() => []),
        employeeService.getAll().catch(() => []),
        departmentService.getAll().catch(() => [])
      ]);

      let userEmpId = null;

      const deptsMap = {};
      if (Array.isArray(deptsData)) {
        setDepartments(deptsData);
        deptsData.forEach((d) => {
          deptsMap[d.id] = d.name;
        });
      }

      if (Array.isArray(employeesData)) {
        setEmployeesList(employeesData);
        const empMap = {};
        employeesData.forEach((e) => {
          empMap[e.id] = {
            name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_id,
            department: deptsMap[e.department_id] || 'General',
            empCode: e.employee_id
          };
          if (user && (e.email === user.email || e.employee_id === user.username)) {
            userEmpId = e.id;
          }
        });
        setEmployeesMap(empMap);

        // Set default selected employee in modal if empty
        if (employeesData.length > 0 && !manualForm.employee_id) {
          setManualForm(prev => ({ ...prev, employee_id: employeesData[0].id }));
        }
      }

      let finalLogs = Array.isArray(logsData) ? logsData : [];

      if (!isAdmin && userEmpId) {
        finalLogs = finalLogs.filter((log) => log.employee_id === userEmpId);
      }

      setLogs(finalLogs);
    } catch (err) {
      console.error('Failed to load attendance logs:', err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchLogsData(true);

    const pollInterval = setInterval(() => {
      fetchLogsData(false);
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [user]);

  // Handle Manual Attendance Submit
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.employee_id) {
      setManualError('Please select an employee');
      return;
    }

    setSavingManual(true);
    setManualError('');
    setManualSuccess('');

    try {
      await attendanceService.manualRecord({
        employee_id: parseInt(manualForm.employee_id),
        attendance_date: manualForm.attendance_date,
        status: manualForm.status,
        check_in_time: manualForm.status === 'absent' || manualForm.status === 'on_leave' ? null : manualForm.check_in_time,
        check_out_time: manualForm.status === 'absent' || manualForm.status === 'on_leave' ? null : manualForm.check_out_time,
        notes: manualForm.notes
      });

      setManualSuccess('Attendance marked successfully!');
      setTimeout(() => {
        setIsManualModalOpen(false);
        setManualSuccess('');
      }, 1200);

      await fetchLogsData(false);
    } catch (err) {
      setManualError(err.response?.data?.detail || 'Failed to record manual attendance.');
    } finally {
      setSavingManual(false);
    }
  };

  // Helper when changing status in modal
  const handleStatusChange = (newStatus) => {
    let inTime = '09:00';
    let outTime = '18:00';
    if (newStatus === 'half_day') {
      outTime = '13:30';
    } else if (newStatus === 'absent' || newStatus === 'on_leave') {
      inTime = '';
      outTime = '';
    }
    setManualForm(prev => ({
      ...prev,
      status: newStatus,
      check_in_time: inTime,
      check_out_time: outTime
    }));
  };

  // Filtering logic
  const filteredLogs = logs.filter((log) => {
    const empInfo = employeesMap[log.employee_id] || {};
    const empName = (empInfo.name || log.employee_name || '').toLowerCase();
    const empCode = (empInfo.empCode || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = !query || empName.includes(query) || empCode.includes(query);

    const logDate = log.attendance_date || (log.check_in ? log.check_in.split('T')[0] : '');
    const matchesDate = !dateFilter || logDate === dateFilter;

    const matchesDept = deptFilter === 'ALL' || empInfo.department === deptFilter;

    const logStatus = (log.status || 'present').toUpperCase();
    const matchesStatus = statusFilter === 'ALL' || logStatus === statusFilter;

    let matchesType = true;
    if (typeFilter === 'CHECKED_IN') {
      matchesType = log.check_in && !log.check_out;
    } else if (typeFilter === 'CHECKED_OUT') {
      matchesType = log.check_in && log.check_out;
    }

    return matchesSearch && matchesDate && matchesDept && matchesStatus && matchesType;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const getInitials = (name) => {
    if (!name) return 'EM';
    return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
  };

  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'In Progress';
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end - start;
    if (diffMs <= 0) return '0 hrs';
    const hours = (diffMs / (1000 * 60 * 60)).toFixed(1);
    return `${hours} hrs`;
  };

  // Metrics summary
  const totalCheckIns = logs.length;
  const totalPresent = logs.filter(l => (l.status || '').toLowerCase() === 'present').length;
  const totalLate = logs.filter(l => (l.status || '').toLowerCase() === 'late').length;
  const totalHalfDay = logs.filter(l => (l.status || '').toLowerCase() === 'half_day' || (l.status || '').toLowerCase() === 'half day').length;

  return (
    <div className="attendance-page-container">
      <PageHeader 
        title={isAdmin ? "Attendance Logs & Control" : "My Attendance History"}
        subtitle={isAdmin ? "Verified AI facial recognition and manual check-in attendance records" : "View your personal verified attendance records"}
        user={user}
        onSearch={(q) => setSearchQuery(q)}
      />

      <div className="attendance-page-content">
        
        {/* SUMMARY CARDS GRID ROW */}
        {isAdmin && (
          <div className="attendance-stats-grid">
            <div className="stat-card-saas ai-card">
              <div className="stat-card-main-content">
                <span className="stat-label">Total Logs</span>
                <span className="stat-value font-heading">{totalCheckIns}</span>
                <span className="stat-hint">Registered scans & entries</span>
              </div>
              <div className="stat-card-visual">
                <div className="stat-icon-badge blue">
                  <Users size={16} />
                </div>
              </div>
            </div>

            <div className="stat-card-saas ai-card">
              <div className="stat-card-main-content">
                <span className="stat-label">On-Time Scans</span>
                <span className="stat-value font-heading">{totalPresent}</span>
                <span className="stat-hint">Marked Present</span>
              </div>
              <div className="stat-card-visual">
                <div className="stat-icon-badge green">
                  <CheckSquare size={16} />
                </div>
              </div>
            </div>

            <div className="stat-card-saas ai-card">
              <div className="stat-card-main-content">
                <span className="stat-label">Late Arrivals</span>
                <span className="stat-value font-heading">{totalLate}</span>
                <span className="stat-hint">Exceeded thresholds</span>
              </div>
              <div className="stat-card-visual">
                <div className="stat-icon-badge orange">
                  <AlertTriangle size={16} />
                </div>
              </div>
            </div>

            <div className="stat-card-saas ai-card">
              <div className="stat-card-main-content">
                <span className="stat-label">Half Days</span>
                <span className="stat-value font-heading">{totalHalfDay}</span>
                <span className="stat-hint">Early check-outs</span>
              </div>
              <div className="stat-card-visual">
                <div className="stat-icon-badge red">
                  <Clock size={16} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="attendance-filter-card ai-card">
          <div className="filter-item">
            <label>Search Employee</label>
            <div className="input-with-icon">
              <Search size={15} className="input-icon" />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Name or ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-item">
            <label>Date Filter</label>
            <input 
              type="date" 
              className="input-field"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          <div className="filter-item">
            <label>Department</label>
            <select 
              className="input-field" 
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d, idx) => (
                <option key={d.id || idx} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Status</label>
            <select 
              className="input-field" 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="ON_LEAVE">On Leave</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Check Type</label>
            <select 
              className="input-field" 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Events</option>
              <option value="CHECKED_IN">Currently Checked In</option>
              <option value="CHECKED_OUT">Checked Out</option>
            </select>
          </div>
        </div>

        {/* Attendance Records Table Card */}
        <div className="ai-card attendance-table-card">
          <div className="ai-card-header flex-header">
            <div>
              <h3 className="ai-card-title">Attendance Records</h3>
              <p className="ai-card-subtitle">Showing {filteredLogs.length} total entries</p>
            </div>

            {isAdmin && (
              <button 
                className="btn-mark-manual"
                onClick={() => {
                  setManualError('');
                  setManualSuccess('');
                  setIsManualModalOpen(true);
                }}
              >
                <Plus size={16} />
                <span>Mark Manual Attendance</span>
              </button>
            )}
          </div>

          <div className="ai-card-body p-0">
            {loading ? (
              <div className="p-20">
                <div className="skeleton" style={{ height: 250 }} />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="empty-attendance-state">
                <Clock size={40} color="#94a3b8" />
                <h4>No attendance logs found</h4>
                <p>Try adjusting your search query or date filters.</p>
              </div>
            ) : (
              <div className="ai-table-container">
                <table className="ai-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Working Hours</th>
                      <th>Status</th>
                      <th>Method / AI Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log) => {
                      const empInfo = employeesMap[log.employee_id] || {};
                      const empName = empInfo.name || log.employee_name || `Employee #${log.employee_id}`;
                      const deptName = empInfo.department || 'General';
                      const logDate = log.attendance_date || (log.check_in ? log.check_in.split('T')[0] : 'Today');
                      const status = (log.status || 'Present').toLowerCase();

                      const isLate = status === 'late';
                      const isHalfDay = status === 'half_day' || status === 'half day';
                      const isAbsent = status === 'absent';
                      const isOnLeave = status === 'on_leave';

                      const isManual = (log.recognition_method || '').toLowerCase() === 'manual';

                      return (
                        <tr key={log.id}>
                          <td>
                            <div className="table-user-cell">
                              <div className="user-avatar-circle">
                                {getInitials(empName)}
                              </div>
                              <div className="user-name-box">
                                <span className="user-full-name">{empName}</span>
                                <span className="user-sub-id">ID: {empInfo.empCode || 'N/A'}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge-dept">{deptName}</span>
                          </td>
                          <td>
                            <span className="log-date">{logDate}</span>
                          </td>
                          <td>
                            <span className="time-val">{formatTime(log.check_in)}</span>
                          </td>
                          <td>
                            <span className="time-val">{formatTime(log.check_out)}</span>
                          </td>
                          <td>
                            <span className="hours-badge">{calculateHours(log.check_in, log.check_out)}</span>
                          </td>
                          <td>
                            <span className={`status-pill ${
                              isAbsent ? 'absent' : 
                              isOnLeave ? 'on-leave' : 
                              isLate ? 'late' : 
                              isHalfDay ? 'half-day' : 
                              'present'
                            }`}>
                              {isAbsent ? 'Absent' : 
                               isOnLeave ? 'On Leave' : 
                               isLate ? 'Late' : 
                               isHalfDay ? 'Half Day' : 
                               'Present'}
                            </span>
                          </td>
                          <td>
                            {isManual ? (
                              <span className="badge-manual-method" title={log.notes || 'Manual Entry'}>
                                <UserCheck size={13} />
                                <span>Manual Punch</span>
                              </span>
                            ) : (
                              <div className="confidence-pill" title={`Confidence score: ${log.confidence_score || '98.5%'}`}>
                                <Zap size={12} />
                                <span>{log.confidence_score ? `${log.confidence_score}%` : 'Verified'}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredLogs.length > itemsPerPage && (
              <div className="table-pagination-footer">
                <span className="pagination-info">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
                </span>
                <div className="pagination-actions">
                  <button 
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="current-page-badge">{currentPage} / {totalPages}</span>
                  <button 
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MANUAL ATTENDANCE ENTRY MODAL
          ══════════════════════════════════════════ */}
      {isManualModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsManualModalOpen(false)}>
          <div className="modal-card manual-attendance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Mark Attendance Manually</h2>
                <p className="modal-subtitle">Direct manual attendance entry for new joiners or shift corrections</p>
              </div>
              <button onClick={() => setIsManualModalOpen(false)} className="btn-close-modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit}>
              <div className="modal-body">
                {manualSuccess && (
                  <div className="alert-success-banner">
                    <CheckCircle2 size={16} />
                    <span>{manualSuccess}</span>
                  </div>
                )}

                {manualError && (
                  <div className="alert-error-banner">
                    <AlertTriangle size={16} />
                    <span>{manualError}</span>
                  </div>
                )}

                {/* Employee Selection */}
                <div className="form-group">
                  <label>Select Employee:</label>
                  <select 
                    value={manualForm.employee_id} 
                    onChange={(e) => setManualForm({ ...manualForm, employee_id: e.target.value })}
                    className="modal-select"
                    required
                  >
                    <option value="">-- Choose Employee --</option>
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} (ID: {emp.employee_id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Attendance Date */}
                <div className="form-group">
                  <label>Attendance Date:</label>
                  <input 
                    type="date" 
                    value={manualForm.attendance_date}
                    onChange={(e) => setManualForm({ ...manualForm, attendance_date: e.target.value })}
                    className="modal-input"
                    required
                  />
                </div>

                {/* Status Selection Buttons */}
                <div className="form-group">
                  <label>Attendance Status:</label>
                  <div className="status-selector-grid">
                    <button
                      type="button"
                      className={`status-select-btn ${manualForm.status === 'present' ? 'active present' : ''}`}
                      onClick={() => handleStatusChange('present')}
                    >
                      <CheckCircle2 size={15} />
                      <span>Full Present</span>
                    </button>

                    <button
                      type="button"
                      className={`status-select-btn ${manualForm.status === 'half_day' ? 'active half-day' : ''}`}
                      onClick={() => handleStatusChange('half_day')}
                    >
                      <Clock size={15} />
                      <span>Half Day (4.5h)</span>
                    </button>

                    <button
                      type="button"
                      className={`status-select-btn ${manualForm.status === 'absent' ? 'active absent' : ''}`}
                      onClick={() => handleStatusChange('absent')}
                    >
                      <XCircle size={15} />
                      <span>Absent</span>
                    </button>

                    <button
                      type="button"
                      className={`status-select-btn ${manualForm.status === 'on_leave' ? 'active on-leave' : ''}`}
                      onClick={() => handleStatusChange('on_leave')}
                    >
                      <Calendar size={15} />
                      <span>On Leave</span>
                    </button>
                  </div>
                </div>

                {/* Check In / Check Out Times */}
                {manualForm.status !== 'absent' && manualForm.status !== 'on_leave' && (
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Check-In Time:</label>
                      <input 
                        type="time" 
                        value={manualForm.check_in_time}
                        onChange={(e) => setManualForm({ ...manualForm, check_in_time: e.target.value })}
                        className="modal-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Check-Out Time:</label>
                      <input 
                        type="time" 
                        value={manualForm.check_out_time}
                        onChange={(e) => setManualForm({ ...manualForm, check_out_time: e.target.value })}
                        className="modal-input"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Notes / Reason */}
                <div className="form-group">
                  <label>Remarks / Notes:</label>
                  <input 
                    type="text" 
                    value={manualForm.notes}
                    onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                    className="modal-input"
                    placeholder="e.g. New employee face scan pending, field work, etc."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setIsManualModalOpen(false)} 
                  className="btn btn-secondary"
                  disabled={savingManual}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-save-manual"
                  disabled={savingManual}
                >
                  {savingManual ? 'Saving...' : 'Save Attendance Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
