import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { dashboardService, attendanceService, departmentService } from '../services/services';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Calendar, Clock, TrendingUp, Users, CheckCircle2, AlertCircle, Download, ChevronDown, X } from 'lucide-react';
import './AnalyticsPage.css';

export default function AnalyticsPage({ user }) {
  const [timeRange, setTimeRange] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [stats, setStats] = useState({
    avgCheckIn: 'N/A',
    avgCheckOut: 'N/A',
    monthlyRate: 0,
    punctualityScore: 0
  });

  const [trendData, setTrendData] = useState([
    { day: 'Mon', present: 0, late: 0, absent: 0 },
    { day: 'Tue', present: 0, late: 0, absent: 0 },
    { day: 'Wed', present: 0, late: 0, absent: 0 },
    { day: 'Thu', present: 0, late: 0, absent: 0 },
    { day: 'Fri', present: 0, late: 0, absent: 0 },
    { day: 'Sat', present: 0, late: 0, absent: 0 },
    { day: 'Sun', present: 0, late: 0, absent: 0 }
  ]);

  const [deptData, setDeptData] = useState([]);
  const [pieData, setPieData] = useState([
    { name: 'Present', value: 0, color: '#10b981' },
    { name: 'Late', value: 0, color: '#f59e0b' },
    { name: 'Absent', value: 0, color: '#ef4444' }
  ]);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const [dash, depts, logs] = await Promise.all([
          dashboardService.getDashboard().catch(() => null),
          departmentService.getAll().catch(() => []),
          attendanceService.getAll().catch(() => [])
        ]);

        if (dash) {
          const totEmp = dash.employees?.total || 0;
          const pres = dash.attendance?.present || 0;
          const abs = dash.attendance?.absent || 0;
          const rate = totEmp > 0 ? Math.round((pres / totEmp) * 100) : 0;

          setStats(prev => ({
            ...prev,
            monthlyRate: rate,
            // Punctuality will be overridden by real log data below if available
            punctualityScore: rate > 0 ? Math.min(rate + 5, 100) : 0
          }));

          setPieData([
            { name: 'Present', value: pres, color: '#10b981' },
            { name: 'Absent', value: abs, color: '#ef4444' }
          ]);
        }

        if (Array.isArray(depts) && depts.length > 0) {
          setDeptData(depts.map(d => ({
            name: d.name,
            rate: d.attendance_rate !== undefined ? d.attendance_rate : 0,
            count: d.employee_count || 0
          })));
        } else {
          setDeptData([]);
        }

        if (Array.isArray(logs)) {
          setAttendanceLogs(logs);
        }

        if (Array.isArray(logs) && logs.length > 0) {
          let totalInSecs = 0;
          let countIn = 0;
          let totalOutSecs = 0;
          let countOut = 0;
          let lateCount = 0;

          const trendMap = {};

          logs.forEach(l => {
            if (l.check_in) {
              const dateObj = new Date(l.check_in);
              totalInSecs += dateObj.getHours() * 3600 + dateObj.getMinutes() * 60;
              countIn++;
              
              if (l.status === 'late' || l.is_late) {
                lateCount++;
              }
            }
            if (l.check_out) {
              const dateObj = new Date(l.check_out);
              totalOutSecs += dateObj.getHours() * 3600 + dateObj.getMinutes() * 60;
              countOut++;
            }

            const logDate = l.check_in || l.date || l.created_at;
            if (logDate) {
              const dateStr = new Date(logDate).toLocaleDateString('en-US', { weekday: 'short' });
              if (!trendMap[dateStr]) trendMap[dateStr] = { day: dateStr, present: 0, late: 0, absent: 0 };
              
              const status = (l.status || '').toLowerCase();
              if (status === 'late' || l.is_late) {
                trendMap[dateStr].late++;
              } else if (status === 'absent') {
                trendMap[dateStr].absent++;
              } else {
                trendMap[dateStr].present++;
              }
            }
          });

          const formatTimeFromSecs = (avgSec) => {
            const hrs = Math.floor(avgSec / 3600);
            const mins = Math.floor((avgSec % 3600) / 60);
            const ampm = hrs >= 12 ? 'PM' : 'AM';
            const formattedHrs = (hrs % 12 || 12).toString().padStart(2, '0');
            const formattedMins = mins.toString().padStart(2, '0');
            return `${formattedHrs}:${formattedMins} ${ampm}`;
          };

          let updates = {};
          if (countIn > 0) {
            updates.avgCheckIn = formatTimeFromSecs(totalInSecs / countIn);
            updates.punctualityScore = Math.round(((countIn - lateCount) / countIn) * 100);
          }
          if (countOut > 0) {
            updates.avgCheckOut = formatTimeFromSecs(totalOutSecs / countOut);
          }
          
          if (Object.keys(updates).length > 0) {
            setStats(prev => ({ ...prev, ...updates }));
          }

          const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const trendArray = orderedDays.map(d => trendMap[d] || { day: d, present: 0, late: 0, absent: 0 });
          setTrendData(trendArray);
        }

      } catch (e) {
        console.error('Analytics load error:', e);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [timeRange]);

  const getFilteredLogs = () => {
    if (!customFrom || !customTo) return attendanceLogs;

    const from = new Date(`${customFrom}T00:00:00`);
    const to = new Date(`${customTo}T23:59:59`);

    return attendanceLogs.filter((log) => {
      const dateValue = log.check_in || log.date || log.created_at;
      if (!dateValue) return false;
      const date = new Date(dateValue);
      return date >= from && date <= to;
    });
  };

  const csvEscape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const exportAttendanceCSV = () => {
    const logs = getFilteredLogs();

    const headers = [
      'Employee',
      'Employee ID',
      'Department',
      'Check In',
      'Check Out',
      'Status'
    ];

    const rows = logs.map((log) => [
      log.employee_name || log.name || '',
      log.employee_id || '',
      log.department || '',
      log.check_in || '',
      log.check_out || '',
      log.status || (log.check_out ? 'Checked Out' : 'Present')
    ]);

    const csv = [
      headers.map(csvEscape).join(','),
      ...rows.map((row) => row.map(csvEscape).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const rangeName =
      customFrom && customTo
        ? `${customFrom}_to_${customTo}`
        : timeRange;

    link.href = url;
    link.download = `AttendIQ_Attendance_${rangeName}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setShowExportMenu(false);
  };

  const exportSummaryCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Average Check-In Time', stats.avgCheckIn],
      ['Average Check-Out Time', stats.avgCheckOut],
      ['Attendance Rate', `${stats.monthlyRate}%`],
      ['Punctuality Score', `${stats.punctualityScore}%`]
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `AttendIQ_Analytics_Summary_${timeRange}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setShowExportMenu(false);
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) {
      alert('Please select both start and end dates.');
      return;
    }

    if (new Date(customFrom) > new Date(customTo)) {
      alert('Start date cannot be after end date.');
      return;
    }

    setTimeRange('custom');
    setShowCustomRange(false);
  };

  return (
    <div className="analytics-page-container">
      <PageHeader
        title="Analytics & Workforce Intelligence"
        subtitle="Real-time attendance patterns, punctuality, and department performance"
        user={user}
      />

      <div className="analytics-content">
        <div className="analytics-filter-bar ai-card">
          <div className="filter-toolbar">

            <div className="filter-group">
              <span className="filter-label">Time Period</span>

              <div className="btn-group">
                <button className={`filter-btn ${timeRange === 'today' ? 'active' : ''}`} onClick={() => setTimeRange('today')}>Today</button>
                <button className={`filter-btn ${timeRange === '7days' ? 'active' : ''}`} onClick={() => setTimeRange('7days')}>7 Days</button>
                <button className={`filter-btn ${timeRange === '30days' ? 'active' : ''}`} onClick={() => setTimeRange('30days')}>30 Days</button>
                <button className={`filter-btn ${timeRange === 'month' ? 'active' : ''}`} onClick={() => setTimeRange('month')}>This Month</button>

                <button
                  className={`filter-btn ${timeRange === 'custom' ? 'active' : ''}`}
                  onClick={() => setShowCustomRange((value) => !value)}
                >
                  Custom
                </button>
              </div>
            </div>

            <div className="analytics-toolbar-actions">
              <button
                className="export-button"
                onClick={() => setShowExportMenu((value) => !value)}
              >
                <Download size={15} />
                Export
                <ChevronDown size={14} />
              </button>

              {showExportMenu && (
                <div className="export-menu">
                  <button onClick={exportAttendanceCSV}>
                    <Download size={14} />
                    Attendance CSV
                  </button>
                  <button onClick={exportSummaryCSV}>
                    <TrendingUp size={14} />
                    Analytics Summary CSV
                  </button>
                </div>
              )}
            </div>

          </div>

          {showCustomRange && (
            <div className="custom-range-panel">
              <div className="custom-range-title">
                <div>
                  <strong>Custom date range</strong>
                  <span>Choose the period you want to analyse or export.</span>
                </div>

                <button
                  className="custom-close"
                  onClick={() => setShowCustomRange(false)}
                  aria-label="Close custom date range"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="custom-range-fields">
                <label>
                  <span>From</span>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                </label>

                <label>
                  <span>To</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </label>

                <button className="apply-range-button" onClick={applyCustomRange}>
                  Apply range
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="active-range-note">
          <Calendar size={14} />
          <span>
            {timeRange === 'custom' && customFrom && customTo
              ? `Showing ${customFrom} to ${customTo}`
              : `Showing ${timeRange === 'today' ? 'today' : timeRange === '7days' ? 'the last 7 days' : timeRange === '30days' ? 'the last 30 days' : 'this month'}`}
          </span>
        </div>

        <div className="analytics-summary-grid">
          <div className="ai-card summary-card">
            <div className="card-top">
              <span className="card-label">Average Check-In Time</span>
              <Clock size={18} color="#2563eb" />
            </div>
            <div className="card-val font-heading">{stats.avgCheckIn}</div>
            <span className="card-sub text-muted">Verified check-in average</span>
          </div>

          <div className="ai-card summary-card">
            <div className="card-top">
              <span className="card-label">Average Check-Out Time</span>
              <Clock size={18} color="#10b981" />
            </div>
            <div className="card-val font-heading">{stats.avgCheckOut}</div>
            <span className="card-sub text-muted">Verified check-out average</span>
          </div>

          <div className="ai-card summary-card">
            <div className="card-top">
              <span className="card-label">Monthly Attendance Rate</span>
              <TrendingUp size={18} color="#10b981" />
            </div>
            <div className="card-val font-heading">{stats.monthlyRate}%</div>
            <span className="card-sub text-muted">Real database attendance rate</span>
          </div>

          <div className="ai-card summary-card">
            <div className="card-top">
              <span className="card-label">Punctuality Score</span>
              <CheckCircle2 size={18} color="#f59e0b" />
            </div>
            <div className="card-val font-heading">{stats.punctualityScore}%</div>
            <span className="card-sub text-muted">Workforce arrival score</span>
          </div>
        </div>

        <div className="analytics-charts-grid">
          <div className="ai-card chart-box full-width">
            <div className="ai-card-header">
              <h3 className="ai-card-title">Workforce Attendance Trend</h3>
            </div>
            <div className="ai-card-body" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Area type="monotone" dataKey="present" name="Present" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ai-card chart-box">
            <div className="ai-card-header">
              <h3 className="ai-card-title">Department Attendance Rate (%)</h3>
            </div>
            <div className="ai-card-body" style={{ height: 300 }}>
              {deptData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
                  No departments created in database yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={100} />
                    <Tooltip formatter={(val) => [`${val}%`, 'Attendance Rate']} />
                    <Bar dataKey="rate" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="ai-card chart-box">
            <div className="ai-card-header">
              <h3 className="ai-card-title">Workforce Status Distribution</h3>
            </div>
            <div className="ai-card-body" style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}