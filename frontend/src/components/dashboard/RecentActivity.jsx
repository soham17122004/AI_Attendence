import React from 'react';
import { UserCheck, UserPlus, Scan, CalendarCheck, Clock } from 'lucide-react';
import './RecentActivity.css';

export default function RecentActivity({ activities = [] }) {
  return (
    <div className="recent-activity-list">
      {activities.length === 0 ? (
        <div className="empty-activity-state">
          <Clock size={28} color="#94a3b8" />
          <p>No recent activity recorded yet.</p>
        </div>
      ) : (
        activities.map((act, idx) => {
          const IconComponent = act.icon || Clock;
          return (
            <div className="activity-item" key={act.id || idx}>
              <div className={`act-icon-bubble color-${act.color || 'blue'}`}>
                <IconComponent size={15} />
              </div>

              <div className="act-content">
                <div className="act-title-row">
                  <span className="act-title">{act.title}</span>
                  <span className="act-time">{act.time}</span>
                </div>
                <span className="act-desc">{act.desc}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
