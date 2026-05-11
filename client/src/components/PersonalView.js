import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DailyUsageChart from './DailyUsageChart';
import './PersonalView.css';

function PersonalView({ selectedMonth }) {
  const [structure, setStructure] = useState(null);
  const [dailyUsage, setDailyUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    fetchPersonalStructure();
    fetchDailyUsage();
  }, [selectedMonth]);

  const fetchPersonalStructure = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/personal/structure', {
        params: { month: selectedMonth }
      });
      setStructure(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  };

  const fetchDailyUsage = async () => {
    try {
      const response = await axios.get('/api/personal/daily-usage', {
        params: { month: selectedMonth }
      });
      setDailyUsage(response.data);
    } catch (err) {
      console.error('Error fetching daily usage:', err);
    }
  };

  if (loading) {
    return (
      <div className="personal-view">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading personal apps...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="personal-view">
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={fetchPersonalStructure} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  if (!structure) return null;

  const displayApp = selectedApp !== null ? structure.apps[selectedApp] : null;

  return (
    <div className="personal-view">
      {/* Account Header */}
      <div className="account-header">
        <div className="account-info">
          <h1>👤 Personal Apps</h1>
          <p className="account-email">{structure.account.email}</p>
          <p className="selected-month">
            📅 Viewing: {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={fetchPersonalStructure} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Daily Usage Chart */}
      {dailyUsage && (
        <DailyUsageChart dailyData={dailyUsage.summary ? { days: dailyUsage.apps.flatMap(app => app.dailyUsage.days), summary: dailyUsage.summary } : null} />
      )}

      {/* Overall Summary */}
      <div className="overall-summary">
        <div className="summary-card">
          <div className="summary-icon">📱</div>
          <div className="summary-content">
            <div className="summary-value">{structure.summary.totalApps}</div>
            <div className="summary-label">Applications</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">⚡</div>
          <div className="summary-content">
            <div className="summary-value">{structure.summary.totalDynos}</div>
            <div className="summary-label">Dynos</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">💾</div>
          <div className="summary-content">
            <div className="summary-value">{structure.summary.totalDataAddons}</div>
            <div className="summary-label">Data Add-ons</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">🔧</div>
          <div className="summary-content">
            <div className="summary-value">{structure.summary.totalOtherAddons}</div>
            <div className="summary-label">Other Add-ons</div>
          </div>
        </div>
        <div className="summary-card highlight">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <div className="summary-value">${structure.summary.totalMonthlyCost}</div>
            <div className="summary-label">Monthly Cost</div>
          </div>
        </div>
      </div>

      {/* Apps Grid */}
      <div className="apps-section">
        <h2>📊 Your Applications</h2>
        <div className="apps-grid">
          {structure.apps.map((app, index) => (
            <div
              key={index}
              className={`app-card ${selectedApp === index ? 'selected' : ''}`}
              onClick={() => setSelectedApp(selectedApp === index ? null : index)}
            >
              <div className="app-header">
                <div className="app-icon">📱</div>
                <div className="app-info">
                  <h3>{app.name}</h3>
                </div>
              </div>

              <div className="app-stats">
                <div className="stat-row">
                  <span className="stat-label">⚡ Dynos</span>
                  <span className="stat-value">{app.dynos.count}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">💾 Data Add-ons</span>
                  <span className="stat-value">{app.dataAddons.count}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">🔧 Other Add-ons</span>
                  <span className="stat-value">{app.otherAddons.count}</span>
                </div>
                <div className="stat-row total">
                  <span className="stat-label">💰 Monthly Cost</span>
                  <span className="stat-value cost">${app.totalMonthlyCost}</span>
                </div>
              </div>

              <div className="app-footer">
                <button className="details-btn">
                  {selectedApp === index ? '▼ Hide Details' : '▶ Show Details'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* App Details Panel */}
      {displayApp && (
        <div className="app-details-panel">
          <div className="panel-header">
            <h2>📱 {displayApp.name} - Detailed Resources</h2>
            <button onClick={() => setSelectedApp(null)} className="close-btn">✕</button>
          </div>

          <div className="resources-grid">
            {/* Dynos Section */}
            <div className="resource-section">
              <h3>⚡ Dynos ({displayApp.dynos.count})</h3>
              {displayApp.dynos.formations.length > 0 ? (
                <div className="resource-list">
                  {displayApp.dynos.formations.map((dyno, idx) => (
                    <div key={idx} className="resource-item">
                      <div className="resource-name">{dyno.type}</div>
                      <div className="resource-details">
                        {dyno.size} • Qty: {dyno.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-resources">No dynos configured</p>
              )}
            </div>

            {/* Data Add-ons Section */}
            <div className="resource-section">
              <h3>
                💾 Data Add-ons ({displayApp.dataAddons.count})
                {displayApp.dataAddons.count > 0 && (
                  <span className="section-cost">${displayApp.dataAddons.totalCost}/mo</span>
                )}
              </h3>
              {displayApp.dataAddons.addons.length > 0 ? (
                <div className="resource-list">
                  {displayApp.dataAddons.addons.map((addon, idx) => (
                    <div key={idx} className="resource-item addon">
                      <div className="addon-header">
                        <div className="resource-name">{addon.name}</div>
                        <div className="addon-cost">${addon.cost.toFixed(2)}</div>
                      </div>
                      <div className="resource-details">
                        {addon.service} • {addon.plan}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-resources">No data add-ons</p>
              )}
            </div>

            {/* Other Add-ons Section */}
            <div className="resource-section">
              <h3>
                🔧 Other Add-ons ({displayApp.otherAddons.count})
                {displayApp.otherAddons.count > 0 && (
                  <span className="section-cost">${displayApp.otherAddons.totalCost}/mo</span>
                )}
              </h3>
              {displayApp.otherAddons.addons.length > 0 ? (
                <div className="resource-list">
                  {displayApp.otherAddons.addons.map((addon, idx) => (
                    <div key={idx} className="resource-item addon">
                      <div className="addon-header">
                        <div className="resource-name">{addon.name}</div>
                        <div className="addon-cost">${addon.cost.toFixed(2)}</div>
                      </div>
                      <div className="resource-details">
                        {addon.service} • {addon.plan}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-resources">No other add-ons</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonalView;
