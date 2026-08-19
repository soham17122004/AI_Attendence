import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Settings, Building, Clock, ScanFace, Bell, Users, ShieldAlert, Laptop, Check } from 'lucide-react';
import './SettingsPage.css';

export default function SettingsPage({ user }) {
  const [activeTab, setActiveTab] = useState('rules'); // rules, org, face, notify, security
  const [saved, setSaved] = useState(false);

  // Settings values
  const [lateTime, setLateTime] = useState('10:00');
  const [shiftHours, setShiftHours] = useState(9);
  const [confidence, setConfidence] = useState(0.78);
  const [orgName, setOrgName] = useState('AttendIQ Enterprises');
  const [notifyAbsence, setNotifyAbsence] = useState(true);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  return (
    <div className="settings-page">
      <PageHeader 
        title="Settings" 
        subtitle="Configure workforce attendance parameters and security rules"
        user={user}
      />

      <div className="settings-page-content">
        <div className="settings-layout ai-card">
          {/* Tabs Sidebar */}
          <div className="settings-sidebar">
            <button 
              className={`settings-tab-btn ${activeTab === 'org' ? 'active' : ''}`}
              onClick={() => setActiveTab('org')}
            >
              <Building size={16} />
              <span>Organization</span>
            </button>
            
            <button 
              className={`settings-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              <Clock size={16} />
              <span>Attendance Rules</span>
            </button>

            <button 
              className={`settings-tab-btn ${activeTab === 'face' ? 'active' : ''}`}
              onClick={() => setActiveTab('face')}
            >
              <ScanFace size={16} />
              <span>Face Recognition</span>
            </button>

            <button 
              className={`settings-tab-btn ${activeTab === 'notify' ? 'active' : ''}`}
              onClick={() => setActiveTab('notify')}
            >
              <Bell size={16} />
              <span>Notifications</span>
            </button>

            <button 
              className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <ShieldAlert size={16} />
              <span>Security & Roles</span>
            </button>
          </div>

          {/* Settings Panels */}
          <div className="settings-panel-container">
            <form onSubmit={handleSave} className="settings-form">
              {/* ORGANIZATION TAB */}
              {activeTab === 'org' && (
                <div className="settings-panel">
                  <h3 className="panel-title">Organization Profile</h3>
                  <p className="panel-desc">Configure your public company branding and office locations.</p>
                  
                  <div className="form-group-saas">
                    <label className="form-label-saas">Organization Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                    />
                  </div>

                  <div className="form-group-saas">
                    <label className="form-label-saas">Corporate Email Address</label>
                    <input type="email" className="input-field" defaultValue="contact@attendiq.ai" />
                  </div>

                  <div className="form-group-saas">
                    <label className="form-label-saas">Office Primary Location</label>
                    <input type="text" className="input-field" defaultValue="Hitech City, Hyderabad" />
                  </div>
                </div>
              )}

              {/* ATTENDANCE RULES TAB */}
              {activeTab === 'rules' && (
                <div className="settings-panel">
                  <h3 className="panel-title">Attendance Rules</h3>
                  <p className="panel-desc">Establish daily checkpoints and parameters for late arrivals and shifts.</p>

                  <div className="form-group-saas">
                    <label className="form-label-saas">Late Arrival Threshold (Time)</label>
                    <input 
                      type="time" 
                      className="input-field" 
                      value={lateTime}
                      onChange={(e) => setLateTime(e.target.value)}
                    />
                    <span className="field-hint">Employees checking in after this hour will be prompted with a warning.</span>
                  </div>

                  <div className="form-group-saas">
                    <label className="form-label-saas">Required Shift Hours (Daily)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={shiftHours}
                      onChange={(e) => setShiftHours(Number(e.target.value))}
                    />
                    <span className="field-hint">Early check-out penalties are applied below this worked duration.</span>
                  </div>

                  <div className="form-group-saas">
                    <label className="form-label-saas">Check-in Type Override</label>
                    <select className="input-field" defaultValue="strict">
                      <option value="strict">Strict (Complete required shift)</option>
                      <option value="flexible">Flexible (Average monthly hour check)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* FACE RECOGNITION TAB */}
              {activeTab === 'face' && (
                <div className="settings-panel">
                  <h3 className="panel-title">Biometric Face Recognition</h3>
                  <p className="panel-desc">Fine-tune the neural comparison thresholds and models.</p>

                  <div className="form-group-saas">
                    <label className="form-label-saas">Recognition Distance Threshold</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0.1" 
                      max="1.0"
                      className="input-field" 
                      value={confidence}
                      onChange={(e) => setConfidence(parseFloat(e.target.value))}
                    />
                    <span className="field-hint">Lower values represent higher strictness (fewer false positives, but harder matches). Recommended: 0.78.</span>
                  </div>

                  <div className="form-group-saas">
                    <label className="form-label-saas">Liveness Detection (Anti-Spoofing)</label>
                    <select className="input-field" defaultValue="enabled">
                      <option value="enabled">Enabled (Prevents photo check-in spoofing)</option>
                      <option value="disabled">Disabled (Allows faster direct matching)</option>
                    </select>
                  </div>

                  <div className="form-group-saas">
                    <label className="form-label-saas">Auto-Capture Speed</label>
                    <select className="input-field" defaultValue="medium">
                      <option value="fast">Fast (Check face presence every 500ms)</option>
                      <option value="medium">Medium (Check face presence every 800ms)</option>
                      <option value="slow">Slow (Manual trigger button required)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === 'notify' && (
                <div className="settings-panel">
                  <h3 className="panel-title">Notification Settings</h3>
                  <p className="panel-desc">Configure automated email reports and Slack triggers.</p>

                  <div className="form-group-saas checkbox-group">
                    <input 
                      type="checkbox" 
                      id="absenceNotify" 
                      checked={notifyAbsence} 
                      onChange={(e) => setNotifyAbsence(e.target.checked)}
                    />
                    <label htmlFor="absenceNotify">Email admin on daily employee absence alerts</label>
                  </div>

                  <div className="form-group-saas checkbox-group">
                    <input type="checkbox" id="lateNotify" defaultChecked />
                    <label htmlFor="lateNotify">Send real-time late arrivals summary to HR team</label>
                  </div>

                  <div className="form-group-saas checkbox-group">
                    <input type="checkbox" id="checkoutNotify" defaultChecked />
                    <label htmlFor="checkoutNotify">Trigger alert notification on early checkout (Half Day)</label>
                  </div>
                </div>
              )}

              {/* SECURITY & ROLES TAB */}
              {activeTab === 'security' && (
                <div className="settings-panel">
                  <h3 className="panel-title">Security & API Access</h3>
                  <p className="panel-desc">Manage API access tokens and authentication profiles.</p>

                  <div className="form-group-saas">
                    <label className="form-label-saas">API Authentication Secret</label>
                    <input type="password" disabled className="input-field" value="••••••••••••••••••••••••" />
                  </div>

                  <div className="form-group-saas">
                    <label className="form-label-saas">Authorized CORS Origins</label>
                    <input type="text" className="input-field" defaultValue="*" />
                  </div>

                  <div className="form-group-saas">
                    <label className="form-label-saas">Administrator Role Restrictions</label>
                    <select className="input-field" defaultValue="full">
                      <option value="full">Full Admin (Manage employees & face models)</option>
                      <option value="editor">HR Specialist (Manage leave requests & attendance logs only)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="settings-panel-footer">
                <button type="submit" className="btn btn-primary">
                  {saved ? (
                    <>
                      <Check size={16} /> Saved
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
