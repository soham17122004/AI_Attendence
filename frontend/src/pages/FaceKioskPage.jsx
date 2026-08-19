import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { recognitionService, kioskService } from '../services/services';
import './FaceKioskPage.css';

export default function FaceKioskPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [streamActive, setStreamActive] = useState(false);
  const [hasFaceInBox, setHasFaceInBox] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Liveness check variables
  const [livenessState, setLivenessState] = useState('searching'); // 'searching', 'blink_instruction', 'verified', 'failed'
  const [countdown, setCountdown] = useState(6);
  const livenessHistoryRef = useRef([]);
  const livenessTimerRef = useRef(null);
  const blinkCheckIntervalRef = useRef(null);

  // Real-time clock & Terminal status
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [terminalOnline, setTerminalOnline] = useState(true);

  const checkTerminalStatus = useCallback(async () => {
    try {
      const kiosks = await kioskService.getAll();
      const pcKiosk = kiosks.find(k => k.id === 1);
      if (pcKiosk) {
        setTerminalOnline(pcKiosk.status === 'online');
      }
    } catch {
      // maintain current state
    }
  }, []);

  useEffect(() => {
    checkTerminalStatus();
    const interval = setInterval(checkTerminalStatus, 2500);
    return () => clearInterval(interval);
  }, [checkTerminalStatus]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // ── Camera Lifecycle ──
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreamActive(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      setError('');
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (isMounted) {
              videoRef.current.play().catch(() => {});
              setStreamActive(true);
            }
          };
        }
      } catch {
        if (isMounted) {
          setError('Camera access denied. Please allow camera permission.');
          setStreamActive(false);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setStreamActive(false);
    };
  }, []);

  // Fast client-side face Presence Detection (checks skin/head luminance contrast inside center target region)
  const checkFacePresence = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !streamActive || scanning || result) return false;
    const video = videoRef.current;
    if (video.readyState !== 4) return false;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(video, 0, 0, 160, 120);

    // Sample central 50% box of video frame
    const imgData = ctx.getImageData(40, 30, 80, 60);
    const data = imgData.data;
    let skinPixelCount = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Basic skin color threshold in RGB space
      if (r > 60 && g > 40 && b > 20 && r > g && r > b && (r - Math.min(g, b)) > 15) {
        skinPixelCount++;
      }
    }

    const skinRatio = skinPixelCount / totalPixels;
    // Face is present inside box if skin pixels occupy > 22% of target center box
    return skinRatio > 0.22;
  }, [streamActive, scanning, result]);

  // Client-side blink detection based on Eye Region luminance difference analysis
  const checkBlink = useCallback((ctx) => {
    // Widened eye-level region to cover entire upper face width (x=40, y=32, w=80, h=24) inside canvas (160x120)
    const imgData = ctx.getImageData(40, 32, 80, 24);
    const data = imgData.data;
    let totalLuminance = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuminance += lum;
    }
    const avgLum = totalLuminance / (data.length / 4);

    const history = livenessHistoryRef.current;
    history.push(avgLum);
    if (history.length > 10) {
      history.shift();
    }

    if (history.length >= 5) {
      const min = Math.min(...history);
      const max = Math.max(...history);
      const diff = max - min;

      // Sensitive threshold of 3.5 luminance variation triggers easily when user blinks or moves naturally
      if (diff > 3.5) {
        livenessHistoryRef.current = [];
        return true;
      }
    }
    return false;
  }, []);

  // Tick down the liveness instruction countdown (resets back to 6s automatically to keep Kiosk active)
  useEffect(() => {
    if (livenessState !== 'blink_instruction') return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 6;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [livenessState]);

  // Reset liveness state to searching when results fade out or scanning is cleared
  useEffect(() => {
    if (!result && !scanning) {
      setLivenessState('searching');
      livenessHistoryRef.current = [];
    }
  }, [result, scanning]);

  // Continuous presence polling + liveness state machine
  useEffect(() => {
    if (!streamActive || scanning || result || error) {
      if (blinkCheckIntervalRef.current) {
        clearInterval(blinkCheckIntervalRef.current);
        blinkCheckIntervalRef.current = null;
      }
      return;
    }

    // Auto-arm liveness instruction immediately when camera starts active (bypasses fragile RGB skin presence checks)
    if (livenessState === 'searching') {
      setLivenessState('blink_instruction');
      setCountdown(6);
      livenessHistoryRef.current = [];
    }

    if (livenessState === 'blink_instruction' && !blinkCheckIntervalRef.current) {
      blinkCheckIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        if (video.readyState !== 4) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = 160;
        canvas.height = 120;
        ctx.drawImage(video, 0, 0, 160, 120);

        const isBlinkDetected = checkBlink(ctx);
        if (isBlinkDetected) {
          setLivenessState('verified');
          clearInterval(blinkCheckIntervalRef.current);
          blinkCheckIntervalRef.current = null;
          captureAndRecognize();
        }
      }, 100);
    }

    return () => {
      if (blinkCheckIntervalRef.current) {
        clearInterval(blinkCheckIntervalRef.current);
        blinkCheckIntervalRef.current = null;
      }
    };
  }, [streamActive, scanning, result, error, livenessState, checkBlink]);

  const formatTime = (v) => {
    if (!v) return '';
    try { return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    catch { return v; }
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || scanning || !streamActive || !terminalOnline) return;
    setScanning(true);
    setError('');

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setScanning(false); return; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) { setScanning(false); return; }
      try {
        const data = await recognitionService.recognizeFace(blob);

        if (data?.success === true) {
          const isCheckOut = data.action === 'check_out';
          const alreadyOut = data.action === 'already_checked_out';
          const name = data.employee_name || data.employee?.full_name || `Employee #${data.employee_id}`;
          const checkInTime = data.check_in ? formatTime(data.check_in) : new Date().toLocaleTimeString();
          const checkOutTime = data.check_out ? formatTime(data.check_out) : null;

          let title, greeting, statusLabel;
          if (isCheckOut) {
            if (data.is_early_checkout) {
              title = 'Early Check-Out (Half Day)';
              greeting = data.message || `Goodbye ${name}! Early check-out before required shift completed. Marked as Half Day! ⚠️`;
              statusLabel = 'Half Day Marked';
            } else {
              title = 'Check-Out Successful!';
              greeting = data.message || `Goodbye, ${name}! Full shift completed! Have a wonderful evening! 👋✨`;
              statusLabel = 'Check-Out Completed';
            }
          } else if (alreadyOut) {
            title = 'Already Checked Out';
            greeting = `Hello ${name}, you have already checked out for today! 😊`;
            statusLabel = 'Already Checked Out';
          } else {
            if (data.is_late) {
              title = 'Late Check-In';
              greeting = data.message || `Welcome ${name}! Check-in after 10:00 AM. Full shift required to avoid Half Day! ⚠️`;
              statusLabel = 'Late Check-In';
            } else {
              title = 'Check-In Successful!';
              greeting = data.message || `Welcome, ${name}! Shift active. Have a fantastic day! 🌟✨`;
              statusLabel = 'Check-In Completed';
            }
          }

          setResult({
            success: true,
            title,
            statusLabel,
            greeting,
            employeeName: name,
            time: isCheckOut ? checkOutTime : checkInTime,
            expectedCheckout: data.expected_checkout,
            completedHours: data.completed_hours
          });
          setTimeout(() => {
            setResult(null);
            // Kiosk should stay open for the next person
          }, 3500);
          return;
        }

        setResult({
          success: false,
          title: 'Face Not Recognized',
          message: data?.message || data?.detail || 'No matching face profile found.'
        });
        setTimeout(() => {
          setResult(null);
        }, 3000);
      } catch (err) {
        const detail = err?.response?.data?.detail;
        const msg = typeof detail === 'string' ? detail : (detail?.message || err?.message || 'Face recognition service error.');
        setResult({
          success: false,
          title: 'Recognition Failed',
          message: msg
        });
        setTimeout(() => {
          setResult(null);
        }, 3000);
      } finally {
        setScanning(false);
      }
    }, 'image/jpeg', 0.9);
  };

  let borderClass = '';
  if (result) {
    borderClass = result.success ? 'border-success' : 'border-fail';
  } else if (livenessState === 'blink_instruction') {
    borderClass = 'border-blink';
  } else if (livenessState === 'verified') {
    borderClass = 'border-success';
  } else if (livenessState === 'failed') {
    borderClass = 'border-fail';
  } else if (hasFaceInBox) {
    borderClass = 'border-detect';
  }

  return (
    <div className={`kiosk-root ${result ? (result.success ? 'full-bg-green' : 'full-bg-red') : ''}`}>
      {/* ── FULL-SCREEN CAMERA VIDEO ── */}
      <video ref={videoRef} autoPlay playsInline muted className="kiosk-video" />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ── DARK VIGNETTE OVERLAY ── */}
      <div className="kiosk-vignette" />

      {/* ── FULL-SCREEN COLOR ANIMATION OVERLAY ── */}
      {result && (
        <div className={`kiosk-fullscreen-overlay ${result.success ? 'overlay-success' : 'overlay-fail'}`} />
      )}

      {/* ── TOP STATUS BAR ── */}
      <div className="kiosk-status-bar">
        <div className="ksb-left" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => {
              stopCamera();
              navigate('/');
            }}
            className="ksb-back-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
              pointerEvents: 'auto'
            }}
            title="Exit to Admin Dashboard"
          >
            <ArrowLeft size={15} />
            <span>Dashboard</span>
          </button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="ksb-time">{timeStr}</span>
            <span className="ksb-date">{dateStr}</span>
          </div>
        </div>
        <div className={`ksb-badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
          <span className="ksb-dot" />
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* ── FACE TARGET FRAME ── */}
      <div className="kiosk-target-area">
        <div className={`kiosk-target ${borderClass}`}>
          <span className="corner tl" />
          <span className="corner tr" />
          <span className="corner bl" />
          <span className="corner br" />
          {scanning && <div className="scan-beam" />}
          
          {/* Eye Blinking Animation HUD Overlay */}
          {livenessState === 'blink_instruction' && (
            <div className="blink-hud-overlay">
              <div className="blink-hud-eye animate-blink">
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <span className="blink-hud-countdown">{countdown}s</span>
            </div>
          )}
        </div>

        {/* Dynamic Instruction text */}
        {!result && !error && (
          <p className="kiosk-instruction">
            {scanning
              ? 'Verifying face profile…'
              : livenessState === 'blink_instruction'
              ? '👁️ Please blink your eyes to verify liveness'
              : livenessState === 'verified'
              ? '✓ Liveness verified! Scanning...'
              : livenessState === 'failed'
              ? '✕ No blink detected. Please retry.'
              : 'Bring your face inside the box to scan'}
          </p>
        )}
      </div>

      {/* ── CENTERED ATTRACTIVE POPUP CARD (SUCCESS / FAILURE) ── */}
      {result && (
        <div className="center-splash-backdrop">
          <div className={`center-splash-card ${result.success ? 'splash-success' : 'splash-fail'}`}>
            <div className="splash-badge-icon">
              {result.success ? '✓' : '✕'}
            </div>

            <h2 className="splash-title">{result.title}</h2>
            <h1 className="splash-emp-name">{result.employeeName || 'Access Denied'}</h1>

            <p className="splash-greeting">{result.greeting || result.message}</p>

            {result.time && (
              <div className="splash-time-pills">
                <div className="splash-time-pill">
                  <span>Time Recorded:</span>
                  <strong>{result.time}</strong>
                </div>
                {result.expectedCheckout && (
                  <div className="splash-time-pill expected-pill">
                    <span>Shift Ends At:</span>
                    <strong>{result.expectedCheckout}</strong>
                  </div>
                )}
                {result.completedHours !== undefined && (
                  <div className="splash-time-pill completed-pill">
                    <span>Shift Worked:</span>
                    <strong>{result.completedHours} Hours</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="center-splash-backdrop">
          <div className="center-splash-card splash-fail">
            <div className="splash-badge-icon">!</div>
            <h2 className="splash-title">Camera Error</h2>
            <p className="splash-greeting">{error}</p>
            <button className="toast-retry" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      )}

      {/* ── TERMINAL DISABLED / OFFLINE OVERLAY ── */}
      {!terminalOnline && (
        <div className="center-splash-backdrop" style={{ zIndex: 100, backgroundColor: 'rgba(15, 23, 42, 0.92)' }}>
          <div className="center-splash-card splash-fail" style={{ maxWidth: '440px', padding: '36px 24px' }}>
            <div className="splash-badge-icon" style={{ backgroundColor: '#ef4444' }}>🔒</div>
            <h2 className="splash-title" style={{ color: '#f87171' }}>Terminal Switched OFF</h2>
            <h1 className="splash-emp-name" style={{ fontSize: '1.25rem', margin: '8px 0' }}>Office Control PC (Disabled)</h1>
            <p className="splash-greeting" style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
              This PC scanner has been turned OFF by the administrator in the Kiosk Settings. Face recognition is currently disabled on this device.
            </p>
            <button
              className="toast-retry"
              style={{
                marginTop: '20px',
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                transition: 'all 0.2s ease'
              }}
              onClick={() => {
                stopCamera();
                navigate('/');
              }}
            >
              <ArrowLeft size={16} />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}