import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NotificationConfig.css';

function NotificationConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const handleEmailConfigChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      emailConfig: {
        ...prev.emailConfig,
        [field]: value
      }
    }));
  };

  const handleRecipientsChange = (value) => {
    const recipients = value.split(',').map(email => email.trim()).filter(Boolean);
    handleEmailConfigChange('recipients', recipients);
  };

  const handleThresholdChange = (resourceType, field, value) => {
    setConfig(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [resourceType]: {
          ...prev.thresholds[resourceType],
          [field]: field === 'enabled' ? value : Number(value)
        }
      }
    }));
  };

  const handleScheduleChange = (scheduleType, field, value) => {
    setConfig(prev => ({
      ...prev,
      triggerSchedule: {
        ...prev.triggerSchedule,
        [scheduleType]: {
          ...prev.triggerSchedule[scheduleType],
          [field]: field === 'enabled' ? value : value
        }
      }
    }));
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      await axios.put('/api/notifications/config', config);
      showMessage('success', 'Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      showMessage('error', 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
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
        <p>Configure email settings, thresholds, and notification schedules</p>
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
              Email service provider detected. SMTP settings will be used automatically from your configured addon (Mailgun, MailtoGo, etc.).
            </p>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={config.emailConfig.enabled}
                  onChange={(e) => handleEmailConfigChange('enabled', e.target.checked)}
                />
                Enable Email Notifications
              </label>
            </div>

            <div className="form-group">
              <label>From Name</label>
              <input
                type="text"
                value={config.emailConfig.fromName}
                onChange={(e) => handleEmailConfigChange('fromName', e.target.value)}
                placeholder="Heroku Usage Monitor"
              />
            </div>

            <div className="form-group">
              <label>From Email (optional - uses SMTP user if empty)</label>
              <input
                type="email"
                value={config.emailConfig.fromEmail}
                onChange={(e) => handleEmailConfigChange('fromEmail', e.target.value)}
                placeholder="noreply@example.com"
              />
            </div>

            <div className="form-group">
              <label>Recipients (comma-separated emails)</label>
              <textarea
                value={config.emailConfig.recipients.join(', ')}
                onChange={(e) => handleRecipientsChange(e.target.value)}
                placeholder="admin@example.com, alerts@example.com"
                rows="3"
              />
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
              Configure usage limits and alert thresholds for each resource type
            </p>

            {Object.entries(config.thresholds).map(([key, threshold]) => (
              <div key={key} className="threshold-card">
                <div className="threshold-header">
                  <label>
                    <input
                      type="checkbox"
                      checked={threshold.enabled}
                      onChange={(e) => handleThresholdChange(key, 'enabled', e.target.checked)}
                    />
                    <strong>{key.replace(/([A-Z])/g, ' $1').trim()}</strong>
                  </label>
                </div>

                {threshold.enabled && (
                  <div className="threshold-fields">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Limit</label>
                        <input
                          type="number"
                          value={threshold.limit}
                          onChange={(e) => handleThresholdChange(key, 'limit', e.target.value)}
                          min="0"
                        />
                      </div>
                      <div className="form-group">
                        <label>Warning %</label>
                        <input
                          type="number"
                          value={threshold.warningPercentage}
                          onChange={(e) => handleThresholdChange(key, 'warningPercentage', e.target.value)}
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="form-group">
                        <label>Critical %</label>
                        <input
                          type="number"
                          value={threshold.criticalPercentage}
                          onChange={(e) => handleThresholdChange(key, 'criticalPercentage', e.target.value)}
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

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
              Configure when to send automated usage summaries and real-time alerts
            </p>

            <div className="schedule-card">
              <h4>Real-time Alerts</h4>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.triggerSchedule.realtimeAlerts.enabled}
                    onChange={(e) => handleScheduleChange('realtimeAlerts', 'enabled', e.target.checked)}
                  />
                  Enable Real-time Threshold Alerts
                </label>
              </div>
              {config.triggerSchedule.realtimeAlerts.enabled && (
                <div className="form-group">
                  <label>Check Interval (minutes)</label>
                  <input
                    type="number"
                    value={config.triggerSchedule.realtimeAlerts.checkIntervalMinutes}
                    onChange={(e) => handleScheduleChange('realtimeAlerts', 'checkIntervalMinutes', e.target.value)}
                    min="15"
                    max="1440"
                  />
                  <small>Minimum: 15 minutes, Maximum: 1440 minutes (24 hours)</small>
                </div>
              )}
            </div>

            <div className="schedule-card">
              <h4>Daily Summary</h4>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.triggerSchedule.dailySummary.enabled}
                    onChange={(e) => handleScheduleChange('dailySummary', 'enabled', e.target.checked)}
                  />
                  Enable Daily Summary Emails
                </label>
              </div>
              {config.triggerSchedule.dailySummary.enabled && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Time (UTC)</label>
                    <input
                      type="time"
                      value={config.triggerSchedule.dailySummary.time}
                      onChange={(e) => handleScheduleChange('dailySummary', 'time', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="schedule-card">
              <h4>Weekly Summary</h4>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.triggerSchedule.weeklySummary.enabled}
                    onChange={(e) => handleScheduleChange('weeklySummary', 'enabled', e.target.checked)}
                  />
                  Enable Weekly Summary Emails
                </label>
              </div>
              {config.triggerSchedule.weeklySummary.enabled && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Day of Week</label>
                    <select
                      value={config.triggerSchedule.weeklySummary.dayOfWeek}
                      onChange={(e) => handleScheduleChange('weeklySummary', 'dayOfWeek', e.target.value)}
                    >
                      <option>Monday</option>
                      <option>Tuesday</option>
                      <option>Wednesday</option>
                      <option>Thursday</option>
                      <option>Friday</option>
                      <option>Saturday</option>
                      <option>Sunday</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Time (UTC)</label>
                    <input
                      type="time"
                      value={config.triggerSchedule.weeklySummary.time}
                      onChange={(e) => handleScheduleChange('weeklySummary', 'time', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="schedule-card">
              <h4>Monthly Summary</h4>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.triggerSchedule.monthlySummary.enabled}
                    onChange={(e) => handleScheduleChange('monthlySummary', 'enabled', e.target.checked)}
                  />
                  Enable Monthly Summary Emails
                </label>
              </div>
              {config.triggerSchedule.monthlySummary.enabled && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Day of Month</label>
                    <input
                      type="number"
                      value={config.triggerSchedule.monthlySummary.dayOfMonth}
                      onChange={(e) => handleScheduleChange('monthlySummary', 'dayOfMonth', e.target.value)}
                      min="1"
                      max="28"
                    />
                  </div>
                  <div className="form-group">
                    <label>Time (UTC)</label>
                    <input
                      type="time"
                      value={config.triggerSchedule.monthlySummary.time}
                      onChange={(e) => handleScheduleChange('monthlySummary', 'time', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="config-footer">
        <button onClick={saveConfig} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

export default NotificationConfig;
