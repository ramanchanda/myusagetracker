const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../config/notificationConfig.json');

/**
 * Helper to get env var with LICENSE_* prefix, falling back to THRESHOLD_* for backward compatibility
 */
function getEnvWithFallback(newKey, oldKey) {
  return process.env[newKey] || process.env[oldKey];
}

// Get default configuration
// Note: License thresholds are stored in enterprise_license_config table, not here
function getDefaultConfig() {
  return {
    emailConfig: {
      enabled: false,
      provider: "mailgun",
      recipients: [],
      fromName: "Heroku Usage Monitor",
      fromEmail: ""
    },
    triggerSchedule: {
      dailySummary: {
        enabled: false,
        time: "09:00",
        timezone: "UTC"
      },
      weeklySummary: {
        enabled: false,
        dayOfWeek: "Monday",
        time: "09:00",
        timezone: "UTC"
      },
      monthlySummary: {
        enabled: false,
        dayOfMonth: 1,
        time: "09:00",
        timezone: "UTC"
      },
      realtimeAlerts: {
        enabled: true,
        checkIntervalMinutes: 60
      }
    },
    cooldownPeriod: {
      enabled: true,
      durationMinutes: 60
    },
    alertHistory: []
  };
}

// Read configuration from environment variables (Heroku Config Vars)
function getConfigFromEnv() {
  const config = getDefaultConfig();

  // Email Configuration
  if (process.env.NOTIFICATION_EMAIL_ENABLED) {
    config.emailConfig.enabled = process.env.NOTIFICATION_EMAIL_ENABLED === 'true';
  }
  if (process.env.NOTIFICATION_RECIPIENTS) {
    config.emailConfig.recipients = process.env.NOTIFICATION_RECIPIENTS.split(',').map(e => e.trim());
  }
  if (process.env.NOTIFICATION_FROM_NAME) {
    config.emailConfig.fromName = process.env.NOTIFICATION_FROM_NAME;
  }
  if (process.env.NOTIFICATION_FROM_EMAIL) {
    config.emailConfig.fromEmail = process.env.NOTIFICATION_FROM_EMAIL;
  }

  // Note: License thresholds are now stored in enterprise_license_config table
  // This config only stores notification schedule and email settings

  // Trigger Schedule - Realtime Alerts
  if (process.env.SCHEDULE_REALTIME_ENABLED) {
    config.triggerSchedule.realtimeAlerts.enabled = process.env.SCHEDULE_REALTIME_ENABLED === 'true';
  }
  if (process.env.SCHEDULE_REALTIME_INTERVAL) {
    config.triggerSchedule.realtimeAlerts.checkIntervalMinutes = parseInt(process.env.SCHEDULE_REALTIME_INTERVAL);
  }

  // Trigger Schedule - Daily Summary
  if (process.env.SCHEDULE_DAILY_ENABLED) {
    config.triggerSchedule.dailySummary.enabled = process.env.SCHEDULE_DAILY_ENABLED === 'true';
  }
  if (process.env.SCHEDULE_DAILY_TIME) {
    config.triggerSchedule.dailySummary.time = process.env.SCHEDULE_DAILY_TIME;
  }

  // Trigger Schedule - Weekly Summary
  if (process.env.SCHEDULE_WEEKLY_ENABLED) {
    config.triggerSchedule.weeklySummary.enabled = process.env.SCHEDULE_WEEKLY_ENABLED === 'true';
  }
  if (process.env.SCHEDULE_WEEKLY_DAY) {
    config.triggerSchedule.weeklySummary.dayOfWeek = process.env.SCHEDULE_WEEKLY_DAY;
  }
  if (process.env.SCHEDULE_WEEKLY_TIME) {
    config.triggerSchedule.weeklySummary.time = process.env.SCHEDULE_WEEKLY_TIME;
  }

  // Trigger Schedule - Monthly Summary
  if (process.env.SCHEDULE_MONTHLY_ENABLED) {
    config.triggerSchedule.monthlySummary.enabled = process.env.SCHEDULE_MONTHLY_ENABLED === 'true';
  }
  if (process.env.SCHEDULE_MONTHLY_DAY) {
    config.triggerSchedule.monthlySummary.dayOfMonth = parseInt(process.env.SCHEDULE_MONTHLY_DAY);
  }
  if (process.env.SCHEDULE_MONTHLY_TIME) {
    config.triggerSchedule.monthlySummary.time = process.env.SCHEDULE_MONTHLY_TIME;
  }

  return config;
}

// Read configuration (prioritize environment variables)
async function getConfig() {
  // Always read from environment variables on Heroku
  if (process.env.DYNO || process.env.USE_ENV_CONFIG === 'true') {
    console.log('Reading notification config from environment variables (Heroku Config Vars)');
    return getConfigFromEnv();
  }

  // For local development, try to read from file
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    const fileConfig = JSON.parse(data);
    console.log('Reading notification config from file (local development)');
    return fileConfig;
  } catch (error) {
    console.log('Config file not found, using defaults from environment or defaults');
    return getConfigFromEnv();
  }
}

// Generate environment variable commands from config
function generateEnvCommands(config) {
  const commands = [];

  // Email Configuration
  commands.push(`heroku config:set NOTIFICATION_EMAIL_ENABLED=${config.emailConfig.enabled}`);
  commands.push(`heroku config:set NOTIFICATION_RECIPIENTS="${config.emailConfig.recipients.join(',')}"`);
  commands.push(`heroku config:set NOTIFICATION_FROM_NAME="${config.emailConfig.fromName}"`);
  if (config.emailConfig.fromEmail) {
    commands.push(`heroku config:set NOTIFICATION_FROM_EMAIL="${config.emailConfig.fromEmail}"`);
  }

  // Note: Thresholds are now managed in enterprise_license_config table via separate API

  // Trigger Schedule - Realtime
  commands.push(`heroku config:set SCHEDULE_REALTIME_ENABLED=${config.triggerSchedule.realtimeAlerts.enabled}`);
  commands.push(`heroku config:set SCHEDULE_REALTIME_INTERVAL=${config.triggerSchedule.realtimeAlerts.checkIntervalMinutes}`);

  // Trigger Schedule - Daily
  commands.push(`heroku config:set SCHEDULE_DAILY_ENABLED=${config.triggerSchedule.dailySummary.enabled}`);
  commands.push(`heroku config:set SCHEDULE_DAILY_TIME="${config.triggerSchedule.dailySummary.time}"`);

  // Trigger Schedule - Weekly
  commands.push(`heroku config:set SCHEDULE_WEEKLY_ENABLED=${config.triggerSchedule.weeklySummary.enabled}`);
  commands.push(`heroku config:set SCHEDULE_WEEKLY_DAY="${config.triggerSchedule.weeklySummary.dayOfWeek}"`);
  commands.push(`heroku config:set SCHEDULE_WEEKLY_TIME="${config.triggerSchedule.weeklySummary.time}"`);

  // Trigger Schedule - Monthly
  commands.push(`heroku config:set SCHEDULE_MONTHLY_ENABLED=${config.triggerSchedule.monthlySummary.enabled}`);
  commands.push(`heroku config:set SCHEDULE_MONTHLY_DAY=${config.triggerSchedule.monthlySummary.dayOfMonth}`);
  commands.push(`heroku config:set SCHEDULE_MONTHLY_TIME="${config.triggerSchedule.monthlySummary.time}"`);

  return commands;
}

// Update configuration
async function updateConfig(newConfig) {
  // On Heroku, just return the config
  // Configuration must be set via Heroku Config Vars to persist
  if (process.env.DYNO || process.env.USE_ENV_CONFIG === 'true') {
    console.log('Heroku environment detected - configuration is read from Config Vars');
    console.log('To persist changes, set Config Vars via Heroku Dashboard or CLI');
    return newConfig;
  }

  // For local development, write to file
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
    return newConfig;
  } catch (error) {
    console.error('Error updating config:', error);
    throw new Error('Failed to update notification configuration');
  }
}

// Get email configuration
async function getEmailConfig() {
  const config = await getConfig();
  return config.emailConfig;
}

// Update email configuration
async function updateEmailConfig(emailConfig) {
  const config = await getConfig();
  config.emailConfig = { ...config.emailConfig, ...emailConfig };
  await updateConfig(config);
  return config.emailConfig;
}

// Note: Threshold functions removed - use enterprise_license_config table instead
// See enterpriseLicenseService.js for license limit management

// Get trigger schedule
async function getTriggerSchedule() {
  const config = await getConfig();
  return config.triggerSchedule;
}

// Update trigger schedule
async function updateTriggerSchedule(triggerSchedule) {
  const config = await getConfig();
  config.triggerSchedule = { ...config.triggerSchedule, ...triggerSchedule };
  await updateConfig(config);
  return config.triggerSchedule;
}

// Add alert to history
async function addAlertToHistory(alert) {
  const config = await getConfig();
  const alertEntry = {
    ...alert,
    timestamp: new Date().toISOString(),
    id: Date.now().toString()
  };

  config.alertHistory = config.alertHistory || [];
  config.alertHistory.unshift(alertEntry);

  // Keep only last 100 alerts
  if (config.alertHistory.length > 100) {
    config.alertHistory = config.alertHistory.slice(0, 100);
  }

  await updateConfig(config);
  return alertEntry;
}

// Get alert history
async function getAlertHistory(limit = 50) {
  const config = await getConfig();
  return (config.alertHistory || []).slice(0, limit);
}

// Clear alert history
async function clearAlertHistory() {
  const config = await getConfig();
  config.alertHistory = [];
  await updateConfig(config);
  return { success: true };
}

module.exports = {
  getConfig,
  updateConfig,
  getEmailConfig,
  updateEmailConfig,
  getTriggerSchedule,
  updateTriggerSchedule,
  addAlertToHistory,
  getAlertHistory,
  clearAlertHistory,
  generateEnvCommands
};
