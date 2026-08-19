import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, ScanFace, ArrowRight, ShieldCheck } from 'lucide-react';
import './AIStatusCard.css';

export default function AIStatusCard({ registeredCount = 124 }) {
  const navigate = useNavigate();

  return (
    <div className="ai-status-card ai-card">
      <div className="ai-status-header">
        <div className="ai-status-title-group">
          <ScanFace size={20} className="ai-icon" />
          <div>
            <h3 className="ai-card-title">AI Recognition System</h3>
            <span className="ai-card-subtitle">Real-time biometrics & camera stream</span>
          </div>
        </div>

        <div className="system-online-badge">
          <span className="pulse-dot" />
          <span>System Online</span>
        </div>
      </div>

      <div className="ai-status-grid">
        <div className="status-grid-item">
          <span className="item-label">Camera Stream</span>
          <span className="item-value val-success">
            <CheckCircle2 size={14} /> Connected
          </span>
        </div>

        <div className="status-grid-item">
          <span className="item-label">Recognition Engine</span>
          <span className="item-value val-info">Active</span>
        </div>

        <div className="status-grid-item">
          <span className="item-label">Registered Faces</span>
          <span className="item-value font-heading">{registeredCount}</span>
        </div>

        <div className="status-grid-item">
          <span className="item-label">Match Accuracy</span>
          <span className="item-value font-heading">98.6%</span>
        </div>
      </div>

      <div className="ai-status-footer">
        <span className="last-rec-time">Last recognition: 2 minutes ago</span>
        <button 
          className="btn btn-primary btn-sm kiosk-open-btn"
          onClick={() => navigate('/kiosk')}
        >
          <span>Open AI Kiosk</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
