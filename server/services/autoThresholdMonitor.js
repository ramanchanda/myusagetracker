/**
 * Automatic Threshold Monitor
 *
 * Monitors thresholds in real-time whenever usage data is fetched.
 * No scheduler needed - triggers on data access.
 */

const configService = require('./configService');
const notificationService = require('./notificationService');

// Track last alert times to prevent spam
const lastAlertTimes = {};
const ALERT_COOLDOWN_MS = 3600000; // 1 hour

// Track last checked values to detect changes
const lastCheckedValues = {};

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

// Check if value has significantly changed (to avoid redundant checks)
function hasValueChanged(resourceType, currentValue) {
  const lastValue = lastCheckedValues[resourceType];

  if (lastValue === undefined) {
    lastCheckedValues[resourceType] = currentValue;
    return true; // First time checking
  }

  // Consider changed if difference > 5%
  const percentDiff = Math.abs((currentValue - lastValue) / lastValue) * 100;

  if (percentDiff > 5) {
    lastCheckedValues[resourceType] = currentValue;
    return true;
  }

  return false;
}

// Determine severity based on usage percentage
function getSeverity(percentUsed, threshold) {
  if (percentUsed >= 100) {
    return 'critical'; // 100% - limit reached
  } else if (percentUsed >= threshold.criticalPercentage) {
    return 'critical'; // 95% by default
  } else if (percentUsed >= threshold.warningPercentage) {
    return 'warning'; // 80% by default
  }
  return null;
}

// Check single resource threshold and send alert if needed
async function checkResourceThreshold(resourceType, currentValue, threshold) {
  if (!threshold.enabled || !threshold.limit) {
    return null;
  }

  const percentUsed = (currentValue / threshold.limit) * 100;
  const severity = getSeverity(percentUsed, threshold);

  if (severity && canSendAlert(resourceType, severity)) {
    console.log(`[Auto Monitor] Threshold exceeded for ${resourceType}: ${percentUsed.toFixed(1)}% (${severity})`);

    try {
      await notificationService.sendThresholdAlert(resourceType, currentValue, threshold, severity);
      recordAlert(resourceType, severity);

      // Log to alert history
      await configService.addAlertToHistory({
        timestamp: new Date().toISOString(),
        resourceType,
        severity,
        message: `${resourceType} usage at ${percentUsed.toFixed(1)}% (${currentValue}/${threshold.limit})`
      });

      return {
        resourceType,
        currentValue,
        limit: threshold.limit,
        percentUsed: percentUsed.toFixed(1),
        severity,
        alerted: true
      };
    } catch (error) {
      console.error(`[Auto Monitor] Failed to send alert for ${resourceType}:`, error.message);
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

/**
 * Automatically check thresholds for usage data
 * Called whenever usage data is fetched
 *
 * @param {Object} usageData - Structure with resources data
 * @returns {Promise<Object>} - Alert results
 */
async function autoCheckThresholds(usageData) {
  try {
    // Get configuration
    const config = await configService.getConfig();

    // Only proceed if realtime alerts are enabled
    if (!config.triggerSchedule.realtimeAlerts.enabled) {
      return { checked: false, reason: 'Realtime alerts disabled' };
    }

    const thresholds = config.thresholds;
    const alerts = [];

    if (!usageData || !usageData.resources) {
      return { checked: false, reason: 'No usage data available' };
    }

    const resources = usageData.resources;

    // Check Dyno Units
    if (thresholds.dynoUnits.enabled && resources.dynos) {
      const currentValue = resources.dynos.count;

      // Only check if value changed significantly
      if (hasValueChanged('dynoUnits', currentValue)) {
        const alert = await checkResourceThreshold(
          'Dyno Units',
          currentValue,
          thresholds.dynoUnits
        );
        if (alert) alerts.push(alert);
      }
    }

    // Check Connect Rows
    if (thresholds.connectRows.enabled && resources.connect) {
      const currentValue = resources.connect.count;

      if (hasValueChanged('connectRows', currentValue)) {
        const alert = await checkResourceThreshold(
          'Connect Rows',
          currentValue,
          thresholds.connectRows
        );
        if (alert) alerts.push(alert);
      }
    }

    // Check Data Add-ons
    if (thresholds.dataAddons.enabled && resources.dataAddons) {
      const currentValue = resources.dataAddons.count;

      if (hasValueChanged('dataAddons', currentValue)) {
        const alert = await checkResourceThreshold(
          'Data Add-ons',
          currentValue,
          thresholds.dataAddons
        );
        if (alert) alerts.push(alert);
      }
    }

    // Check General Add-ons
    if (thresholds.generalAddons.enabled && resources.otherAddons) {
      const currentValue = resources.otherAddons.count;

      if (hasValueChanged('generalAddons', currentValue)) {
        const alert = await checkResourceThreshold(
          'General Add-ons',
          currentValue,
          thresholds.generalAddons
        );
        if (alert) alerts.push(alert);
      }
    }

    // Check Private Spaces
    if (thresholds.privateSpaces.enabled && resources.privateSpaces) {
      const currentValue = resources.privateSpaces.count;

      if (hasValueChanged('privateSpaces', currentValue)) {
        const alert = await checkResourceThreshold(
          'Private Spaces',
          currentValue,
          thresholds.privateSpaces
        );
        if (alert) alerts.push(alert);
      }
    }

    // Check Shield Spaces
    if (thresholds.shieldSpaces.enabled && resources.shieldSpaces) {
      const currentValue = resources.shieldSpaces.count;

      if (hasValueChanged('shieldSpaces', currentValue)) {
        const alert = await checkResourceThreshold(
          'Shield Spaces',
          currentValue,
          thresholds.shieldSpaces
        );
        if (alert) alerts.push(alert);
      }
    }

    if (alerts.length > 0) {
      console.log(`[Auto Monitor] ✓ ${alerts.length} alert(s) triggered`);
    }

    return {
      checked: true,
      alertsTriggered: alerts.length,
      alerts: alerts
    };

  } catch (error) {
    console.error('[Auto Monitor] Error checking thresholds:', error);
    return {
      checked: false,
      error: error.message
    };
  }
}

/**
 * Reset cooldown for a specific resource (useful for testing)
 */
function resetCooldown(resourceType, severity) {
  const key = `${resourceType}_${severity}`;
  delete lastAlertTimes[key];
}

/**
 * Get current cooldown status
 */
function getCooldownStatus() {
  const now = Date.now();
  const status = {};

  for (const [key, timestamp] of Object.entries(lastAlertTimes)) {
    const elapsed = now - timestamp;
    const remaining = Math.max(0, ALERT_COOLDOWN_MS - elapsed);

    status[key] = {
      lastAlert: new Date(timestamp).toISOString(),
      cooldownRemaining: Math.ceil(remaining / 1000 / 60), // minutes
      canAlert: remaining === 0
    };
  }

  return status;
}

module.exports = {
  autoCheckThresholds,
  resetCooldown,
  getCooldownStatus
};
