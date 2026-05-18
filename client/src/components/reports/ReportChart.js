import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './ReportChart.css';

/**
 * Print-optimized chart component for PDF reports
 * - Fixed height for predictable PDF layout
 * - Animations disabled
 * - Simple styling for print clarity
 */
function ReportChart({ data, type = 'line', title, dataKeys, height = 300 }) {
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    // Mark chart as ready after mount
    const timer = setTimeout(() => {
      setChartReady(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) {
    return null;
  }

  const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="report-chart-container">
      {title && <h4 className="report-chart-title">{title}</h4>}
      <div className="report-chart-wrapper" style={{ height: `${height}px`, minHeight: `${height}px` }}>
        <ResponsiveContainer width="100%" height={height}>
          {type === 'line' ? (
            <LineChart
              data={data}
              margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {dataKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                  animationDuration={0}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart
              data={data}
              margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {dataKeys.map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[idx % colors.length]}
                  isAnimationActive={false}
                  animationDuration={0}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {chartReady && (
        <div className="chart-ready-marker" style={{ display: 'none' }}>
          Chart Ready
        </div>
      )}
    </div>
  );
}

export default ReportChart;
