import React from 'react';
import { Building2 } from 'lucide-react';
import './DepartmentPerformance.css';

export default function DepartmentPerformance({ departments = [] }) {
  return (
    <div className="dept-performance-container">
      {departments.length === 0 ? (
        <div className="empty-dept-perf-state">
          <Building2 size={32} color="#94a3b8" />
          <p>No departments created yet.</p>
        </div>
      ) : (
        departments.map((dept, idx) => {
          const rate = dept.rate !== undefined ? dept.rate : (dept.attendance_rate || 0);
          const colorClass = rate >= 88 ? 'high' : rate >= 80 ? 'medium' : 'low';
          const empCount = dept.total_employees || dept.employee_count || 0;

          return (
            <div className="dept-perf-item" key={dept.id || idx}>
              <div className="dept-perf-header">
                <div className="dept-name-wrapper">
                  <span className="dept-title">{dept.name}</span>
                  <span className="dept-count">{empCount} employees</span>
                </div>
                <span className={`dept-percentage rate-${colorClass}`}>{rate}%</span>
              </div>

              <div className="dept-progress-track">
                <div 
                  className={`dept-progress-bar bar-${colorClass}`} 
                  style={{ width: `${rate}%` }} 
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
