import React from 'react';
import './UsageCard.css';

function UsageCard({ title, used, limit, remaining, percentage, icon }) {
  const getStatusColor = (percent) => {
    if (percent >= 90) return '#dc3545';
    if (percent >= 75) return '#ffc107';
    return '#28a745';
  };

  const getStatusLabel = (percent) => {
    if (percent >= 90) return '⚠️ Critical';
    if (percent >= 75) return '⚡ Warning';
    return '✅ Healthy';
  };

  const statusColor = getStatusColor(percentage);
  const statusLabel = getStatusLabel(percentage);

  return (
    <div className="usage-card card">
      <div className="card-header" style={{ background: `linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%)` }}>
        <h2>
          {icon} {title}
        </h2>
        <div className="status-badge">{statusLabel}</div>
      </div>

      <div className="card-body">
        <div className="usage-stats">
          <div className="stat-item">
            <span className="stat-label">Used</span>
            <span className="stat-value">{used.toLocaleString()}</span>
          </div>
          <div className="stat-divider">/</div>
          <div className="stat-item">
            <span className="stat-label">Limit</span>
            <span className="stat-value">{limit.toLocaleString()}</span>
          </div>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: statusColor
              }}
            >
              {percentage > 10 && <span className="progress-text">{percentage}%</span>}
            </div>
          </div>
          {percentage <= 10 && (
            <span className="progress-text-outside">{percentage}%</span>
          )}
        </div>

        <div className="remaining-info">
          <span className="remaining-label">Remaining:</span>
          <span className="remaining-value">{remaining.toLocaleString()} hours</span>
        </div>
      </div>
    </div>
  );
}

export default UsageCard;
