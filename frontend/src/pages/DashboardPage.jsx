import React, { useState, useEffect, useMemo } from 'react';

import PageHeader from '../components/PageHeader';

import AttendanceChart from '../components/dashboard/AttendanceChart';
import AttendanceDonut from '../components/dashboard/AttendanceDonut';
import LiveAttendance from '../components/dashboard/LiveAttendance';
import DepartmentPerformance from '../components/dashboard/DepartmentPerformance';
import AIStatusCard from '../components/dashboard/AIStatusCard';
import RecentActivity from '../components/dashboard/RecentActivity';
import QuickActions from '../components/dashboard/QuickActions';

import {
  dashboardService,
  attendanceService,
  departmentService,
  employeeService
} from '../services/services';

import wsService from '../services/websocket';

import {
  Users,
  UserCheck,
  UserX,
  Clock,
  ShieldCheck,
  Sparkles,
  Activity,
  ScanFace,
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  X,
  Search
} from 'lucide-react';

import './DashboardPage.css';


export default function DashboardPage({ user }) {

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [chartFilter, setChartFilter] = useState('7d');

  const [stats, setStats] = useState({
    totalEmployees: 0,
    present: 0,
    absent: 0,
    late: 0,
    currentlyIn: 0,
    checkedOut: 0,
    attendanceRate: 0,
    registeredFaces: 0
  });

  const [allEmployees, setAllEmployees] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [serverDate, setServerDate] = useState('');
  const [liveEvents, setLiveEvents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  const [attendanceLogs, setAttendanceLogs] = useState([]);

  const [currentTime, setCurrentTime] = useState(
    new Date()
  );


  // ============================================================
  // LIVE CLOCK
  // ============================================================

  useEffect(() => {

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);

  }, []);


  // ============================================================
  // LOAD DASHBOARD
  // ============================================================

  useEffect(() => {

    let mounted = true;

    async function loadDashboardData(showLoading = false) {

      try {

        if (showLoading) {
          setLoading(true);
        }
        setError(null);


        // ------------------------------------------------------
        // DASHBOARD METRICS
        // ------------------------------------------------------

        const data =
          await dashboardService.getDashboard();


        if (data && mounted) {

          const totalEmployees =
            data.employees?.total || 0;

          const present =
            data.attendance?.present || 0;

          const absent =
            data.attendance?.absent || 0;

          const checkedIn =
            data.attendance?.checked_in || 0;

          const checkedOut =
            data.attendance?.checked_out || 0;

          const registeredFaces =
            data.face_recognition?.registered || 0;


          const late =
            Math.max(
              totalEmployees -
              present -
              absent,
              0
            );


          const attendanceRate =
            totalEmployees > 0
              ? Number(
                (
                  (present /
                    totalEmployees) *
                  100
                ).toFixed(1)
              )
              : 0;


          if (data.date) {
            setServerDate(data.date);
          }

          setStats({
            totalEmployees,
            present,
            absent,
            late,
            currentlyIn: Math.max(checkedIn - checkedOut, 0),
            checkedOut,
            attendanceRate,
            registeredFaces
          });

        }


        // ------------------------------------------------------
        // DEPARTMENTS
        // ------------------------------------------------------

        try {

          const departmentData =
            await departmentService.getAll();

          if (
            mounted &&
            Array.isArray(departmentData)
          ) {
            setDepartments(departmentData);
          }

        } catch (departmentError) {

          console.warn(
            'Department fetch notice:',
            departmentError
          );

        }


        // ------------------------------------------------------
        // WORKFORCE / EMPLOYEES
        // ------------------------------------------------------

        try {

          const employeesData =
            await employeeService.getAll();

          if (
            mounted &&
            Array.isArray(employeesData)
          ) {
            setAllEmployees(employeesData);
          }

        } catch (employeeError) {

          console.warn(
            'Employees fetch notice:',
            employeeError
          );

        }


        // ------------------------------------------------------
        // ATTENDANCE LOGS
        // ------------------------------------------------------

        try {

          const logs =
            await attendanceService.getAll();


          if (
            mounted &&
            Array.isArray(logs)
          ) {

            setAttendanceLogs(logs);


            // --------------------------------------------------
            // LIVE ATTENDANCE
            // --------------------------------------------------

            const formattedLive =
              logs
                .slice(0, 8)
                .map((log) => ({

                  id: log.id,

                  employee_name:
                    log.employee_name ||
                    `Employee #${log.employee_id}`,

                  department:
                    log.department ||
                    'General',

                  time:
                    log.check_in
                      ? new Date(
                        log.check_in
                      ).toLocaleTimeString(
                        [],
                        {
                          hour: '2-digit',
                          minute: '2-digit'
                        }
                      )
                      : 'Today',

                  event_type:
                    log.check_out
                      ? 'Check Out'
                      : 'Check In',

                  status:
                    log.status ||
                    'Present',

                  confidence:
                    log.confidence ??
                    98.4

                }));


            setLiveEvents(
              formattedLive
            );


            // --------------------------------------------------
            // RECENT ACTIVITY
            // --------------------------------------------------

            const activities =
              logs
                .slice(0, 5)
                .map((log, index) => ({

                  id:
                    log.id ||
                    index,

                  title:
                    log.check_out
                      ? 'Employee Checked Out'
                      : 'Employee Checked In',

                  desc:
                    `${log.employee_name ||
                    `Employee #${log.employee_id}`
                    } verified via face recognition.`,

                  time:
                    log.check_out
                      ? new Date(
                        log.check_out
                      ).toLocaleTimeString(
                        [],
                        {
                          hour: '2-digit',
                          minute: '2-digit'
                        }
                      )
                      : log.check_in
                        ? new Date(
                          log.check_in
                        ).toLocaleTimeString(
                          [],
                          {
                            hour: '2-digit',
                            minute: '2-digit'
                          }
                        )
                        : 'Today',

                  color:
                    log.check_out
                      ? 'blue'
                      : 'green',

                  icon:
                    UserCheck

                }));


            setRecentActivities(
              activities
            );

          }

        } catch (attendanceError) {

          console.warn(
            'Attendance logs fetch notice:',
            attendanceError
          );

        }

      } catch (err) {

        console.error(
          'Failed to load dashboard data:',
          err
        );

        if (mounted) {

          setError(
            'Could not fetch metrics from backend server.'
          );

        }

      } finally {

        if (mounted && showLoading) {
          setLoading(false);
        }

      }

    }


    loadDashboardData(true);

    const pollInterval = setInterval(() => {
      loadDashboardData(false);
    }, 1500);


    // ========================================================
    // WEBSOCKET
    // ========================================================

    wsService.connect();


    const unsubscribe =
      wsService.subscribe(
        (eventData) => {

          if (
            !eventData ||
            !eventData.employee_name
          ) {
            return;
          }


          const newEvent = {

            id:
              Date.now().toString(),

            employee_name:
              eventData.employee_name,

            department:
              eventData.department ||
              'General',

            time:
              eventData.time ||
              new Date().toLocaleTimeString(
                [],
                {
                  hour: '2-digit',
                  minute: '2-digit'
                }
              ),

            event_type:
              eventData.event_type ||
              'Check In',

            status:
              eventData.status ||
              'Present',

            confidence:
              eventData.confidence ??
              98.4

          };


          setLiveEvents(
            (previous) => [
              newEvent,
              ...previous.slice(0, 7)
            ]
          );


          // Update dashboard counters

          setStats(
            (previous) => {

              const isCheckOut =
                eventData.event_type ===
                'Check Out';


              if (isCheckOut) {

                return {
                  ...previous,

                  currentlyIn:
                    Math.max(
                      previous.currentlyIn - 1,
                      0
                    ),

                  checkedOut:
                    previous.checkedOut + 1

                };

              }


              const newPresent =
                previous.present + 1;


              const newRate =
                previous.totalEmployees > 0
                  ? Number(
                    (
                      (newPresent /
                        previous.totalEmployees) *
                      100
                    ).toFixed(1)
                  )
                  : 0;


              return {

                ...previous,

                present:
                  newPresent,

                currentlyIn:
                  previous.currentlyIn + 1,

                attendanceRate:
                  newRate

              };

            }
          );


          // Recent activity

          setRecentActivities(
            (previous) => [

              {
                id:
                  Date.now().toString(),

                title:
                  eventData.event_type ===
                    'Check Out'
                    ? 'Employee Checked Out'
                    : 'Employee Checked In',

                desc:
                  `${eventData.employee_name} verified at terminal entrance.`,

                time:
                  new Date().toLocaleTimeString(
                    [],
                    {
                      hour: '2-digit',
                      minute: '2-digit'
                    }
                  ),

                color:
                  eventData.event_type ===
                    'Check Out'
                    ? 'blue'
                    : 'green',

                icon:
                  UserCheck

              },

              ...previous.slice(0, 4)

            ]
          );

        }
      );


    return () => {

      mounted = false;

      unsubscribe();

      clearInterval(pollInterval);

    };

  }, []);


  // ============================================================
  // REAL CHART DATA
  // ============================================================

  const chartData =
    useMemo(() => {

      const now =
        new Date();


      const days =
        chartFilter === '7d'
          ? 7
          : chartFilter === '30d'
            ? 30
            : 12;


      const result = [];


      for (
        let i = days - 1;
        i >= 0;
        i--
      ) {

        const date =
          new Date(now);


        if (chartFilter === '3m') {

          date.setDate(
            date.getDate() -
            i * 7
          );

        } else {

          date.setDate(
            date.getDate() -
            i
          );

        }


        const dateKey =
          date.toISOString()
            .split('T')[0];


        const dayLogs =
          attendanceLogs.filter(
            (log) => {

              if (!log.check_in) {
                return false;
              }

              const logDate =
                new Date(
                  log.check_in
                )
                  .toISOString()
                  .split('T')[0];

              return (
                logDate === dateKey
              );

            }
          );


        // Unique employees
        const uniqueEmployees =
          new Map();


        dayLogs.forEach(
          (log) => {

            const employeeId =
              log.employee_id ??
              log.employee_name;


            if (
              employeeId !==
              undefined
            ) {

              uniqueEmployees.set(
                String(employeeId),
                log
              );

            }

          }
        );


        let present = 0;
        let late = 0;


        uniqueEmployees.forEach(
          (log) => {

            const status =
              String(
                log.status ||
                ''
              ).toLowerCase();


            if (
              status.includes('late')
            ) {

              late++;

            } else {

              present++;

            }

          }
        );


        const absent =
          Math.max(
            stats.totalEmployees -
            present -
            late,
            0
          );


        let label;


        if (
          chartFilter === '7d'
        ) {

          label =
            date.toLocaleDateString(
              'en-US',
              {
                weekday: 'short'
              }
            );

        } else if (
          chartFilter === '30d'
        ) {

          label =
            date.toLocaleDateString(
              'en-US',
              {
                month: 'short',
                day: 'numeric'
              }
            );

        } else {

          label =
            `Week ${12 - i}`;

        }


        result.push({

          day: label,

          present,

          late,

          absent

        });

      }


      return result;

    }, [
      attendanceLogs,
      chartFilter,
      stats.totalEmployees
    ]);


  // ============================================================
  // CALCULATED VALUES
  // ============================================================

  const attendanceRate =
    stats.totalEmployees > 0
      ? (
        (
          stats.present /
          stats.totalEmployees
        ) * 100
      ).toFixed(1)
      : '0';


  const systemOnline =
    true;


  const currentDate =
    currentTime.toLocaleDateString(
      'en-US',
      {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      }
    );


  const latestEmployeeRecords = useMemo(() => {
    const map = new Map();

    [...attendanceLogs]
      .sort((a, b) => {
        const aTime = new Date(a.check_out || a.check_in || 0).getTime();
        const bTime = new Date(b.check_out || b.check_in || 0).getTime();
        return bTime - aTime;
      })
      .forEach((log) => {
        const key = String(log.employee_id ?? log.employee_name ?? log.id);
        if (!map.has(key)) map.set(key, log);
      });

    return Array.from(map.values());
  }, [attendanceLogs]);

  const insideEmployees = useMemo(() => {
    return latestEmployeeRecords
      .filter((log) => !log.check_out)
      .slice(0, 5);
  }, [latestEmployeeRecords]);

  const needsAttention = stats.absent + stats.late;

  const biometricCoverage =
    stats.totalEmployees > 0
      ? Math.round((stats.registeredFaces / stats.totalEmployees) * 100)
      : 0;


  const getModalEmployees = () => {
    if (!activeModal) return [];

    // Map department ID to name
    const deptsMap = new Map();
    departments.forEach(d => {
      deptsMap.set(String(d.id), d.name);
    });

    const getDeptName = (deptId) => {
      if (!deptId) return 'General';
      return deptsMap.get(String(deptId)) || 'General';
    };

    // Filter today's logs
    const targetDate = serverDate || (() => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();

    const todayLogs = attendanceLogs.filter(log => {
      const logDate = log.attendance_date || (log.check_in ? log.check_in.split('T')[0] : '');
      return logDate === targetDate;
    });

    // Map logs by employee ID
    const logsMap = new Map();
    todayLogs.forEach(log => {
      logsMap.set(String(log.employee_id), log);
    });

    let list = [];

    if (activeModal === 'workforce') {
      list = allEmployees.map(emp => {
        const log = logsMap.get(String(emp.id));
        return {
          id: emp.id,
          name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_id,
          department: getDeptName(emp.department_id),
          meta: emp.email || emp.phone || 'No contact info',
          status: log ? (log.status || 'Present') : 'Absent',
          checkIn: log?.check_in,
          checkOut: log?.check_out
        };
      });
    } else if (activeModal === 'present') {
      allEmployees.forEach(emp => {
        const log = logsMap.get(String(emp.id));
        if (log) {
          list.push({
            id: emp.id,
            name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_id,
            department: getDeptName(emp.department_id),
            meta: `Check-in: ${new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            status: log.status || 'Present',
            checkIn: log.check_in,
            checkOut: log.check_out
          });
        }
      });
    } else if (activeModal === 'late') {
      allEmployees.forEach(emp => {
        const log = logsMap.get(String(emp.id));
        if (log && (String(log.status).toLowerCase().includes('late') || String(log.status).toLowerCase().includes('half'))) {
          list.push({
            id: emp.id,
            name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_id,
            department: getDeptName(emp.department_id),
            meta: `Checked in late at ${new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            status: log.status || 'Late',
            checkIn: log.check_in,
            checkOut: log.check_out
          });
        }
      });
    } else if (activeModal === 'absent') {
      allEmployees.forEach(emp => {
        const log = logsMap.get(String(emp.id));
        if (!log) {
          list.push({
            id: emp.id,
            name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_id,
            department: getDeptName(emp.department_id),
            meta: emp.email || emp.phone || 'No contact info',
            status: 'Absent',
            checkIn: null,
            checkOut: null
          });
        }
      });
    } else if (activeModal === 'inside') {
      allEmployees.forEach(emp => {
        const log = logsMap.get(String(emp.id));
        if (log && !log.check_out) {
          list.push({
            id: emp.id,
            name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_id,
            department: getDeptName(emp.department_id),
            meta: `Inside office since ${new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            status: 'Present',
            checkIn: log.check_in,
            checkOut: null
          });
        }
      });
    }

    if (modalSearchQuery) {
      const q = modalSearchQuery.toLowerCase();
      list = list.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.department.toLowerCase().includes(q)
      );
    }

    return list;
  };


  const departmentsWithStats = useMemo(() => {
    // Group allEmployees by department_id
    const empByDept = new Map();
    allEmployees.forEach(emp => {
      const deptId = String(emp.department_id || '');
      if (deptId) {
        if (!empByDept.has(deptId)) empByDept.set(deptId, []);
        empByDept.get(deptId).push(emp);
      }
    });

    // Map today's logs by employee ID
    const todayStr = serverDate || (() => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();

    const todayLogs = attendanceLogs.filter(log => {
      const logDate = log.attendance_date || (log.check_in ? log.check_in.split('T')[0] : '');
      return logDate === todayStr;
    });

    const logsMap = new Map();
    todayLogs.forEach(log => {
      logsMap.set(String(log.employee_id), log);
    });

    // Calculate stats for each department
    return departments.map(dept => {
      const deptEmployees = empByDept.get(String(dept.id)) || [];
      const totalEmpCount = deptEmployees.length;

      // Count present employees today in this department
      let presentCount = 0;
      deptEmployees.forEach(emp => {
        if (logsMap.has(String(emp.id))) {
          presentCount++;
        }
      });

      const rate = totalEmpCount > 0 
        ? Math.round((presentCount / totalEmpCount) * 100) 
        : 0;

      return {
        ...dept,
        total_employees: totalEmpCount,
        attendance_rate: rate
      };
    });
  }, [departments, allEmployees, attendanceLogs, serverDate]);


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="dashboard-page-container">

      <PageHeader
        title="Overview"
        subtitle="Real-time workforce attendance insights"
        user={user}
      />

      <main className="dashboard-content">

        {error && (
          <div className="dashboard-alert-banner">
            <strong>Dashboard:</strong> {error}
          </div>
        )}

        {/* ======================================================
            WELCOME + TODAY'S STATUS
        ====================================================== */}
        <section className="overview-hero">

          <div className="hero-copy">
            <span className="hero-kicker">ATTENDANCE OVERVIEW</span>

            <h2>
              Good morning, {user?.full_name || user?.username || 'Admin'}
            </h2>

            <p>
              A quick look at who is here, who is late, and what needs attention today.
            </p>

            <div className="hero-actions">
              <button
                className="hero-primary-action"
                onClick={() => window.location.href = '/kiosk'}
              >
                <ScanFace size={16} />
                Scan attendance
                <ArrowRight size={15} />
              </button>

              <button
                className="hero-secondary-action"
                onClick={() => window.location.href = '/attendance'}
              >
                View attendance
              </button>
            </div>
          </div>

          <div className="hero-side">

            <div className="hero-date">
              <CalendarDays size={17} />
              <div>
                <span>{currentDate}</span>
                <strong>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>
              </div>
            </div>

            <div className="hero-system">
              <span className="system-dot" />
              <div>
                <strong>Recognition system online</strong>
                <span>Camera and verification service ready</span>
              </div>
            </div>

          </div>
        </section>


        {/* ======================================================
            KPI SUMMARY
        ====================================================== */}
        <section className="overview-kpis">

          <div className="overview-kpi" onClick={() => { setActiveModal('workforce'); setModalSearchQuery(''); }} style={{ cursor: 'pointer' }}>
            <div className="kpi-icon blue">
              <Users size={18} />
            </div>
            <div className="kpi-copy">
              <span>Total workforce</span>
              <strong>{stats.totalEmployees}</strong>
              <small>Registered employees</small>
            </div>
          </div>

          <div className="overview-kpi" onClick={() => { setActiveModal('present'); setModalSearchQuery(''); }} style={{ cursor: 'pointer' }}>
            <div className="kpi-icon green">
              <UserCheck size={18} />
            </div>
            <div className="kpi-copy">
              <span>Present today</span>
              <strong>{stats.present}</strong>
              <small>{attendanceRate}% of workforce</small>
            </div>
          </div>

          <div className="overview-kpi" onClick={() => { setActiveModal('late'); setModalSearchQuery(''); }} style={{ cursor: 'pointer' }}>
            <div className="kpi-icon amber">
              <Clock size={18} />
            </div>
            <div className="kpi-copy">
              <span>Late arrivals</span>
              <strong>{stats.late}</strong>
              <small>{stats.late ? 'Needs attention' : 'No late arrivals'}</small>
            </div>
          </div>

          <div className="overview-kpi" onClick={() => { setActiveModal('absent'); setModalSearchQuery(''); }} style={{ cursor: 'pointer' }}>
            <div className="kpi-icon red">
              <UserX size={18} />
            </div>
            <div className="kpi-copy">
              <span>Absent today</span>
              <strong>{stats.absent}</strong>
              <small>{stats.absent ? 'Not checked in' : 'Everyone accounted for'}</small>
            </div>
          </div>

          <div className="overview-kpi occupancy-kpi" onClick={() => { setActiveModal('inside'); setModalSearchQuery(''); }} style={{ cursor: 'pointer' }}>
            <div className="kpi-icon violet">
              <Activity size={18} />
            </div>
            <div className="kpi-copy">
              <span>Currently in office</span>
              <strong>{stats.currentlyIn}</strong>
              <small>{stats.checkedOut} checked out</small>
            </div>
          </div>

        </section>


        {/* ======================================================
            MAIN WORK AREA
        ====================================================== */}
        <section className="overview-work-grid">

          <div className="overview-main-column">

            {/* Attendance trend */}
            <section className="overview-panel chart-panel">
              <div className="overview-panel-header">
                <div>
                  <span className="section-kicker">ATTENDANCE TREND</span>
                  <h3>Workforce attendance</h3>
                  <p>Actual records from your recognition system</p>
                </div>

                <div className="chart-switcher">
                  <button
                    className={chartFilter === '7d' ? 'active' : ''}
                    onClick={() => setChartFilter('7d')}
                  >
                    7 days
                  </button>
                  <button
                    className={chartFilter === '30d' ? 'active' : ''}
                    onClick={() => setChartFilter('30d')}
                  >
                    30 days
                  </button>
                  <button
                    className={chartFilter === '3m' ? 'active' : ''}
                    onClick={() => setChartFilter('3m')}
                  >
                    3 months
                  </button>
                </div>
              </div>

              <div className="chart-mini-summary">
                <div>
                  <span className="summary-mark present-mark" />
                  <label>Present</label>
                  <strong>{stats.present}</strong>
                </div>
                <div>
                  <span className="summary-mark late-mark" />
                  <label>Late</label>
                  <strong>{stats.late}</strong>
                </div>
                <div>
                  <span className="summary-mark absent-mark" />
                  <label>Absent</label>
                  <strong>{stats.absent}</strong>
                </div>
              </div>

              <div className="chart-wrap">
                {loading ? (
                  <div className="skeleton" style={{ height: 300 }} />
                ) : (
                  <AttendanceChart data={chartData} />
                )}
              </div>
            </section>


            {/* Live events */}
            <section className="overview-panel">

              <div className="overview-panel-header">
                <div>
                  <div className="live-title">
                    <span className="live-pulse" />
                    <span className="section-kicker live-kicker">LIVE</span>
                  </div>
                  <h3>Latest attendance activity</h3>
                  <p>New recognition events appear here automatically</p>
                </div>

                <span className="event-total">
                  {liveEvents.length} events
                </span>
              </div>

              <div className="live-events-wrap">
                <LiveAttendance events={liveEvents} />
              </div>

            </section>

          </div>


          {/* ====================================================
              RIGHT SIDEBAR
          ==================================================== */}
          <aside className="overview-side-column">

            {/* Attendance health */}
            <section className="overview-panel health-panel">

              <div className="overview-panel-header compact">
                <div>
                  <span className="section-kicker">TODAY</span>
                  <h3>Attendance health</h3>
                </div>
              </div>

              <div className="health-body">

                <div className="health-score">
                  <div className="health-score-ring" style={{ "--rate": `${Math.min(Number(attendanceRate) || 0, 100)}%` }}>
                    <strong>{attendanceRate}%</strong>
                    <span>attendance</span>
                  </div>

                  <div className="health-text">
                    <strong>
                      {attendanceRate >= 90
                        ? 'Good attendance'
                        : attendanceRate >= 75
                          ? 'Needs monitoring'
                          : 'Needs attention'}
                    </strong>

                    <span>
                      {needsAttention === 0
                        ? 'No attendance issues reported today.'
                        : `${needsAttention} employee${needsAttention === 1 ? '' : 's'} need attention.`}
                    </span>
                  </div>
                </div>

                <div className="health-list">
                  <div>
                    <span>Present</span>
                    <strong>{stats.present}</strong>
                  </div>
                  <div>
                    <span>Late</span>
                    <strong>{stats.late}</strong>
                  </div>
                  <div>
                    <span>Absent</span>
                    <strong>{stats.absent}</strong>
                  </div>
                </div>

              </div>
            </section>


            {/* Who is inside */}
            <section className="overview-panel inside-panel">

              <div className="overview-panel-header compact">
                <div>
                  <span className="section-kicker">OFFICE PRESENCE</span>
                  <h3>Currently inside</h3>
                  <p>{stats.currentlyIn} people checked in</p>
                </div>
              </div>

              <div className="inside-list">

                {insideEmployees.length > 0 ? (
                  insideEmployees.map((employee, index) => (
                    <div className="inside-person" key={`${employee.id || employee.employee_id || index}`}>
                      <div className="person-avatar">
                        {(employee.employee_name || `Employee ${employee.employee_id || ''}`)
                          .split(' ')
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="person-info">
                        <strong>
                          {employee.employee_name || `Employee #${employee.employee_id}`}
                        </strong>
                        <span>
                          {employee.department || 'General'}
                          {employee.check_in && (
                            <> • {new Date(employee.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                          )}
                        </span>
                      </div>

                      <span className="inside-badge">
                        <span />
                        In
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="inside-empty">
                    <Users size={20} />
                    <span>No one is currently checked in.</span>
                  </div>
                )}

              </div>

              <button
                className="text-action"
                onClick={() => window.location.href = '/attendance'}
              >
                Open attendance logs
                <ArrowRight size={14} />
              </button>

            </section>


            {/* Biometric coverage */}
            <section className="coverage-card">

              <div className="coverage-top">
                <div className="coverage-icon">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <span>BIOMETRIC COVERAGE</span>
                  <strong>{biometricCoverage}%</strong>
                </div>
              </div>

              <div className="coverage-track">
                <span style={{ width: `${Math.min(biometricCoverage, 100)}%` }} />
              </div>

              <p>
                {stats.registeredFaces} of {stats.totalEmployees} employees have a registered face profile.
              </p>

              <button
                onClick={() => window.location.href = '/face-profiles'}
                className="coverage-action"
              >
                Manage face profiles
                <ArrowRight size={14} />
              </button>

            </section>

          </aside>

        </section>


        {/* ======================================================
            DEPARTMENTS + QUICK ACTIONS
        ====================================================== */}
        <section className="bottom-work-grid">

          <section className="overview-panel">

            <div className="overview-panel-header">
              <div>
                <span className="section-kicker">WORKFORCE</span>
                <h3>Department attendance</h3>
                <p>Attendance performance across your teams</p>
              </div>

              <button
                className="header-text-button"
                onClick={() => window.location.href = '/departments'}
              >
                Manage departments
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="department-content">
              <DepartmentPerformance departments={departmentsWithStats} />
            </div>

          </section>


          <section className="overview-panel">

            <div className="overview-panel-header">
              <div>
                <span className="section-kicker">ACTIONS</span>
                <h3>Quick actions</h3>
                <p>Frequently used workforce tools</p>
              </div>
            </div>

            <div className="quick-actions-wrap">
              <QuickActions />
            </div>

          </section>

        </section>


        {/* ======================================================
            RECENT ACTIVITY
        ====================================================== */}
        <section className="overview-panel">

          <div className="overview-panel-header">
            <div>
              <span className="section-kicker">SYSTEM ACTIVITY</span>
              <h3>Recent recognition activity</h3>
              <p>Latest actions recorded by AttendIQ</p>
            </div>

            <span className="activity-status">
              <span />
              Live
            </span>
          </div>

          <div className="recent-activity-wrap">
            <RecentActivity activities={recentActivities} />
          </div>

        </section>

      </main>

      {/* Glassmorphic Modal for KPI details */}
      {activeModal && (
        <div className="dashboard-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="dashboard-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-modal-header">
              <div>
                <h3>
                  {activeModal === 'workforce' && 'Workforce Employees'}
                  {activeModal === 'present' && 'Employees Present Today'}
                  {activeModal === 'late' && 'Late Arrivals Today'}
                  {activeModal === 'absent' && 'Employees Absent Today'}
                  {activeModal === 'inside' && 'Employees Currently Inside'}
                </h3>
                <p>
                  {activeModal === 'workforce' && 'Total registered staff list'}
                  {activeModal === 'present' && 'Employees who have checked in today'}
                  {activeModal === 'late' && 'Staff who checked in after start time'}
                  {activeModal === 'absent' && 'Staff who have not logged in yet'}
                  {activeModal === 'inside' && 'Active occupants currently in the building'}
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="dashboard-modal-body">
              <div className="modal-search-box">
                <Search size={16} className="text-muted" style={{ marginRight: 8, color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search by name or department..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="modal-employees-list">
                {getModalEmployees().length > 0 ? (
                  getModalEmployees().map((emp) => (
                    <div className="modal-employee-item" key={emp.id}>
                      <div className={`modal-emp-avatar ${String(emp.status).toLowerCase().replace(' ', '-')}`}>
                        {(emp.name || '')
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="modal-emp-info">
                        <span className="modal-emp-name">{emp.name}</span>
                        <span className="modal-emp-meta">{emp.department} • {emp.meta}</span>
                      </div>

                      <span className={`modal-emp-status-pill ${String(emp.status).toLowerCase().replace(' ', '-')}`}>
                        {emp.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="inside-empty" style={{ padding: '30px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    <Users size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <span style={{ fontSize: '0.82rem' }}>No employees found.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}