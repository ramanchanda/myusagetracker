import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import DailyUsageChart from './DailyUsageChart';
import './EnterpriseView.css';

function EnterpriseView({ selectedMonth }) {
  const [structure, setStructure] = useState(null);
  const [dailyUsage, setDailyUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEnterpriseStructure = useCallback(async () => {
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
  }, [selectedMonth]);

  const fetchDailyUsage = useCallback(async () => {
    try {
      const response = await axios.get('/api/enterprise/daily-usage', {
        params: { month: selectedMonth }
      });
      setDailyUsage(response.data);
    } catch (err) {
      console.error('Error fetching daily usage:', err);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchEnterpriseStructure();
    fetchDailyUsage();
  }, [fetchDailyUsage, fetchEnterpriseStructure]);

  const formatCurrency = (value) => Number(value || 0).toLocaleString();
  const formatUsage = (value) => Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

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

  const enterpriseTeams = structure.teams
    .filter(team => team.type === 'enterprise')
    .map(team => ({
    name: team.name,
    type: team.type,
    resources: team.resources
  }));

  return (
    <div className="enterprise-view">
      {/* Account Header */}
      <div className="account-header">
        <div className="account-info">
          <h1>Heroku Enterprise Teams Usage</h1>
          <p className="account-email">
            {structure.account.enterpriseAccountName || 'Enterprise Account'}
          </p>
          <p className="account-email">{structure.account.email}</p>
          <p className="selected-month">
            📅 Viewing: {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={fetchEnterpriseStructure} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Daily Usage Chart */}
      {dailyUsage && dailyUsage.dailyUsage && (
        <DailyUsageChart dailyData={dailyUsage.dailyUsage} />
      )}

      {/* Overall Summary */}
      <div className="overall-summary">
        <div className="summary-card">
          <div className="summary-icon">👥</div>
          <div className="summary-content">
            <div className="summary-value">{enterpriseTeams.length}</div>
            <div className="summary-label">Enterprise Teams</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">⚡</div>
          <div className="summary-content">
            <div className="summary-value">{formatUsage(structure.summary.totalDynos)}</div>
            <div className="summary-label">Dynos Usage</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">💾</div>
          <div className="summary-content">
            <div className="summary-value">{formatUsage(structure.summary.totalDataAddons)}</div>
            <div className="summary-label">Data Add-ons Usage</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">🔧</div>
          <div className="summary-content">
            <div className="summary-value">{formatUsage(structure.summary.totalOtherAddons)}</div>
            <div className="summary-label">Other Add-ons Usage</div>
          </div>
        </div>
        <div className="summary-card highlight">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <div className="summary-value">${formatCurrency(structure.summary.totalMonthlyCost)}</div>
            <div className="summary-label">Monthly Cost</div>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="teams-section">
        <h2>{(structure.account.enterpriseAccountName || 'Enterprise Account')} &gt; Enterprise Teams</h2>
        <div className="teams-grid">
          {enterpriseTeams.map((team, index) => {
            const resources = team.resources;
            return (
              <div key={index} className="team-card">
                <div className="team-header">
                  <div className="team-icon">🏢</div>
                  <div className="team-info">
                    <h3>{team.name}</h3>
                    <span className="team-type">Enterprise</span>
                  </div>
                </div>

                <div className="team-stats">
                  <div className="stat-row">
                    <span className="stat-label">⚡ Dynos Usage</span>
                    <span className="stat-value">{formatUsage(resources.dynos.count)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">💾 Data Add-ons Usage</span>
                    <span className="stat-value">{formatUsage(resources.dataAddons.count)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">🔧 Other Add-ons Usage</span>
                    <span className="stat-value">{formatUsage(resources.otherAddons.count)}</span>
                  </div>
                  <div className="stat-row total">
                    <span className="stat-label">💰 Monthly Cost</span>
                    <span className="stat-value cost">${formatCurrency(resources.totalMonthlyCost)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default EnterpriseView;
