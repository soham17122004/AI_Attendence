import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Calendar,
  ScanFace,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

import './PageHeader.css';


export default function PageHeader({
  title,
  subtitle,
  user,
  onSearch
}) {

  const navigate = useNavigate();

  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [cloudflareHttpsUrl, setCloudflareHttpsUrl] = useState(
    localStorage.getItem('smartattend_mobile_url') ||
    'https://combination-specialized-explains-knock.trycloudflare.com'
  );


  // ============================================================
  // DATE
  // ============================================================

  const currentDateStr = new Date().toLocaleDateString(
    'en-US',
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  );


  // ============================================================
  // USER INITIALS
  // ============================================================

  const getInitials = (name) => {

    if (!name) return 'AD';

    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

  };


  const userName =
    user?.full_name ||
    user?.username ||
    'Admin';

  const userRole =
    user?.role ||
    'Administrator';


  // ============================================================
  // MOBILE SCANNER URLS
  // ============================================================

  const localIpUrl =
    'http://192.168.10.36:5174';

  const handleUrlChange = (e) => {
    const newUrl = e.target.value.trim();
    setCloudflareHttpsUrl(newUrl);
    localStorage.setItem('smartattend_mobile_url', newUrl);
  };


  return (
    <>
      <header className="page-header">


        {/* ======================================================
            LEFT
        ====================================================== */}

        <div className="header-left">

          <div className="page-heading-row">

            <div className="page-heading-content">

              <h1 className="page-title font-heading">
                {title}
              </h1>

              <p className="page-subtitle">
                {subtitle ||
                  'Monitor your workforce attendance and activity'}
              </p>

            </div>

          </div>

        </div>


        {/* ======================================================
            RIGHT
        ====================================================== */}

        <div className="header-right">


          {/* ====================================================
              SEARCH
          ==================================================== */}

          <div className="header-search">

            <Search
              size={16}
              className="search-icon"
            />

            <input
              type="text"
              placeholder="Search..."
              onChange={(e) =>
                onSearch &&
                onSearch(e.target.value)
              }
            />

            <span className="search-shortcut">
              /
            </span>

          </div>


          {/* ====================================================
              LAUNCH KIOSK
          ==================================================== */}

          <button
            className="header-kiosk-btn"
            onClick={() => navigate('/kiosk')}
            title="Launch face recognition kiosk"
          >

            <ScanFace size={16} />

            <span>
              Launch Kiosk
            </span>

          </button>


          {/* ====================================================
              PHONE SCANNER
          ==================================================== */}

          <button
            className="header-tool-btn phone-scanner-btn"
            onClick={() =>
              setShowMobileModal(true)
            }
            title="Open phone scanner"
          >

            <Smartphone size={17} />

            <span>
              Phone
            </span>

          </button>


          {/* ====================================================
              DATE
          ==================================================== */}

          <div className="header-date">

            <Calendar size={15} />

            <span>
              {currentDateStr}
            </span>

          </div>


          {/* ====================================================
              NOTIFICATIONS
          ==================================================== */}

          <button
            className="header-icon-btn notification-btn"
            title="Notifications"
          >

            <Bell size={17} />

            <span className="notification-badge-dot" />

          </button>


          {/* ====================================================
              USER
          ==================================================== */}

          <div className="profile-wrapper">

            <button
              className="user-profile"
              onClick={() =>
                setShowProfileMenu(
                  !showProfileMenu
                )
              }
            >

              <div className="user-avatar-badge">
                {getInitials(userName)}
              </div>


              <div className="user-details-text">

                <span className="user-name">
                  {userName}
                </span>

                <span className="user-role-label">
                  {userRole}
                </span>

              </div>


              <ChevronDown
                size={14}
                className={`profile-chevron ${showProfileMenu
                    ? 'open'
                    : ''
                  }`}
              />

            </button>


            {/* ==================================================
                PROFILE MENU
            ================================================== */}

            {showProfileMenu && (

              <div className="profile-dropdown">

                <div className="profile-dropdown-header">

                  <div className="dropdown-avatar">
                    {getInitials(userName)}
                  </div>

                  <div>

                    <strong>
                      {userName}
                    </strong>

                    <span>
                      {userRole}
                    </span>

                  </div>

                </div>


                <div className="dropdown-divider" />


                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  className="profile-menu-item"
                >
                  Settings
                </button>


                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  className="profile-menu-item"
                >
                  Account Settings
                </button>

              </div>

            )}

          </div>

        </div>

      </header>


      {/* ========================================================
          PHONE SCANNER MODAL
      ======================================================== */}

      {showMobileModal && (

        <div className="modal-backdrop">

          <div className="modal-card ai-card mobile-qr-modal">


            {/* HEADER */}

            <div className="modal-header">

              <h3 className="modal-title">

                <Smartphone
                  size={18}
                  className="text-primary"
                />

                Open Scanner on Mobile

              </h3>


              <button
                onClick={() =>
                  setShowMobileModal(false)
                }
                className="close-btn"
              >
                ×
              </button>

            </div>


            {/* BODY */}

            <div className="mobile-qr-body">

              <p className="qr-desc">
                Open the AttendIQ face scanner on your
                phone to record attendance.
              </p>


              {/* LOCAL NETWORK */}

              <div className="option-link-card">

                <span className="option-badge text-accent">
                  Local Wi-Fi
                </span>


                <a
                  href={localIpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tunnel-url-link wifi-style"
                >

                  {localIpUrl}

                  <ExternalLink size={14} />

                </a>


                <span className="option-hint">
                  Your phone must be connected to the
                  same Wi-Fi network.
                </span>

              </div>


              {/* CLOUDFLARE */}

              <div className="option-link-card primary-tunnel">

                <span className="option-badge text-success">

                  <ShieldCheck size={14} />

                  Secure HTTPS Scanner

                </span>


                <a
                  href={cloudflareHttpsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tunnel-url-link tunnel-style"
                >

                  {cloudflareHttpsUrl}

                  <ExternalLink size={14} />

                </a>


                <span className="option-hint font-medium text-success">
                  HTTPS camera access is enabled through
                  the secure tunnel.
                </span>

              </div>

              {/* URL SETTINGS INPUT */}
              <div className="option-link-card tunnel-config-card" style={{ marginTop: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  🔧 Paste new Cloudflare tunnel URL (if restarted):
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="https://xxx.trycloudflare.com" 
                  value={cloudflareHttpsUrl} 
                  onChange={handleUrlChange}
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem', width: '100%', padding: '6px 10px', borderRadius: '6px' }}
                />
              </div>

            </div>

            {/* FOOTER */}

            <div className="modal-footer">

              <a
                href={cloudflareHttpsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  textDecoration: 'none'
                }}
              >
                Open Scanner
              </a>


              <button
                onClick={() =>
                  setShowMobileModal(false)
                }
                className="btn btn-secondary"
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </>
  );
}