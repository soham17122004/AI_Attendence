import React from 'react';
import { Camera, RefreshCw, ShieldAlert } from 'lucide-react';

export default function CameraView({
  videoRef,
  canvasRef,
  streamActive,
  permissionDenied,
  insecureOriginError,
  requestCamera,
  scanning
}) {
  if (insecureOriginError) {
    return (
      <div className="camera-viewport error-state">
        <div className="permission-card">
          <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: 12 }} />
          <h3>HTTPS Required for Camera</h3>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '8px 0 16px 0' }}>
            Mobile browsers block camera access on non-secure HTTP links. Please use the HTTPS localtunnel link on your phone.
          </p>
          <button onClick={requestCamera} className="btn-mobile btn-primary">
            Retry Camera Access
          </button>
        </div>
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div className="camera-viewport error-state">
        <div className="permission-card">
          <Camera size={48} color="#f59e0b" style={{ marginBottom: 12 }} />
          <h3>Camera Permission Blocked</h3>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '8px 0 16px 0' }}>
            Please tap "Allow Camera" or enable Camera access in your mobile browser settings.
          </p>
          <button onClick={requestCamera} className="btn-mobile btn-primary">
            Grant Camera Access
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-viewport">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="video-feed"
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {!streamActive && (
        <div className="camera-placeholder">
          <RefreshCw size={36} className="spin text-muted" style={{ marginBottom: 10 }} />
          <p style={{ fontWeight: 600 }}>Initializing Camera Stream...</p>
          <button 
            onClick={requestCamera} 
            className="btn-mobile btn-primary"
            style={{ marginTop: 14, width: 'auto', padding: '8px 18px', fontSize: '0.82rem' }}
          >
            Start Camera
          </button>
        </div>
      )}
    </div>
  );
}
