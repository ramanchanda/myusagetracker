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
function getDefaultConfig() {
  return {
    emailConfig: {
      enabled: false,
      provider: "mailgun",
      recipients: [],
      fromName: "Heroku Usage Monitor",
      fromEmail: ""
    },
    thresholds: {
      dynoUnits: {
        enabled: true,
        limit: 1000,
        warningPercentage: 80,
        criticalPercentage: 95
      },
      connectRows: {
        enabled: true,
        limit: 10000,
        warningPercentage: 80,
        criticalPercentage: 95
      },
      dataAddons: {
        enabled: true,
        limit: 500,
        warningPercentage: 80,
        criticalPercentage: 95
      },
      generalAddons: {
        enabled: true,
        limit: 300,
        warningPercentage: 80,
        criticalPercentage: 95
      },
      privateSpaces: {
        enabled: true,
        limit: 5,
        warningPercentage: 80,
        criticalPercentage: 100
      },
      shieldSpaces: {
        enabled: true,
        limit: 3,
        warningPercentage: 80,
        criticalPercentage: 100
      }
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

  // Global License Utilization Percentages (apply to all resources)
  // Support both LICENSE_* (new) and THRESHOLD_* (legacy) prefixes
  const globalWarning = getEnvWithFallback('LICENSE_WARNING_PERCENTAGE', 'THRESHOLD_WARNING_PERCENTAGE')
    ? parseInt(getEnvWithFallback('LICENSE_WARNING_PERCENTAGE', 'THRESHOLD_WARNING_PERCENTAGE'))
    : 80;
  const globalCritical = getEnvWithFallback('LICENSE_CRITICAL_PERCENTAGE', 'THRESHOLD_CRITICAL_PERCENTAGE')
    ? parseInt(getEnvWithFallback('LICENSE_CRITICAL_PERCENTAGE', 'THRESHOLD_CRITICAL_PERCENTAGE'))
    : 95;

  // Apply global percentages to all resources
  Object.keys(config.thresholds).forEach(resource => {
    config.thresholds[resource].warningPercentage = globalWarning;
    config.thresholds[resource].criticalPercentage = globalCritical;
  });

  // License Limits - Dyno Units (with backward compatibility)
  const dynoEnabled = getEnvWithFallback('LICENSE_DYNO_UNITS_ENABLED', 'THRESHOLD_DYNO_ENABLED');
  if (dynoEnabled) {
    config.thresholds.dynoUnits.enabled = dynoEnabled === 'true';
  }
  const dynoLimit = getEnvWithFallback('LICENSE_DYNO_UNITS_LIMIT', 'THRESHOLD_DYNO_LIMIT');
  if (dynoLimit) {
    config.thresholds.dynoUnits.limit = parseInt(dynoLimit);
  }

  // License Limits - Connect Rows
  const connectEnabled = getEnvWithFallback('LICENSE_CONNECT_ROWS_ENABLED', 'THRESHOLD_CONNECT_ENABLED');
  if (connectEnabled) {
    config.thresholds.connectRows.enabled = connectEnabled === 'true';
  }
  const connectLimit = getEnvWithFallback('LICENSE_CONNECT_ROWS_LIMIT', 'THRESHOLD_CONNECT_LIMIT');
  if (connectLimit) {
    config.thresholds.connectRows.limit = parseInt(connectLimit);
  }

  // License Limits - Data Addons
  const dataAddonsEnabled = getEnvWithFallback('LICENSE_DATA_ADDONS_ENABLED', 'THRESHOLD_DATA_ADDONS_ENABLED');
  if (dataAddonsEnabled) {
    config.thresholds.dataAddons.enabled = dataAddonsEnabled === 'true';
  }
  const dataAddonsLimit = getEnvWithFallback('LICENSE_DATA_ADDONS_LIMIT', 'THRESHOLD_DATA_ADDONS_LIMIT');
  if (dataAddonsLimit) {
    config.thresholds.dataAddons.limit = parseInt(dataAddonsLimit);
  }

  // License Limits - General Addons
  const generalAddonsEnabled = getEnvWithFallback('LICENSE_GENERAL_ADDONS_ENABLED', 'THRESHOLD_GENERAL_ADDONS_ENABLED');
  if (generalAddonsEnabled) {
    config.thresholds.generalAddons.enabled = generalAddonsEnabled === 'true';
  }
  const generalAddonsLimit = getEnvWithFallback('LICENSE_GENERAL_ADDONS_LIMIT', 'THRESHOLD_GENERAL_ADDONS_LIMIT');
  if (generalAddonsLimit) {
    config.thresholds.generalAddons.limit = parseInt(generalAddonsLimit);
  }

  // License Limits - Private Spaces
  const privateSpacesEnabled = getEnvWithFallback('LICENSE_PRIVATE_SPACES_ENABLED', 'THRESHOLD_PRIVATE_SPACES_ENABLED');
  if (privateSpacesEnabled) {
    config.thresholds.privateSpaces.enabled = privateSpacesEnabled === 'true';
  }
  const privateSpacesLimit = getEnvWithFallback('LICENSE_PRIVATE_SPACES_LIMIT', 'THRESHOLD_PRIVATE_SPACES_LIMIT');
  if (privateSpacesLimit) {
    config.thresholds.privateSpaces.limit = parseInt(privateSpacesLimit);
  }

  // License Limits - Shield Spaces
  const shieldSpacesEnabled = getEnvWithFallback('LICENSE_SHIELD_SPACES_ENABLED', 'THRESHOLD_SHIELD_SPACES_ENABLED');
  if (shieldSpacesEnabled) {
    config.thresholds.shieldSpaces.enabled = shieldSpacesEnabled === 'true';
  }
  const shieldSpacesLimit = getEnvWithFallback('LICENSE_SHIELD_SPACES_LIMIT', 'THRESHOLD_SHIELD_SPACES_LIMIT');
  if (shieldSpacesLimit) {
    config.thresholds.shieldSpaces.limit = parseInt(shieldSpacesLimit);
  }

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

  // Thresholds - Dyno Units
  commands.push(`heroku config:set THRESHOLD_DYNO_ENABLED=${config.thresholds.dynoUnits.enabled}`);
  commands.push(`heroku config:set THRESHOLD_DYNO_LIMIT=${config.thresholds.dynoUnits.limit}`);
  commands.push(`heroku config:set THRESHOLD_DYNO_WARNING=${config.thresholds.dynoUnits.warningPercentage}`);
  commands.push(`heroku config:set THRESHOLD_DYNO_CRITICAL=${config.thresholds.dynoUnits.criticalPercentage}`);

  // Thresholds - Connect Rows
  commands.push(`heroku config:set THRESHOLD_CONNECT_ENABLED=${config.thresholds.connectRows.enabled}`);
  commands.push(`heroku config:set THRESHOLD_CONNECT_LIMIT=${config.thresholds.connectRows.limit}`);
  commands.push(`heroku config:set THRESHOLD_CONNECT_WARNING=${config.thresholds.connectRows.warningPercentage}`);
  commands.push(`heroku config:set THRESHOLD_CONNECT_CRITICAL=${config.thresholds.connectRows.criticalPercentage}`);

  // Thresholds - Data Addons
  commands.push(`heroku config:set THRESHOLD_DATA_ADDONS_ENABLED=${config.thresholds.dataAddons.enabled}`);
  commands.push(`heroku config:set THRESHOLD_DATA_ADDONS_LIMIT=${config.thresholds.dataAddons.limit}`);
  commands.push(`heroku config:set THRESHOLD_DATA_ADDONS_WARNING=${config.thresholds.dataAddons.warningPercentage}`);
  commands.push(`heroku config:set THRESHOLD_DATA_ADDONS_CRITICAL=${config.thresholds.dataAddons.criticalPercentage}`);

  // Thresholds - General Addons
  commands.push(`heroku config:set THRESHOLD_GENERAL_ADDONS_ENABLED=${config.thresholds.generalAddons.enabled}`);
  commands.push(`heroku config:set THRESHOLD_GENERAL_ADDONS_LIMIT=${config.thresholds.generalAddons.limit}`);
  commands.push(`heroku config:set THRESHOLD_GENERAL_ADDONS_WARNING=${config.thresholds.generalAddons.warningPercentage}`);
  commands.push(`heroku config:set THRESHOLD_GENERAL_ADDONS_CRITICAL=${config.thresholds.generalAddons.criticalPercentage}`);

  // Thresholds - Private Spaces
  commands.push(`heroku config:set THRESHOLD_PRIVATE_SPACES_ENABLED=${config.thresholds.privateSpaces.enabled}`);
  commands.push(`heroku config:set THRESHOLD_PRIVATE_SPACES_LIMIT=${config.thresholds.privateSpaces.limit}`);
  commands.push(`heroku config:set THRESHOLD_PRIVATE_SPACES_WARNING=${config.thresholds.privateSpaces.warningPercentage}`);
  commands.push(`heroku config:set THRESHOLD_PRIVATE_SPACES_CRITICAL=${config.thresholds.privateSpaces.criticalPercentage}`);

  // Thresholds - Shield Spaces
  commands.push(`heroku config:set THRESHOLD_SHIELD_SPACES_ENABLED=${config.thresholds.shieldSpaces.enabled}`);
  commands.push(`heroku config:set THRESHOLD_SHIELD_SPACES_LIMIT=${config.thresholds.shieldSpaces.limit}`);
  commands.push(`heroku config:set THRESHOLD_SHIELD_SPACES_WARNING=${config.thresholds.shieldSpaces.warningPercentage}`);
  commands.push(`heroku config:set THRESHOLD_SHIELD_SPACES_CRITICAL=${config.thresholds.shieldSpaces.criticalPercentage}`);

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

// Get thresholds
async function getThresholds() {
  const config = await getConfig();
  return config.thresholds;
}

// Update thresholds
async function updateThresholds(thresholds) {
  const config = await getConfig();
  config.thresholds = { ...config.thresholds, ...thresholds };
  await updateConfig(config);
  return config.thresholds;
}

// Update single threshold
async function updateThreshold(resourceType, thresholdConfig) {
  const config = await getConfig();
  if (!config.thresholds[resourceType]) {
    throw new Error(`Invalid resource type: ${resourceType}`);
  }
  config.thresholds[resourceType] = { ...config.thresholds[resourceType], ...thresholdConfig };
  await updateConfig(config);
  return config.thresholds[resourceType];
}

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
  getThresholds,
  updateThresholds,
  updateThreshold,
  getTriggerSchedule,
  updateTriggerSchedule,
  addAlertToHistory,
  getAlertHistory,
  clearAlertHistory,
  generateEnvCommands
};
