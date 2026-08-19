import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import './AttendanceDonut.css';

export default function AttendanceDonut({ present = 0, absent = 0, late = 0, total = 0 }) {
  const isZero = present === 0 && absent === 0 && late === 0;

  const pieData = isZero ? [
    { name: 'No Data', value: 1, color: '#e2e8f0' }
  ] : [
    { name: 'Present', value: present, color: '#10b981' },
    { name: 'Absent', value: absent, color: '#ef4444' },
    { name: 'Late', value: late, color: '#f59e0b' }
  ];

  const calculatedTotal = total || (present + absent + late);
  const attendanceRate = calculatedTotal > 0 ? Math.round((present / calculatedTotal) * 100) : 0;

  return (
    <div className="attendance-donut-container">
      <div className="donut-chart-wrapper">
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={isZero ? 0 : 4}
              dataKey="value"
              cornerRadius={isZero ? 0 : 5}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            {!isZero && (
              <Tooltip 
                formatter={(value, name) => [`${value} Employees`, name]}
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.8rem'
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center-badge">
          <span className="rate-value font-heading">{attendanceRate}%</span>
          <span className="rate-label">Attendance</span>
        </div>
      </div>

      <div className="donut-legend-grid">
        <div className="legend-item">
          <div className="legend-indicator" style={{ background: '#10b981' }} />
          <div className="legend-info">
            <span className="legend-label">Present</span>
            <span className="legend-val">{present}</span>
          </div>
        </div>

        <div className="legend-item">
          <div className="legend-indicator" style={{ background: '#ef4444' }} />
          <div className="legend-info">
            <span className="legend-label">Absent</span>
            <span className="legend-val">{absent}</span>
          </div>
        </div>

        <div className="legend-item">
          <div className="legend-indicator" style={{ background: '#f59e0b' }} />
          <div className="legend-info">
            <span className="legend-label">Late</span>
            <span className="legend-val">{late}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
