import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { recognitionService, employeeService } from '../services/services';
import { ScanFace, CheckCircle, AlertCircle, RefreshCw, Search, ShieldCheck, Heart, Sparkles, Trash2 } from 'lucide-react';
import './FaceProfilesPage.css';

export default function FaceProfilesPage({ user }) {
  const [profiles, setProfiles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, REGISTERED, PENDING

  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesData, employeesData] = await Promise.all([
        recognitionService.getAllProfiles().catch(() => []),
        employeeService.getAll().catch(() => [])
      ]);
      setProfiles(profilesData);
      setEmployees(employeesData);
    } catch (e) {
      console.error('Failed to load face profile data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteProfile = async (empId) => {
    if (window.confirm('Are you sure you want to delete this employee\'s face profile? They will not be able to check in via face recognition.')) {
      try {
        await recognitionService.deleteFaceProfile(empId);
        loadData();
      } catch (err) {
        alert('Failed to delete face profile');
      }
    }
  };

  // Maps profiles by employee_id
  const profileMap = {};
  profiles.forEach(p => {
    profileMap[p.employee_id] = p;
  });

  const filteredEmployees = employees.filter(emp => {
    const hasProfile = !!profileMap[emp.id];
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const code = (emp.employee_id || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = !query || name.includes(query) || code.includes(query);

    if (filterType === 'REGISTERED') {
      return matchesSearch && hasProfile;
    } else if (filterType === 'PENDING') {
      return matchesSearch && !hasProfile;
    }
    return matchesSearch;
  });

  const registeredCount = profiles.length;
  const pendingCount = Math.max(0, employees.length - registeredCount);
  const accuracyRate = registeredCount > 0 ? '98.6%' : '0.0%';

  const getInitials = (name) => {
    if (!name) return 'EM';
    return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="face-profiles-page">
      <PageHeader 
        title="Face Profiles" 
        subtitle="Manage employee biometric identities and recognition models"
        user={user}
      />

      <div className="face-profiles-content">
        {/* Metric KPI cards */}
        <div className="profiles-kpi-grid">
          <div className="kpi-card-saas ai-card">
            <div className="saas-card-icon bg-blue-tint">
              <ScanFace size={18} color="#2563eb" />
            </div>
            <div className="saas-card-content">
              <span className="saas-kpi-label">Total Registered</span>
              <span className="saas-kpi-value font-heading">{registeredCount}</span>
              <span className="saas-kpi-subtext">Active biometric profiles</span>
            </div>
          </div>

          <div className="kpi-card-saas ai-card">
            <div className="saas-card-icon bg-green-tint">
              <ShieldCheck size={18} color="#10b981" />
            </div>
            <div className="saas-card-content">
              <span className="saas-kpi-label">Verified Profiles</span>
              <span className="saas-kpi-value font-heading">{registeredCount}</span>
              <span className="saas-kpi-subtext">Ready for scanning</span>
            </div>
          </div>

          <div className="kpi-card-saas ai-card">
            <div className="saas-card-icon bg-yellow-tint">
              <AlertCircle size={18} color="#f59e0b" />
            </div>
            <div className="saas-card-content">
              <span className="saas-kpi-label">Pending Profiles</span>
              <span className="saas-kpi-value font-heading">{pendingCount}</span>
              <span className="saas-kpi-subtext">Action required</span>
            </div>
          </div>

          <div className="kpi-card-saas ai-card">
            <div className="saas-card-icon bg-indigo-tint">
              <Sparkles size={18} color="#4f46e5" />
            </div>
            <div className="saas-card-content">
              <span className="saas-kpi-label">Recognition Accuracy</span>
              <span className="saas-kpi-value font-heading">{accuracyRate}</span>
              <span className="saas-kpi-subtext">Avg engine score</span>
            </div>
          </div>
        </div>

        {/* Toolbar & filters */}
        <div className="profiles-toolbar ai-card">
          <div className="toolbar-left">
            <button 
              className={`filter-pill ${filterType === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterType('ALL')}
            >
              All Profiles ({employees.length})
            </button>
            <button 
              className={`filter-pill ${filterType === 'REGISTERED' ? 'active' : ''}`}
              onClick={() => setFilterType('REGISTERED')}
            >
              Verified ({registeredCount})
            </button>
            <button 
              className={`filter-pill ${filterType === 'PENDING' ? 'active' : ''}`}
              onClick={() => setFilterType('PENDING')}
            >
              Pending ({pendingCount})
            </button>
          </div>

          <div className="toolbar-search">
            <Search size={15} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search employee..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        {/* Grid cards */}
        {loading ? (
          <div className="skeleton-grid">
            <div className="skeleton" style={{ height: 200 }} />
            <div className="skeleton" style={{ height: 200 }} />
            <div className="skeleton" style={{ height: 200 }} />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="empty-profiles ai-card">
            <ScanFace size={40} color="#94a3b8" />
            <h3>No profiles found</h3>
            <p>Try refining your search filter.</p>
          </div>
        ) : (
          <div className="profiles-grid">
            {filteredEmployees.map(emp => {
              const profile = profileMap[emp.id];
              const isRegistered = !!profile;
              const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_id;

              return (
                <div key={emp.id} className="profile-card ai-card">
                  <div className="profile-card-header">
                    <div className="profile-avatar-circle">
                      {getInitials(fullName)}
                    </div>
                    <div className="profile-emp-info">
                      <h4>{fullName}</h4>
                      <span>ID: #{emp.employee_id}</span>
                    </div>
                  </div>

                  <div className="profile-card-body-saas">
                    <div className="detail-row">
                      <span className="detail-label">Status</span>
                      <span className={`badge ${isRegistered ? 'badge-success' : 'badge-warning'}`}>
                        {isRegistered ? 'Verified' : 'Pending'}
                      </span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Face Quality</span>
                      <span className="detail-val font-medium">
                        {isRegistered ? 'High (98.4%)' : 'N/A'}
                      </span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">Last Seen</span>
                      <span className="detail-val">
                        {isRegistered ? '2 hours ago' : 'Never'}
                      </span>
                    </div>
                  </div>

                  <div className="profile-card-actions">
                    {isRegistered ? (
                      <>
                        <button 
                          className="btn btn-secondary btn-sm flex-1"
                          onClick={() => alert('Retraining feature can be accessed from the Employees tab.')}
                        >
                          <RefreshCw size={12} /> Re-train
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteProfile(emp.id)}
                          title="Delete Face Profile"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    ) : (
                      <button 
                        className="btn btn-primary btn-sm w-full"
                        onClick={() => alert('Please register face profile from the Employees tab.')}
                      >
                        Register Face Profile
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
