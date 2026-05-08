import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import './UsageChart.css';

function UsageChart({ data }) {
  const getColor = (percentage) => {
    if (percentage >= 90) return '#dc3545';
    if (percentage >= 75) return '#ffc107';
    return '#28a745';
  };

  const chartData = data.map(item => ({
    name: item.name,
    'Used': item.used,
    'Remaining': item.remaining,
    percentage: item.percentage
  }));

  return (
    <div className="usage-chart card">
      <div className="chart-header">
        <h2>📊 Usage Overview</h2>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Used" stackId="a">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.percentage)} />
              ))}
            </Bar>
            <Bar dataKey="Remaining" stackId="a" fill="#e9ecef" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default UsageChart;
