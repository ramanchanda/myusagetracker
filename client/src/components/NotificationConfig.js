import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NotificationConfig.css';

function NotificationConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('email');

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/notifications/config');
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching config:', error);
      showMessage('error', 'Failed to load configuration');
    } finally {
      setLoading(false);
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
        showMessage('success', 'Test email sent successfully!');
      } else {
        showMessage('warning', `Test email not sent: ${result.data.reason}`);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      showMessage('error', `Failed to send test email: ${error.response?.data?.error || error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const checkThresholds = async () => {
    try {
      const result = await axios.post('/api/notifications/check-thresholds');
      if (result.data.checked) {
        showMessage('success', `Threshold check complete. ${result.data.alertsTriggered} alert(s) triggered.`);
      } else {
        showMessage('warning', `Threshold check failed: ${result.data.reason || result.data.error}`);
      }
    } catch (error) {
      console.error('Error checking thresholds:', error);
      showMessage('error', 'Failed to check thresholds');
    }
  };

  if (loading) {
    return <div className="notification-config loading">Loading configuration...</div>;
  }

  if (!config) {
    return <div className="notification-config error">Failed to load configuration</div>;
  }

  return (
    <div className="notification-config">
      <div className="config-header">
        <h2>📧 Notification Configuration</h2>
        <p>View current notification settings from Heroku Config Vars</p>
        <div className="config-note">
          <strong>Note:</strong> Configuration is read-only. Update via Heroku Config Vars.
        </div>
      </div>

      {message && (
        <div className={`config-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="config-tabs">
        <button
          className={`tab-btn ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          📧 Email Setup
        </button>
        <button
          className={`tab-btn ${activeTab === 'thresholds' ? 'active' : ''}`}
          onClick={() => setActiveTab('thresholds')}
        >
          ⚠️ Thresholds
        </button>
        <button
          className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          🕐 Schedule
        </button>
      </div>

      <div className="config-content">
        {activeTab === 'email' && (
          <div className="config-section">
            <h3>Email Configuration</h3>
            <p className="section-note">
              Email service provider: Mailgun API (with SMTP fallback)
            </p>

            <div className="readonly-field">
              <label>Email Notifications Status</label>
              <div className="readonly-value">
                <span className={`status-badge ${config.emailConfig.enabled ? 'enabled' : 'disabled'}`}>
                  {config.emailConfig.enabled ? '✓ Enabled' : '✗ Disabled'}
                </span>
              </div>
              <small>Stored in database (toggle via Notification Settings)</small>
            </div>

            <div className="readonly-field">
              <label>From Name</label>
              <div className="readonly-value">{config.emailConfig.fromName || '(Not set)'}</div>
              <small>Config Var: <code>NOTIFICATION_FROM_NAME</code></small>
            </div>

            <div className="readonly-field">
              <label>From Email</label>
              <div className="readonly-value">{config.emailConfig.fromEmail || '(Using default from Mailgun)'}</div>
              <small>Config Var: <code>NOTIFICATION_FROM_EMAIL</code></small>
            </div>

            <div className="readonly-field">
              <label>Recipients</label>
              <div className="readonly-value">
                {config.emailConfig.recipients && config.emailConfig.recipients.length > 0 ? (
                  <div className="recipients-list">
                    {config.emailConfig.recipients.map((email, idx) => (
                      <span key={idx} className="recipient-badge">{email}</span>
                    ))}
                  </div>
                ) : (
                  '(No recipients configured)'
                )}
              </div>
              <small>Config Var: <code>NOTIFICATION_RECIPIENTS</code> (comma-separated)</small>
            </div>

            <div className="form-actions">
              <button onClick={testEmail} disabled={testing || !config.emailConfig.enabled} className="btn-secondary">
                {testing ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'thresholds' && (
          <div className="config-section">
            <h3>Resource Thresholds</h3>
            <p className="section-note">
              Current usage limits and alert thresholds from Heroku Config Vars
            </p>

            <div className="global-thresholds-panel">
              <h4>Global Alert Percentages</h4>
              <p className="global-note">
                These percentages apply to <strong>all resources</strong> below
              </p>
              <div className="global-percentages">
                <div className="global-percentage-card warning">
                  <label>⚠️ Warning Threshold</label>
                  <div className="percentage-value">
                    {config.thresholds.dynoUnits?.warningPercentage || 80}%
                  </div>
                  <small>Config Var: <code>THRESHOLD_WARNING_PERCENTAGE</code></small>
                </div>
                <div className="global-percentage-card critical">
                  <label>🚨 Critical Threshold</label>
                  <div className="percentage-value">
                    {config.thresholds.dynoUnits?.criticalPercentage || 95}%
                  </div>
                  <small>Config Var: <code>THRESHOLD_CRITICAL_PERCENTAGE</code></small>
                </div>
              </div>
            </div>

            <h4 style={{ marginTop: '32px', marginBottom: '16px', color: '#4c1d95', fontSize: '1.1rem' }}>
              Resource Limits
            </h4>

            {Object.entries(config.thresholds).map(([key, threshold]) => {
              const resourceLabel = key.replace(/([A-Z])/g, ' $1').trim();
              const configPrefix = 'THRESHOLD_' + key.replace(/([A-Z])/g, '_$1').toUpperCase();

              return (
                <div key={key} className="threshold-card readonly">
                  <div className="threshold-header">
                    <strong>{resourceLabel}</strong>
                    <span className={`status-badge ${threshold.enabled ? 'enabled' : 'disabled'}`}>
                      {threshold.enabled ? '✓ Enabled' : '✗ Disabled'}
                    </span>
                  </div>

                  <div className="threshold-fields readonly">
                    <div className="readonly-field-inline" style={{ maxWidth: '200px' }}>
                      <label>Usage Limit</label>
                      <div className="readonly-value-inline">{threshold.limit.toLocaleString()}</div>
                      <small style={{ marginTop: '8px', display: 'block' }}>
                        Config Var: <code>{configPrefix}_LIMIT</code>
                      </small>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '12px' }}>
                      Alert percentages: ⚠️ {threshold.warningPercentage}% (Warning) · 🚨 {threshold.criticalPercentage}% (Critical)
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="form-actions">
              <button onClick={checkThresholds} className="btn-secondary">
                Check Thresholds Now
              </button>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="config-section">
            <h3>Notification Schedule</h3>
            <p className="section-note">
              Current schedule configuration from Heroku Config Vars
            </p>

            <div className="schedule-card readonly">
              <h4>Real-time Alerts</h4>
              <div className="readonly-field">
                <label>Status</label>
                <div className="readonly-value">
                  <span className={`status-badge ${config.triggerSchedule.realtimeAlerts.enabled ? 'enabled' : 'disabled'}`}>
                    {config.triggerSchedule.realtimeAlerts.enabled ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
                <small>Config Var: <code>SCHEDULE_REALTIME_ENABLED</code></small>
              </div>
              {config.triggerSchedule.realtimeAlerts.enabled && (
                <div className="readonly-field">
                  <label>Check Interval</label>
                  <div className="readonly-value">{config.triggerSchedule.realtimeAlerts.checkIntervalMinutes} minutes</div>
                  <small>Config Var: <code>SCHEDULE_REALTIME_INTERVAL</code></small>
                </div>
              )}
            </div>

            <div className="schedule-card readonly">
              <h4>Daily Summary</h4>
              <div className="readonly-field">
                <label>Status</label>
                <div className="readonly-value">
                  <span className={`status-badge ${config.triggerSchedule.dailySummary.enabled ? 'enabled' : 'disabled'}`}>
                    {config.triggerSchedule.dailySummary.enabled ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
                <small>Config Var: <code>SCHEDULE_DAILY_ENABLED</code></small>
              </div>
              {config.triggerSchedule.dailySummary.enabled && (
                <div className="readonly-field">
                  <label>Time (UTC)</label>
                  <div className="readonly-value">{config.triggerSchedule.dailySummary.time}</div>
                  <small>Config Var: <code>SCHEDULE_DAILY_TIME</code></small>
                </div>
              )}
            </div>

            <div className="schedule-card readonly">
              <h4>Weekly Summary</h4>
              <div className="readonly-field">
                <label>Status</label>
                <div className="readonly-value">
                  <span className={`status-badge ${config.triggerSchedule.weeklySummary.enabled ? 'enabled' : 'disabled'}`}>
                    {config.triggerSchedule.weeklySummary.enabled ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
                <small>Config Var: <code>SCHEDULE_WEEKLY_ENABLED</code></small>
              </div>
              {config.triggerSchedule.weeklySummary.enabled && (
                <>
                  <div className="readonly-field">
                    <label>Day of Week</label>
                    <div className="readonly-value">{config.triggerSchedule.weeklySummary.dayOfWeek}</div>
                    <small>Config Var: <code>SCHEDULE_WEEKLY_DAY</code></small>
                  </div>
                  <div className="readonly-field">
                    <label>Time (UTC)</label>
                    <div className="readonly-value">{config.triggerSchedule.weeklySummary.time}</div>
                    <small>Config Var: <code>SCHEDULE_WEEKLY_TIME</code></small>
                  </div>
                </>
              )}
            </div>

            <div className="schedule-card readonly">
              <h4>Monthly Summary</h4>
              <div className="readonly-field">
                <label>Status</label>
                <div className="readonly-value">
                  <span className={`status-badge ${config.triggerSchedule.monthlySummary.enabled ? 'enabled' : 'disabled'}`}>
                    {config.triggerSchedule.monthlySummary.enabled ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
                <small>Config Var: <code>SCHEDULE_MONTHLY_ENABLED</code></small>
              </div>
              {config.triggerSchedule.monthlySummary.enabled && (
                <>
                  <div className="readonly-field">
                    <label>Day of Month</label>
                    <div className="readonly-value">{config.triggerSchedule.monthlySummary.dayOfMonth}</div>
                    <small>Config Var: <code>SCHEDULE_MONTHLY_DAY</code></small>
                  </div>
                  <div className="readonly-field">
                    <label>Time (UTC)</label>
                    <div className="readonly-value">{config.triggerSchedule.monthlySummary.time}</div>
                    <small>Config Var: <code>SCHEDULE_MONTHLY_TIME</code></small>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default NotificationConfig;
