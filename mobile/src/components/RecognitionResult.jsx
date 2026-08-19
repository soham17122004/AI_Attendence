import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Award } from 'lucide-react';

export default function RecognitionResult({ result, error, onRetry }) {
  if (error) {
    return (
      <div className="result-overlay error">
        <div className="result-card glass-panel">
          <XCircle size={56} className="status-icon text-danger" />
          <h2 className="result-title text-danger">Connection Error</h2>
          <p className="result-message">{error}</p>
          <p className="result-subtext">Please check the office network connection.</p>
          {onRetry && (
            <button onClick={onRetry} className="btn-mobile btn-secondary mt-3">
              Retry Connection
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!result) return null;

  const isSuccess = result.success !== false && result.recognized !== false;
  const isAlreadyCheckedOut = result.action === 'already_checked_out' || (result.check_in && result.check_out && result.action !== 'check_out');
  const isCheckOut = result.action === 'check_out' || isAlreadyCheckedOut || result.message?.toLowerCase().includes('check-out');

  const now = new Date();
  const dateStr = result.attendance_date || now.toLocaleDateString([], {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const timeStr = isCheckOut
    ? result.check_out ? new Date(result.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : result.check_in ? new Date(result.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const confidencePct = result.confidence !== undefined && result.confidence !== null
    ? (Number(result.confidence) > 1 ? Number(result.confidence) : Number(result.confidence) * 100).toFixed(0)
    : '91';

  if (isSuccess) {
    return (
      <div className={`result-overlay full-screen-animated ${isCheckOut ? 'theme-checkout' : 'theme-checkin'}`}>
        <div className="full-screen-content">
          <div className="animated-tick-circle">
            <CheckCircle2 size={80} className="tick-icon" />
          </div>

          <span className="success-tag">
            {isAlreadyCheckedOut 
              ? '✓ ALREADY CHECKED OUT TODAY' 
              : isCheckOut 
                ? '✓ CHECK-OUT SUCCESSFUL' 
                : '✓ CHECK-IN SUCCESSFUL'}
          </span>

          <h1 className="success-greeting-title">
            {isCheckOut 
              ? `Goodbye, ${result.employee_name || result.employeeName || 'Employee'}` 
              : `Welcome, ${result.employee_name || result.employeeName || 'Employee'}`}
          </h1>

          <div className="success-details-box">
            <p className="success-main-msg">
              {isAlreadyCheckedOut
                ? 'You have already completed check-out today.'
                : isCheckOut 
                  ? 'You have checked out successfully!' 
                  : 'You have checked in successfully!'}
            </p>

            <div className="success-time-badge">
              <Clock size={20} />
              <span>{isCheckOut ? 'Check-Out Time' : 'Check-In Time'}: <strong>{timeStr}</strong></span>
            </div>

            <p className="success-date-str">{dateStr}</p>
          </div>

          <div className="auto-reset-bar">
            <div className="reset-progress" />
          </div>
        </div>
      </div>
    );
  }

  // Unrecognized / Error Result
  return (
    <div className="result-overlay full-screen-animated theme-error">
      <div className="full-screen-content">
        <div className="animated-tick-circle error-circle">
          <XCircle size={80} className="tick-icon" />
        </div>

        <span className="success-tag error-tag">
          ⚠ FACE NOT RECOGNIZED
        </span>

        <h1 className="success-greeting-title error-title">
          Unregistered Face
        </h1>

        <div className="success-details-box error-details-box">
          <p className="success-main-msg">
            {result.message || 'No matching registered employee face profile found.'}
          </p>
          <p className="error-sub-msg">
            Please contact administrator or register your face profile in Employee Management.
          </p>
        </div>

        <div className="auto-reset-bar">
          <div className="reset-progress error-progress" />
        </div>
      </div>
    </div>
  );
}
