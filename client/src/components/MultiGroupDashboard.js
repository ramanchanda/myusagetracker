import React from 'react';
import UsageCard from './UsageCard';
import './MultiGroupDashboard.css';

function MultiGroupDashboard({ groupsData }) {
  const getGroupIcon = (type) => {
    switch (type) {
      case 'personal':
        return '👤';
      case 'team':
        return '👥';
      case 'enterprise':
        return '🏢';
      default:
        return '📊';
    }
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'healthy';
  };

  if (!groupsData || groupsData.length === 0) {
    return (
      <div className="multi-group-dashboard">
        <p>No group data available</p>
      </div>
    );
  }

  return (
    <div className="multi-group-dashboard">
      {groupsData.map((group) => {
        if (group.error) {
          return (
            <div key={group.groupId} className="group-panel error">
              <div className="group-header">
                <h2>
                  {getGroupIcon(group.groupType)} {group.groupName}
                </h2>
                <span className="group-type-badge">{group.groupType}</span>
              </div>
              <div className="error-message">
                <p>❌ Failed to fetch data: {group.error}</p>
              </div>
            </div>
          );
        }

        const { dynos, connect, addons } = group;
        const dynoPercentage = parseFloat(dynos.usagePercentage);
        const connectPercentage = parseFloat(connect.usagePercentage);

        return (
          <div key={group.groupId} className="group-panel">
            <div className="group-header">
              <div className="header-left">
                <h2>
                  {getGroupIcon(group.groupType)} {group.groupName}
                </h2>
                <span className="group-email">{group.accountEmail}</span>
              </div>
              <span className={`group-type-badge ${group.groupType}`}>
                {group.groupType}
              </span>
            </div>

            <div className="group-stats">
              <div className="stat-item">
                <span className="stat-label">Apps</span>
                <span className="stat-value">{dynos.totalApps}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Add-ons</span>
                <span className="stat-value">{addons.totalAddons}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Monthly Cost</span>
                <span className="stat-value cost">${addons.totalMonthlyCost}</span>
              </div>
            </div>

            <div className="group-usage-cards">
              <div className="mini-usage-card">
                <div className="mini-card-header">
                  <span className="mini-icon">⚡</span>
                  <span className="mini-title">Dyno Hours</span>
                </div>
                <div className="mini-card-body">
                  <div className={`usage-percentage ${getStatusColor(dynoPercentage)}`}>
                    {dynoPercentage}%
                  </div>
                  <div className="usage-details">
                    <span>{dynos.used} / {dynos.limit}</span>
                  </div>
                  <div className="mini-progress-bar">
                    <div
                      className={`mini-progress-fill ${getStatusColor(dynoPercentage)}`}
                      style={{ width: `${Math.min(dynoPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="mini-usage-card">
                <div className="mini-card-header">
                  <span className="mini-icon">🔌</span>
                  <span className="mini-title">Connect Hours</span>
                </div>
                <div className="mini-card-body">
                  <div className={`usage-percentage ${getStatusColor(connectPercentage)}`}>
                    {connectPercentage}%
                  </div>
                  <div className="usage-details">
                    <span>{connect.connectUsed} / {connect.connectLimit}</span>
                  </div>
                  <div className="mini-progress-bar">
                    <div
                      className={`mini-progress-fill ${getStatusColor(connectPercentage)}`}
                      style={{ width: `${Math.min(connectPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MultiGroupDashboard;
