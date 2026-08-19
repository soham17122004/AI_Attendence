import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace, Clock, UserPlus, BarChart3 } from 'lucide-react';
import './QuickActions.css';

export default function QuickActions({ onAddEmployeeClick }) {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Launch AI Kiosk',
      icon: ScanFace,
      color: 'blue',
      onClick: () => navigate('/kiosk')
    },
    {
      label: 'View Attendance',
      icon: Clock,
      color: 'green',
      onClick: () => navigate('/attendance')
    },
    {
      label: 'Add Employee',
      icon: UserPlus,
      color: 'purple',
      onClick: () => {
        if (onAddEmployeeClick) onAddEmployeeClick();
        else navigate('/employees');
      }
    },
    {
      label: 'View Analytics',
      icon: BarChart3,
      color: 'orange',
      onClick: () => navigate('/analytics')
    }
  ];

  return (
    <div className="quick-actions-grid">
      {actions.map((act, idx) => {
        const Icon = act.icon;
        return (
          <button 
            className="quick-action-card" 
            key={idx}
            onClick={act.onClick}
          >
            <div className={`action-icon-wrapper color-${act.color}`}>
              <Icon size={18} />
            </div>
            <span className="action-label">{act.label}</span>
          </button>
        );
      })}
    </div>
  );
}
