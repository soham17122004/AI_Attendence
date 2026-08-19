import React, { useState } from 'react';
import { authService } from '../services/services';
import { Lock, User, ScanFace, LogIn, AlertCircle } from 'lucide-react';
import './AuthPage.css';

export default function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await authService.login(username, password);
        const user = await authService.getCurrentUser();
        onLoginSuccess(user);
      } else {
        await authService.register({
          username,
          password,
          email,
          role
        });
        await authService.login(username, password);
        const user = await authService.getCurrentUser();
        onLoginSuccess(user);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card ai-card">
        <div className="auth-header">
          <div className="auth-logo">
            <ScanFace size={30} color="#ffffff" />
          </div>
          <h2 className="auth-title font-heading">Attend<span className="brand-accent">IQ</span></h2>
          <p className="auth-subtitle">AI-Powered Workforce Attendance</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <div className="input-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  className="input-field"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  className="input-field"
                  placeholder="user@attendiq.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>Account Role</label>
                <select 
                  className="input-field"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </>
          )}

          <div className="input-group">
            <label>Username</label>
            <div className="input-with-icon">
              <User className="input-icon" size={16} />
              <input 
                type="text" 
                className="input-field"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={16} />
              <input 
                type="password" 
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
            <LogIn size={16} />
            <span>{loading ? 'Authenticating...' : isLogin ? 'Sign In to AttendIQ' : 'Create Account'}</span>
          </button>
        </form>

        <div className="auth-toggle">
          <span>{isLogin ? "Don't have an account?" : 'Already registered?'}</span>
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="toggle-btn">
            {isLogin ? 'Register now' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
