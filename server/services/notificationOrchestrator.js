/**
 * Notification Orchestrator
 *
 * Centralized entry point for ALL notification operations.
 * Coordinates threshold checks, scheduled reports, and manual notifications.
 *
 * This is the ONLY service that should trigger notifications.
 */

const enterpriseUsageService = require('./enterpriseUsageService');
const configService = require('./configService');
const enhancedNotificationService = require('./enhancedNotificationService');

// Track alert state to implement smart alerting
const alertState = new Map();

/**
 * Get current alert state for a resource
 */
function getAlertState(resourceType) {
  return alertState.get(resourceType) || {
    lastSeverity: null,
    lastAlertTime: null,
    consecutiveAlerts: 0
  };
}

/**
 * Update alert state after sending notification
 */
function updateAlertState(resourceType, severity) {
  const current = getAlertState(resourceType);

  alertState.set(resourceType, {
    lastSeverity: severity,
    lastAlertTime: Date.now(),
    consecutiveAlerts: current.lastSeverity === severity ? current.consecutiveAlerts + 1 : 1
  });
}

/**
 * Clear alert state (when usage drops below threshold)
 */
function clearAlertState(resourceType) {
  alertState.delete(resourceType);
}

/**
 * Determine if alert should be sent based on state and cooldown
 */
function shouldSendAlert(resourceType, severity, percentUsed, threshold) {
  const state = getAlertState(resourceType);
  const COOLDOWN_MS = 3600000; // 1 hour

  // If below all thresholds, clear state
  if (percentUsed < threshold.warningPercentage) {
    if (state.lastSeverity) {
      console.log(`[Orchestrator] ${resourceType} returned to normal (${percentUsed.toFixed(1)}%)`);
      clearAlertState(resourceType);
    }
    return false;
  }

  // First time crossing threshold
  if (!state.lastSeverity) {
    console.log(`[Orchestrator] ${resourceType} crossed ${severity} threshold for first time`);
    return true;
  }

  // Severity escalated (warning → critical)
  if (severity === 'critical' && state.lastSeverity === 'warning') {
    console.log(`[Orchestrator] ${resourceType} escalated from warning to critical`);
    return true;
  }

  // Check cooldown for same severity
  const elapsed = Date.now() - state.lastAlertTime;
  if (elapsed < COOLDOWN_MS) {
    console.log(`[Orchestrator] ${resourceType} ${severity} alert suppressed (cooldown: ${Math.round((COOLDOWN_MS - elapsed) / 1000 / 60)}m remaining)`);
    return false;
  }

  // Cooldown expired, resend alert
  console.log(`[Orchestrator] ${resourceType} ${severity} alert: cooldown expired, resending`);
  return true;
}

/**
 * Get severity level based on percentage
 */
function getSeverity(percentUsed, threshold) {
  if (percentUsed >= 100) {
    return 'critical';
  } else if (percentUsed >= threshold.criticalPercentage) {
    return 'critical';
  } else if (percentUsed >= threshold.warningPercentage) {
    return 'warning';
  }
  return null;
}

/**
 * Check single resource threshold
 */
async function checkResourceThreshold(resourceType, currentValue, threshold) {
  if (!threshold.enabled || !threshold.limit) {
    return null;
  }

  const percentUsed = (currentValue / threshold.limit) * 100;
  const severity = getSeverity(percentUsed, threshold);

  if (!severity) {
    // Below warning threshold, clear any existing alert state
    const state = getAlertState(resourceType);
    if (state.lastSeverity) {
      clearAlertState(resourceType);
    }
    return null;
  }

  // Check if alert should be sent based on state
  if (!shouldSendAlert(resourceType, severity, percentUsed, threshold)) {
    return {
      resourceType,
      currentValue,
      limit: threshold.limit,
      percentUsed: percentUsed.toFixed(1),
      severity,
      alerted: false,
      reason: 'Suppressed by smart alerting'
    };
  }

  // Send alert
  try {
    console.log(`[Orchestrator] Sending ${severity} alert for ${resourceType}: ${percentUsed.toFixed(1)}%`);

    await enhancedNotificationService.sendThresholdAlert(
      resourceType,
      currentValue,
      threshold,
      severity
    );

    updateAlertState(resourceType, severity);

    return {
      resourceType,
      currentValue,
      limit: threshold.limit,
      percentUsed: percentUsed.toFixed(1),
      severity,
      alerted: true
    };
  } catch (error) {
    console.error(`[Orchestrator] Failed to send alert for ${resourceType}:`, error.message);
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

/**
 * Run threshold evaluation for all resources
 * This is the main entry point for scheduled checks
 */
async function runThresholdEvaluation(options = {}) {
  const startTime = Date.now();
  console.log('[Orchestrator] Starting threshold evaluation...');

  try {
    // Get configuration
    const config = await configService.getConfig();
    const thresholds = config.thresholds;

    // Fetch latest usage data
    const month = options.month || new Date().toISOString().slice(0, 7);
    const usageData = await enterpriseUsageService.getEnterpriseStructure(month);

    if (!usageData || !usageData.resources) {
      console.log('[Orchestrator] No usage data available');
      return { checked: false, reason: 'No usage data available' };
    }

    const resources = usageData.resources;
    const alerts = [];

    // Check each resource type
    const checks = [
      {
        type: 'Dyno Units',
        key: 'dynoUnits',
        data: resources.dynos,
        valueKey: 'count'
      },
      {
        type: 'Connect Rows',
        key: 'connectRows',
        data: resources.connect,
        valueKey: 'count'
      },
      {
        type: 'Data Add-ons',
        key: 'dataAddons',
        data: resources.dataAddons,
        valueKey: 'count'
      },
      {
        type: 'General Add-ons',
        key: 'generalAddons',
        data: resources.otherAddons,
        valueKey: 'count'
      },
      {
        type: 'Private Spaces',
        key: 'privateSpaces',
        data: resources.privateSpaces,
        valueKey: 'count'
      },
      {
        type: 'Shield Spaces',
        key: 'shieldSpaces',
        data: resources.shieldSpaces,
        valueKey: 'count'
      }
    ];

    for (const check of checks) {
      if (thresholds[check.key].enabled && check.data) {
        const currentValue = check.data[check.valueKey] || 0;
        const alert = await checkResourceThreshold(
          check.type,
          currentValue,
          thresholds[check.key]
        );
        if (alert) {
          alerts.push(alert);
        }
      }
    }

    const duration = Date.now() - startTime;
    const alertedCount = alerts.filter(a => a.alerted).length;
    const suppressedCount = alerts.filter(a => !a.alerted).length;

    console.log(`[Orchestrator] Evaluation complete in ${duration}ms: ${alertedCount} alert(s) sent, ${suppressedCount} suppressed`);

    return {
      checked: true,
      duration,
      totalChecks: checks.length,
      alertsTriggered: alertedCount,
      alertsSuppressed: suppressedCount,
      alerts
    };

  } catch (error) {
    console.error('[Orchestrator] Threshold evaluation failed:', error);
    return {
      checked: false,
      error: error.message
    };
  }
}

/**
 * Send scheduled usage summary
 */
async function sendScheduledSummary(period = 'daily') {
  console.log(`[Orchestrator] Sending ${period} usage summary...`);

  try {
    // Fetch usage data
    const month = new Date().toISOString().slice(0, 7);
    const usageData = await enterpriseUsageService.getEnterpriseStructure(month);

    if (!usageData || !usageData.resources) {
      console.log('[Orchestrator] No usage data for summary');
      return { sent: false, reason: 'No usage data available' };
    }

    // Build summary data
    const summaryData = {
      period,
      reportPeriod: month,
      resources: {
        dynos: {
          label: 'Dyno Units',
          current: usageData.resources.dynos?.count || 0,
          limit: usageData.resources.dynos?.limit,
          percentage: usageData.resources.dynos?.limit
            ? (usageData.resources.dynos.count / usageData.resources.dynos.limit * 100)
            : 0,
          cost: usageData.resources.dynos?.cost
        },
        connect: {
          label: 'Connect Rows',
          current: usageData.resources.connect?.count || 0,
          limit: usageData.resources.connect?.limit,
          percentage: usageData.resources.connect?.limit
            ? (usageData.resources.connect.count / usageData.resources.connect.limit * 100)
            : 0,
          cost: usageData.resources.connect?.cost
        },
        dataAddons: {
          label: 'Data Add-ons',
          current: usageData.resources.dataAddons?.count || 0,
          cost: usageData.resources.dataAddons?.cost
        },
        generalAddons: {
          label: 'General Add-ons',
          current: usageData.resources.otherAddons?.count || 0,
          cost: usageData.resources.otherAddons?.cost
        }
      },
      totalCost: usageData.totalCost
    };

    const result = await enhancedNotificationService.sendUsageSummary(summaryData, period);

    console.log(`[Orchestrator] ${period} summary sent successfully`);
    return result;

  } catch (error) {
    console.error(`[Orchestrator] Failed to send ${period} summary:`, error);
    throw error;
  }
}

/**
 * Send test notification (manual trigger)
 */
async function sendTestNotification() {
  console.log('[Orchestrator] Sending test notification...');
  return await enhancedNotificationService.sendTestNotification();
}

/**
 * Get current alert states (for debugging/monitoring)
 */
function getAlertStates() {
  const states = {};
  for (const [resourceType, state] of alertState.entries()) {
    states[resourceType] = {
      ...state,
      cooldownRemaining: state.lastAlertTime
        ? Math.max(0, Math.round((3600000 - (Date.now() - state.lastAlertTime)) / 1000))
        : 0
    };
  }
  return states;
}

/**
 * Reset alert state for testing
 */
function resetAlertState(resourceType = null) {
  if (resourceType) {
    alertState.delete(resourceType);
    console.log(`[Orchestrator] Alert state reset for ${resourceType}`);
  } else {
    alertState.clear();
    console.log('[Orchestrator] All alert states reset');
  }
}

module.exports = {
  runThresholdEvaluation,
  sendScheduledSummary,
  sendTestNotification,
  getAlertStates,
  resetAlertState
};
