import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EnterpriseView.css';

function EnterpriseView({ selectedMonth }) {
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    fetchEnterpriseStructure();
  }, [selectedMonth]);

  const fetchEnterpriseStructure = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/enterprise/structure', {
        params: { month: selectedMonth }
      });
      setStructure(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  };

  const getTeamIcon = (teamType) => {
    if (teamType === 'personal') return '👤';
    if (teamType === 'enterprise') return '🏢';
    return '👥';
  };

  const getTeamTypeLabel = (teamType) => {
    if (teamType === 'personal') return 'Personal';
    if (teamType === 'enterprise') return 'Enterprise';
    return 'Team';
  };

  if (loading) {
    return (
      <div className="enterprise-view">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading enterprise structure...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enterprise-view">
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={fetchEnterpriseStructure} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  if (!structure) return null;

  const allTeams = structure.teams.map(team => ({
    name: team.name,
    type: team.type,
    resources: team.resources
  }));

  const displayTeam = selectedTeam !== null ? allTeams[selectedTeam] : null;

  return (
    <div className="enterprise-view">
      {/* Account Header */}
      <div className="account-header">
        <div className="account-info">
          <h1>🏢 Enterprise Account</h1>
          <p className="account-email">{structure.account.email}</p>
          <p className="selected-month">
            📅 Viewing: {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={fetchEnterpriseStructure} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Overall Summary */}
      <div className="overall-summary">
        <div className="summary-card">
          <div className="summary-icon">👥</div>
          <div className="summary-content">
            <div className="summary-value">{structure.summary.totalTeams}</div>
            <div className="summary-label">Teams</div>
          </div>
        </div>
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

      {/* Teams Grid */}
      <div className="teams-section">
        <h2>📊 Enterprise Teams</h2>
        <div className="teams-grid">
          {allTeams.map((team, index) => {
            const resources = team.resources;
            return (
              <div
                key={index}
                className={`team-card ${selectedTeam === index ? 'selected' : ''}`}
                onClick={() => setSelectedTeam(selectedTeam === index ? null : index)}
              >
                <div className="team-header">
                  <div className="team-icon">{getTeamIcon(team.type)}</div>
                  <div className="team-info">
                    <h3>{team.name}</h3>
                    <span className="team-type">{getTeamTypeLabel(team.type)}</span>
                  </div>
                </div>

                <div className="team-stats">
                  <div className="stat-row">
                    <span className="stat-label">📱 Apps</span>
                    <span className="stat-value">{resources.totalApps}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">⚡ Dynos</span>
                    <span className="stat-value">{resources.dynos.count}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">💾 Data Add-ons</span>
                    <span className="stat-value">{resources.dataAddons.count}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">🔧 Other Add-ons</span>
                    <span className="stat-value">{resources.otherAddons.count}</span>
                  </div>
                  <div className="stat-row total">
                    <span className="stat-label">💰 Monthly Cost</span>
                    <span className="stat-value cost">${resources.totalMonthlyCost}</span>
                  </div>
                </div>

                <div className="team-footer">
                  <button className="details-btn">
                    {selectedTeam === index ? '▼ Hide Details' : '▶ Show Details'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Details Panel */}
      {displayTeam && (
        <div className="team-details-panel">
          <div className="panel-header">
            <h2>
              {getTeamIcon(displayTeam.type)} {displayTeam.name} - Detailed Resources
            </h2>
            <button onClick={() => setSelectedTeam(null)} className="close-btn">✕</button>
          </div>

          <div className="resources-grid">
            {/* Dynos Section */}
            <div className="resource-section">
              <h3>⚡ Dynos ({displayTeam.resources.dynos.count})</h3>
              {displayTeam.resources.dynos.formations.length > 0 ? (
                <div className="resource-list">
                  {displayTeam.resources.dynos.formations.map((dyno, idx) => (
                    <div key={idx} className="resource-item">
                      <div className="resource-name">{dyno.appName}</div>
                      <div className="resource-details">
                        {dyno.type} • {dyno.size} • Qty: {dyno.quantity}
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
              <h3>💾 Data Add-ons ({displayTeam.resources.dataAddons.count})</h3>
              <div className="section-cost">${displayTeam.resources.dataAddons.totalCost}/mo</div>
              {displayTeam.resources.dataAddons.addons.length > 0 ? (
                <div className="resource-list">
                  {displayTeam.resources.dataAddons.addons.map((addon, idx) => (
                    <div key={idx} className="resource-item addon">
                      <div className="addon-header">
                        <div className="resource-name">{addon.name}</div>
                        <div className="addon-cost">${addon.cost.toFixed(2)}</div>
                      </div>
                      <div className="resource-details">
                        App: {addon.appName}
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
              <h3>🔧 Other Add-ons ({displayTeam.resources.otherAddons.count})</h3>
              <div className="section-cost">${displayTeam.resources.otherAddons.totalCost}/mo</div>
              {displayTeam.resources.otherAddons.addons.length > 0 ? (
                <div className="resource-list">
                  {displayTeam.resources.otherAddons.addons.map((addon, idx) => (
                    <div key={idx} className="resource-item addon">
                      <div className="addon-header">
                        <div className="resource-name">{addon.name}</div>
                        <div className="addon-cost">${addon.cost.toFixed(2)}</div>
                      </div>
                      <div className="resource-details">
                        App: {addon.appName}
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

export default EnterpriseView;
