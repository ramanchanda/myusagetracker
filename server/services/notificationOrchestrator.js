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
const notificationHistory = require('./notificationHistory'); // PHASE 4

// PHASE 3: Enhanced state tracking with anomaly detection
const alertState = new Map();
const usageHistory = new Map(); // Track usage over time for anomaly detection

/**
 * Get current alert state for a resource
 */
function getAlertState(resourceType) {
  return alertState.get(resourceType) || {
    lastSeverity: null,
    lastAlertTime: null,
    lastValue: null,
    consecutiveAlerts: 0,
    lastAnomalyAlert: null
  };
}

/**
 * Get usage history for a resource
 */
function getUsageHistory(resourceType) {
  if (!usageHistory.has(resourceType)) {
    usageHistory.set(resourceType, []);
  }
  return usageHistory.get(resourceType);
}

/**
 * Add value to usage history (keep last 24 hours)
 */
function recordUsageValue(resourceType, value) {
  const history = getUsageHistory(resourceType);
  const now = Date.now();

  history.push({
    value,
    timestamp: now
  });

  // Keep only last 24 data points (24 hours of hourly checks)
  if (history.length > 24) {
    history.shift();
  }

  usageHistory.set(resourceType, history);
}

/**
 * Update alert state after sending notification
 */
function updateAlertState(resourceType, severity, currentValue) {
  const current = getAlertState(resourceType);

  alertState.set(resourceType, {
    lastSeverity: severity,
    lastAlertTime: Date.now(),
    lastValue: currentValue,
    consecutiveAlerts: current.lastSeverity === severity ? current.consecutiveAlerts + 1 : 1,
    lastAnomalyAlert: current.lastAnomalyAlert
  });
}

/**
 * Clear alert state (when usage drops below threshold)
 */
function clearAlertState(resourceType) {
  alertState.delete(resourceType);
}

/**
 * PHASE 3: Detect anomalies in usage patterns
 */
function detectAnomalies(resourceType, currentValue) {
  const history = getUsageHistory(resourceType);

  if (history.length < 3) {
    // Need at least 3 data points
    return null;
  }

  const anomalies = [];

  // Calculate statistics from history (excluding current value)
  const values = history.map(h => h.value);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  // 1. Sudden Spike Detection
  // Alert if current value is 50% higher than recent average
  const spikeThreshold = avg * 1.5;
  if (currentValue > spikeThreshold && currentValue > avg) {
    const increase = ((currentValue - avg) / avg * 100).toFixed(1);
    anomalies.push({
      type: 'sudden_spike',
      message: `Sudden spike detected: ${currentValue} (${increase}% above recent average of ${avg.toFixed(0)})`,
      severity: currentValue > avg * 2 ? 'critical' : 'warning'
    });
  }

  // 2. Unusual Jump Detection
  // Alert if increase from last value is > 30%
  if (history.length >= 2) {
    const lastValue = history[history.length - 1].value;
    const percentChange = ((currentValue - lastValue) / lastValue * 100);

    if (percentChange > 30) {
      anomalies.push({
        type: 'unusual_jump',
        message: `Unusual jump: ${lastValue} → ${currentValue} (+${percentChange.toFixed(1)}% in 1 hour)`,
        severity: percentChange > 50 ? 'critical' : 'warning'
      });
    }
  }

  // 3. Trend Acceleration Detection
  // Alert if growth rate is accelerating
  if (history.length >= 4) {
    const recentGrowth = currentValue - history[history.length - 2].value;
    const previousGrowth = history[history.length - 2].value - history[history.length - 4].value;

    if (previousGrowth > 0 && recentGrowth > previousGrowth * 2) {
      anomalies.push({
        type: 'trend_acceleration',
        message: `Accelerating growth detected: Previous +${previousGrowth}, Recent +${recentGrowth}`,
        severity: 'warning'
      });
    }
  }

  // 4. Sustained High Usage
  // Alert if consistently above 90% of max for 3+ hours
  if (history.length >= 3) {
    const recentValues = values.slice(-3);
    const highThreshold = max * 0.9;
    const sustainedHigh = recentValues.every(v => v >= highThreshold);

    if (sustainedHigh && currentValue >= highThreshold) {
      anomalies.push({
        type: 'sustained_high',
        message: `Sustained high usage: ${currentValue} maintained near max (${max}) for 3+ hours`,
        severity: 'warning'
      });
    }
  }

  return anomalies.length > 0 ? anomalies : null;
}

/**
 * PHASE 3: Check if anomaly alert should be sent
 */
function shouldSendAnomalyAlert(resourceType, anomalies) {
  if (!anomalies || anomalies.length === 0) {
    return false;
  }

  const state = getAlertState(resourceType);
  const ANOMALY_COOLDOWN_MS = 7200000; // 2 hours (longer than threshold cooldown)

  // Don't spam anomaly alerts
  if (state.lastAnomalyAlert) {
    const elapsed = Date.now() - state.lastAnomalyAlert;
    if (elapsed < ANOMALY_COOLDOWN_MS) {
      console.log(`[Orchestrator] Anomaly alert suppressed for ${resourceType} (cooldown: ${Math.round((ANOMALY_COOLDOWN_MS - elapsed) / 1000 / 60)}m remaining)`);
      return false;
    }
  }

  return true;
}

/**
 * PHASE 3: Update anomaly alert timestamp
 */
function recordAnomalyAlert(resourceType) {
  const current = getAlertState(resourceType);
  alertState.set(resourceType, {
    ...current,
    lastAnomalyAlert: Date.now()
  });
}

/**
 * PHASE 3: Determine if alert should be sent (improved smart alerting)
 */
function shouldSendAlert(resourceType, severity, percentUsed, threshold, currentValue) {
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

  // PHASE 3: Usage changed significantly (>20% from last alert)
  if (state.lastValue) {
    const changePercent = Math.abs((currentValue - state.lastValue) / state.lastValue * 100);
    if (changePercent > 20) {
      console.log(`[Orchestrator] ${resourceType} usage changed significantly: ${state.lastValue} → ${currentValue} (${changePercent.toFixed(1)}%)`);
      return true;
    }
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
 * PHASE 3: Check single resource threshold with anomaly detection
 */
async function checkResourceThreshold(resourceType, currentValue, threshold) {
  if (!threshold.enabled || !threshold.limit) {
    return null;
  }

  // PHASE 3: Record usage value for trend analysis
  recordUsageValue(resourceType, currentValue);

  const percentUsed = (currentValue / threshold.limit) * 100;
  const severity = getSeverity(percentUsed, threshold);

  // PHASE 3: Check for anomalies regardless of threshold
  const anomalies = detectAnomalies(resourceType, currentValue);
  if (anomalies && shouldSendAnomalyAlert(resourceType, anomalies)) {
    console.log(`[Orchestrator] 🚨 Anomalies detected for ${resourceType}:`);
    anomalies.forEach(a => console.log(`[Orchestrator]   - ${a.type}: ${a.message}`));

    // Send anomaly alert (lower priority, informational)
    try {
      // Build anomaly message for email
      const anomalyMessage = anomalies.map(a => `• ${a.message}`).join('\n');

      // TODO: Create dedicated anomaly alert template in Phase 4
      // For now, log it prominently
      console.log(`[Orchestrator] 📧 Anomaly alert would be sent: ${anomalyMessage}`);

      recordAnomalyAlert(resourceType);
    } catch (error) {
      console.error(`[Orchestrator] Failed to send anomaly alert:`, error.message);
    }
  }

  if (!severity) {
    // Below warning threshold, clear any existing alert state
    const state = getAlertState(resourceType);
    if (state.lastSeverity) {
      clearAlertState(resourceType);
    }
    return null;
  }

  // Check if threshold alert should be sent based on state
  if (!shouldSendAlert(resourceType, severity, percentUsed, threshold, currentValue)) {
    return {
      resourceType,
      currentValue,
      limit: threshold.limit,
      percentUsed: percentUsed.toFixed(1),
      severity,
      alerted: false,
      reason: 'Suppressed by smart alerting',
      anomalies: anomalies ? anomalies.map(a => a.type) : []
    };
  }

  // Send threshold alert
  try {
    console.log(`[Orchestrator] Sending ${severity} alert for ${resourceType}: ${percentUsed.toFixed(1)}%`);

    const result = await enhancedNotificationService.sendThresholdAlert(
      resourceType,
      currentValue,
      threshold,
      severity
    );

    // PHASE 4: Log to notification history
    await notificationHistory.addEvent({
      type: 'threshold-alert',
      severity,
      resourceType,
      recipients: result.recipients || [],
      subject: `${severity === 'critical' ? '🚨' : '⚠️'} Heroku ${resourceType} Usage Alert - ${severity.toUpperCase()}`,
      provider: result.provider,
      status: result.sent ? 'sent' : 'failed',
      messageId: result.messageId,
      error: result.error || null,
      metadata: {
        currentValue,
        limit: threshold.limit,
        percentUsed: percentUsed.toFixed(1),
        anomalies: anomalies ? anomalies.map(a => a.type) : []
      }
    });

    updateAlertState(resourceType, severity, currentValue);

    return {
      resourceType,
      currentValue,
      limit: threshold.limit,
      percentUsed: percentUsed.toFixed(1),
      severity,
      alerted: true,
      anomalies: anomalies ? anomalies.map(a => a.type) : []
    };
  } catch (error) {
    console.error(`[Orchestrator] Failed to send alert for ${resourceType}:`, error.message);

    // PHASE 4: Log failure to history
    await notificationHistory.addEvent({
      type: 'threshold-alert',
      severity,
      resourceType,
      recipients: [],
      subject: `${severity === 'critical' ? '🚨' : '⚠️'} Heroku ${resourceType} Usage Alert`,
      provider: null,
      status: 'failed',
      error: error.message,
      metadata: {
        currentValue,
        limit: threshold.limit,
        percentUsed: percentUsed.toFixed(1)
      }
    });

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
 * PHASE 3: Get current alert states with usage history (for debugging/monitoring)
 */
function getAlertStates() {
  const states = {};
  for (const [resourceType, state] of alertState.entries()) {
    const history = getUsageHistory(resourceType);

    states[resourceType] = {
      ...state,
      cooldownRemaining: state.lastAlertTime
        ? Math.max(0, Math.round((3600000 - (Date.now() - state.lastAlertTime)) / 1000))
        : 0,
      anomalyCooldownRemaining: state.lastAnomalyAlert
        ? Math.max(0, Math.round((7200000 - (Date.now() - state.lastAnomalyAlert)) / 1000))
        : 0,
      historySize: history.length,
      recentValues: history.slice(-5).map(h => ({
        value: h.value,
        timestamp: new Date(h.timestamp).toISOString()
      }))
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
