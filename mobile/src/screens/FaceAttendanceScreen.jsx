import React, { useRef, useState, useEffect, useCallback, Component } from 'react';
import { Camera as CameraIcon, ShieldAlert, Sparkles, Settings, SwitchCamera } from 'lucide-react';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import attendanceService from '../services/attendanceService';
import { API_BASE_URL } from '../config/api';
import '../App.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error", error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: 'black', color: 'red', height: '100vh', overflow: 'auto' }}>
          <h2>Something went wrong!</h2>
          <p>{this.state.error?.toString()}</p>
          <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>{this.state.info?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children; 
  }
}

export default function FaceAttendanceScreenWrapper() {
  return (
    <ErrorBoundary>
      <FaceAttendanceScreen />
    </ErrorBoundary>
  );
}

function FaceAttendanceScreen() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [streamActive, setStreamActive] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [insecureOriginError, setInsecureOriginError] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [hasFaceInBox, setHasFaceInBox] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cameraIdle, setCameraIdle] = useState(false);

  // Settings configuration states
  const [showSettings, setShowSettings] = useState(false);
  const [settingsUrl, setSettingsUrl] = useState(localStorage.getItem('api_base_url') || API_BASE_URL);
  const [kiosks, setKiosks] = useState([]);
  const [selectedKioskId, setSelectedKioskId] = useState(() => {
    return Number(localStorage.getItem('kiosk_device_id') || '2');
  });
  const [terminalActive, setTerminalActive] = useState(true);

  // Face Registration states
  const [employees, setEmployees] = useState([]);
  const [faceProfiles, setFaceProfiles] = useState({});
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [registrationMode, setRegistrationMode] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);

  // Fetch employees, face profiles, and kiosks when settings opens
  useEffect(() => {
    if (showSettings) {
      const loadSettingsData = async () => {
        try {
          const [empData, profData, kioskData] = await Promise.all([
            attendanceService.getEmployees().catch(() => []),
            attendanceService.getFaceProfiles().catch(() => []),
            attendanceService.getKiosks().catch(() => [])
          ]);
          const safeEmpData = Array.isArray(empData) ? empData : [];
          const safeProfData = Array.isArray(profData) ? profData : [];
          const safeKioskData = Array.isArray(kioskData) ? kioskData : [];
          
          setEmployees(safeEmpData);
          const pMap = {};
          safeProfData.forEach(p => {
            pMap[p.employee_id] = p;
          });
          setFaceProfiles(pMap);
          setKiosks(safeKioskData);
        } catch (err) {
          console.error("Failed to load settings data:", err);
        }
      };
      loadSettingsData();
    }
  }, [showSettings]);

  // Terminal active status validation
  const checkTerminalStatus = useCallback(async () => {
    try {
      const kiosksList = await attendanceService.getKiosks();
      const currentKiosk = kiosksList.find(k => k.id === selectedKioskId);
      if (currentKiosk) {
        setTerminalActive(currentKiosk.status === 'online');
      } else {
        setTerminalActive(true);
      }
    } catch (err) {
      setTerminalActive(true);
    }
  }, [selectedKioskId]);

  useEffect(() => {
    checkTerminalStatus();
    const interval = setInterval(checkTerminalStatus, 2500);
    return () => clearInterval(interval);
  }, [checkTerminalStatus]);

  // Liveness check variables
  const [livenessState, setLivenessState] = useState('searching'); // 'searching', 'blink_instruction', 'verified', 'failed'
  const [countdown, setCountdown] = useState(6);
  const livenessHistoryRef = useRef([]);
  const livenessTimerRef = useRef(null);
  const blinkCheckIntervalRef = useRef(null);

  // Connection & Clock states
  const [currentTime, setCurrentTime] = useState(new Date());
  const [serverConnected, setServerConnected] = useState(true);

  // Health check & clock triggers
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const checkConnection = useCallback(async () => {
    const isHealthy = await attendanceService.checkHealth();
    setServerConnected(isHealthy);
  }, []);

  useEffect(() => {
    checkConnection();
    const connectionInterval = setInterval(checkConnection, 15000);
    return () => clearInterval(connectionInterval);
  }, [checkConnection]);

  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // ── Camera Access (Front / Back Support with Hardware Enumeration) ──
  const requestCamera = useCallback(async (targetFacingMode = facingMode) => {
    setPermissionDenied(false);
    setInsecureOriginError(false);
    setError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Camera access unavailable. Non-HTTPS origin or unsupported browser.');
      setInsecureOriginError(true);
      setStreamActive(false);
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      // 0. Request native Android runtime permissions using Capacitor
      if (Capacitor.isNativePlatform()) {
        try {
          const permissions = await Camera.checkPermissions();
          if (permissions.camera !== 'granted') {
            const req = await Camera.requestPermissions();
            if (req.camera !== 'granted') {
              setPermissionDenied(true);
              setStreamActive(false);
              return;
            }
          }
        } catch (capErr) {
          console.warn('Capacitor camera permission check failed', capErr);
        }
      }

      let stream = null;

      // 1. Try exact facingMode constraint (works on modern Chrome/Safari mobile)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: targetFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (errExact) {
        console.warn('Exact facingMode failed, trying ideal constraint...', errExact);
      }

      // 2. Try ideal facingMode constraint
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: targetFacingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        } catch (errIdeal) {
          console.warn('Ideal facingMode with resolution failed, trying fallback...', errIdeal);
        }
      }

      // 3. Try deviceId lookup from enumerated video inputs
      if (!stream) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          let targetDevice = null;
          if (targetFacingMode === 'environment') {
            targetDevice = videoDevices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('rear') || 
              d.label.toLowerCase().includes('environment') ||
              d.label.toLowerCase().includes('0')
            ) || (videoDevices.length > 1 ? videoDevices[1] : null);
          } else {
            targetDevice = videoDevices.find(d => 
              d.label.toLowerCase().includes('front') || 
              d.label.toLowerCase().includes('user') ||
              d.label.toLowerCase().includes('selfie') ||
              d.label.toLowerCase().includes('1')
            ) || videoDevices[0];
          }

          if (targetDevice && targetDevice.deviceId) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: targetDevice.deviceId } }
            });
          }
        } catch (errDevices) {
          console.warn('DeviceId enumeration failed, trying generic video...', errDevices);
        }
      }

      // 4. Fallback to basic stream
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Try playing immediately (fixes mobile bug where onloadedmetadata doesn't fire twice)
        videoRef.current.play().then(() => {
          setStreamActive(true);
        }).catch(e => console.warn('Immediate play error:', e));

        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setStreamActive(true);
          }).catch(e => console.warn('Onload play error:', e));
        };
      }
    } catch (err) {
      console.error('Camera permission error:', err);
      setPermissionDenied(true);
      setStreamActive(false);
    }
  }, [facingMode]);

  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    // The useEffect will automatically call requestCamera after cleanup
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  }, []);

  useEffect(() => {
    if (cameraIdle) return;
    requestCamera(facingMode);
    return () => stopCamera();
  }, [requestCamera, stopCamera, facingMode, cameraIdle]);

  // Fast client-side face presence detection (checks skin pixels)
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

  // Tick down the liveness instruction countdown (resets back to 6s automatically to keep mobile active)
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
    if (!streamActive || scanning || result || error || permissionDenied || insecureOriginError || registrationMode || !terminalActive) {
      if (blinkCheckIntervalRef.current) {
        clearInterval(blinkCheckIntervalRef.current);
        blinkCheckIntervalRef.current = null;
      }
      return;
    }

    // Continuously check for face presence before arming blink check
    if (livenessState === 'searching' && !blinkCheckIntervalRef.current) {
      blinkCheckIntervalRef.current = setInterval(() => {
        const facePresent = checkFacePresence();
        setHasFaceInBox(facePresent);
        
        if (facePresent) {
          setLivenessState('blink_instruction');
          setCountdown(6);
          livenessHistoryRef.current = [];
          clearInterval(blinkCheckIntervalRef.current);
          blinkCheckIntervalRef.current = null;
        }
      }, 300);
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
  }, [streamActive, scanning, result, error, permissionDenied, insecureOriginError, livenessState, checkBlink]);

  const formatTime = (v) => {
    if (!v) return '';
    try {
      return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return v;
    }
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || scanning || !streamActive || !terminalActive) return;
    setScanning(true);
    setError('');

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setScanning(false);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setScanning(false);
          return;
        }

        try {
          const data = await attendanceService.recognizeFace(blob, selectedKioskId);

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
                greeting = data.message || `Goodbye ${name}! Early check-out before 9h completed shift. Marked as Half Day! ⚠️`;
                statusLabel = 'Half Day Marked';
              } else {
                title = 'Check-Out Successful!';
                greeting = data.message || `Goodbye, ${name}! Full 9h shift completed! Have a wonderful evening! 👋✨`;
                statusLabel = 'Check-Out Completed';
              }
            } else if (alreadyOut) {
              title = 'Already Checked Out';
              greeting = `Hello ${name}, you have already checked out for today! 😊`;
              statusLabel = 'Already Checked Out';
            } else {
              if (data.is_late) {
                title = 'Late Check-In';
                greeting = data.message || `Welcome ${name}! Check-in after 10:00 AM. 9h shift required to avoid Half Day! ⚠️`;
                statusLabel = 'Late Check-In';
              } else {
                title = 'Check-In Successful!';
                greeting = data.message || `Welcome, ${name}! 9h shift active. Have a fantastic day! 🌟✨`;
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
            stopCamera();
            setCameraIdle(true);
            setTimeout(() => setResult(null), 4000);
          } else {
            setResult({
              success: false,
              title: 'Face Not Recognized',
              message: data?.message || 'No matching face profile found.'
            });
            setTimeout(() => setResult(null), 3000);
          }
        } catch (err) {
          console.error('Attendance API Error:', err);
          const detail = err?.response?.data?.detail;
          const msg = typeof detail === 'string' ? detail : (detail?.message || err?.message || 'Unable to connect to attendance server.');
          setResult({
            success: false,
            title: 'Recognition Failed',
            message: msg
          });
          setTimeout(() => setResult(null), 3000);
        } finally {
          setScanning(false);
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const handleRegisterFace = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedEmpId || registrationLoading) return;
    setRegistrationLoading(true);
    setRegistrationStatus(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setRegistrationLoading(false);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setRegistrationStatus({ success: false, message: 'Failed to capture image.' });
          setRegistrationLoading(false);
          return;
        }

        try {
          await attendanceService.registerFace(selectedEmpId, blob);
          setRegistrationStatus({
            success: true,
            message: 'Face registered successfully!'
          });
          setTimeout(() => {
            setRegistrationMode(false);
            setRegistrationStatus(null);
            setSelectedEmpId('');
          }, 3000);
        } catch (err) {
          console.error('Registration API Error:', err);
          const detail = err?.response?.data?.detail;
          const msg = typeof detail === 'string' ? detail : (detail?.message || err?.message || 'Failed to register face profile.');
          setRegistrationStatus({
            success: false,
            message: msg
          });
        } finally {
          setRegistrationLoading(false);
        }
      },
      'image/jpeg',
      0.9
    );
  };

  let borderClass = '';
  if (registrationMode) {
    borderClass = 'border-register';
  } else if (result) {
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

  // ── ERROR & ACCESS STATES ──
  if (insecureOriginError) {
    return (
      <div className="kiosk-root error-state-page">
        <div className="center-splash-backdrop">
          <div className="center-splash-card splash-fail">
            <div className="splash-badge-icon">
              <ShieldAlert size={36} />
            </div>
            <h2 className="splash-title">HTTPS Required</h2>
            <p className="splash-greeting">
              Mobile browsers block camera access on non-secure HTTP links. Please use the secure HTTPS localtunnel/Cloudflare link on your phone.
            </p>
            <button onClick={requestCamera} className="toast-retry">
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div className="kiosk-root error-state-page">
        <div className="center-splash-backdrop">
          <div className="center-splash-card splash-fail">
            <div className="splash-badge-icon">
              <CameraIcon size={36} />
            </div>
            <h2 className="splash-title">Camera Blocked</h2>
            <p className="splash-greeting">
              Camera permission is denied. Please tap "Allow Camera" or enable Camera access in your browser settings.
            </p>
            <button onClick={requestCamera} className="toast-retry">
              Grant Permission
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`kiosk-root ${result ? (result.success ? 'full-bg-green' : 'full-bg-red') : ''}`}>
      {/* Fullscreen Camera Feed */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`kiosk-video ${facingMode === 'user' ? 'kiosk-video-mirror' : ''}`} 
        style={{ 
          opacity: cameraIdle ? 0 : 1,
          pointerEvents: 'none' 
        }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Dark Vignette Overlay */}
      <div className="kiosk-vignette" />

      {/* Color Overlay on Result */}
      {result && (
        <div className={`kiosk-fullscreen-overlay ${result.success ? 'overlay-success' : 'overlay-fail'}`} />
      )}

      {/* Top Glassmorphism Status Bar */}
      <div className="kiosk-status-bar">
        <div className="ksb-left">
          <span className="ksb-time">{timeStr}</span>
          <span className="ksb-date">{dateStr}</span>
        </div>
        <div className="ksb-right-actions">
          <div className={`ksb-badge ${serverConnected ? 'badge-online' : 'badge-offline'}`}>
            <span className="ksb-dot" />
            <span>{serverConnected ? 'System Online' : 'System Offline'}</span>
          </div>
          <button
            onClick={toggleCamera}
            className="ksb-settings-btn"
            title={`Switch to ${facingMode === 'user' ? 'Rear (Back)' : 'Front (Selfie)'} Camera`}
          >
            <SwitchCamera size={18} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="ksb-settings-btn"
            title="Configure API Endpoint"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Face Scanner Frame */}
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

        {/* Instructions */}
        {!result && !error && (
          <p className="kiosk-instruction">
            {registrationMode
              ? (registrationStatus ? registrationStatus.message : '📸 Registration Mode: Align face inside frame and tap Capture')
              : (scanning
                  ? 'Analyzing face profile…'
                  : livenessState === 'blink_instruction'
                  ? '👁️ Please blink your eyes to verify liveness'
                  : livenessState === 'verified'
                  ? '✓ Liveness verified! Scanning...'
                  : livenessState === 'failed'
                  ? '✕ No blink detected. Please retry.'
                  : 'Bring your face inside the frame to scan')}
          </p>
        )}
      </div>

      {/* Face Registration Action Buttons */}
      {registrationMode && (!registrationStatus || !registrationStatus.success) && (
        <div className="registration-actions-container">
          <button
            onClick={() => {
              setRegistrationMode(false);
              setSelectedEmpId('');
              setRegistrationStatus(null);
            }}
            className="registration-btn registration-btn-cancel"
            disabled={registrationLoading}
          >
            Cancel
          </button>
          <button
            onClick={toggleCamera}
            className="registration-btn registration-btn-cancel"
            disabled={registrationLoading}
            type="button"
          >
            <SwitchCamera size={16} />
            <span>{facingMode === 'user' ? 'Rear Cam' : 'Front Cam'}</span>
          </button>
          <button
            onClick={handleRegisterFace}
            className="registration-btn registration-btn-save"
            disabled={registrationLoading}
          >
            {registrationLoading ? 'Saving...' : 'Capture & Save'}
          </button>
        </div>
      )}

      {/* Floating Bottom Camera Switcher Pill */}
      {!result && !error && !showSettings && !registrationMode && !cameraIdle && (
        <button
          onClick={toggleCamera}
          className="kiosk-camera-switch-pill"
          title="Switch Camera (Front / Back)"
        >
          <SwitchCamera size={16} />
          <span>{facingMode === 'user' ? 'Switch to Back' : 'Switch to Front'}</span>
        </button>
      )}

      {/* Idle State Tap to Start Overlay */}
      {cameraIdle && !result && (
        <div className="center-splash-backdrop" style={{ zIndex: 100, backgroundColor: 'rgba(0,0,0,0.85)', pointerEvents: 'auto' }}>
          <button 
            onClick={(e) => {
              e.preventDefault();
              setCameraIdle(false);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              setCameraIdle(false);
            }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '16px', padding: '40px', borderRadius: '50%', border: '2px solid #8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.2)', color: 'white', cursor: 'pointer',
              pointerEvents: 'auto',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <CameraIcon size={48} />
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Tap to Start Scanner</span>
          </button>
        </div>
      )}

      {/* Result Backdrop & Card */}
      {result && (
        <div className="center-splash-backdrop">
          <div className={`center-splash-card ${result.success ? 'splash-success' : 'splash-fail'}`}>
            <div className="splash-badge-icon">
              {result.success ? '✓' : '✕'}
            </div>

            <h2 className="splash-title">{result.title}</h2>
            <h1 className="splash-emp-name">{result.employeeName || 'Access Denied'}</h1>

            <p className="splash-greeting">{result.greeting || result.message}</p>

            {result.success && result.time && (
              <div className="splash-time-pills">
                <div className="splash-time-pill">
                  <span>Recorded:</span>
                  <strong>{result.time}</strong>
                </div>
                {result.expectedCheckout && (
                  <div className="splash-time-pill expected-pill">
                    <span>Ends:</span>
                    <strong>{result.expectedCheckout}</strong>
                  </div>
                )}
                {result.completedHours !== undefined && (
                  <div className="splash-time-pill completed-pill">
                    <span>Worked:</span>
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
            <h2 className="splash-title">System Error</h2>
            <p className="splash-greeting">{error}</p>
            <button className="toast-retry" onClick={requestCamera}>Retry</button>
          </div>
        </div>
      )}

      {/* Terminal Disabled / Offline Lock Overlay */}
      {!terminalActive && (
        <div className="center-splash-backdrop" style={{ zIndex: 90, backgroundColor: 'rgba(15, 23, 42, 0.94)' }}>
          <div className="center-splash-card splash-fail" style={{ maxWidth: '360px', padding: '32px 20px' }}>
            <div className="splash-badge-icon" style={{ backgroundColor: '#ef4444' }}>🔒</div>
            <h2 className="splash-title" style={{ color: '#f87171' }}>Terminal Switched OFF</h2>
            <h1 className="splash-emp-name" style={{ fontSize: '1.2rem', margin: '8px 0' }}>Mobile Scanner (Disabled)</h1>
            <p className="splash-greeting" style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
              This mobile terminal has been turned OFF by the administrator in the Admin Panel. Face recognition is disabled.
            </p>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowSettings(false)}>
          <div style={{ backgroundColor: '#1e293b', padding: '24px', width: '100%', maxWidth: '380px', borderRadius: '16px', display: 'flex', flexDirection: 'column', color: 'white' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>Configure Backend URL</h2>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '16px' }}>
              Enter the SmartAttend AI API base URL.
            </p>
            <input
              type="text"
              value={settingsUrl}
              onChange={(e) => setSettingsUrl(e.target.value)}
              placeholder="e.g. http://192.168.1.50:8000"
              style={{ padding: '12px', marginBottom: '16px', color: 'white', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', width: '100%' }}
            />

            {/* Choose Terminal Section */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '1.05rem', marginBottom: '4px', color: 'white' }}>Kiosk Terminal ID</h2>
              <select
                value={selectedKioskId}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSelectedKioskId(val);
                  localStorage.setItem('kiosk_device_id', val);
                }}
                style={{ padding: '12px', color: 'white', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', width: '100%' }}
              >
                {kiosks.length === 0 ? (
                  <option value="2">Mobile Scanner Device (Default)</option>
                ) : (
                  kiosks.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.location})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Face Registration Section */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '4px', color: 'white' }}>Register Employee Face</h2>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                style={{ padding: '12px', marginBottom: '12px', color: 'white', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', width: '100%' }}
              >
                <option value="">Choose Employee...</option>
                {employees.map(emp => {
                  const isRegistered = !!faceProfiles[emp.id];
                  return (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} {isRegistered ? '✓' : '[Pending]'}
                    </option>
                  );
                })}
              </select>
              <button
                disabled={!selectedEmpId}
                style={{ width: '100%', padding: '12px', backgroundColor: selectedEmpId ? '#db2777' : '#6b7280', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
                onClick={() => {
                  setRegistrationMode(true);
                  setShowSettings(false);
                  setRegistrationStatus(null);
                }}
              >
                Start Face Registration
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
                onClick={() => setShowSettings(false)}
              >
                Close
              </button>
              <button
                style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
                onClick={() => {
                  localStorage.setItem('api_base_url', settingsUrl);
                  setShowSettings(false);
                  window.location.reload();
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Disabled Fullscreen Blocker */}
      {!terminalActive && !showSettings && (
        <div className="center-splash-backdrop" style={{ backdropFilter: 'blur(24px)', background: 'rgba(15, 23, 42, 0.96)', zIndex: 9999 }}>
          <div className="center-splash-card splash-fail" style={{ maxWidth: '400px', padding: '40px 24px' }}>
            <div className="splash-badge-icon" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
              ⚠️
            </div>
            <h2 className="splash-title" style={{ color: '#ef4444' }}>Terminal Blocked</h2>
            <h1 className="splash-emp-name" style={{ fontSize: '1.8rem', margin: '16px 0 8px 0', color: '#f1f5f9' }}>Scanner Disabled</h1>
            <p className="splash-greeting" style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' }}>
              This scanning terminal has been disabled by the administrator. Face registration and attendance checking are locked.
            </p>
            <button 
              className="toast-retry" 
              style={{ marginTop: '24px', background: '#334155', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => setShowSettings(true)}
            >
              Open Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
