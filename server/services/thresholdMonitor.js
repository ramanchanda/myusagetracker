const configService = require('./configService');
const notificationService = require('./notificationService');
const enterpriseUsageService = require('./enterpriseUsageService');

// Track last alert times to prevent spam
const lastAlertTimes = {};
const ALERT_COOLDOWN_MS = 3600000; // 1 hour

// Check if cooldown period has passed
function canSendAlert(resourceType, severity) {
  const key = `${resourceType}_${severity}`;
  const lastTime = lastAlertTimes[key];

  if (!lastTime) {
    return true;
  }

  const elapsed = Date.now() - lastTime;
  return elapsed >= ALERT_COOLDOWN_MS;
}

// Update last alert time
function recordAlert(resourceType, severity) {
  const key = `${resourceType}_${severity}`;
  lastAlertTimes[key] = Date.now();
}

// Check single resource threshold
async function checkResourceThreshold(resourceType, currentValue, threshold) {
  if (!threshold.enabled || !threshold.limit) {
    return null;
  }

  const percentUsed = (currentValue / threshold.limit) * 100;
  let severity = null;

  if (percentUsed >= threshold.criticalPercentage) {
    severity = 'critical';
  } else if (percentUsed >= threshold.warningPercentage) {
    severity = 'warning';
  }

  if (severity && canSendAlert(resourceType, severity)) {
    console.log(`Threshold exceeded for ${resourceType}: ${percentUsed.toFixed(1)}% (${severity})`);

    try {
      await notificationService.sendThresholdAlert(resourceType, currentValue, threshold, severity);
      recordAlert(resourceType, severity);
      return {
        resourceType,
        currentValue,
        limit: threshold.limit,
        percentUsed: percentUsed.toFixed(1),
        severity,
        alerted: true
      };
    } catch (error) {
      console.error(`Failed to send alert for ${resourceType}:`, error.message);
      return {
        resourceType,
        currentValue,
        limit: threshold.limit,
        percentUsed: percentUsed.toFixed(1),
        severity,
        alerted: false,
        error: error.message
      };
    }
  }

  return null;
}

// Monitor all thresholds for enterprise account
async function monitorEnterpriseThresholds(month = null) {
  try {
    const config = await configService.getConfig();
    const thresholds = config.thresholds;

    // Fetch current usage data
    const structure = await enterpriseUsageService.getEnterpriseStructure(month);

    if (!structure || !structure.resources) {
      console.log('No usage data available for monitoring');
      return { checked: false, reason: 'No usage data available' };
    }

    const alerts = [];
    const resources = structure.resources;

    // Check Dyno Units
    if (thresholds.dynoUnits.enabled && resources.dynos) {
      const alert = await checkResourceThreshold(
        'Dyno Units',
        resources.dynos.count,
        thresholds.dynoUnits
      );
      if (alert) alerts.push(alert);
    }

    // Check Connect Rows
    if (thresholds.connectRows.enabled && resources.connect) {
      const alert = await checkResourceThreshold(
        'Connect Rows',
        resources.connect.used,
        thresholds.connectRows
      );
      if (alert) alerts.push(alert);
    }

    // Check Data Add-ons
    if (thresholds.dataAddons.enabled && resources.dataAddons) {
      const alert = await checkResourceThreshold(
        'Data Add-ons',
        resources.dataAddons.count,
        thresholds.dataAddons
      );
      if (alert) alerts.push(alert);
    }

    // Check General Add-ons
    if (thresholds.generalAddons.enabled && resources.otherAddons) {
      const alert = await checkResourceThreshold(
        'General Add-ons',
        resources.otherAddons.count,
        thresholds.generalAddons
      );
      if (alert) alerts.push(alert);
    }

    // Check Private Spaces
    if (thresholds.privateSpaces.enabled && typeof resources.privateSpaces === 'number') {
      const alert = await checkResourceThreshold(
        'Private Spaces',
        resources.privateSpaces,
        thresholds.privateSpaces
      );
      if (alert) alerts.push(alert);
    }

    // Check Shield Spaces
    if (thresholds.shieldSpaces.enabled && typeof resources.shieldSpaces === 'number') {
      const alert = await checkResourceThreshold(
        'Shield Spaces',
        resources.shieldSpaces,
        thresholds.shieldSpaces
      );
      if (alert) alerts.push(alert);
    }

    return {
      checked: true,
      timestamp: new Date().toISOString(),
      alertsTriggered: alerts.length,
      alerts
    };
  } catch (error) {
    console.error('Error monitoring thresholds:', error);
    return {
      checked: false,
      error: error.message
    };
  }
}

// Send usage summary report
async function sendScheduledSummary(period = 'daily') {
  try {
    const structure = await enterpriseUsageService.getEnterpriseStructure();

    if (!structure || !structure.resources) {
      console.log('No usage data available for summary');
      return { sent: false, reason: 'No usage data available' };
    }

    const resources = structure.resources;
    const thresholds = await configService.getThresholds();

    const summaryData = {
      resources: {
        dynoUnits: {
          label: 'Dyno Units',
          current: resources.dynos?.count || 0,
          limit: thresholds.dynoUnits.limit,
          percentage: thresholds.dynoUnits.limit > 0
            ? ((resources.dynos?.count || 0) / thresholds.dynoUnits.limit) * 100
            : 0
        },
        connectRows: {
          label: 'Connect Rows',
          current: resources.connect?.used || 0,
          limit: thresholds.connectRows.limit,
          percentage: thresholds.connectRows.limit > 0
            ? ((resources.connect?.used || 0) / thresholds.connectRows.limit) * 100
            : 0
        },
        dataAddons: {
          label: 'Data Add-ons',
          current: resources.dataAddons?.count || 0,
          limit: thresholds.dataAddons.limit,
          percentage: thresholds.dataAddons.limit > 0
            ? ((resources.dataAddons?.count || 0) / thresholds.dataAddons.limit) * 100
            : 0
        },
        generalAddons: {
          label: 'General Add-ons',
          current: resources.otherAddons?.count || 0,
          limit: thresholds.generalAddons.limit,
          percentage: thresholds.generalAddons.limit > 0
            ? ((resources.otherAddons?.count || 0) / thresholds.generalAddons.limit) * 100
            : 0
        },
        privateSpaces: {
          label: 'Private Spaces',
          current: resources.privateSpaces || 0,
          limit: thresholds.privateSpaces.limit,
          percentage: thresholds.privateSpaces.limit > 0
            ? ((resources.privateSpaces || 0) / thresholds.privateSpaces.limit) * 100
            : 0
        },
        shieldSpaces: {
          label: 'Shield Spaces',
          current: resources.shieldSpaces || 0,
          limit: thresholds.shieldSpaces.limit,
          percentage: thresholds.shieldSpaces.limit > 0
            ? ((resources.shieldSpaces || 0) / thresholds.shieldSpaces.limit) * 100
            : 0
        }
      },
      totalCost: resources.totalCost || 0
    };

    return await notificationService.sendUsageSummary(summaryData, period);
  } catch (error) {
    console.error('Error sending scheduled summary:', error);
    return { sent: false, error: error.message };
  }
}

module.exports = {
  monitorEnterpriseThresholds,
  sendScheduledSummary,
  checkResourceThreshold
};
