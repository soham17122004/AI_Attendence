import React from 'react';
import { UserCheck, CheckCircle2, Zap, Clock } from 'lucide-react';
import './LiveAttendance.css';

export default function LiveAttendance({ events = [] }) {
  const getInitials = (name) => {
    if (!name) return 'EMP';
    return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="live-attendance-container">
      <div className="live-header-badge">
        <span className="pulse-dot" />
        <span className="live-label">LIVE STREAM</span>
      </div>

      <div className="live-events-list">
        {events.length === 0 ? (
          <div className="empty-live-state">
            <Clock size={32} color="#94a3b8" />
            <p>No live recognition events recorded today yet.</p>
          </div>
        ) : (
          events.map((evt, idx) => (
            <div className="live-event-row" key={evt.id || idx}>
              <div className="live-emp-avatar">
                {getInitials(evt.employee_name)}
              </div>

              <div className="live-emp-info">
                <div className="live-emp-name">{evt.employee_name}</div>
                <div className="live-emp-dept">{evt.department || 'General'}</div>
              </div>

              <div className="live-event-time">
                <span>{evt.time}</span>
              </div>

              <div className="live-type-badge">
                <span className="badge badge-success">
                  <CheckCircle2 size={12} />
                  {evt.event_type || 'Check In'}
                </span>
              </div>

              <div className="live-confidence">
                <Zap size={13} className="conf-icon" />
                <span>{evt.confidence}%</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
