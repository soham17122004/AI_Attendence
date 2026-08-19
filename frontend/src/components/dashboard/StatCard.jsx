import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import './StatCard.css';

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  trendType = 'up',
  badgeColor = 'blue',
  variant = 'primary',
  sparklineData = []
}) {

  const drawSparkline = (points, color) => {
    if (!points || points.length === 0) return null;
    const w = 70;
    const h = 24;
    const maxVal = Math.max(...points);
    const minVal = Math.min(...points);
    const spread = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const coordinates = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * w;
      const y = h - ((val - minVal) / spread) * h + 2; // Offset slightly to avoid clipping
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={w} height={h + 4} style={{ overflow: 'visible' }}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coordinates}
        />
      </svg>
    );
  };

  const sparklineColor = trendType === 'up' ? '#10b981' : trendType === 'down' ? '#ef4444' : '#2563eb';

  return (
    <div className={`stat-card-saas ai-card ${variant === 'secondary' ? 'secondary' : ''}`}>
      <div className="stat-card-main-content">
        <span className="stat-label">{title}</span>
        <div className="stat-number-row">
          <span className="stat-value font-heading">{value}</span>
          {trendLabel && (
            <div className={`trend-badge-saas ${trendType}`}>
              {trendType === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              <span>{trend}</span>
            </div>
          )}
        </div>
        {trendLabel && <span className="stat-hint">{trendLabel}</span>}
      </div>

      <div className="stat-card-visual">
        <div className={`stat-icon-badge ${badgeColor}`}>
          {Icon && <Icon size={18} />}
        </div>

        {sparklineData.length > 0 && (
          <div className="sparkline-container">
            {drawSparkline(sparklineData, sparklineColor)}
          </div>
        )}
      </div>
    </div>
  );
}