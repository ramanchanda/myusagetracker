/**
 * Configuration Service - Optimized & Clean
 *
 * Manages notification configuration from:
 * 1. Heroku Config Vars (production)
 * 2. Local JSON file (development)
 *
 * Features:
 * - DRY (Don't Repeat Yourself) principle
 * - Easy to add new resources
 * - Validation
 * - Caching
 * - Clean structure
 */

const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../config/notificationConfig.json');

// Cache configuration (expires after 5 minutes)
let configCache = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const RESOURCE_TYPES = [
  'dynoUnits',
  'connectRows',
  'dataAddons',
  'generalAddons',
  'privateSpaces',
  'shieldSpaces'
];

function getDefaultConfig() {
  return {
    emailConfig: {
      enabled: false,
      provider: "mailgun",
      recipients: [],
      fromName: "Heroku Usage Monitor",
      fromEmail: ""
    },
    thresholds: buildDefaultThresholds(),
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

function buildDefaultThresholds() {
  const defaults = {
    dynoUnits: { limit: 1000, criticalPercentage: 95 },
    connectRows: { limit: 10000, criticalPercentage: 95 },
    dataAddons: { limit: 500, criticalPercentage: 95 },
    generalAddons: { limit: 300, criticalPercentage: 95 },
    privateSpaces: { limit: 5, criticalPercentage: 100 },
    shieldSpaces: { limit: 3, criticalPercentage: 100 }
  };

  const thresholds = {};

  for (const [key, values] of Object.entries(defaults)) {
    thresholds[key] = {
      enabled: true,
      limit: values.limit,
      warningPercentage: 80,
      criticalPercentage: values.criticalPercentage
    };
  }

  return thresholds;
}

// ============================================
// ENVIRONMENT VARIABLE HELPERS
// ============================================

/**
 * Get boolean from environment variable
 */
function getEnvBool(key, defaultValue = false) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * Get integer from environment variable
 */
function getEnvInt(key, defaultValue = 0) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get string from environment variable
 */
function getEnvString(key, defaultValue = '') {
  return process.env[key] || defaultValue;
}

/**
 * Get array from comma-separated environment variable
 */
function getEnvArray(key, defaultValue = []) {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

// ============================================
// CONFIGURATION READERS
// ============================================

/**
 * Read email configuration from environment
 */
function getEmailConfigFromEnv(config) {
  config.emailConfig.enabled = getEnvBool('NOTIFICATION_EMAIL_ENABLED', config.emailConfig.enabled);
  config.emailConfig.recipients = getEnvArray('NOTIFICATION_RECIPIENTS', config.emailConfig.recipients);
  config.emailConfig.fromName = getEnvString('NOTIFICATION_FROM_NAME', config.emailConfig.fromName);
  config.emailConfig.fromEmail = getEnvString('NOTIFICATION_FROM_EMAIL', config.emailConfig.fromEmail);
}

/**
 * Read thresholds from environment
 * Supports both global and per-resource configuration
 */
function getThresholdsFromEnv(config) {
  // Global threshold percentages (apply to all resources)
  const globalWarning = getEnvInt('THRESHOLD_WARNING_PERCENTAGE', 80);
  const globalCritical = getEnvInt('THRESHOLD_CRITICAL_PERCENTAGE', 95);

  // Apply global percentages to all resources first
  for (const resource of RESOURCE_TYPES) {
    config.thresholds[resource].warningPercentage = globalWarning;
    config.thresholds[resource].criticalPercentage = globalCritical;
  }

  // Per-resource configuration
  const resourceEnvMap = {
    dynoUnits: 'DYNO',
    connectRows: 'CONNECT',
    dataAddons: 'DATA_ADDONS',
    generalAddons: 'GENERAL_ADDONS',
    privateSpaces: 'PRIVATE_SPACES',
    shieldSpaces: 'SHIELD_SPACES'
  };

  for (const [resource, envPrefix] of Object.entries(resourceEnvMap)) {
    const enabled = getEnvBool(`THRESHOLD_${envPrefix}_ENABLED`);
    const limit = getEnvInt(`THRESHOLD_${envPrefix}_LIMIT`);
    const warning = getEnvInt(`THRESHOLD_${envPrefix}_WARNING`);
    const critical = getEnvInt(`THRESHOLD_${envPrefix}_CRITICAL`);

    if (enabled !== undefined) {
      config.thresholds[resource].enabled = enabled;
    }
    if (limit > 0) {
      config.thresholds[resource].limit = limit;
    }
    if (warning > 0) {
      config.thresholds[resource].warningPercentage = warning;
    }
    if (critical > 0) {
      config.thresholds[resource].criticalPercentage = critical;
    }
  }
}

/**
 * Read trigger schedule from environment
 */
function getTriggerScheduleFromEnv(config) {
  // Realtime Alerts
  config.triggerSchedule.realtimeAlerts.enabled = getEnvBool(
    'SCHEDULE_REALTIME_ENABLED',
    config.triggerSchedule.realtimeAlerts.enabled
  );
  config.triggerSchedule.realtimeAlerts.checkIntervalMinutes = getEnvInt(
    'SCHEDULE_REALTIME_INTERVAL',
    config.triggerSchedule.realtimeAlerts.checkIntervalMinutes
  );

  // Daily Summary
  config.triggerSchedule.dailySummary.enabled = getEnvBool(
    'SCHEDULE_DAILY_ENABLED',
    config.triggerSchedule.dailySummary.enabled
  );
  config.triggerSchedule.dailySummary.time = getEnvString(
    'SCHEDULE_DAILY_TIME',
    config.triggerSchedule.dailySummary.time
  );

  // Weekly Summary
  config.triggerSchedule.weeklySummary.enabled = getEnvBool(
    'SCHEDULE_WEEKLY_ENABLED',
    config.triggerSchedule.weeklySummary.enabled
  );
  config.triggerSchedule.weeklySummary.dayOfWeek = getEnvString(
    'SCHEDULE_WEEKLY_DAY',
    config.triggerSchedule.weeklySummary.dayOfWeek
  );
  config.triggerSchedule.weeklySummary.time = getEnvString(
    'SCHEDULE_WEEKLY_TIME',
    config.triggerSchedule.weeklySummary.time
  );

  // Monthly Summary
  config.triggerSchedule.monthlySummary.enabled = getEnvBool(
    'SCHEDULE_MONTHLY_ENABLED',
    config.triggerSchedule.monthlySummary.enabled
  );
  config.triggerSchedule.monthlySummary.dayOfMonth = getEnvInt(
    'SCHEDULE_MONTHLY_DAY',
    config.triggerSchedule.monthlySummary.dayOfMonth
  );
  config.triggerSchedule.monthlySummary.time = getEnvString(
    'SCHEDULE_MONTHLY_TIME',
    config.triggerSchedule.monthlySummary.time
  );
}

/**
 * Read complete configuration from environment variables
 */
function getConfigFromEnv() {
  const config = getDefaultConfig();

  getEmailConfigFromEnv(config);
  getThresholdsFromEnv(config);
  getTriggerScheduleFromEnv(config);

  return config;
}

// ============================================
// MAIN CONFIGURATION FUNCTIONS
// ============================================

/**
 * Detect if running on Heroku
 */
function isHeroku() {
  return !!(process.env.DYNO || process.env.USE_ENV_CONFIG === 'true');
}

/**
 * Read configuration (prioritize environment variables)
 * Uses caching to avoid frequent file reads
 */
async function getConfig(skipCache = false) {
  // Check cache
  if (!skipCache && configCache && Date.now() < cacheExpiry) {
    return configCache;
  }

  let config;

  // Heroku: Always read from environment variables
  if (isHeroku()) {
    console.log('[Config] Reading from environment variables (Heroku)');
    config = getConfigFromEnv();
  } else {
    // Local: Try file first, fallback to environment
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf8');
      config = JSON.parse(data);
      console.log('[Config] Reading from file (local)');
    } catch (error) {
      console.log('[Config] File not found, using environment/defaults');
      config = getConfigFromEnv();
    }
  }

  // Cache the configuration
  configCache = config;
  cacheExpiry = Date.now() + CACHE_TTL;

  return config;
}

/**
 * Update configuration
 * On Heroku: returns config (changes must be made via Config Vars)
 * Locally: writes to file
 */
async function updateConfig(newConfig) {
  // Clear cache
  configCache = null;
  cacheExpiry = 0;

  if (isHeroku()) {
    console.log('[Config] Heroku detected - config is read-only');
    console.log('[Config] To persist: Set Config Vars via Heroku Dashboard or CLI');
    return newConfig;
  }

  // Local: write to file
  try {
    // Ensure config directory exists
    const configDir = path.dirname(CONFIG_FILE);
    await fs.mkdir(configDir, { recursive: true });

    await fs.writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
    console.log('[Config] Configuration saved to file');
    return newConfig;
  } catch (error) {
    console.error('[Config] Error updating config:', error);
    throw new Error('Failed to update notification configuration');
  }
}

/**
 * Clear configuration cache
 */
function clearCache() {
  configCache = null;
  cacheExpiry = 0;
}

// ============================================
// SPECIFIC CONFIGURATION GETTERS/SETTERS
// ============================================

async function getEmailConfig() {
  const config = await getConfig();
  return config.emailConfig;
}

async function updateEmailConfig(emailConfig) {
  const config = await getConfig();
  config.emailConfig = { ...config.emailConfig, ...emailConfig };
  await updateConfig(config);
  return config.emailConfig;
}

async function getThresholds() {
  const config = await getConfig();
  return config.thresholds;
}

async function updateThresholds(thresholds) {
  const config = await getConfig();
  config.thresholds = { ...config.thresholds, ...thresholds };
  await updateConfig(config);
  return config.thresholds;
}

async function updateThreshold(resourceType, thresholdConfig) {
  const config = await getConfig();

  if (!config.thresholds[resourceType]) {
    throw new Error(`Invalid resource type: ${resourceType}. Valid types: ${RESOURCE_TYPES.join(', ')}`);
  }

  config.thresholds[resourceType] = {
    ...config.thresholds[resourceType],
    ...thresholdConfig
  };

  await updateConfig(config);
  return config.thresholds[resourceType];
}

async function getTriggerSchedule() {
  const config = await getConfig();
  return config.triggerSchedule;
}

async function updateTriggerSchedule(triggerSchedule) {
  const config = await getConfig();
  config.triggerSchedule = { ...config.triggerSchedule, ...triggerSchedule };
  await updateConfig(config);
  return config.triggerSchedule;
}

// ============================================
// ALERT HISTORY
// ============================================

async function addAlertToHistory(alert) {
  const config = await getConfig();

  const alertEntry = {
    ...alert,
    timestamp: alert.timestamp || new Date().toISOString(),
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
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

async function getAlertHistory(limit = 50) {
  const config = await getConfig();
  return (config.alertHistory || []).slice(0, limit);
}

async function clearAlertHistory() {
  const config = await getConfig();
  config.alertHistory = [];
  await updateConfig(config);
  return { success: true, cleared: true };
}

// ============================================
// ENVIRONMENT VARIABLE GENERATOR
// ============================================

/**
 * Generate Heroku CLI commands to set config vars
 * Useful for migration and documentation
 */
function generateEnvCommands(config) {
  const commands = [];

  // Email Configuration
  commands.push(`# Email Configuration`);
  commands.push(`heroku config:set NOTIFICATION_EMAIL_ENABLED=${config.emailConfig.enabled}`);
  commands.push(`heroku config:set NOTIFICATION_RECIPIENTS="${config.emailConfig.recipients.join(',')}"`);
  commands.push(`heroku config:set NOTIFICATION_FROM_NAME="${config.emailConfig.fromName}"`);
  if (config.emailConfig.fromEmail) {
    commands.push(`heroku config:set NOTIFICATION_FROM_EMAIL="${config.emailConfig.fromEmail}"`);
  }
  commands.push('');

  // Global Thresholds
  commands.push(`# Global Threshold Percentages`);
  commands.push(`heroku config:set THRESHOLD_WARNING_PERCENTAGE=80`);
  commands.push(`heroku config:set THRESHOLD_CRITICAL_PERCENTAGE=95`);
  commands.push('');

  // Per-Resource Thresholds
  const resourceEnvMap = {
    dynoUnits: 'DYNO',
    connectRows: 'CONNECT',
    dataAddons: 'DATA_ADDONS',
    generalAddons: 'GENERAL_ADDONS',
    privateSpaces: 'PRIVATE_SPACES',
    shieldSpaces: 'SHIELD_SPACES'
  };

  for (const [resource, envPrefix] of Object.entries(resourceEnvMap)) {
    const threshold = config.thresholds[resource];
    commands.push(`# ${resource}`);
    commands.push(`heroku config:set THRESHOLD_${envPrefix}_ENABLED=${threshold.enabled}`);
    commands.push(`heroku config:set THRESHOLD_${envPrefix}_LIMIT=${threshold.limit}`);
    commands.push('');
  }

  // Trigger Schedule
  commands.push(`# Trigger Schedule`);
  commands.push(`heroku config:set SCHEDULE_REALTIME_ENABLED=${config.triggerSchedule.realtimeAlerts.enabled}`);
  commands.push(`heroku config:set SCHEDULE_DAILY_ENABLED=${config.triggerSchedule.dailySummary.enabled}`);
  commands.push(`heroku config:set SCHEDULE_DAILY_TIME="${config.triggerSchedule.dailySummary.time}"`);
  commands.push(`heroku config:set SCHEDULE_WEEKLY_ENABLED=${config.triggerSchedule.weeklySummary.enabled}`);
  commands.push(`heroku config:set SCHEDULE_MONTHLY_ENABLED=${config.triggerSchedule.monthlySummary.enabled}`);

  return commands;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate configuration
 */
function validateConfig(config) {
  const errors = [];

  // Validate email config
  if (config.emailConfig.enabled && config.emailConfig.recipients.length === 0) {
    errors.push('Email enabled but no recipients configured');
  }

  // Validate thresholds
  for (const [resource, threshold] of Object.entries(config.thresholds)) {
    if (threshold.limit <= 0) {
      errors.push(`${resource}: limit must be greater than 0`);
    }
    if (threshold.warningPercentage < 0 || threshold.warningPercentage > 100) {
      errors.push(`${resource}: warningPercentage must be between 0-100`);
    }
    if (threshold.criticalPercentage < 0 || threshold.criticalPercentage > 100) {
      errors.push(`${resource}: criticalPercentage must be between 0-100`);
    }
    if (threshold.warningPercentage >= threshold.criticalPercentage) {
      errors.push(`${resource}: warningPercentage must be less than criticalPercentage`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Main functions
  getConfig,
  updateConfig,
  clearCache,

  // Email
  getEmailConfig,
  updateEmailConfig,

  // Thresholds
  getThresholds,
  updateThresholds,
  updateThreshold,

  // Schedule
  getTriggerSchedule,
  updateTriggerSchedule,

  // Alert History
  addAlertToHistory,
  getAlertHistory,
  clearAlertHistory,

  // Utilities
  generateEnvCommands,
  validateConfig,
  isHeroku,

  // Constants
  RESOURCE_TYPES
};
