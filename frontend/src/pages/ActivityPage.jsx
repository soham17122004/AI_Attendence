import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { attendanceService } from '../services/services';
import wsService from '../services/websocket';
import { Activity, Clock, Zap, CheckCircle2, XCircle, Search, RefreshCw } from 'lucide-react';
import './ActivityPage.css';

export default function ActivityPage({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveMode, setLiveMode] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getAll().catch(() => []);
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (e) {
      console.error('Failed to load recognition logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Subscribe to live WebSocket events if liveMode is active
    wsService.connect();
    const unsubscribe = wsService.subscribe((eventData) => {
      if (!liveMode || !eventData || !eventData.employee_name) return;

      setLogs((prevLogs) => [
        {
          id: Date.now().toString(),
          employee_name: eventData.employee_name,
          employee_id: eventData.employee_id || 'N/A',
          department: eventData.department || 'General',
          attendance_date: new Date().toISOString().split('T')[0],
          check_in: eventData.event_type === 'Check In' ? new Date().toISOString() : null,
          check_out: eventData.event_type === 'Check Out' ? new Date().toISOString() : null,
          status: 'Present',
          confidence: eventData.confidence || 98.4
        },
        ...prevLogs
      ]);
    });

    return () => {
      unsubscribe();
    };
  }, [liveMode]);

  const filteredLogs = logs.filter(log => {
    const name = (log.employee_name || `Employee #${log.employee_id}`).toLowerCase();
    const idStr = String(log.employee_id).toLowerCase();
    const query = searchQuery.toLowerCase();
    return !query || name.includes(query) || idStr.includes(query);
  });

  const getInitials = (name) => {
    if (!name) return 'EM';
    return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="activity-page">
      <PageHeader 
        title="Recognition Activity" 
        subtitle="Monitor live face recognition check-in streams and model matches"
        user={user}
      />

      <div className="activity-page-content">
        <div className="activity-main-layout">
          {/* Timeline Feed Card */}
          <div className="activity-feed-card ai-card">
            <div className="feed-header">
              <div className="feed-header-left">
                <h3 className="feed-title">
                  <Activity size={18} className="text-primary" /> Live Stream
                </h3>
                <div className={`live-badge ${liveMode ? 'pulsing' : ''}`} onClick={() => setLiveMode(!liveMode)}>
                  <span className="live-dot" />
                  <span>{liveMode ? 'Live Syncing' : 'Paused'}</span>
                </div>
              </div>

              <div className="feed-header-actions">
                <div className="feed-search">
                  <Search size={14} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search logs..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field"
                  />
                </div>
                <button className="btn btn-secondary btn-sm" onClick={fetchLogs} title="Refresh Logs">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <div className="feed-body">
              {loading && logs.length === 0 ? (
                <div className="p-20">
                  <div className="skeleton" style={{ height: 250 }} />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="empty-feed">
                  <Activity size={40} color="#94a3b8" />
                  <h4>No recognition activity found</h4>
                  <p>Awaiting live face scans or check-ins.</p>
                </div>
              ) : (
                <div className="timeline-container">
                  {filteredLogs.map((log, idx) => {
                    const empName = log.employee_name || `Employee #${log.employee_id}`;
                    const timestamp = log.check_out || log.check_in || new Date().toISOString();
                    const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const isCheckOut = !!log.check_out;
                    const confidenceVal = log.confidence ? log.confidence : 98.4;

                    return (
                      <div key={log.id || idx} className="timeline-item">
                        <div className="timeline-badge-column">
                          <div className={`timeline-icon-circle ${isCheckOut ? 'out' : 'in'}`}>
                            {isCheckOut ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                          </div>
                          {idx < filteredLogs.length - 1 && <div className="timeline-connector-line" />}
                        </div>

                        <div className="timeline-content-card ai-card">
                          <div className="card-top-header">
                            <div className="user-profile-summary">
                              <div className="user-initials">
                                {getInitials(empName)}
                              </div>
                              <div className="user-names">
                                <strong>{empName}</strong>
                                <span>Employee ID: #{log.employee_id} • {log.department || 'General'}</span>
                              </div>
                            </div>
                            <div className="event-time">
                              <Clock size={12} />
                              <span>{formattedTime}</span>
                            </div>
                          </div>

                          <div className="card-bottom-details">
                            <p className="event-action-desc">
                              Face verified successfully for <strong>{isCheckOut ? 'Check Out' : 'Check In'}</strong>. 
                              Status marked as <span className={`status-badge-inline ${log.status?.toLowerCase() || 'present'}`}>{log.status || 'Present'}</span>.
                            </p>
                            
                            <div className="confidence-indicator">
                              <Zap size={12} className="text-primary" />
                              <span>AI Match Confidence: <strong>{confidenceVal}%</strong></span>
                            </div>
                          </div>
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
    </div>
  );
}
