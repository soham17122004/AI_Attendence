import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { Monitor, CheckCircle, XCircle, RefreshCw, Plus, Wifi, ShieldAlert, Cpu } from 'lucide-react';
import { kioskService } from '../services/services';
import './KioskPage.css';

export default function KioskPage({ user }) {
  const [kiosks, setKiosks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newIp, setNewIp] = useState('');

  const loadKiosks = async () => {
    try {
      setLoading(true);
      const data = await kioskService.getAll();
      setKiosks(data);
    } catch (error) {
      console.error("Failed to load kiosks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKiosks();
  }, []);

  const handleRemove = async (id) => {
    if (window.confirm('Are you sure you want to remove this terminal device?')) {
      try {
        await kioskService.delete(id);
        await loadKiosks();
      } catch (err) {
        alert("Failed to remove kiosk device.");
      }
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const data = await kioskService.getAll();
      setKiosks(data);
    } catch (err) {
      console.error("Failed to sync kiosks:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = async (kiosk) => {
    const nextStatus = kiosk.status === 'online' ? 'offline' : 'online';
    try {
      await kioskService.update(kiosk.id, {
        name: kiosk.name,
        location: kiosk.location,
        ip: kiosk.ip,
        status: nextStatus,
        camera_status: nextStatus === 'online' ? 'Connected' : 'Disconnected',
        engine_status: nextStatus === 'online' ? 'Active' : 'Inactive',
        last_seen: nextStatus === 'online' ? 'Active / Just now' : 'Disabled by admin'
      });
      await loadKiosks();
    } catch (err) {
      alert("Failed to toggle kiosk status.");
    }
  };

  const activeCount = kiosks.filter(k => k.status === 'online').length;
  const offlineCount = kiosks.length - activeCount;

  return (
    <div className="kiosk-page">
      <PageHeader 
        title="Kiosk Devices" 
        subtitle="Monitor and coordinate AttendIQ facial recognition kiosk terminals"
        user={user}
      />

      <div className="kiosk-page-content">
        {/* KPI Row */}
        <div className="kiosks-kpi-grid">
          <div className="kpi-card-saas ai-card">
            <div className="saas-card-icon bg-blue-tint">
              <Monitor size={18} color="#2563eb" />
            </div>
            <div className="saas-card-content">
              <span className="saas-kpi-label">Total Terminals</span>
              <span className="saas-kpi-value font-heading">{kiosks.length}</span>
              <span className="saas-kpi-subtext">Registered kiosk nodes</span>
            </div>
          </div>

          <div className="kpi-card-saas ai-card">
            <div className="saas-card-icon bg-green-tint">
              <CheckCircle size={18} color="#10b981" />
            </div>
            <div className="saas-card-content">
              <span className="saas-kpi-label">Active Terminals</span>
              <span className="saas-kpi-value font-heading">{activeCount}</span>
              <span className="saas-kpi-subtext">Online & scanning</span>
            </div>
          </div>

          <div className="kpi-card-saas ai-card">
            <div className="saas-card-icon bg-red-tint">
              <XCircle size={18} color="#ef4444" />
            </div>
            <div className="saas-card-content">
              <span className="saas-kpi-label">Offline Terminals</span>
              <span className="saas-kpi-value font-heading">{offlineCount}</span>
              <span className="saas-kpi-subtext">Disabled/offline nodes</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="kiosks-toolbar ai-card">
          <div className="toolbar-left-side">
            <h3 className="toolbar-title">Active Devices</h3>
          </div>

          <div className="toolbar-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw size={14} className={syncing ? 'spin' : ''} />
              <span>{syncing ? 'Synchronizing...' : 'Sync Devices'}</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
              <Plus size={14} />
              <span>Provision Kiosk</span>
            </button>
          </div>
        </div>

        {/* Devices list */}
        {loading ? (
          <div className="p-20" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            <div className="skeleton" style={{ height: 260, borderRadius: '20px' }} />
            <div className="skeleton" style={{ height: 260, borderRadius: '20px' }} />
          </div>
        ) : kiosks.length === 0 ? (
          <div className="ai-card" style={{ padding: '40px', textAlign: 'center' }}>
            <p className="text-muted">No kiosk devices found. Tap "Provision Kiosk" to add your first terminal.</p>
          </div>
        ) : (
          <div className="kiosks-grid">
            {kiosks.map(kiosk => {
              const isOnline = kiosk.status === 'online';

              return (
                <div key={kiosk.id} className="kiosk-node-card ai-card">
                  <div className="kiosk-card-header">
                    <div className="kiosk-title-group">
                      <Monitor size={20} className={isOnline ? 'text-primary' : 'text-muted'} />
                      <div>
                        <h4>{kiosk.name}</h4>
                        <span>IP: {kiosk.ip}</span>
                      </div>
                    </div>

                    <button
                      className={`status-pill is-button ${isOnline ? 'online' : 'offline'}`}
                      onClick={() => handleToggleStatus(kiosk)}
                      style={{ outline: 'none' }}
                      title="Click to toggle ON/OFF"
                    >
                      <span className="pill-dot" />
                      {isOnline ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="kiosk-card-body-saas">
                    <div className="kiosk-detail-row">
                      <span className="detail-label">Location</span>
                      <span className="detail-value">{kiosk.location}</span>
                    </div>

                    <div className="kiosk-detail-row">
                      <span className="detail-label">Camera Stream</span>
                      <span className="detail-value flex-val">
                        {isOnline ? (
                          <>
                            <CheckCircle size={12} className="text-success" />
                            <span className="text-success">{kiosk.camera_status}</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert size={12} className="text-danger" />
                            <span className="text-danger">{kiosk.camera_status}</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="kiosk-detail-row">
                      <span className="detail-label">Recognition Engine</span>
                      <span className="detail-value flex-val">
                        {isOnline ? (
                          <>
                            <Cpu size={12} className="text-primary" />
                            <span className="text-primary">{kiosk.engine_status}</span>
                          </>
                        ) : (
                          <span>{kiosk.engine_status}</span>
                        )}
                      </span>
                    </div>

                    <div className="kiosk-detail-row">
                      <span className="detail-label">Last Ping</span>
                      <span className="detail-value">{kiosk.last_seen}</span>
                    </div>
                  </div>

                  <div className="kiosk-card-footer" style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => alert(`Opening diagnostic log panel for device: ${kiosk.name}`)}
                    >
                      Diagnose
                    </button>
                    {kiosk.id !== 1 && kiosk.id !== 2 && (
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemove(kiosk.id)}
                        style={{ padding: '0 12px', background: '#dc2626', color: '#fff' }}
                        title="Remove Terminal"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD TERMINAL MODAL */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-card ai-card" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Provision New Kiosk Terminal</h3>
              <button onClick={() => setShowAddModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newName.trim() || !newLocation.trim() || !newIp.trim()) return;
              try {
                await kioskService.create({
                  name: newName.trim(),
                  location: newLocation.trim(),
                  ip: newIp.trim()
                });
                setShowAddModal(false);
                setNewName('');
                setNewLocation('');
                setNewIp('');
                await loadKiosks();
              } catch (err) {
                alert("Failed to provision kiosk device.");
              }
            }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0' }}>
                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Terminal Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Backdoor Security Gate"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Physical Location *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Parking Gate B"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>IP Address / Domain *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 192.168.1.45"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Terminal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
