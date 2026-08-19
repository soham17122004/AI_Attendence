import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Clock, 
  BarChart3, 
  CalendarCheck, 
  ScanFace, 
  Activity,
  Monitor,
  CreditCard,
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'administrator';

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const closeMobile = () => {
    setMobileOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return 'AD';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop for Mobile */}
      {mobileOpen && <div className="sidebar-backdrop" onClick={closeMobile} />}

      <aside className={`attendiq-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Section */}
        <div className="sidebar-brand">
          <div className="brand-logo-container">
            <div className="brand-logo-icon">
              <ScanFace size={20} color="#ffffff" />
            </div>
            {!collapsed && (
              <div className="brand-details">
                <h1 className="brand-title">Attend<span className="brand-highlight">IQ</span></h1>
                <span className="brand-subtitle">AI Workforce Attendance</span>
              </div>
            )}
          </div>

          <button 
            className="collapse-btn desktop-only" 
            onClick={toggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* ==================== WORKSPACE SECTION ==================== */}
          <div className="nav-section">
            <div className="nav-group-label">{collapsed ? 'WS' : 'WORKSPACE'}</div>
            {isAdmin ? (
              <>
                <NavLink 
                  to="/" 
                  end 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Overview"
                >
                  <LayoutDashboard className="link-icon" size={18} />
                  {!collapsed && <span>Overview</span>}
                </NavLink>

                <NavLink 
                  to="/attendance" 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Attendance"
                >
                  <Clock className="link-icon" size={18} />
                  {!collapsed && <span>Attendance</span>}
                </NavLink>

                <NavLink 
                  to="/employees" 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Employees"
                >
                  <Users className="link-icon" size={18} />
                  {!collapsed && <span>Employees</span>}
                </NavLink>

                <NavLink 
                  to="/departments" 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Departments"
                >
                  <Building2 className="link-icon" size={18} />
                  {!collapsed && <span>Departments</span>}
                </NavLink>

                <NavLink 
                  to="/analytics" 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Analytics"
                >
                  <BarChart3 className="link-icon" size={18} />
                  {!collapsed && <span>Analytics</span>}
                </NavLink>

                <NavLink 
                  to="/leaves" 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Leave Requests"
                >
                  <CalendarCheck className="link-icon" size={18} />
                  {!collapsed && <span>Leave Requests</span>}
                </NavLink>

                <NavLink 
                  to="/payroll" 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Payroll & Salary"
                >
                  <CreditCard className="link-icon" size={18} />
                  {!collapsed && <span>Payroll & Salary</span>}
                </NavLink>
              </>
            ) : (
              <>
                <NavLink 
                  to="/" 
                  end
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="Dashboard"
                >
                  <LayoutDashboard className="link-icon" size={18} />
                  {!collapsed && <span>Dashboard</span>}
                </NavLink>

                <NavLink 
                  to="/attendance" 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                  title="My Attendance"
                >
                  <Clock className="link-icon" size={18} />
                  {!collapsed && <span>My Attendance</span>}
                </NavLink>
              </>
            )}
          </div>

          {/* ==================== AI & SECURITY SECTION ==================== */}
          {isAdmin && (
            <div className="nav-section">
              <div className="nav-group-label">{collapsed ? 'AI' : 'AI & SECURITY'}</div>
              
              <NavLink 
                to="/face-profiles" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
                title="Face Profiles"
              >
                <ScanFace className="link-icon" size={18} />
                {!collapsed && <span>Face Profiles</span>}
              </NavLink>

              <NavLink 
                to="/recognition-activity" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
                title="Recognition Activity"
              >
                <Activity className="link-icon" size={18} />
                {!collapsed && <span>Recognition Activity</span>}
              </NavLink>

              <NavLink 
                to="/kiosk-devices" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
                title="Kiosk Devices"
              >
                <Monitor className="link-icon" size={18} />
                {!collapsed && <span>Kiosk Devices</span>}
              </NavLink>
            </div>
          )}

          {/* ==================== SYSTEM SECTION ==================== */}
          {isAdmin && (
            <div className="nav-section">
              <div className="nav-group-label">{collapsed ? 'SYS' : 'SYSTEM'}</div>
              
              <NavLink 
                to="/settings" 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
                title="Settings"
              >
                <Settings className="link-icon" size={18} />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </div>
          )}
        </nav>

        {/* Footer Section */}
        <div className="sidebar-footer">
          <div className="footer-profile-badge">
            <div className="footer-avatar">
              {getInitials(user?.full_name || user?.username)}
            </div>
            {!collapsed && (
              <div className="footer-profile-details">
                <span className="profile-name">{user?.full_name || user?.username || 'Admin'}</span>
                <span className="profile-role">{user?.role || 'Administrator'}</span>
              </div>
            )}
          </div>

          <button 
            className="footer-action-btn logout-btn"
            onClick={onLogout}
            title="Sign Out"
          >
            <LogOut size={16} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
