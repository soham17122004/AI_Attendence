import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function AttendanceChart({ data = [] }) {
  const hasData = Array.isArray(data) && data.length > 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e5eaf1',
          borderRadius: '12px',
          padding: '12px 14px',
          minWidth: '150px',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.10)'
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#172033',
            marginBottom: '8px'
          }}
        >
          {label}
        </div>

        {payload.map((entry, index) => (
          <div
            key={`item-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              marginTop: '6px',
              fontSize: '12px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#64748b'
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: entry.color,
                  display: 'inline-block'
                }}
              />

              {entry.name}
            </div>

            <strong style={{ color: '#172033' }}>
              {entry.value}
            </strong>
          </div>
        ))}
      </div>
    );
  };

  if (!hasData) {
    return (
      <div
        style={{
          width: '100%',
          height: 310,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '8px',
          color: '#94a3b8'
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}
        >
          📊
        </div>

        <strong
          style={{
            color: '#475569',
            fontSize: '14px'
          }}
        >
          No attendance data yet
        </strong>

        <span
          style={{
            fontSize: '12px'
          }}
        >
          Attendance trends will appear here.
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: 310
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 12,
            right: 8,
            left: -18,
            bottom: 0
          }}
        >
          <defs>
            <linearGradient
              id="presentGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#10b981"
                stopOpacity={0.24}
              />
              <stop
                offset="100%"
                stopColor="#10b981"
                stopOpacity={0}
              />
            </linearGradient>

            <linearGradient
              id="lateGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#f59e0b"
                stopOpacity={0.20}
              />
              <stop
                offset="100%"
                stopColor="#f59e0b"
                stopOpacity={0}
              />
            </linearGradient>

            <linearGradient
              id="absentGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#ef4444"
                stopOpacity={0.18}
              />
              <stop
                offset="100%"
                stopColor="#ef4444"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 5"
            vertical={false}
            stroke="#edf1f6"
          />

          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: '#94a3b8',
              fontSize: 11,
              fontWeight: 500
            }}
            dy={8}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tick={{
              fill: '#94a3b8',
              fontSize: 11,
              fontWeight: 500
            }}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: '#cbd5e1',
              strokeDasharray: '4 4'
            }}
          />

          <Legend
            verticalAlign="top"
            align="center"
            height={42}
            iconType="circle"
            wrapperStyle={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748b'
            }}
          />

          <Area
            type="monotone"
            dataKey="present"
            name="Present"
            stroke="#10b981"
            strokeWidth={2.5}
            fill="url(#presentGradient)"
            fillOpacity={1}
            dot={false}
            activeDot={{
              r: 5,
              strokeWidth: 3,
              stroke: '#ffffff'
            }}
            animationDuration={700}
          />

          <Area
            type="monotone"
            dataKey="late"
            name="Late"
            stroke="#f59e0b"
            strokeWidth={2.5}
            fill="url(#lateGradient)"
            fillOpacity={1}
            dot={false}
            activeDot={{
              r: 5,
              strokeWidth: 3,
              stroke: '#ffffff'
            }}
            animationDuration={700}
          />

          <Area
            type="monotone"
            dataKey="absent"
            name="Absent"
            stroke="#ef4444"
            strokeWidth={2.5}
            fill="url(#absentGradient)"
            fillOpacity={1}
            dot={false}
            activeDot={{
              r: 5,
              strokeWidth: 3,
              stroke: '#ffffff'
            }}
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}