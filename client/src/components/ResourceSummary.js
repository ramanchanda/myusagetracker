import React from 'react';
import './ResourceSummary.css';

function ResourceSummary({ data }) {
  const { dynos, connect, addons } = data;

  const dynoPercentage = parseFloat(dynos.usagePercentage);
  const connectPercentage = parseFloat(connect.usagePercentage);

  const getStatusColor = (percentage) => {
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'healthy';
  };

  const getStatusLabel = (percentage) => {
    if (percentage >= 90) return '🔴 Critical';
    if (percentage >= 75) return '🟡 Warning';
    return '🟢 Healthy';
  };

  // Calculate total monthly cost
  const totalMonthlyCost = parseFloat(addons.totalMonthlyCost || 0);

  // Group add-ons by category for quick stats
  const categorySummary = addons.categorySummary || [];

  return (
    <div className="resource-summary">
      <div className="summary-header">
        <h2>📊 Resource Overview</h2>
        <div className="overall-status">
          <span className="status-label">Overall Status:</span>
          <span className={`status-badge ${getStatusColor(Math.max(dynoPercentage, connectPercentage))}`}>
            {getStatusLabel(Math.max(dynoPercentage, connectPercentage))}
          </span>
        </div>
      </div>

      <div className="summary-grid">
        {/* Compute Resources */}
        <div className="summary-section compute">
          <div className="section-header">
            <h3>⚡ Compute Resources</h3>
          </div>
          <div className="section-content">
            {/* Dynos */}
            <div className="resource-item">
              <div className="resource-info">
                <div className="resource-icon">🚀</div>
                <div className="resource-details">
                  <div className="resource-name">Dyno Hours</div>
                  <div className="resource-apps">{dynos.totalApps} apps</div>
                </div>
              </div>
              <div className="resource-stats">
                <div className="usage-bar-container">
                  <div
                    className={`usage-bar ${getStatusColor(dynoPercentage)}`}
                    style={{ width: `${Math.min(dynoPercentage, 100)}%` }}
                  ></div>
                </div>
                <div className="usage-numbers">
                  <span className="used">{dynos.used}</span>
                  <span className="separator">/</span>
                  <span className="limit">{dynos.limit}</span>
                  <span className={`percentage ${getStatusColor(dynoPercentage)}`}>
                    {dynoPercentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Connect */}
            {connect.connectLimit > 0 && (
              <div className="resource-item">
                <div className="resource-info">
                  <div className="resource-icon">🔌</div>
                  <div className="resource-details">
                    <div className="resource-name">Connect Hours</div>
                    <div className="resource-apps">Data sync</div>
                  </div>
                </div>
                <div className="resource-stats">
                  <div className="usage-bar-container">
                    <div
                      className={`usage-bar ${getStatusColor(connectPercentage)}`}
                      style={{ width: `${Math.min(connectPercentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="usage-numbers">
                    <span className="used">{connect.connectUsed}</span>
                    <span className="separator">/</span>
                    <span className="limit">{connect.connectLimit}</span>
                    <span className={`percentage ${getStatusColor(connectPercentage)}`}>
                      {connectPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add-ons Summary */}
        <div className="summary-section addons">
          <div className="section-header">
            <h3>💎 Add-ons & Services</h3>
            <div className="total-cost">${totalMonthlyCost}/mo</div>
          </div>
          <div className="section-content">
            <div className="addons-overview">
              <div className="addon-count-card">
                <div className="count-number">{addons.totalAddons}</div>
                <div className="count-label">Total Add-ons</div>
              </div>
              <div className="addon-count-card">
                <div className="count-number">{categorySummary.length}</div>
                <div className="count-label">Categories</div>
              </div>
            </div>

            {categorySummary.length > 0 && (
              <div className="top-categories">
                <div className="categories-label">Top Categories:</div>
                {categorySummary.slice(0, 3).map((cat) => {
                  const getCategoryIcon = (category) => {
                    const icons = {
                      data: '💾',
                      connect: '🔌',
                      monitoring: '📊',
                      email: '📧',
                      search: '🔍',
                      queue: '📬',
                      scheduler: '⏰',
                      storage: '🗄️',
                      analytics: '📈',
                      security: '🔒',
                      other: '🔧'
                    };
                    return icons[category] || '📦';
                  };

                  const getCategoryName = (category) => {
                    const names = {
                      data: 'Data & Databases',
                      connect: 'Heroku Connect',
                      monitoring: 'Monitoring',
                      email: 'Email',
                      search: 'Search',
                      queue: 'Queue & Workers',
                      scheduler: 'Scheduler',
                      storage: 'Storage',
                      analytics: 'Analytics',
                      security: 'Security',
                      other: 'Other'
                    };
                    return names[category] || category;
                  };

                  return (
                    <div key={cat.category} className="category-item">
                      <span className="cat-icon">{getCategoryIcon(cat.category)}</span>
                      <span className="cat-name">{getCategoryName(cat.category)}</span>
                      <span className="cat-count">{cat.count}</span>
                      <span className="cat-cost">${cat.totalCost}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-item">
          <div className="stat-icon">📱</div>
          <div className="stat-content">
            <div className="stat-value">{dynos.totalApps}</div>
            <div className="stat-label">Applications</div>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-value">{dynos.dynos.length}</div>
            <div className="stat-label">Active Dynos</div>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon">💎</div>
          <div className="stat-content">
            <div className="stat-value">{addons.totalAddons}</div>
            <div className="stat-label">Add-ons</div>
          </div>
        </div>
        <div className="stat-item highlight">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">${totalMonthlyCost}</div>
            <div className="stat-label">Monthly Cost</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResourceSummary;
