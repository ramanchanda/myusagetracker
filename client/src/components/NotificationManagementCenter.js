import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NotificationManagementCenter.css';
import { formatNumber, formatUsage, calculateUtilizationPercentage, getUtilizationStatus } from '../utils/formatters';

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
  const [cooldownState, setCooldownState] = useState({
    active: false,
    remainingMinutes: 0,
    remainingSeconds: 0
  });
  const [lastAuditTime, setLastAuditTime] = useState(null);

  useEffect(() => {
    fetchData();
    fetchEnterpriseUsage();
    fetchCooldownStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live countdown timer
  useEffect(() => {
    if (!cooldownState.active || cooldownState.remainingSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldownState(prev => {
        const newRemaining = Math.max(0, prev.remainingSeconds - 1);
        return {
          active: newRemaining > 0,
          remainingMinutes: Math.ceil(newRemaining / 60),
          remainingSeconds: newRemaining
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownState.active, cooldownState.remainingSeconds]);

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

  const fetchCooldownStatus = async () => {
    try {
      const [cooldownResponse, lastAuditResponse] = await Promise.all([
        axios.get('/api/notifications/cooldown-status'),
        axios.get('/api/notifications/last-audit').catch(() => ({ data: { lastAuditTime: null } }))
      ]);

      // Check if any resource has active cooldown
      let maxCooldown = 0;
      let hasCooldown = false;

      Object.values(cooldownResponse.data).forEach(state => {
        if (state.cooldownRemaining > 0) {
          hasCooldown = true;
          maxCooldown = Math.max(maxCooldown, state.cooldownRemaining);
        }
      });

      if (hasCooldown) {
        setCooldownState({
          active: true,
          remainingMinutes: Math.ceil(maxCooldown / 60),
          remainingSeconds: maxCooldown
        });
      }

      // Set last audit time from database
      if (lastAuditResponse.data.lastAuditTime) {
        setLastAuditTime(new Date(lastAuditResponse.data.lastAuditTime));
      }
    } catch (error) {
      console.error('Error fetching cooldown status:', error);
      // Fail silently - assume no cooldown if can't fetch
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
    // Don't allow audit if cooldown is active
    if (cooldownState.active) {
      showMessage('warning', `Cooldown active. Next audit available in ${formatCooldownTime(cooldownState.remainingSeconds)}`);
      return;
    }

    try {
      setTesting(true);
      setLastAuditTime(new Date());

      const result = await axios.post('/api/notifications/check-thresholds');

      if (result.data.checked) {
        // Update cooldown state with seconds
        const cooldownSeconds = result.data.cooldownRemainingSeconds || 0;
        setCooldownState({
          active: result.data.cooldownActive || false,
          remainingMinutes: Math.ceil(cooldownSeconds / 60),
          remainingSeconds: cooldownSeconds
        });

        // Check if cooldown is active
        if (result.data.cooldownActive && !result.data.consolidatedEmailSent) {
          // Cooldown suppression
          const cooldownMin = result.data.cooldownRemainingMinutes || 0;
          const summary = [
            `${result.data.accountsScanned || 0} account(s) scanned`,
            `${result.data.alertsSuppressed || 0} alert(s) suppressed (cooldown)`,
            `Next alert window in ${cooldownMin} minute(s)`
          ].join(' • ');
          showMessage('warning', `License audit completed (cooldown active) • ${summary}`);
        } else {
          // Success - show detailed summary
          const emailStatus = result.data.consolidatedEmailSent ? 'Email sent' : 'No alerts triggered';
          const summary = [
            `${result.data.accountsScanned || 0} account(s) scanned`,
            `${result.data.warningConditions || 0} warning(s)`,
            `${result.data.criticalConditions || 0} critical condition(s)`,
            emailStatus
          ].join(' • ');
          showMessage('success', `License audit complete • ${summary}`);
        }
        fetchData(); // Refresh activity
      } else {
        // Failed audit - show contextual message
        const reason = result.data.reason || 'Unknown error';
        const detail = result.data.detail;
        const message = detail ? `${reason}: ${detail}` : reason;

        // Use warning for operational issues, error for failures
        const messageType = result.data.error ? 'error' : 'warning';
        showMessage(messageType, message);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || 'License audit failed';
      showMessage('error', errorMsg);
    } finally {
      setTesting(false);
    }
  };

  const formatCooldownTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const calculateUtilization = (current, limit) => {
    if (!limit || limit === 0) return { percentage: 0, status: 'normal' };
    const percentage = calculateUtilizationPercentage(current, limit);
    const status = getUtilizationStatus(percentage,
      (config.thresholds.dynoUnits?.warningPercentage || 80) / 100,
      (config.thresholds.dynoUnits?.criticalPercentage || 95) / 100
    );
    return { percentage: (percentage * 100).toFixed(1), status };
  };

  const calculateAccountLicenseStatus = (account) => {
    if (!account.resources || !config) {
      return { status: 'healthy', label: 'LICENSE HEALTHY', overageResources: [], highestResource: null, highestPercentage: 0 };
    }

    const warningThreshold = (config.thresholds.dynoUnits?.warningPercentage || 80) / 100;
    const criticalThreshold = (config.thresholds.dynoUnits?.criticalPercentage || 95) / 100;

    const resourceUtilizations = [
      {
        name: 'Dyno Units',
        current: account.resources.dynoUnits,
        limit: config.thresholds.dynoUnits?.limit,
        enabled: config.thresholds.dynoUnits?.enabled
      },
      {
        name: 'Connect Rows',
        current: account.resources.connectRows,
        limit: config.thresholds.connectRows?.limit,
        enabled: config.thresholds.connectRows?.enabled
      },
      {
        name: 'Enterprise Teams',
        current: account.resources.enterpriseTeams,
        limit: config.thresholds.enterpriseTeams?.limit,
        enabled: config.thresholds.enterpriseTeams?.enabled
      },
      {
        name: 'Private Spaces',
        current: account.resources.privateSpaces,
        limit: config.thresholds.privateSpaces?.limit,
        enabled: config.thresholds.privateSpaces?.enabled
      },
      {
        name: 'Shield Spaces',
        current: account.resources.shieldSpaces,
        limit: config.thresholds.shieldSpaces?.limit,
        enabled: config.thresholds.shieldSpaces?.enabled
      }
    ];

    let highestPercentage = 0;
    let highestResource = null;
    let overageResources = [];

    resourceUtilizations.forEach(resource => {
      if (resource.enabled && resource.limit && resource.limit > 0) {
        const percentage = calculateUtilizationPercentage(resource.current, resource.limit);

        // Track all resources over 100%
        if (percentage > 1.0) {
          overageResources.push({
            name: resource.name,
            percentage: percentage
          });
        }

        if (percentage > highestPercentage) {
          highestPercentage = percentage;
          highestResource = resource.name;
        }
      }
    });

    // Determine status based on utilization
    // If ANY resource exceeds 100%, status is OVERAGE
    let status = 'healthy';
    let label = 'LICENSE HEALTHY';

    if (overageResources.length > 0) {
      status = 'overage';
      label = 'LICENSE OVERAGE';
    } else if (highestPercentage >= criticalThreshold) {
      status = 'critical';
      label = 'LICENSE CRITICAL';
    } else if (highestPercentage >= warningThreshold) {
      status = 'warning';
      label = 'LICENSE WARNING';
    }

    return {
      status,
      label,
      overageResources,
      highestResource,
      highestPercentage: (highestPercentage * 100).toFixed(1)
    };
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
          {lastAuditTime && (
            <div className="nmc-last-audit">
              Last audit: {lastAuditTime.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={testEmail}
            disabled={testing || !config.emailConfig.enabled}
            className="nmc-btn nmc-btn-secondary nmc-btn-sm"
          >
            {testing ? 'Sending...' : 'Test Email'}
          </button>
          <button
            onClick={checkThresholds}
            disabled={testing || cooldownState.active}
            className={`nmc-btn nmc-btn-primary nmc-btn-sm ${cooldownState.active ? 'nmc-btn-cooldown' : ''}`}
            title={
              cooldownState.active
                ? `⏱ License audits are rate-limited to prevent duplicate alerts. Last audit: ${lastAuditTime ? lastAuditTime.toLocaleTimeString() : 'Unknown'}`
                : 'Run license audit across all enterprise accounts'
            }
          >
            {testing
              ? 'Running Audit...'
              : cooldownState.active
                ? `Run License Audit (cooldown ${formatCooldownTime(cooldownState.remainingSeconds)})`
                : 'Run License Audit'}
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
            <div className="nmc-kpi-icon nmc-kpi-icon-threshold">📋</div>
            <div className="nmc-kpi-content">
              <div className="nmc-kpi-label">Monitored Licenses</div>
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
          className={`nmc-tab ${activeTab === 'licenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('licenses')}
        >
          Licenses
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
                  <span>Loading enterprise usage data...</span>
                </div>
              ) : enterpriseAccounts.length === 0 ? (
                <div className="nmc-enterprise-empty">
                  <span className="nmc-empty-icon">🏢</span>
                  <div className="nmc-empty-content">
                    <h3>No Enterprise Accounts Configured</h3>
                    <p>Add and monitor Enterprise Accounts to begin license auditing.</p>
                  </div>
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
                    {enterpriseAccounts.map((account, idx) => {
                      const licenseStatus = calculateAccountLicenseStatus(account);
                      return (
                        <div
                          key={idx}
                          className={`nmc-enterprise-card ${!account.billingAccess ? 'restricted' : ''}`}
                        >
                          <div className="nmc-enterprise-header">
                            <div className="nmc-enterprise-name">
                              {account.accountName || account.accountEmail}
                            </div>
                            {!account.billingAccess ? (
                              <span className="nmc-badge nmc-badge-restricted">
                                Restricted
                              </span>
                            ) : (
                              <div className="nmc-license-status">
                                <span className={`nmc-badge nmc-badge-license-${licenseStatus.status}`}>
                                  {licenseStatus.label}
                                </span>
                                {licenseStatus.status === 'overage' && licenseStatus.overageResources.length > 0 ? (
                                  <div className="nmc-license-overage-list">
                                    {licenseStatus.overageResources.map((resource, idx) => (
                                      <div key={idx} className="nmc-license-overage-item">
                                        {resource.name}: &gt;{(resource.percentage * 100).toFixed(1)}%
                                      </div>
                                    ))}
                                  </div>
                                ) : licenseStatus.highestResource ? (
                                  <div className="nmc-license-highest">
                                    {licenseStatus.highestResource}: {licenseStatus.highestPercentage}%
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>

                        {!account.billingAccess ? (
                          <div className="nmc-enterprise-restricted">
                            <span className="nmc-restricted-icon">🔒</span>
                            <span>Billing Access Restricted</span>
                          </div>
                        ) : account.resources ? (
                          <div className="nmc-enterprise-metrics-v2">
                            {/* Enterprise Teams (count only, no progress bar) */}
                            <div className="nmc-metric-row-simple">
                              <span className="nmc-metric-label">Enterprise Teams</span>
                              <span className="nmc-metric-value-simple">
                                {account.resources.enterpriseTeams || 0}
                              </span>
                            </div>

                            {/* Dyno Units with utilization */}
                            {(() => {
                              const dynoUtil = calculateUtilization(
                                account.resources.dynoUnits,
                                config.thresholds.dynoUnits?.limit
                              );
                              return (
                                <div className="nmc-metric-row">
                                  <span className="nmc-metric-label">Dyno Units</span>
                                  <span className="nmc-metric-usage">
                                    {formatUsage(account.resources.dynoUnits)} / {formatUsage(config.thresholds.dynoUnits?.limit || 0)}
                                  </span>
                                  <span className={`nmc-metric-percent nmc-util-${dynoUtil.status}`}>
                                    {dynoUtil.percentage}%
                                  </span>
                                  <div className={`nmc-progress-bar nmc-util-${dynoUtil.status}`}>
                                    <div className="nmc-progress-fill" style={{width: `${Math.min(dynoUtil.percentage, 100)}%`}}></div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Connect Rows with utilization */}
                            {(() => {
                              const connectUtil = calculateUtilization(
                                account.resources.connectRows,
                                config.thresholds.connectRows?.limit
                              );
                              return (
                                <div className="nmc-metric-row">
                                  <span className="nmc-metric-label">Connect Rows</span>
                                  <span className="nmc-metric-usage">
                                    {formatUsage(account.resources.connectRows)} / {formatUsage(config.thresholds.connectRows?.limit || 0)}
                                  </span>
                                  <span className={`nmc-metric-percent nmc-util-${connectUtil.status}`}>
                                    {connectUtil.percentage}%
                                  </span>
                                  <div className={`nmc-progress-bar nmc-util-${connectUtil.status}`}>
                                    <div className="nmc-progress-fill" style={{width: `${Math.min(connectUtil.percentage, 100)}%`}}></div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Private Spaces with utilization */}
                            {(() => {
                              const spacesUtil = calculateUtilization(
                                account.resources.privateSpaces,
                                config.thresholds.privateSpaces?.limit
                              );
                              return (
                                <div className="nmc-metric-row">
                                  <span className="nmc-metric-label">Private Spaces</span>
                                  <span className="nmc-metric-usage">
                                    {account.resources.privateSpaces || 0} / {config.thresholds.privateSpaces?.limit || 0}
                                  </span>
                                  <span className={`nmc-metric-percent nmc-util-${spacesUtil.status}`}>
                                    {spacesUtil.percentage}%
                                  </span>
                                  <div className={`nmc-progress-bar nmc-util-${spacesUtil.status}`}>
                                    <div className="nmc-progress-fill" style={{width: `${Math.min(spacesUtil.percentage, 100)}%`}}></div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Shield Spaces with utilization */}
                            {(() => {
                              const shieldUtil = calculateUtilization(
                                account.resources.shieldSpaces,
                                config.thresholds.shieldSpaces?.limit
                              );
                              return (
                                <div className="nmc-metric-row">
                                  <span className="nmc-metric-label">Shield Spaces</span>
                                  <span className="nmc-metric-usage">
                                    {account.resources.shieldSpaces || 0} / {config.thresholds.shieldSpaces?.limit || 0}
                                  </span>
                                  <span className={`nmc-metric-percent nmc-util-${shieldUtil.status}`}>
                                    {shieldUtil.percentage}%
                                  </span>
                                  <div className={`nmc-progress-bar nmc-util-${shieldUtil.status}`}>
                                    <div className="nmc-progress-fill" style={{width: `${Math.min(shieldUtil.percentage, 100)}%`}}></div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Data Add-ons with utilization */}
                            {(() => {
                              const dataUtil = calculateUtilization(
                                account.resources.dataAddons,
                                config.thresholds.dataAddons?.limit
                              );
                              return (
                                <div className="nmc-metric-row">
                                  <span className="nmc-metric-label">Data Add-ons</span>
                                  <span className="nmc-metric-usage">
                                    {formatNumber(account.resources.dataAddons)} / {formatNumber(config.thresholds.dataAddons?.limit || 0)}
                                  </span>
                                  <span className={`nmc-metric-percent nmc-util-${dataUtil.status}`}>
                                    {dataUtil.percentage}%
                                  </span>
                                  <div className={`nmc-progress-bar nmc-util-${dataUtil.status}`}>
                                    <div className="nmc-progress-fill" style={{width: `${Math.min(dataUtil.percentage, 100)}%`}}></div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* General Add-ons with utilization */}
                            {(() => {
                              const generalUtil = calculateUtilization(
                                account.resources.generalAddons,
                                config.thresholds.generalAddons?.limit
                              );
                              return (
                                <div className="nmc-metric-row">
                                  <span className="nmc-metric-label">General Add-ons</span>
                                  <span className="nmc-metric-usage">
                                    {formatNumber(account.resources.generalAddons)} / {formatNumber(config.thresholds.generalAddons?.limit || 0)}
                                  </span>
                                  <span className={`nmc-metric-percent nmc-util-${generalUtil.status}`}>
                                    {generalUtil.percentage}%
                                  </span>
                                  <div className={`nmc-progress-bar nmc-util-${generalUtil.status}`}>
                                    <div className="nmc-progress-fill" style={{width: `${Math.min(generalUtil.percentage, 100)}%`}}></div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="nmc-enterprise-restricted">
                            <span>No usage data available</span>
                          </div>
                        )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Licensed Resources */}
            <div className="nmc-section">
              <h2 className="nmc-section-title">Licensed Resources</h2>
              <div className="nmc-resource-grid">
                {Object.entries(config.thresholds).map(([key, threshold]) => {
                  const resourceLabel = key.replace(/([A-Z])/g, ' $1').trim();
                  return (
                    <div key={key} className="nmc-resource-card">
                      <div className="nmc-resource-header">
                        <span className="nmc-resource-name">{resourceLabel}</span>
                        <span className={`nmc-badge ${threshold.enabled ? 'active' : 'inactive'}`}>
                          {threshold.enabled ? 'Monitored' : 'Off'}
                        </span>
                      </div>
                      <div className="nmc-resource-limit">{formatUsage(threshold.limit)}</div>
                      <div className="nmc-resource-meta">
                        Alert: {threshold.warningPercentage}% / {threshold.criticalPercentage}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="nmc-section">
              <h2 className="nmc-section-title">Recent Activity</h2>
              {loading ? (
                <div className="nmc-activity-loading">Loading recent activity...</div>
              ) : recentActivity.length > 0 ? (
                <div className="nmc-activity-list">
                  {recentActivity.map((event) => (
                    <div key={event.id} className="nmc-activity-item">
                      <span className={`nmc-activity-icon ${event.status}`}>
                        {event.status === 'sent' && '✓'}
                        {event.status === 'failed' && '✗'}
                        {event.status === 'queued' && '⏱'}
                        {event.status === 'suppressed' && '⚠'}
                        {event.status === 'completed' && '✓'}
                      </span>
                      <div className="nmc-activity-content">
                        <div className="nmc-activity-title">
                          {event.subject || event.type}
                        </div>
                        <div className="nmc-activity-meta">
                          {new Date(event.timestamp).toLocaleString()} • {event.provider || event.status}
                        </div>
                      </div>
                      <span className={`nmc-activity-status ${event.status}`}>
                        {event.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="nmc-activity-empty">
                  No notification activity yet. Run a license audit to begin monitoring.
                </div>
              )}
            </div>
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

        {activeTab === 'licenses' && (
          <div className="nmc-section">
            <h2 className="nmc-section-title">Enterprise Licenses</h2>
            <p className="nmc-section-desc">Current enterprise license allocations and monitored usage limits</p>

            <div className="nmc-threshold-cards">
              {Object.entries(config.thresholds).map(([key, threshold]) => {
                const resourceLabel = key.replace(/([A-Z])/g, ' $1').trim();
                return (
                  <div key={key} className="nmc-threshold-card">
                    <div className="nmc-threshold-card-header">
                      <h3>{resourceLabel}</h3>
                      <span className={`nmc-badge ${threshold.enabled ? 'active' : 'inactive'}`}>
                        {threshold.enabled ? 'Monitored' : 'Disabled'}
                      </span>
                    </div>
                    <div className="nmc-threshold-card-body">
                      <div className="nmc-threshold-limit">
                        <span className="nmc-threshold-limit-label">Licensed Capacity</span>
                        <span className="nmc-threshold-limit-value">{threshold.limit.toLocaleString()}</span>
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
