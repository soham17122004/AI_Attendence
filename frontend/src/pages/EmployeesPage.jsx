import React, { useState, useEffect, useRef, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import {
  employeeService,
  departmentService,
  recognitionService,
  attendanceService,
  leaveService
} from '../services/services';

import {
  Plus,
  Search,
  User,
  Trash2,
  Camera,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Building2,
  ScanFace,
  IdCard,
  ChevronRight,
  Calendar,
  Clock
} from 'lucide-react';

import './EmployeesPage.css';

export default function EmployeesPage({ user }) {

  // STATE
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [todayAttendanceMap, setTodayAttendanceMap] = useState({});

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [showModal, setShowModal] = useState(false);

  // Split view selection
  const [selectedId, setSelectedId] = useState(null);

  // Form
  const [employeeId, setEmployeeId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [salary, setSalary] = useState('');
  const [salaries, setSalaries] = useState({});
  const [selectedEmpLogs, setSelectedEmpLogs] = useState([]);
  const [selectedEmpLeaves, setSelectedEmpLeaves] = useState([]);
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [now, setNow] = useState(Date.now());

  // User credentials state
  const [accountInfo, setAccountInfo] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [showAccountForm, setShowAccountForm] = useState(false);

  // Face Registration Modal
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceTarget, setFaceTarget] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [faceStatus, setFaceStatus] = useState(null);
  const [faceMessage, setFaceMessage] = useState('');
  const [faceProfiles, setFaceProfiles] = useState({});
  const [facingMode, setFacingMode] = useState('user');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // LOAD EMPLOYEES
  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeService.getAll();
      if (Array.isArray(data)) {
        setEmployees(data);
        setSelectedId((prev) => {
          if (prev && data.some((e) => e.id === prev)) return prev;
          return data.length > 0 ? data[0].id : null;
        });
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error('EMPLOYEE LOAD ERROR:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // LOAD DEPARTMENTS
  const loadDepartments = async () => {
    try {
      setDepartmentLoading(true);
      const data = await departmentService.getAll();
      if (Array.isArray(data)) {
        setDepartments(data);
      } else {
        setDepartments([]);
      }
    } catch (error) {
      console.error('DEPARTMENT LOAD ERROR:', error);
      setDepartments([]);
    } finally {
      setDepartmentLoading(false);
    }
  };

  // LOAD FACE PROFILES
  const loadFaceProfiles = async () => {
    try {
      const profiles = await recognitionService.getAllProfiles();
      if (Array.isArray(profiles)) {
        const profileMap = {};
        profiles.forEach((p) => {
          profileMap[p.employee_id] = p;
        });
        setFaceProfiles(profileMap);
      }
    } catch (error) {
      console.error('FACE PROFILES LOAD ERROR:', error);
    }
  };
  const streamRef = useRef(null);

  const loadTodayAttendance = async () => {
    try {
      const logs = await attendanceService.getAll();
      const todayStr = new Date().toISOString().split('T')[0];
      const map = {};
      logs.forEach(log => {
        const logDate = log.date || (log.check_in ? log.check_in.split('T')[0] : '');
        if (logDate === todayStr) {
          map[log.employee_id] = log;
        }
      });
      setTodayAttendanceMap(map);
    } catch (err) {
      console.error("Failed to load today's attendance logs:", err);
    }
  };

  useEffect(() => {
    loadEmployees();
    loadDepartments();
    loadFaceProfiles();
    loadTodayAttendance();
    
    // Live ticking countdown timer every 1 second
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const saved = JSON.parse(localStorage.getItem('smartattend_salaries') || '{}');
    setSalaries(saved);

    return () => clearInterval(timer);
  }, []);

  // Fetch selected employee logs for salary calculation
  useEffect(() => {
    if (selectedId) {
      setCalendarOffset(0);
      attendanceService.getByEmployee(selectedId)
        .then(data => {
          if (Array.isArray(data)) setSelectedEmpLogs(data);
          else setSelectedEmpLogs([]);
        })
        .catch(() => setSelectedEmpLogs([]));
      
      leaveService.getAll(selectedId)
        .then(data => {
          if (Array.isArray(data)) setSelectedEmpLeaves(data);
          else setSelectedEmpLeaves([]);
        })
        .catch(() => setSelectedEmpLeaves([]));
    } else {
      setSelectedEmpLogs([]);
      setSelectedEmpLeaves([]);
    }
  }, [selectedId]);

  const getTodayRemainingTime = () => {
    if (!selectedEmpLogs || selectedEmpLogs.length === 0) return null;
    
    const todayStr = new Date(now).toISOString().split('T')[0];
    const logDay = new Date(now).getDay();
    const shiftRequiredHours = logDay === 6 ? 4 : 8;
    const shiftRequiredSeconds = shiftRequiredHours * 3600;
    
    const todayLog = selectedEmpLogs.find(log => {
      const logDate = log.date || (log.check_in ? log.check_in.split('T')[0] : '');
      return logDate === todayStr;
    });
    
    if (!todayLog) return { status: 'Not Checked In', activeHours: 0, remainingSeconds: shiftRequiredSeconds, reverseTimerFormatted: `0${shiftRequiredHours}h 00m 00s remaining`, totalWorkedHours: 0, shiftRequiredHours };
    
    const parsedIntervals = todayLog.intervals ? (typeof todayLog.intervals === 'string' ? JSON.parse(todayLog.intervals) : todayLog.intervals) : [];
    let totalWorkedMs = 0;
    let currentlyIn = false;
    
    parsedIntervals.forEach(interval => {
      const inTime = new Date(interval.in).getTime();
      if (interval.out) {
        totalWorkedMs += (new Date(interval.out).getTime() - inTime);
      } else {
        currentlyIn = true;
        totalWorkedMs += (now - inTime);
      }
    });
    
    const totalWorkedSeconds = Math.max(0, Math.floor(totalWorkedMs / 1000));
    const remainingSeconds = Math.max(0, shiftRequiredSeconds - totalWorkedSeconds);
    const totalWorkedHours = totalWorkedMs / (1000 * 60 * 60);

    let statusText = 'Checked Out';
    if (currentlyIn) {
      statusText = 'Working / Inside';
    } else if (totalWorkedSeconds >= shiftRequiredSeconds) {
      statusText = 'Completed Shift';
    } else if (totalWorkedSeconds > 0) {
      statusText = 'On Break / Checked Out';
    }
    
    const remH = Math.floor(remainingSeconds / 3600);
    const remM = Math.floor((remainingSeconds % 3600) / 60);
    const remS = Math.floor(remainingSeconds % 60);

    const pad = (n) => String(n).padStart(2, '0');
    const reverseTimerFormatted = remainingSeconds <= 0 
      ? 'Shift Completed! 🎉' 
      : `${pad(remH)}h ${pad(remM)}m ${pad(remS)}s remaining`;
    
    return {
      status: statusText,
      currentlyIn,
      reverseTimerFormatted,
      remainingSeconds,
      totalWorkedHours,
      shiftRequiredHours
    };
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          aspectRatio: { ideal: 4 / 3 },
          facingMode: facingMode
        },
        audio: false
      });

      if (!showFaceModal) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      if (showFaceModal) {
        console.error('Camera access denied:', err);
        setFaceStatus('error');
        setFaceMessage('Camera access failed. Please allow webcam permissions.');
      }
    }
  }, [facingMode, stopCamera, showFaceModal]);

  const openFaceModal = (emp) => {
    setFaceTarget(emp);
    setCapturedImage(null);
    setFaceStatus(null);
    setFaceMessage('');
    setShowFaceModal(true);
  };

  const closeFaceModal = () => {
    stopCamera();
    setShowFaceModal(false);
    setFaceTarget(null);
    setCapturedImage(null);
    setFaceStatus(null);
    setFaceMessage('');
    setCapturing(false);
  };

  const loadAccountInfo = useCallback(async (empId) => {
    if (!empId) return;
    try {
      setAccountLoading(true);
      const data = await employeeService.getUserAccount(empId);
      setAccountInfo(data);
      if (data && data.has_account) {
        setAccountUsername(data.username);
      } else {
        setAccountUsername('');
      }
      setAccountPassword('');
      setShowAccountForm(false);
    } catch (error) {
      console.error('FAILED TO LOAD ACCOUNT INFO:', error);
      setAccountInfo(null);
    } finally {
      setAccountLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadAccountInfo(selectedId);
    } else {
      setAccountInfo(null);
    }
  }, [selectedId, loadAccountInfo]);

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!accountUsername.trim()) {
      alert('Username is required.');
      return;
    }
    if (!accountInfo?.has_account && !accountPassword) {
      alert('Password is required for new accounts.');
      return;
    }
    try {
      setAccountLoading(true);
      await employeeService.setUserAccount(selectedId, {
        username: accountUsername.trim(),
        password: accountPassword
      });
      alert('Credentials saved successfully!');
      await loadAccountInfo(selectedId);
    } catch (error) {
      alert('Failed to save credentials: ' + (error.response?.data?.detail || error.message));
    } finally {
      setAccountLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete this employee's login credentials? They will no longer be able to log in.")) return;
    try {
      setAccountLoading(true);
      await employeeService.deleteUserAccount(selectedId);
      alert('Credentials deleted successfully.');
      await loadAccountInfo(selectedId);
    } catch (error) {
      alert('Failed to delete credentials.');
    } finally {
      setAccountLoading(false);
    }
  };

  useEffect(() => {
    if (showFaceModal) {
      const timer = setTimeout(() => startCamera(), 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [showFaceModal, startCamera, stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
  };

  const registerFace = async () => {
    if (!faceTarget || !canvasRef.current) return;
    setCapturing(true);
    setFaceStatus(null);
    setFaceMessage('');

    try {
      if (!capturedImage) {
        capturePhoto();
      }

      const canvas = canvasRef.current;
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
      });

      if (!blob) {
        setFaceStatus('error');
        setFaceMessage('Failed to capture image from webcam.');
        setCapturing(false);
        return;
      }

      const response = await recognitionService.registerFaceProfile(faceTarget.id, blob);

      const personName = `${faceTarget.first_name} ${faceTarget.last_name}`;
      setFaceStatus('success');
      setFaceMessage(`${personName}, your face is registered successfully!`);
      await loadFaceProfiles();

      // Automatically close modal after 4 seconds so the user has time to read the success message
      setTimeout(() => {
        closeFaceModal();
      }, 4000);
    } catch (error) {
      console.error('FACE REGISTRATION ERROR:', error);
      let message = 'Face registration failed.';
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') message = detail;
      else if (Array.isArray(detail)) message = detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
      setFaceStatus('error');
      setFaceMessage(message);
    } finally {
      setCapturing(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (!employeeId.trim() || !firstName.trim() || !lastName.trim() || !email.trim() || !departmentId) {
        alert('Please fill out all required fields.');
        return;
      }

      const employeeData = {
        employee_id: employeeId.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        department_id: Number(departmentId),
        is_active: true
      };

      const created = await employeeService.create(employeeData);
      
      if (salary.trim() && created && created.id) {
        const updatedSalaries = { ...salaries, [created.id]: Number(salary.trim()) };
        setSalaries(updatedSalaries);
        localStorage.setItem('smartattend_salaries', JSON.stringify(updatedSalaries));
      }

      alert('Employee created successfully!');

      setEmployeeId('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setDepartmentId('');
      setSalary('');
      setShowModal(false);
      await loadEmployees();
    } catch (error) {
      console.error('CREATE EMPLOYEE ERROR:', error);
      let message = error.message;
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') message = detail;
      else if (Array.isArray(detail)) message = detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
      alert('Error creating employee: ' + message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await employeeService.delete(id);
      await loadEmployees();
    } catch (error) {
      alert('Failed to delete employee.');
    }
  };

  const handleUpdateSalary = (empId, newSal) => {
    const updated = { ...salaries, [empId]: Number(newSal) };
    setSalaries(updated);
    localStorage.setItem('smartattend_salaries', JSON.stringify(updated));
    alert('Salary updated successfully!');
  };

  const calculateSalaryForMonth = (baseSalary) => {
    if (!baseSalary) return { amount: 0, presentDays: 0, halfDays: 0, totalWeekdays: 22 };
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    let totalWeekdays = 0;
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        totalWeekdays++;
      }
      d.setDate(d.getDate() + 1);
    }

    const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthlyLogs = selectedEmpLogs.filter(log => {
      const logDate = log.attendance_date || (log.check_in ? log.check_in.split('T')[0] : '');
      return logDate.startsWith(currentMonthStr);
    });

    let presentDays = 0;
    let halfDays = 0;

    monthlyLogs.forEach(log => {
      const status = (log.status || 'Present').toLowerCase();
      if (status === 'present' || status === 'late') {
        presentDays++;
      } else if (status === 'half_day' || status === 'half day') {
        halfDays++;
      }
    });

    const dailyRate = baseSalary / totalWeekdays;
    const calculatedAmount = Math.round((presentDays * dailyRate) + (halfDays * dailyRate * 0.5));

    return {
      amount: calculatedAmount,
      presentDays,
      halfDays,
      totalWeekdays
    };
  };

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const empEmail = emp.email?.toLowerCase() || '';
    const empId = emp.employee_id?.toLowerCase() || '';
    const searchText = search.toLowerCase();

    const matchesSearch = fullName.includes(searchText) || empEmail.includes(searchText) || empId.includes(searchText);

    const deptName = emp.department_name || emp.department?.name || '';
    const matchesDept = selectedDept === 'ALL' || deptName === selectedDept;

    return matchesSearch && matchesDept;
  });

  const getInitials = (firstName, lastName) => {
    const f = firstName ? firstName[0] : '';
    const l = lastName ? lastName[0] : '';
    return (f + l).toUpperCase() || 'EM';
  };

  const selectedEmployee = employees.find((e) => e.id === selectedId) || null;
  const selectedDeptName = selectedEmployee
    ? (selectedEmployee.department_name || selectedEmployee.department?.name || 'Unassigned')
    : null;
  const selectedFaceRegistered = selectedEmployee ? !!faceProfiles[selectedEmployee.id] : false;

  return (
    <div className="employees-page-container">
      <PageHeader
        title="Employee Directory"
        subtitle="Manage employee profiles, departmental assignments, and AI face registrations"
        user={user}
        onSearch={(q) => setSearch(q)}
      />

      <div className="employees-content">
        {/* Action & Filter Bar */}
        <div className="employees-action-bar ai-card">
          <div className="search-filter-box">
            <div className="input-with-icon">
              <Search size={16} className="input-icon" />
              <input
                type="text"
                className="input-field"
                placeholder="Search by name, ID, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="dept-select-box">
              <Building2 size={16} className="select-icon" />
              <select
                className="input-field"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="ALL">All Departments</option>
                {departments.map((d, idx) => (
                  <option key={d.id || idx} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              setShowModal(true);
              loadDepartments();
            }}
          >
            <Plus size={16} />
            <span>Add New Employee</span>
          </button>
        </div>

        {/* Split View: list + detail panel */}
        <div className="employees-split-view">
          {/* LEFT: compact list */}
          <div className="ai-card employees-list-panel">
            <div className="ai-card-header list-panel-header">
              <div>
                <h3 className="ai-card-title">All Employees</h3>
                <p className="ai-card-subtitle">{filteredEmployees.length} registered</p>
              </div>
            </div>

            <div className="employees-list-scroll">
              {loading ? (
                <div className="p-20">
                  <div className="skeleton" style={{ height: 260 }} />
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="empty-employees-state">
                  <User size={36} color="#94a3b8" />
                  <h4>No employees found</h4>
                  <p>Click "Add New Employee" to register staff records.</p>
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isFaceRegistered = !!faceProfiles[emp.id];
                  const isSelected = emp.id === selectedId;

                  // Today's attendance details for list view
                  const todayLog = todayAttendanceMap[emp.id];
                  const logDayList = new Date(now).getDay();
                  const shiftReqHoursList = logDayList === 6 ? 4 : 8;
                  const shiftReqSecsList = shiftReqHoursList * 3600;
                  
                  let isCurrentlyWorking = false;
                  let hasCompletedShift = false;
                  let remFormatted = `0${shiftReqHoursList}h 00m 00s left`;

                  if (todayLog) {
                    const parsedIntervals = todayLog.intervals ? (typeof todayLog.intervals === 'string' ? JSON.parse(todayLog.intervals) : todayLog.intervals) : [];
                    let totalWorkedMs = 0;
                    let currentlyIn = false;
                    parsedIntervals.forEach(interval => {
                      const inTime = new Date(interval.in).getTime();
                      if (interval.out) {
                        totalWorkedMs += (new Date(interval.out).getTime() - inTime);
                      } else {
                        currentlyIn = true;
                        totalWorkedMs += (now - inTime);
                      }
                    });
                    const totalWorkedSeconds = Math.max(0, Math.floor(totalWorkedMs / 1000));
                    const shiftRequiredSeconds = shiftReqSecsList;
                    const remainingSeconds = Math.max(0, shiftRequiredSeconds - totalWorkedSeconds);

                    isCurrentlyWorking = currentlyIn && remainingSeconds > 0;
                    hasCompletedShift = totalWorkedSeconds >= shiftRequiredSeconds;

                    const rH = Math.floor(remainingSeconds / 3600);
                    const rM = Math.floor((remainingSeconds % 3600) / 60);
                    const rS = Math.floor(remainingSeconds % 60);
                    const pad = (n) => String(n).padStart(2, '0');
                    remFormatted = `${pad(rH)}h ${pad(rM)}m ${pad(rS)}s left`;
                  }

                  return (
                    <button
                      key={emp.id}
                      className={`employee-list-row ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedId(emp.id)}
                    >
                      <div className="emp-avatar-circle">
                        {getInitials(emp.first_name, emp.last_name)}
                      </div>
                      <div className="employee-list-row-info">
                        <span className="emp-full-name">{emp.first_name} {emp.last_name}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                          <span className="emp-id-tag">#{emp.employee_id}</span>
                          {isCurrentlyWorking && (
                            <span className="badge" style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', fontFamily: 'monospace' }}>
                              {remFormatted}
                            </span>
                          )}
                          {hasCompletedShift && (
                            <span className="badge" style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                              Done 🎉
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="employee-list-row-status">
                        {isFaceRegistered ? (
                          <span className="face-dot registered" title="Face registered" />
                        ) : (
                          <span className="face-dot pending" title="Face not registered" />
                        )}
                        <span className={`badge ${emp.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <ChevronRight size={15} className="row-chevron" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: detail panel */}
          <div className="ai-card employees-detail-panel">
            {!selectedEmployee ? (
              <div className="empty-employees-state detail-empty">
                <User size={40} color="#94a3b8" />
                <h4>Select an employee</h4>
                <p>Choose someone from the list to view their profile.</p>
              </div>
            ) : (
              <>
                <div className="detail-panel-header">
                  <div className="detail-panel-identity">
                    <div className="emp-avatar-circle detail-avatar">
                      {getInitials(selectedEmployee.first_name, selectedEmployee.last_name)}
                    </div>
                    <div>
                      <h2 className="detail-panel-name">
                        {selectedEmployee.first_name} {selectedEmployee.last_name}
                      </h2>
                      <div className="detail-panel-subrow">
                        <span className="emp-id-tag"><IdCard size={13} /> #{selectedEmployee.employee_id}</span>
                        <span className="badge badge-neutral">{selectedDeptName}</span>
                        <span className={`badge ${selectedEmployee.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {selectedEmployee.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="icon-btn delete-action-btn"
                    onClick={() => handleDelete(selectedEmployee.id)}
                    title="Delete Employee"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="detail-panel-body">
                  <div className="detail-info-grid">
                    <div className="detail-info-item">
                      <Mail size={15} className="detail-info-icon" />
                      <div>
                        <span className="detail-info-label">Email</span>
                        <span className="detail-info-value">{selectedEmployee.email}</span>
                      </div>
                    </div>
                    <div className="detail-info-item">
                      <Phone size={15} className="detail-info-icon" />
                      <div>
                        <span className="detail-info-label">Phone</span>
                        <span className="detail-info-value">{selectedEmployee.phone || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="detail-info-item">
                      <Building2 size={15} className="detail-info-icon" />
                      <div>
                        <span className="detail-info-label">Department</span>
                        <span className="detail-info-value">{selectedDeptName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Today's Shift Status Card */}
                  {(() => {
                    const todayStats = getTodayRemainingTime();
                    if (!todayStats) return null;
                    return (
                      <div className="detail-face-section" style={{ marginTop: '16px', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
                        <div className="detail-face-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} color="#6366f1" />
                            <span style={{ fontWeight: '700', fontSize: '0.88rem' }}>Today's Shift Tracker ({todayStats.shiftRequiredHours}h Required)</span>
                          </div>
                          <span className={`badge ${todayStats.currentlyIn ? 'badge-success' : todayStats.totalWorkedHours >= todayStats.shiftRequiredHours ? 'badge-primary' : 'badge-neutral'}`}>
                            {todayStats.status}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-muted text-sm" style={{ fontWeight: '600' }}>Time Remaining:</span>
                            <span className="text-base font-bold" style={{ color: todayStats.remainingSeconds > 0 ? '#f59e0b' : '#10b981', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                              {todayStats.reverseTimerFormatted}
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div style={{ width: '100%', height: '8px', background: 'rgba(0, 0, 0, 0.08)', borderRadius: '4px', overflow: 'hidden', marginTop: '2px' }}>
                            <div style={{
                              width: `${Math.min(100, (todayStats.totalWorkedHours / todayStats.shiftRequiredHours) * 100)}%`,
                              height: '100%',
                              background: todayStats.remainingSeconds > 0 ? 'linear-gradient(90deg, #6366f1, #06b6d4)' : 'linear-gradient(90deg, #10b981, #34d399)',
                              borderRadius: '4px',
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="detail-face-section">
                    <div className="detail-face-section-header">
                      <ScanFace size={16} />
                      <span>Face Biometrics</span>
                    </div>

                    {selectedFaceRegistered ? (
                      <div className="face-registered-row">
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} /> Registered
                        </span>
                        <span className="text-muted text-sm">This employee can check in via face scan.</span>
                      </div>
                    ) : (
                      <div className="face-registered-row">
                        <button
                          className="btn btn-secondary btn-sm register-face-btn"
                          onClick={() => openFaceModal(selectedEmployee)}
                        >
                          <Camera size={13} />
                          <span>Register Face</span>
                        </button>
                        <span className="text-muted text-sm">No face profile yet.</span>
                      </div>
                    )}
                  </div>

                  {/* Employee User Credentials Section */}
                  <div className="detail-face-section" style={{ marginTop: '20px' }}>
                    <div className="detail-face-section-header">
                      <User size={16} />
                      <span>User Account (Employee Login)</span>
                    </div>

                    {accountLoading ? (
                      <div className="skeleton" style={{ height: 60, marginTop: '10px' }} />
                    ) : accountInfo && accountInfo.has_account ? (
                      <div style={{ marginTop: '10px', fontSize: '0.82rem' }}>
                        {!showAccountForm ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span className="text-muted">Username:</span>
                              <strong style={{ color: 'var(--text-main)' }}>{accountInfo.username}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span className="text-muted">Email:</span>
                              <span style={{ color: 'var(--text-main)' }}>{accountInfo.email || selectedEmployee.email}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setAccountUsername(accountInfo.username);
                                  setAccountPassword('');
                                  setShowAccountForm(true);
                                }}
                              >
                                Edit Account
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={handleDeleteAccount}
                              >
                                Delete Account
                              </button>
                            </div>
                          </div>
                        ) : (
                          <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                              <label className="text-muted" style={{ display: 'block', marginBottom: '4px' }}>Username</label>
                              <input
                                type="text"
                                className="input-field"
                                value={accountUsername}
                                onChange={(e) => setAccountUsername(e.target.value)}
                                placeholder="Enter username"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-muted" style={{ display: 'block', marginBottom: '4px' }}>Password (Leave blank to keep current)</label>
                              <input
                                type="password"
                                className="input-field"
                                value={accountPassword}
                                onChange={(e) => setAccountPassword(e.target.value)}
                                placeholder="Enter new password"
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button type="submit" className="btn btn-primary btn-sm">
                                Save
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setShowAccountForm(false)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: '10px', fontSize: '0.82rem' }}>
                        {!showAccountForm ? (
                          <div className="face-registered-row">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setAccountUsername(selectedEmployee.employee_id);
                                setAccountPassword('');
                                setShowAccountForm(true);
                              }}
                            >
                              <Plus size={13} />
                              <span>Create Login Account</span>
                            </button>
                            <span className="text-muted text-sm">No login account set up yet.</span>
                          </div>
                        ) : (
                          <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                              <label className="text-muted" style={{ display: 'block', marginBottom: '4px' }}>Username</label>
                              <input
                                type="text"
                                className="input-field"
                                value={accountUsername}
                                onChange={(e) => setAccountUsername(e.target.value)}
                                placeholder="Enter username"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-muted" style={{ display: 'block', marginBottom: '4px' }}>Password</label>
                              <input
                                type="password"
                                className="input-field"
                                value={accountPassword}
                                onChange={(e) => setAccountPassword(e.target.value)}
                                placeholder="Enter password"
                                required
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button type="submit" className="btn btn-primary btn-sm">
                                Create Account
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setShowAccountForm(false)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Compensation & Payroll Section */}
                  {(() => {
                    const baseSalary = salaries[selectedEmployee.id] || 0;
                    const payroll = calculateSalaryForMonth(baseSalary);
                    return (
                      <div className="detail-face-section" style={{ marginTop: '20px' }}>
                        <div className="detail-face-section-header">
                          <Building2 size={16} />
                          <span>Compensation & Payroll</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', fontSize: '0.82rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span className="text-muted">Monthly Base Salary:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input 
                                type="number" 
                                className="input-field" 
                                style={{ width: '100px', padding: '4px 8px', fontSize: '0.8rem' }}
                                key={selectedEmployee.id}
                                defaultValue={baseSalary || ''}
                                onBlur={(e) => handleUpdateSalary(selectedEmployee.id, e.target.value)}
                                placeholder="Not Set"
                              />
                              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>INR</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Weekdays in Month (Mon-Fri):</span>
                            <span className="font-semibold">{payroll.totalWeekdays} days</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Days Present / Half-Days:</span>
                            <span className="font-semibold">{payroll.presentDays}d / {payroll.halfDays}d</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
                            <strong style={{ color: 'var(--text-main)' }}>Calculated Payout:</strong>
                            <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                              INR {payroll.amount.toLocaleString()}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Monthly Attendance Calendar Grid */}
                  {(() => {
                    // 1. Map log dates
                    const attendanceMap = {};
                    selectedEmpLogs.forEach(log => {
                      const dateStr = log.attendance_date || (log.check_in ? log.check_in.split('T')[0] : '');
                      if (dateStr) {
                        attendanceMap[dateStr] = (log.status || 'present').toLowerCase();
                      }
                    });

                    // 1.5 Map leave dates
                    const approvedLeaves = selectedEmpLeaves.filter(l => (l.status || '').toLowerCase() === 'approved');
                    const isDateInLeave = (dateObj) => {
                      return approvedLeaves.some(l => {
                        const start = new Date(l.start_date);
                        const end = new Date(l.end_date);
                        start.setHours(0,0,0,0);
                        end.setHours(23,59,59,999);
                        return dateObj >= start && dateObj <= end;
                      });
                    };

                    // 2. Calculate target month/year based on offset
                    const targetDate = new Date();
                    targetDate.setMonth(targetDate.getMonth() + calendarOffset);
                    const year = targetDate.getFullYear();
                    const month = targetDate.getMonth();

                    const monthNames = [
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
                    ];
                    const currentMonthName = monthNames[month];

                    // 3. Sunday-start calendar grid
                    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
                    const totalDays = new Date(year, month + 1, 0).getDate();

                    const monthDays = [];
                    // Padding at start
                    for (let i = 0; i < firstDay; i++) {
                      monthDays.push({ padding: true });
                    }

                    // Populate days
                    const todayCompare = new Date();
                    todayCompare.setHours(0,0,0,0);

                    for (let d = 1; d <= totalDays; d++) {
                      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const checkDate = new Date(year, month, d);
                      checkDate.setHours(0,0,0,0);
                      
                      const isWeekend = checkDate.getDay() === 0 || checkDate.getDay() === 6;
                      const isFuture = checkDate > todayCompare;

                      let status = 'future';
                      if (attendanceMap[dayStr]) {
                        const s = attendanceMap[dayStr];
                        if (s === 'present' || s === 'late') {
                          status = 'present';
                        } else if (s === 'half_day' || s === 'half day') {
                          status = 'half_day';
                        } else if (s === 'absent') {
                          status = 'absent';
                        }
                      } else if (isDateInLeave(checkDate)) {
                        status = 'leave';
                      } else if (!isFuture) {
                        status = isWeekend ? 'weekend' : 'absent';
                      }

                      monthDays.push({
                        dayNum: d,
                        dateStr: dayStr,
                        status,
                        isToday: checkDate.getTime() === todayCompare.getTime()
                      });
                    }

                    return (
                      <div className="detail-face-section" style={{ marginTop: '20px' }}>
                        <div className="detail-face-section-header" style={{ justifyContent: 'space-between', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={16} />
                            <span>Attendance Calendar</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '2px 6px', fontSize: '0.75rem', minHeight: 'auto', lineHeight: '1' }}
                              onClick={() => setCalendarOffset(prev => prev - 1)}
                            >
                              &lt;
                            </button>
                            <span style={{ fontSize: '0.8rem', fontWeight: '600', minWidth: '95px', textAlign: 'center' }}>
                              {currentMonthName} {year}
                            </span>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '2px 6px', fontSize: '0.75rem', minHeight: 'auto', lineHeight: '1' }}
                              onClick={() => setCalendarOffset(prev => prev + 1)}
                            >
                              &gt;
                            </button>
                          </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="attendance-calendar-grid-container" style={{ marginTop: '12px' }}>
                          <div className="calendar-weekdays-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '6px' }}>
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                              <span key={d} style={{ fontSize: '0.72rem', fontWeight: '600', color: '#94a3b8' }}>{d}</span>
                            ))}
                          </div>

                          <div className="calendar-days-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                            {monthDays.map((day, idx) => {
                              if (day.padding) {
                                return <div key={`pad-${idx}`} className="calendar-day-box pad" style={{ aspectRatio: '1' }} />;
                              }

                              let bg = '#ffffff';
                              let border = '1px solid #e2e8f0';
                              let color = '#0f172a';

                              if (day.status === 'present') {
                                bg = '#22c55e';
                                border = '1px solid #16a34a';
                                color = '#ffffff';
                              } else if (day.status === 'absent') {
                                bg = '#ef4444';
                                border = '1px solid #dc2626';
                                color = '#ffffff';
                              } else if (day.status === 'half_day') {
                                bg = '#eab308';
                                border = '1px solid #ca8a04';
                                color = '#ffffff';
                              } else if (day.status === 'leave') {
                                bg = '#a855f7';
                                border = '1px solid #9333ea';
                                color = '#ffffff';
                              } else if (day.status === 'weekend') {
                                bg = '#f8fafc';
                                border = '1px solid #e2e8f0';
                                color = '#94a3b8';
                              } else if (day.status === 'future') {
                                bg = '#ffffff';
                                border = '1px dashed #cbd5e1';
                                color = '#cbd5e1';
                              }

                              return (
                                <div 
                                  key={day.dateStr} 
                                  className={`calendar-day-box ${day.status} ${day.isToday ? 'is-today' : ''}`}
                                  title={`${day.dateStr}: ${day.status.toUpperCase()}`}
                                  style={{
                                    background: bg,
                                    border: border,
                                    color: color,
                                    borderRadius: '6px',
                                    aspectRatio: '1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.72rem',
                                    fontWeight: day.isToday ? '700' : '500',
                                    cursor: 'default',
                                    boxShadow: day.isToday ? '0 0 0 2px var(--primary)' : 'none',
                                    position: 'relative'
                                  }}
                                >
                                  {day.dayNum}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="calendar-legend" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', fontSize: '0.72rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                            <span className="text-muted">Present</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                            <span className="text-muted">Absent</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308', display: 'inline-block' }} />
                            <span className="text-muted">Half Day</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7', display: 'inline-block' }} />
                            <span className="text-muted">On Leave</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'inline-block' }} />
                            <span className="text-muted">Weekend</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CREATE EMPLOYEE MODAL */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card ai-card">
            <div className="modal-header">
              <h3 className="modal-title">Create New Employee</h3>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>

            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-grid">
                <div className="input-group">
                  <label>Employee ID *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="EMP-001"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Department *</label>
                  <select
                    className="input-field"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    required
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="jane.smith@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Monthly Salary (INR)</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 50000"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} /> Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FACE REGISTRATION MODAL */}
      {showFaceModal && faceTarget && (
        <div className="modal-backdrop">
          <div className="modal-card ai-card face-modal">
            <div className="modal-header">
              <h3 className="modal-title">
                <ScanFace size={20} className="text-primary" /> Register Face Profile
              </h3>
              <button onClick={closeFaceModal} className="close-btn">&times;</button>
            </div>

            <div className="face-modal-body">
              <div className="face-target-info">
                <div className="emp-avatar-circle">
                  {getInitials(faceTarget.first_name, faceTarget.last_name)}
                </div>
                <div>
                  <strong>{faceTarget.first_name} {faceTarget.last_name}</strong>
                  <span className="d-block text-muted text-sm">ID: #{faceTarget.employee_id}</span>
                </div>
              </div>

              <div className="camera-guide">
                <div className="camera-viewport">
                  {capturedImage ? (
                    <img
                      src={capturedImage}
                      alt="Captured preview"
                      className="captured-img"
                    />
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="camera-video"
                      />
                      <button
                        type="button"
                        className="flip-camera-btn"
                        onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
                        title="Flip Camera"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <div className="face-frame-overlay">
                        <div className="oval-target" />
                      </div>
                    </>
                  )}
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>

                {!capturedImage && !faceStatus && (
                  <div className="face-camera-instruction">
                    <strong>Position your full face inside the oval</strong>
                    <span>Look directly at the camera and keep your head straight</span>
                  </div>
                )}
              </div>

              {faceStatus && (
                <div className={`face-alert ${faceStatus}`}>
                  {faceStatus === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  <span>{faceMessage}</span>
                </div>
              )}

              <div className="modal-footer">
                {faceStatus === 'success' ? (
                  <button onClick={closeFaceModal} className="btn btn-primary">Done</button>
                ) : capturedImage ? (
                  <>
                    <button onClick={() => { setCapturedImage(null); setFaceStatus(null); }} className="btn btn-secondary">
                      <RefreshCw size={14} /> Retake
                    </button>
                    <button onClick={registerFace} className="btn btn-primary" disabled={capturing}>
                      {capturing ? 'Saving...' : 'Register Face'}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={closeFaceModal} className="btn btn-secondary">Cancel</button>
                    <button onClick={capturePhoto} className="btn btn-primary" disabled={!cameraActive}>
                      <Camera size={16} /> Capture Face
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}