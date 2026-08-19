import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import EmployeeDashboardPage from './pages/EmployeeDashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import FaceKioskPage from './pages/FaceKioskPage';
import EmployeesPage from './pages/EmployeesPage';
import AttendancePage from './pages/AttendancePage';
import LeavesPage from './pages/LeavesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import FaceProfilesPage from './pages/FaceProfilesPage';
import ActivityPage from './pages/ActivityPage';
import KioskPage from './pages/KioskPage';
import PayrollPage from './pages/PayrollPage';
import SettingsPage from './pages/SettingsPage';
import { authService } from './services/services';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('smartattend_token');
      if (token) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch (err) {
          console.error('Session expired:', err);
          authService.logout();
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const handleLogin = async (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'administrator';

  return (
    <Router>
      <Routes>
        <Route path="/kiosk" element={<FaceKioskPage user={user} />} />
        <Route
          path="*"
          element={
            loading ? (
              <div className="full-screen-loader">
                <div className="loader-spinner" />
                <p>Loading AttendIQ...</p>
              </div>
            ) : !user ? (
              <AuthPage onLoginSuccess={handleLogin} />
            ) : (
              <div className="app-layout">
                <Sidebar user={user} onLogout={handleLogout} />
                <main className="main-content">
                  <Routes>
                    <Route path="/attendance" element={<AttendancePage user={user} />} />
                    {isAdmin ? (
                      <>
                        <Route path="/" element={<DashboardPage user={user} />} />
                        <Route path="/analytics" element={<AnalyticsPage user={user} />} />
                        <Route path="/employees" element={<EmployeesPage user={user} />} />
                        <Route path="/leaves" element={<LeavesPage user={user} />} />
                        <Route path="/departments" element={<DepartmentsPage user={user} />} />
                        <Route path="/face-profiles" element={<FaceProfilesPage user={user} />} />
                        <Route path="/recognition-activity" element={<ActivityPage user={user} />} />
                        <Route path="/kiosk-devices" element={<KioskPage user={user} />} />
                        <Route path="/payroll" element={<PayrollPage user={user} />} />
                        <Route path="/settings" element={<SettingsPage user={user} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </>
                    ) : (
                      <>
                        <Route path="/" element={<EmployeeDashboardPage user={user} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </>
                    )}
                  </Routes>
                </main>
              </div>
            )
          }
        />
      </Routes>
    </Router>
  );
}
