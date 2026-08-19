import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { leaveService, employeeService } from '../services/services';
import { CalendarCheck, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import './LeavesPage.css';

export default function LeavesPage({ user }) {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const fetchLeaves = async () => {
    try {
      const data = await leaveService.getAll().catch(() => []);
      setLeaves(Array.isArray(data) ? data : []);
      const emps = await employeeService.getAll().catch(() => []);
      setEmployees(Array.isArray(emps) ? emps : []);
    } catch (err) {
      console.error('Failed to load leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        employee_id: parseInt(employeeId),
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason
      };
      if (leaveService.createRequest) {
        await leaveService.createRequest(payload);
      } else if (leaveService.create) {
        await leaveService.create(payload);
      }
      setShowModal(false);
      setReason('');
      fetchLeaves();
    } catch (err) {
      alert('Error submitting leave request: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      if (leaveService.updateStatus) {
        await leaveService.updateStatus(id, newStatus);
      } else if (leaveService.update) {
        await leaveService.update(id, { status: newStatus.toLowerCase() });
      }
      fetchLeaves();
    } catch (err) {
      alert('Failed updating leave status.');
    }
  };

  return (
    <div className="leaves-page-container">
      <PageHeader 
        title="Leave Requests"
        subtitle="Review employee time-off applications, approvals, and leave balance tracking"
        user={user}
      />

      <div className="leaves-content">
        <div className="leaves-action-bar ai-card">
          <div>
            <h3 className="ai-card-title">All Requests</h3>
            <p className="ai-card-subtitle">{leaves.length} time-off submissions</p>
          </div>

          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Request Time-Off</span>
          </button>
        </div>

        <div className="ai-card leaves-table-card">
          <div className="ai-card-body p-0">
            {loading ? (
              <div className="p-20">
                <div className="skeleton" style={{ height: 240 }} />
              </div>
            ) : leaves.length === 0 ? (
              <div className="empty-leaves-state">
                <CalendarCheck size={40} color="#94a3b8" />
                <h4>No leave requests found</h4>
                <p>New time-off applications will appear here for admin review.</p>
              </div>
            ) : (
              <div className="ai-table-container">
                <table className="ai-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Duration</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave) => (
                      <tr key={leave.id}>
                        <td>
                          <strong>{leave.employee_name || `Employee #${leave.employee_id}`}</strong>
                        </td>
                        <td>
                          <span className="badge badge-info">{leave.leave_type || 'Casual'}</span>
                        </td>
                        <td>{leave.start_date} to {leave.end_date}</td>
                        <td>{leave.reason || 'N/A'}</td>
                        <td>
                          <span className={`badge ${
                            (leave.status || '').toLowerCase() === 'approved' ? 'badge-success' :
                            (leave.status || '').toLowerCase() === 'rejected' ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {leave.status || 'Pending'}
                          </span>
                        </td>
                        <td>
                          {((leave.status || '').toLowerCase() === 'pending') && (
                            <div className="action-buttons-group">
                              <button onClick={() => handleStatusUpdate(leave.id, 'Approved')} className="btn btn-secondary btn-sm text-success">
                                <CheckCircle2 size={14} /> Approve
                              </button>
                              <button onClick={() => handleStatusUpdate(leave.id, 'Rejected')} className="btn btn-danger btn-sm">
                                <XCircle size={14} /> Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card ai-card">
            <div className="modal-header">
              <h3 className="modal-title">Apply for Time-Off</h3>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleApply} className="modal-form">
              <div className="input-group">
                <label>Employee *</label>
                <select 
                  className="input-field" 
                  value={employeeId} 
                  onChange={(e) => setEmployeeId(e.target.value)} 
                  required
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Leave Type *</label>
                <select 
                  className="input-field"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Vacation">Paid Vacation</option>
                </select>
              </div>

              <div className="form-grid">
                <div className="input-group">
                  <label>Start Date *</label>
                  <input 
                    type="date" 
                    className="input-field"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>End Date *</label>
                  <input 
                    type="date" 
                    className="input-field"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Reason</label>
                <textarea 
                  className="input-field"
                  rows="3"
                  placeholder="Medical reason, family event, personal, etc."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                ></textarea>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Application</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
