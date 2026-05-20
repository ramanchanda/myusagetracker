import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NotificationManagementCenter-enterprise.css';
import { formatNumber, formatUsage, calculateUtilizationPercentage, getUtilizationStatus } from '../utils/formatters';
import EnterpriseLicenseManagement from './EnterpriseLicenseManagement';
import { BellRing, CalendarDays, CalendarRange, CalendarClock, Info } from 'lucide-react';

function NotificationManagementCenter({ currentUser }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [enterpriseAccounts, setEnterpriseAccounts] = useState([]);
  const [enterpriseLoading, setEnterpriseLoading] = useState(false);
  const [licenseConfigs, setLicenseConfigs] = useState({});
  const [cooldownState, setCooldownState] = useState({
    active: false,
    remainingMinutes: 0,
    remainingSeconds: 0
  });
  const [lastAuditTime, setLastAuditTime] = useState(null);
  const [restarting, setRestarting] = useState(false);
  const [scalingScheduler, setScalingScheduler] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({
    enabled: false,
    fromName: '',
    fromEmail: '',
    subjectPrefix: '',
    subject: '',
    recipients: [],
    smtpConfig: {
      enabled: false,
      host: '',
      port: 587,
      user: '',
      password: '',
      secure: false
    }
  });
  const [newRecipient, setNewRecipient] = useState('');

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

        // Fetch license configs for all accounts in parallel
        const configPromises = transformedAccounts
          .filter(account => account.accountId)
          .map(account =>
            axios.get(`/api/licenses/enterprise/${account.accountId}`)
              .then(response => ({ accountId: account.accountId, data: response.data }))
              .catch(err => {
                console.warn(`Could not fetch license config for ${account.accountId}:`, err);
                return null;
              })
          );

        const configResults = await Promise.all(configPromises);
        const configs = {};
        configResults.forEach(result => {
          if (result) {
            configs[result.accountId] = result.data;
          }
        });
        setLicenseConfigs(configs);
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

  const handleScheduleToggle = async (scheduleType, enabled) => {
    try {
      const updatedConfig = {
        ...config,
        triggerSchedule: {
          ...config.triggerSchedule,
          [scheduleType]: {
            ...config.triggerSchedule[scheduleType],
            enabled
          }
        }
      };

      const response = await axios.put('/api/notifications/config', updatedConfig);
      setConfig(response.data);
      showMessage('success', `${scheduleType} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating schedule:', error);
      showMessage('error', 'Failed to update schedule');
    }
  };

  const handleScheduleUpdate = async (scheduleType, field, value) => {
    try {
      const updatedConfig = {
        ...config,
        triggerSchedule: {
          ...config.triggerSchedule,
          [scheduleType]: {
            ...config.triggerSchedule[scheduleType],
            [field]: value
          }
        }
      };

      const response = await axios.put('/api/notifications/config', updatedConfig);
      setConfig(response.data);
      showMessage('success', 'Schedule updated');
    } catch (error) {
      console.error('Error updating schedule:', error);
      showMessage('error', 'Failed to update schedule');
    }
  };

  const toggleScheduling = async (enabled) => {
    try {
      setScalingScheduler(true);

      // Update config in database
      const updatedConfig = {
        ...config,
        schedulingEnabled: enabled
      };
      await axios.put('/api/notifications/config', updatedConfig);

      // Scale clock dyno
      const response = await axios.post('/api/scheduler/scale', { enabled });

      if (response.data.success) {
        setConfig(updatedConfig);
        showMessage('success', response.data.message);
      } else {
        showMessage('error', response.data.message || 'Failed to scale scheduler');
      }
    } catch (error) {
      console.error('Error scaling scheduler:', error);
      showMessage('error', error.response?.data?.error || 'Failed to scale scheduler');
    } finally {
      setScalingScheduler(false);
    }
  };

  const startEditingEmail = () => {
    setEmailForm({
      enabled: config.emailConfig.enabled,
      fromName: config.emailConfig.fromName,
      fromEmail: config.emailConfig.fromEmail,
      subjectPrefix: config.emailConfig.subjectPrefix || 'Heroku Usage Monitor',
      subject: config.emailConfig.subject || '',
      recipients: [...config.emailConfig.recipients],
      smtpConfig: config.emailConfig.smtpConfig || {
        enabled: false,
        host: '',
        port: 587,
        user: '',
        password: '',
        secure: false
      }
    });
    setEditingEmail(true);
  };

  const cancelEditingEmail = () => {
    setEditingEmail(false);
    setNewRecipient('');
  };

  const addRecipient = () => {
    if (newRecipient && newRecipient.includes('@')) {
      setEmailForm({
        ...emailForm,
        recipients: [...emailForm.recipients, newRecipient]
      });
      setNewRecipient('');
    }
  };

  const removeRecipient = (index) => {
    setEmailForm({
      ...emailForm,
      recipients: emailForm.recipients.filter((_, idx) => idx !== index)
    });
  };

  const saveEmailConfig = async () => {
    try {
      const updatedConfig = {
        ...config,
        emailConfig: emailForm
      };

      const response = await axios.put('/api/notifications/config', updatedConfig);
      setConfig(response.data);
      setEditingEmail(false);
      showMessage('success', 'Email configuration saved successfully');
    } catch (error) {
      console.error('Error saving email config:', error);
      showMessage('error', 'Failed to save email configuration');
    }
  };

  const restartClockDyno = async () => {
    try {
      setRestarting(true);
      const response = await axios.post('/api/scheduler/restart');

      if (response.data.success) {
        showMessage('success', 'Clock dyno restarted successfully! New schedule will be applied.');
      } else {
        showMessage('error', response.data.message || 'Failed to restart clock dyno');
      }
    } catch (error) {
      console.error('Error restarting clock dyno:', error);
      showMessage('error', error.response?.data?.error || 'Failed to restart clock dyno');
    } finally {
      setRestarting(false);
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

  const calculateUtilization = (current, limit, warningPct = 80, criticalPct = 95) => {
    if (!limit || limit === 0) return { percentage: 0, status: 'normal' };
    const percentage = calculateUtilizationPercentage(current, limit);
    const status = getUtilizationStatus(percentage,
      warningPct / 100,
      criticalPct / 100
    );
    return { percentage: (percentage * 100).toFixed(1), status };
  };

  const calculateAccountLicenseStatus = (account) => {
    if (!account.resources) {
      return { status: 'healthy', label: 'LICENSE HEALTHY', overageResources: [], highestResource: null, highestPercentage: 0 };
    }

    // Get per-EA license config
    const licenseConfig = licenseConfigs[account.accountId];
    if (!licenseConfig) {
      return { status: 'healthy', label: 'LICENSE HEALTHY', overageResources: [], highestResource: null, highestPercentage: 0 };
    }

    const warningThreshold = (licenseConfig.warning_percentage || 80) / 100;
    const criticalThreshold = (licenseConfig.critical_percentage || 95) / 100;

    const resourceUtilizations = [
      {
        name: 'Dyno Units',
        current: account.resources.dynoUnits,
        limit: licenseConfig.dyno_units_limit,
        enabled: licenseConfig.dyno_units_limit > 0
      },
      {
        name: 'Connect Rows',
        current: account.resources.connectRows,
        limit: licenseConfig.connect_rows_limit,
        enabled: licenseConfig.connect_rows_limit > 0
      },
      {
        name: 'Private Spaces',
        current: account.resources.privateSpaces,
        limit: licenseConfig.private_spaces_limit,
        enabled: licenseConfig.private_spaces_limit > 0
      },
      {
        name: 'Shield Spaces',
        current: account.resources.shieldSpaces,
        limit: licenseConfig.shield_spaces_limit,
        enabled: licenseConfig.shield_spaces_limit > 0
      },
      {
        name: 'Data Add-ons',
        current: account.resources.dataAddons,
        limit: licenseConfig.data_addons_limit,
        enabled: licenseConfig.data_addons_limit > 0
      },
      {
        name: 'General Add-ons',
        current: account.resources.generalAddons,
        limit: licenseConfig.general_addons_limit,
        enabled: licenseConfig.general_addons_limit > 0
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
              <div className="nmc-kpi-label">Enterprise Accounts</div>
              <div className="nmc-kpi-value">{enterpriseAccounts.length}</div>
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
                          (() => {
                            const eaLicense = licenseConfigs[account.accountId];
                            if (!eaLicense) {
                              return (
                                <div className="nmc-enterprise-restricted">
                                  <span>License configuration not found</span>
                                </div>
                              );
                            }
                            return (
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
                                    eaLicense.dyno_units_limit,
                                    eaLicense.warning_percentage,
                                    eaLicense.critical_percentage
                                  );
                                  return (
                                    <div className="nmc-metric-row">
                                      <span className="nmc-metric-label">Dyno Units</span>
                                      <span className="nmc-metric-usage">
                                        {formatUsage(account.resources.dynoUnits)} / {formatUsage(eaLicense.dyno_units_limit || 0)}
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
                                    eaLicense.connect_rows_limit,
                                    eaLicense.warning_percentage,
                                    eaLicense.critical_percentage
                                  );
                                  return (
                                    <div className="nmc-metric-row">
                                      <span className="nmc-metric-label">Connect Rows</span>
                                      <span className="nmc-metric-usage">
                                        {formatUsage(account.resources.connectRows)} / {formatUsage(eaLicense.connect_rows_limit || 0)}
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
                                    eaLicense.private_spaces_limit,
                                    eaLicense.warning_percentage,
                                    eaLicense.critical_percentage
                                  );
                                  return (
                                    <div className="nmc-metric-row">
                                      <span className="nmc-metric-label">Private Spaces</span>
                                      <span className="nmc-metric-usage">
                                        {account.resources.privateSpaces || 0} / {eaLicense.private_spaces_limit || 0}
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
                                    eaLicense.shield_spaces_limit,
                                    eaLicense.warning_percentage,
                                    eaLicense.critical_percentage
                                  );
                                  return (
                                    <div className="nmc-metric-row">
                                      <span className="nmc-metric-label">Shield Spaces</span>
                                      <span className="nmc-metric-usage">
                                        {account.resources.shieldSpaces || 0} / {eaLicense.shield_spaces_limit || 0}
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
                                    eaLicense.data_addons_limit,
                                    eaLicense.warning_percentage,
                                    eaLicense.critical_percentage
                                  );
                                  return (
                                    <div className="nmc-metric-row">
                                      <span className="nmc-metric-label">Data Add-ons</span>
                                      <span className="nmc-metric-usage">
                                        {formatNumber(account.resources.dataAddons)} / {formatNumber(eaLicense.data_addons_limit || 0)}
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
                                    eaLicense.general_addons_limit,
                                    eaLicense.warning_percentage,
                                    eaLicense.critical_percentage
                                  );
                                  return (
                                    <div className="nmc-metric-row">
                                      <span className="nmc-metric-label">General Add-ons</span>
                                      <span className="nmc-metric-usage">
                                        {formatNumber(account.resources.generalAddons)} / {formatNumber(eaLicense.general_addons_limit || 0)}
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
                            );
                          })()
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

            {/* License Management Note */}
            <div className="nmc-section">
              <div className="nmc-info-banner" style={{ borderLeft: '4px solid #6762a6' }}>
                <span className="nmc-info-icon">📋</span>
                <div>
                  <strong>Per-Enterprise Account License Management</strong>
                  <br />
                  View and configure license limits for each Enterprise Account in the <strong>Licenses</strong> tab above.
                  Each Enterprise Account has independent license capacity limits and monitoring thresholds.
                </div>
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
            <div className="nmc-section-header">
              <div>
                <h2 className="nmc-section-title">Email Configuration</h2>
              </div>
              {!editingEmail && currentUser && currentUser.role === 'admin' && (
                <button onClick={startEditingEmail} className="nmc-btn nmc-btn-primary">
                  Edit Configuration
                </button>
              )}
            </div>

            {editingEmail ? (
              <div className="nmc-form-section">
                {/* API Configuration Section */}
                <div className="nmc-api-section">
                  <div className="nmc-subsection-header">
                    <h3 className="nmc-subsection-title">API Configuration</h3>
                    <p className="nmc-subsection-desc">Primary email delivery via API</p>
                  </div>

                  <div className="nmc-form-grid">
                    <div className="nmc-field">
                      <label className="nmc-input-label">
                        Status
                        <label className="nmc-schedule-toggle">
                          <input
                            type="checkbox"
                            checked={emailForm.enabled}
                            onChange={(e) => setEmailForm({ ...emailForm, enabled: e.target.checked })}
                          />
                          <span className="nmc-schedule-toggle-track"></span>
                        </label>
                      </label>
                    </div>

                    <div className="nmc-field">
                      <label className="nmc-input-label">
                        From Name
                        <input
                          type="text"
                          value={emailForm.fromName}
                          onChange={(e) => setEmailForm({ ...emailForm, fromName: e.target.value })}
                          placeholder="Heroku Usage Monitor"
                          className="nmc-schedule-input"
                        />
                      </label>
                    </div>

                    <div className="nmc-field nmc-field-full">
                      <label className="nmc-input-label">
                        From Email
                        <input
                          type="email"
                          value={emailForm.fromEmail}
                          onChange={(e) => setEmailForm({ ...emailForm, fromEmail: e.target.value })}
                          placeholder="postmaster@yourdomain.mailgun.org"
                          className="nmc-schedule-input"
                        />
                      </label>
                      <span className="nmc-field-hint">Leave empty to use Mailgun default</span>
                    </div>

                    <div className="nmc-field nmc-field-full">
                      <label className="nmc-input-label">
                        Email Subject Prefix
                        <input
                          type="text"
                          value={emailForm.subjectPrefix}
                          onChange={(e) => setEmailForm({ ...emailForm, subjectPrefix: e.target.value })}
                          placeholder="Heroku Usage Monitor"
                          className="nmc-schedule-input"
                        />
                      </label>
                      <span className="nmc-field-hint">Company/brand name prefix (e.g., "Heroku Usage Monitor")</span>
                    </div>

                    <div className="nmc-field nmc-field-full">
                      <label className="nmc-input-label">
                        Email Subject
                        <input
                          type="text"
                          value={emailForm.subject}
                          onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                          placeholder="License Alert"
                          className="nmc-schedule-input"
                        />
                      </label>
                      <span className="nmc-field-hint">Main email subject (combined with prefix: "Prefix - Subject - Details")</span>
                    </div>

                    <div className="nmc-field nmc-field-full">
                      <label className="nmc-input-label">Recipients</label>
                      <div className="nmc-recipients-editor">
                        {emailForm.recipients.map((email, idx) => (
                          <div key={idx} className="nmc-recipient-badge editable">
                            {email}
                            <button onClick={() => removeRecipient(idx)} className="nmc-recipient-remove">×</button>
                          </div>
                        ))}
                      </div>
                      <div className="nmc-recipient-add">
                        <input
                          type="email"
                          value={newRecipient}
                          onChange={(e) => setNewRecipient(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                          placeholder="email@example.com"
                          className="nmc-schedule-input"
                        />
                        <button onClick={addRecipient} className="nmc-btn nmc-btn-secondary">
                          Add Recipient
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SMTP Configuration Section */}
                <div className="nmc-smtp-section">
                  <div className="nmc-subsection-header">
                    <div>
                      <h3 className="nmc-subsection-title">SMTP Configuration</h3>
                      <p className="nmc-subsection-desc">Fallback email delivery via SMTP (optional but recommended)</p>
                    </div>
                    <label className="nmc-schedule-toggle">
                      <input
                        type="checkbox"
                        checked={emailForm.smtpConfig.enabled}
                        onChange={(e) => setEmailForm({
                          ...emailForm,
                          smtpConfig: { ...emailForm.smtpConfig, enabled: e.target.checked }
                        })}
                      />
                      <span className="nmc-schedule-toggle-track"></span>
                    </label>
                  </div>

                  {emailForm.smtpConfig.enabled && (
                    <div className="nmc-form-grid">
                      <div className="nmc-field">
                        <label className="nmc-input-label">
                          SMTP Host
                          <input
                            type="text"
                            value={emailForm.smtpConfig.host}
                            onChange={(e) => setEmailForm({
                              ...emailForm,
                              smtpConfig: { ...emailForm.smtpConfig, host: e.target.value }
                            })}
                            placeholder="smtp.example.com"
                            className="nmc-schedule-input"
                          />
                        </label>
                      </div>

                      <div className="nmc-field">
                        <label className="nmc-input-label">
                          SMTP Port
                          <input
                            type="number"
                            value={emailForm.smtpConfig.port}
                            onChange={(e) => setEmailForm({
                              ...emailForm,
                              smtpConfig: { ...emailForm.smtpConfig, port: parseInt(e.target.value) || 587 }
                            })}
                            placeholder="587"
                            className="nmc-schedule-input"
                          />
                        </label>
                      </div>

                      <div className="nmc-field">
                        <label className="nmc-input-label">
                          SMTP Username
                          <input
                            type="text"
                            value={emailForm.smtpConfig.user}
                            onChange={(e) => setEmailForm({
                              ...emailForm,
                              smtpConfig: { ...emailForm.smtpConfig, user: e.target.value }
                            })}
                            placeholder="username"
                            className="nmc-schedule-input"
                          />
                        </label>
                      </div>

                      <div className="nmc-field">
                        <label className="nmc-input-label">
                          SMTP Password
                          <input
                            type="password"
                            value={emailForm.smtpConfig.password}
                            onChange={(e) => setEmailForm({
                              ...emailForm,
                              smtpConfig: { ...emailForm.smtpConfig, password: e.target.value }
                            })}
                            placeholder="••••••••"
                            className="nmc-schedule-input"
                          />
                        </label>
                      </div>

                      <div className="nmc-field nmc-field-full">
                        <label className="nmc-input-label">
                          Use SSL/TLS
                          <label className="nmc-schedule-toggle">
                            <input
                              type="checkbox"
                              checked={emailForm.smtpConfig.secure}
                              onChange={(e) => setEmailForm({
                                ...emailForm,
                                smtpConfig: { ...emailForm.smtpConfig, secure: e.target.checked }
                              })}
                            />
                            <span className="nmc-schedule-toggle-track"></span>
                          </label>
                        </label>
                        <span className="nmc-field-hint">Enable for port 465, disable for port 587 (STARTTLS)</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="nmc-form-actions">
                  <button onClick={saveEmailConfig} className="nmc-btn nmc-btn-primary">
                    Save Configuration
                  </button>
                  <button onClick={cancelEditingEmail} className="nmc-btn nmc-btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* API Configuration Display */}
                <div className="nmc-api-section-readonly">
                  <h3 className="nmc-subsection-title">API Configuration</h3>
                  <p className="nmc-subsection-desc">Primary email delivery via API</p>

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

                    <div className="nmc-field">
                      <label>Subject Prefix</label>
                      <div className="nmc-field-value">{config.emailConfig.subjectPrefix || 'Heroku Usage Monitor'}</div>
                    </div>

                    <div className="nmc-field">
                      <label>Subject</label>
                      <div className="nmc-field-value">{config.emailConfig.subject || '(Not set)'}</div>
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
                </div>

                {/* SMTP Configuration Display */}
                <div className="nmc-smtp-section-readonly">
                  <h3 className="nmc-subsection-title">SMTP Configuration</h3>
                  <p className="nmc-subsection-desc">Fallback email delivery via SMTP</p>
                  <div className="nmc-form-grid">
                    <div className="nmc-field">
                      <label>Status</label>
                      <div className="nmc-field-value">
                        <span className={`nmc-badge ${config.emailConfig.smtpConfig?.enabled ? 'active' : 'inactive'}`}>
                          {config.emailConfig.smtpConfig?.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    {config.emailConfig.smtpConfig?.enabled && (
                      <>
                        <div className="nmc-field">
                          <label>SMTP Host</label>
                          <div className="nmc-field-value">{config.emailConfig.smtpConfig.host || '(Not set)'}</div>
                        </div>

                        <div className="nmc-field">
                          <label>SMTP Port</label>
                          <div className="nmc-field-value">{config.emailConfig.smtpConfig.port || 587}</div>
                        </div>

                        <div className="nmc-field">
                          <label>SMTP Username</label>
                          <div className="nmc-field-value">{config.emailConfig.smtpConfig.user || '(Not set)'}</div>
                        </div>

                        <div className="nmc-field">
                          <label>SSL/TLS</label>
                          <div className="nmc-field-value">{config.emailConfig.smtpConfig.secure ? 'Enabled' : 'Disabled'}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'licenses' && (
          <EnterpriseLicenseManagement />
        )}

        {activeTab === 'schedule' && (
          <div className="nmc-section">
            <h2 className="nmc-schedule-section-title">Notification Schedule</h2>
            <p className="nmc-schedule-section-desc">Automated threshold checks and usage reports</p>

            {/* Master Scheduling Toggle */}
            <div className={`nmc-schedule-master ${config.schedulingEnabled !== false ? 'enabled' : 'disabled'}`}>
              <div className="nmc-schedule-master-content">
                <div className="nmc-schedule-master-info">
                  <h3>Automated Scheduling</h3>
                  <p>Enable background scheduler (clock dyno) for automated notifications</p>
                </div>
                <label className="nmc-schedule-toggle nmc-schedule-toggle-large">
                  <input
                    type="checkbox"
                    checked={config.schedulingEnabled !== false}
                    onChange={(e) => toggleScheduling(e.target.checked)}
                    disabled={scalingScheduler}
                  />
                  <span className="nmc-schedule-toggle-track"></span>
                </label>
              </div>
              {scalingScheduler && (
                <div className="nmc-schedule-master-status">
                  Scaling clock dyno...
                </div>
              )}
            </div>

            {config.schedulingEnabled !== false && (
              <div className="nmc-schedule-notice">
                <Info size={16} className="nmc-schedule-notice-icon" />
                <div className="nmc-schedule-notice-content">
                  After changing schedule settings, restart the clock dyno to apply changes.
                </div>
                <button
                  onClick={restartClockDyno}
                  disabled={restarting}
                  className="nmc-schedule-notice-btn"
                >
                  {restarting ? 'Restarting...' : 'Restart Clock Dyno'}
                </button>
              </div>
            )}

            <div className={`nmc-schedule-grid ${config.schedulingEnabled === false ? 'disabled' : ''}`}>
              {/* Real-time Alerts */}
              <div className={`nmc-schedule-policy ${config.triggerSchedule.realtimeAlerts.enabled ? 'enabled' : 'disabled'}`}>
                <div className="nmc-schedule-policy-header">
                  <div className="nmc-schedule-policy-title">
                    <BellRing size={18} className="nmc-schedule-policy-icon" />
                    <h3>Real-time Alerts</h3>
                  </div>
                  <label className="nmc-schedule-toggle">
                    <input
                      type="checkbox"
                      checked={config.triggerSchedule.realtimeAlerts.enabled}
                      onChange={(e) => handleScheduleToggle('realtimeAlerts', e.target.checked)}
                      disabled={config.schedulingEnabled === false}
                    />
                    <span className="nmc-schedule-toggle-track"></span>
                  </label>
                </div>
                <p className="nmc-schedule-policy-desc">Automated license monitoring</p>
                {config.triggerSchedule.realtimeAlerts.enabled && (
                  <div className="nmc-schedule-policy-config">
                    <label className="nmc-schedule-field-label">Check every</label>
                    <select
                      value={config.triggerSchedule.realtimeAlerts.checkIntervalMinutes}
                      onChange={(e) => handleScheduleUpdate('realtimeAlerts', 'checkIntervalMinutes', parseInt(e.target.value))}
                      disabled={config.schedulingEnabled === false}
                      className="nmc-schedule-select"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={240}>4 hours</option>
                      <option value={480}>8 hours</option>
                      <option value={720}>12 hours</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Daily Summary */}
              <div className={`nmc-schedule-policy ${config.triggerSchedule.dailySummary.enabled ? 'enabled' : 'disabled'}`}>
                <div className="nmc-schedule-policy-header">
                  <div className="nmc-schedule-policy-title">
                    <CalendarDays size={18} className="nmc-schedule-policy-icon" />
                    <h3>Daily Summary</h3>
                  </div>
                  <label className="nmc-schedule-toggle">
                    <input
                      type="checkbox"
                      checked={config.triggerSchedule.dailySummary.enabled}
                      onChange={(e) => handleScheduleToggle('dailySummary', e.target.checked)}
                      disabled={config.schedulingEnabled === false}
                    />
                    <span className="nmc-schedule-toggle-track"></span>
                  </label>
                </div>
                <p className="nmc-schedule-policy-desc">Daily usage digest</p>
                {config.triggerSchedule.dailySummary.enabled && (
                  <div className="nmc-schedule-policy-config">
                    <label className="nmc-schedule-field-label">Time (UTC)</label>
                    <input
                      type="time"
                      value={config.triggerSchedule.dailySummary.time}
                      onChange={(e) => handleScheduleUpdate('dailySummary', 'time', e.target.value)}
                      disabled={config.schedulingEnabled === false}
                      className="nmc-schedule-input"
                    />
                  </div>
                )}
              </div>

              {/* Weekly Summary */}
              <div className={`nmc-schedule-policy ${config.triggerSchedule.weeklySummary.enabled ? 'enabled' : 'disabled'}`}>
                <div className="nmc-schedule-policy-header">
                  <div className="nmc-schedule-policy-title">
                    <CalendarRange size={18} className="nmc-schedule-policy-icon" />
                    <h3>Weekly Summary</h3>
                  </div>
                  <label className="nmc-schedule-toggle">
                    <input
                      type="checkbox"
                      checked={config.triggerSchedule.weeklySummary.enabled}
                      onChange={(e) => handleScheduleToggle('weeklySummary', e.target.checked)}
                      disabled={config.schedulingEnabled === false}
                    />
                    <span className="nmc-schedule-toggle-track"></span>
                  </label>
                </div>
                <p className="nmc-schedule-policy-desc">Weekly trend report</p>
                {config.triggerSchedule.weeklySummary.enabled && (
                  <div className="nmc-schedule-policy-config">
                    <label className="nmc-schedule-field-label">Day of week</label>
                    <select
                      value={config.triggerSchedule.weeklySummary.dayOfWeek}
                      onChange={(e) => handleScheduleUpdate('weeklySummary', 'dayOfWeek', e.target.value)}
                      className="nmc-schedule-select"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                    <label className="nmc-schedule-field-label">Time (UTC)</label>
                    <input
                      type="time"
                      value={config.triggerSchedule.weeklySummary.time}
                      onChange={(e) => handleScheduleUpdate('weeklySummary', 'time', e.target.value)}
                      disabled={config.schedulingEnabled === false}
                      className="nmc-schedule-input"
                    />
                  </div>
                )}
              </div>

              {/* Monthly Summary */}
              <div className={`nmc-schedule-policy ${config.triggerSchedule.monthlySummary.enabled ? 'enabled' : 'disabled'}`}>
                <div className="nmc-schedule-policy-header">
                  <div className="nmc-schedule-policy-title">
                    <CalendarClock size={18} className="nmc-schedule-policy-icon" />
                    <h3>Monthly Summary</h3>
                  </div>
                  <label className="nmc-schedule-toggle">
                    <input
                      type="checkbox"
                      checked={config.triggerSchedule.monthlySummary.enabled}
                      onChange={(e) => handleScheduleToggle('monthlySummary', e.target.checked)}
                      disabled={config.schedulingEnabled === false}
                    />
                    <span className="nmc-schedule-toggle-track"></span>
                  </label>
                </div>
                <p className="nmc-schedule-policy-desc">Executive monthly report</p>
                {config.triggerSchedule.monthlySummary.enabled && (
                  <div className="nmc-schedule-policy-config">
                    <label className="nmc-schedule-field-label">Day of month</label>
                    <select
                      value={config.triggerSchedule.monthlySummary.dayOfMonth}
                      onChange={(e) => handleScheduleUpdate('monthlySummary', 'dayOfMonth', parseInt(e.target.value))}
                      className="nmc-schedule-select"
                    >
                      {[...Array(28)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                    <label className="nmc-schedule-field-label">Time (UTC)</label>
                    <input
                      type="time"
                      value={config.triggerSchedule.monthlySummary.time}
                      onChange={(e) => handleScheduleUpdate('monthlySummary', 'time', e.target.value)}
                      disabled={config.schedulingEnabled === false}
                      className="nmc-schedule-input"
                    />
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
