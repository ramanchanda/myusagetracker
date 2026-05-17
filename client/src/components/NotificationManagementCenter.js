import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NotificationManagementCenter.css';

function NotificationManagementCenter() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [enterpriseAccounts, setEnterpriseAccounts] = useState([]);
  const [enterpriseLoading, setEnterpriseLoading] = useState(false);

  useEffect(() => {
    fetchData();
    fetchEnterpriseUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configRes, statsRes, historyRes] = await Promise.all([
        axios.get('/api/notifications/config'),
        axios.get('/api/notifications/stats').catch(() => ({ data: null })),
        axios.get('/api/notifications/history-v2?limit=5').catch(() => ({ data: [] }))
      ]);

      setConfig(configRes.data);
      setStats(statsRes.data);
      setRecentActivity(historyRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      showMessage('error', 'Failed to load notification configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchEnterpriseUsage = async () => {
    try {
      setEnterpriseLoading(true);
      const currentMonth = new Date().toISOString().slice(0, 7);
      const response = await axios.get(`/api/enterprise/all-accounts?month=${currentMonth}`);

      if (response.data && Array.isArray(response.data.enterpriseAccounts)) {
        // Transform the API response to the format expected by UI
        const transformedAccounts = response.data.enterpriseAccounts.map(account => ({
          accountEmail: account.enterpriseAccount?.name || 'Unknown Account',
          accountName: account.enterpriseAccount?.name || 'Unknown Account',
          accountId: account.enterpriseAccount?.id,
          billingAccess: account.enterpriseAccount?.has_billing_access !== false,
          billingStatus: account.enterpriseAccount?.billing_status,
          billingError: account.enterpriseAccount?.billing_error,
          resources: {
            enterpriseTeams: account.summary?.totalActiveTeams || 0,
            privateSpaces: account.summary?.totalPrivateSpaces || 0,
            shieldSpaces: account.summary?.totalShieldSpaces || 0,
            dynoUnits: account.summary?.totalDynos || 0,
            connectRows: account.summary?.totalConnect || 0,
            dataAddons: account.summary?.totalDataAddons || 0,
            generalAddons: account.summary?.totalOtherAddons || 0
          },
          totalCost: account.summary?.totalMonthlyCost || 0
        }));
        setEnterpriseAccounts(transformedAccounts);
      }
    } catch (error) {
      console.error('Error fetching enterprise usage:', error);
      // Don't show error to user - just fail silently with empty state
      setEnterpriseAccounts([]);
    } finally {
      setEnterpriseLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const testEmail = async () => {
    try {
      setTesting(true);
      const result = await axios.post('/api/notifications/send-test');
      if (result.data.sent) {
        showMessage('success', 'Test email sent successfully');
        fetchData(); // Refresh to show in recent activity
      } else {
        showMessage('warning', result.data.reason);
      }
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  const checkThresholds = async () => {
    try {
      const result = await axios.post('/api/notifications/check-thresholds');
      if (result.data.checked) {
        showMessage('success', `Threshold check complete • ${result.data.alertsTriggered} alert(s) triggered`);
        fetchData(); // Refresh activity
      } else {
        showMessage('warning', result.data.reason || result.data.error);
      }
    } catch (error) {
      showMessage('error', 'Threshold check failed');
    }
  };

  if (loading) {
    return (
      <div className="nmc-container">
        <div className="nmc-loading">
          <div className="nmc-spinner"></div>
          <p>Loading Notification Center...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="nmc-container">
        <div className="nmc-error">
          <span className="nmc-error-icon">⚠️</span>
          <h3>Configuration Error</h3>
          <p>Failed to load notification settings</p>
        </div>
      </div>
    );
  }

  const enabledCount = Object.values(config.thresholds).filter(t => t.enabled).length;
  const activeSchedules = Object.values(config.triggerSchedule).filter(s => s.enabled).length;

  return (
    <div className="nmc-container">
      {/* Header */}
      <div className="nmc-header">
        <div className="nmc-header-content">
          <h1>Notification Management</h1>
          <p className="nmc-subtitle">Enterprise alert configuration and monitoring</p>
        </div>
        <div className="nmc-header-actions">
          <button
            onClick={testEmail}
            disabled={testing || !config.emailConfig.enabled}
            className="nmc-btn nmc-btn-secondary nmc-btn-sm"
          >
            {testing ? 'Sending...' : 'Test Email'}
          </button>
          <button
            onClick={checkThresholds}
            className="nmc-btn nmc-btn-primary nmc-btn-sm"
          >
            Run Threshold Check
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`nmc-message nmc-message-${message.type}`}>
          <span className="nmc-message-icon">
            {message.type === 'success' && '✓'}
            {message.type === 'error' && '✗'}
            {message.type === 'warning' && '⚠'}
          </span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Overview KPI Cards */}
      {activeTab === 'overview' && (
        <div className="nmc-kpi-grid">
          <div className="nmc-kpi-card">
            <div className="nmc-kpi-icon nmc-kpi-icon-email">📧</div>
            <div className="nmc-kpi-content">
              <div className="nmc-kpi-label">Email Status</div>
              <div className="nmc-kpi-value">
                <span className={`nmc-status-dot ${config.emailConfig.enabled ? 'active' : 'inactive'}`}></span>
                {config.emailConfig.enabled ? 'Active' : 'Disabled'}
              </div>
            </div>
          </div>

          <div className="nmc-kpi-card">
            <div className="nmc-kpi-icon nmc-kpi-icon-threshold">⚠️</div>
            <div className="nmc-kpi-content">
              <div className="nmc-kpi-label">Active Thresholds</div>
              <div className="nmc-kpi-value">{enabledCount} / {Object.keys(config.thresholds).length}</div>
            </div>
          </div>

          <div className="nmc-kpi-card">
            <div className="nmc-kpi-icon nmc-kpi-icon-schedule">🕐</div>
            <div className="nmc-kpi-content">
              <div className="nmc-kpi-label">Scheduled Reports</div>
              <div className="nmc-kpi-value">{activeSchedules} Enabled</div>
            </div>
          </div>

          {stats && (
            <div className="nmc-kpi-card">
              <div className="nmc-kpi-icon nmc-kpi-icon-stats">📊</div>
              <div className="nmc-kpi-content">
                <div className="nmc-kpi-label">Success Rate</div>
                <div className="nmc-kpi-value">{stats.successRate || '0'}%</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sticky Navigation */}
      <div className="nmc-tabs">
        <button
          className={`nmc-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`nmc-tab ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          Email Setup
        </button>
        <button
          className={`nmc-tab ${activeTab === 'thresholds' ? 'active' : ''}`}
          onClick={() => setActiveTab('thresholds')}
        >
          Thresholds
        </button>
        <button
          className={`nmc-tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          Schedule
        </button>
      </div>

      {/* Tab Content */}
      <div className="nmc-content">
        {activeTab === 'overview' && (
          <>
            {/* Enterprise Accounts Usage Summary */}
            <div className="nmc-section">
              <h2 className="nmc-section-title">Enterprise Accounts - Current Month Usage</h2>
              <p className="nmc-section-desc">Real-time usage metrics for monitored enterprise accounts</p>

              {enterpriseLoading ? (
                <div className="nmc-enterprise-loading">
                  <div className="nmc-spinner-sm"></div>
                  <span>Loading enterprise data...</span>
                </div>
              ) : enterpriseAccounts.length === 0 ? (
                <div className="nmc-enterprise-empty">
                  <span className="nmc-empty-icon">📊</span>
                  <p>No enterprise accounts configured</p>
                </div>
              ) : (
                <>
                  {/* Operational Summary Row */}
                  <div className="nmc-ops-summary">
                    <div className="nmc-ops-stat">
                      <span className="nmc-ops-label">Total Accounts</span>
                      <span className="nmc-ops-value">{enterpriseAccounts.length}</span>
                    </div>
                    <div className="nmc-ops-stat">
                      <span className="nmc-ops-label">Billing Enabled</span>
                      <span className="nmc-ops-value">
                        {enterpriseAccounts.filter(acc => acc.billingAccess).length}
                      </span>
                    </div>
                    <div className="nmc-ops-stat">
                      <span className="nmc-ops-label">Restricted</span>
                      <span className="nmc-ops-value nmc-ops-warning">
                        {enterpriseAccounts.filter(acc => !acc.billingAccess).length}
                      </span>
                    </div>
                    <div className="nmc-ops-stat">
                      <span className="nmc-ops-label">Notifications</span>
                      <span className="nmc-ops-value">
                        {config.emailConfig.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {/* Enterprise Account Cards */}
                  <div className="nmc-enterprise-grid">
                    {enterpriseAccounts.map((account, idx) => (
                      <div
                        key={idx}
                        className={`nmc-enterprise-card ${!account.billingAccess ? 'restricted' : ''}`}
                      >
                        <div className="nmc-enterprise-header">
                          <div className="nmc-enterprise-name">
                            {account.accountName || account.accountEmail}
                          </div>
                          <span className={`nmc-badge ${account.billingAccess ? 'active' : 'warning'}`}>
                            {account.billingAccess ? 'Billing OK' : 'Restricted'}
                          </span>
                        </div>

                        {!account.billingAccess ? (
                          <div className="nmc-enterprise-restricted">
                            <span className="nmc-restricted-icon">🔒</span>
                            <span>Billing Access Restricted</span>
                          </div>
                        ) : account.resources ? (
                          <div className="nmc-enterprise-metrics">
                            <div className="nmc-metric">
                              <span className="nmc-metric-label">Teams</span>
                              <span className="nmc-metric-value">
                                {account.resources.enterpriseTeams || 0}
                              </span>
                            </div>
                            <div className="nmc-metric">
                              <span className="nmc-metric-label">Private Spaces</span>
                              <span className="nmc-metric-value">
                                {account.resources.privateSpaces || 0}
                              </span>
                            </div>
                            <div className="nmc-metric">
                              <span className="nmc-metric-label">Shield Spaces</span>
                              <span className="nmc-metric-value">
                                {account.resources.shieldSpaces || 0}
                              </span>
                            </div>
                            <div className="nmc-metric">
                              <span className="nmc-metric-label">Dyno Units</span>
                              <span className="nmc-metric-value">
                                {(account.resources.dynoUnits || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="nmc-metric">
                              <span className="nmc-metric-label">Connect Rows</span>
                              <span className="nmc-metric-value">
                                {(account.resources.connectRows || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="nmc-metric">
                              <span className="nmc-metric-label">Data Add-ons</span>
                              <span className="nmc-metric-value">
                                {account.resources.dataAddons || 0}
                              </span>
                            </div>
                            <div className="nmc-metric">
                              <span className="nmc-metric-label">General Add-ons</span>
                              <span className="nmc-metric-value">
                                {account.resources.generalAddons || 0}
                              </span>
                            </div>
                            {account.totalCost && (
                              <div className="nmc-metric nmc-metric-cost">
                                <span className="nmc-metric-label">Est. Cost</span>
                                <span className="nmc-metric-value">
                                  ${account.totalCost.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="nmc-enterprise-restricted">
                            <span>No usage data available</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Alert Thresholds Summary */}
            <div className="nmc-section">
              <h2 className="nmc-section-title">Alert Thresholds</h2>
              <div className="nmc-threshold-summary">
                <div className="nmc-threshold-banner warning">
                  <span className="nmc-threshold-icon">⚠️</span>
                  <div>
                    <div className="nmc-threshold-label">Warning Level</div>
                    <div className="nmc-threshold-value">{config.thresholds.dynoUnits?.warningPercentage || 80}%</div>
                  </div>
                </div>
                <div className="nmc-threshold-banner critical">
                  <span className="nmc-threshold-icon">🚨</span>
                  <div>
                    <div className="nmc-threshold-label">Critical Level</div>
                    <div className="nmc-threshold-value">{config.thresholds.dynoUnits?.criticalPercentage || 95}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resource Grid */}
            <div className="nmc-section">
              <h2 className="nmc-section-title">Resource Limits</h2>
              <div className="nmc-resource-grid">
                {Object.entries(config.thresholds).map(([key, threshold]) => {
                  const resourceLabel = key.replace(/([A-Z])/g, ' $1').trim();
                  return (
                    <div key={key} className="nmc-resource-card">
                      <div className="nmc-resource-header">
                        <span className="nmc-resource-name">{resourceLabel}</span>
                        <span className={`nmc-badge ${threshold.enabled ? 'active' : 'inactive'}`}>
                          {threshold.enabled ? 'On' : 'Off'}
                        </span>
                      </div>
                      <div className="nmc-resource-limit">{threshold.limit.toLocaleString()}</div>
                      <div className="nmc-resource-meta">
                        {threshold.warningPercentage}% / {threshold.criticalPercentage}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className="nmc-section">
                <h2 className="nmc-section-title">Recent Activity</h2>
                <div className="nmc-activity-list">
                  {recentActivity.map((event) => (
                    <div key={event.id} className="nmc-activity-item">
                      <span className={`nmc-activity-icon ${event.status}`}>
                        {event.status === 'sent' && '✓'}
                        {event.status === 'failed' && '✗'}
                        {event.status === 'queued' && '⏱'}
                      </span>
                      <div className="nmc-activity-content">
                        <div className="nmc-activity-title">
                          {event.subject || event.type}
                        </div>
                        <div className="nmc-activity-meta">
                          {new Date(event.timestamp).toLocaleString()} • {event.provider || 'pending'}
                        </div>
                      </div>
                      <span className={`nmc-activity-status ${event.status}`}>
                        {event.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'email' && (
          <div className="nmc-section">
            <h2 className="nmc-section-title">Email Configuration</h2>
            <p className="nmc-section-desc">Mailgun API with SMTP fallback • Read-only view</p>

            <div className="nmc-form-grid">
              <div className="nmc-field">
                <label>Status</label>
                <div className="nmc-field-value">
                  <span className={`nmc-badge ${config.emailConfig.enabled ? 'active' : 'inactive'}`}>
                    {config.emailConfig.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="nmc-field">
                <label>From Name</label>
                <div className="nmc-field-value">{config.emailConfig.fromName || '(Default)'}</div>
              </div>

              <div className="nmc-field">
                <label>From Email</label>
                <div className="nmc-field-value">{config.emailConfig.fromEmail || '(Mailgun default)'}</div>
              </div>

              <div className="nmc-field nmc-field-full">
                <label>Recipients</label>
                <div className="nmc-field-value">
                  {config.emailConfig.recipients && config.emailConfig.recipients.length > 0 ? (
                    <div className="nmc-recipients">
                      {config.emailConfig.recipients.map((email, idx) => (
                        <span key={idx} className="nmc-recipient-badge">{email}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="nmc-field-empty">No recipients configured</span>
                  )}
                </div>
              </div>
            </div>

            <div className="nmc-info-banner">
              <span className="nmc-info-icon">ℹ️</span>
              <div>
                <strong>Configuration Source:</strong> Heroku Config Vars
                <br />
                Update via <code>heroku config:set NOTIFICATION_*</code>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'thresholds' && (
          <div className="nmc-section">
            <h2 className="nmc-section-title">Resource Thresholds</h2>
            <p className="nmc-section-desc">Alert levels apply to all monitored resources</p>

            <div className="nmc-threshold-cards">
              {Object.entries(config.thresholds).map(([key, threshold]) => {
                const resourceLabel = key.replace(/([A-Z])/g, ' $1').trim();
                return (
                  <div key={key} className="nmc-threshold-card">
                    <div className="nmc-threshold-card-header">
                      <h3>{resourceLabel}</h3>
                      <span className={`nmc-badge ${threshold.enabled ? 'active' : 'inactive'}`}>
                        {threshold.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="nmc-threshold-card-body">
                      <div className="nmc-threshold-limit">
                        <span className="nmc-threshold-limit-label">Usage Limit</span>
                        <span className="nmc-threshold-limit-value">{threshold.limit.toLocaleString()}</span>
                      </div>
                      <div className="nmc-threshold-percentages">
                        <span>⚠️ {threshold.warningPercentage}%</span>
                        <span>🚨 {threshold.criticalPercentage}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="nmc-section">
            <h2 className="nmc-section-title">Notification Schedule</h2>
            <p className="nmc-section-desc">Automated threshold checks and usage reports</p>

            <div className="nmc-schedule-grid">
              <div className="nmc-schedule-card">
                <div className="nmc-schedule-header">
                  <h3>Real-time Alerts</h3>
                  <span className={`nmc-badge ${config.triggerSchedule.realtimeAlerts.enabled ? 'active' : 'inactive'}`}>
                    {config.triggerSchedule.realtimeAlerts.enabled ? 'Active' : 'Off'}
                  </span>
                </div>
                {config.triggerSchedule.realtimeAlerts.enabled && (
                  <div className="nmc-schedule-detail">
                    Every {config.triggerSchedule.realtimeAlerts.checkIntervalMinutes} minutes
                  </div>
                )}
              </div>

              <div className="nmc-schedule-card">
                <div className="nmc-schedule-header">
                  <h3>Daily Summary</h3>
                  <span className={`nmc-badge ${config.triggerSchedule.dailySummary.enabled ? 'active' : 'inactive'}`}>
                    {config.triggerSchedule.dailySummary.enabled ? 'Active' : 'Off'}
                  </span>
                </div>
                {config.triggerSchedule.dailySummary.enabled && (
                  <div className="nmc-schedule-detail">
                    {config.triggerSchedule.dailySummary.time} UTC
                  </div>
                )}
              </div>

              <div className="nmc-schedule-card">
                <div className="nmc-schedule-header">
                  <h3>Weekly Summary</h3>
                  <span className={`nmc-badge ${config.triggerSchedule.weeklySummary.enabled ? 'active' : 'inactive'}`}>
                    {config.triggerSchedule.weeklySummary.enabled ? 'Active' : 'Off'}
                  </span>
                </div>
                {config.triggerSchedule.weeklySummary.enabled && (
                  <div className="nmc-schedule-detail">
                    {config.triggerSchedule.weeklySummary.dayOfWeek} at {config.triggerSchedule.weeklySummary.time} UTC
                  </div>
                )}
              </div>

              <div className="nmc-schedule-card">
                <div className="nmc-schedule-header">
                  <h3>Monthly Summary</h3>
                  <span className={`nmc-badge ${config.triggerSchedule.monthlySummary.enabled ? 'active' : 'inactive'}`}>
                    {config.triggerSchedule.monthlySummary.enabled ? 'Active' : 'Off'}
                  </span>
                </div>
                {config.triggerSchedule.monthlySummary.enabled && (
                  <div className="nmc-schedule-detail">
                    Day {config.triggerSchedule.monthlySummary.dayOfMonth} at {config.triggerSchedule.monthlySummary.time} UTC
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationManagementCenter;
