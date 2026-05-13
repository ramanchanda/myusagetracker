const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../config/notificationConfig.json');

// Read configuration
async function getConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading config:', error);
    throw new Error('Failed to read notification configuration');
  }
}

// Update configuration
async function updateConfig(newConfig) {
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
  clearAlertHistory
};
