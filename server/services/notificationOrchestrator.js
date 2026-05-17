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
const notificationService = require('./notificationService');
const notificationHistory = require('./notificationHistory');
const config = require('../config/notificationConfig');

// Service name for structured logging
const LOG_PREFIX = config.LOGGING.PREFIXES.ORCHESTRATOR;

// Enhanced state tracking with anomaly detection
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

  // Keep only configured max data points
  if (history.length > config.USAGE_HISTORY.MAX_DATA_POINTS) {
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
 * Detect anomalies in usage patterns
 */
function detectAnomalies(resourceType, currentValue) {
  const history = getUsageHistory(resourceType);

  if (history.length < config.ANOMALY_THRESHOLDS.MIN_DATA_POINTS) {
    return null;
  }

  const anomalies = [];

  // Calculate statistics from history (excluding current value)
  const values = history.map(h => h.value);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);

  // 1. Sudden Spike Detection
  const spikeThreshold = avg * config.ANOMALY_THRESHOLDS.SPIKE_MULTIPLIER;
  if (currentValue > spikeThreshold && currentValue > avg) {
    const increase = ((currentValue - avg) / avg * 100).toFixed(1);
    const isCritical = currentValue > avg * config.ANOMALY_THRESHOLDS.CRITICAL_SPIKE_MULTIPLIER;
    anomalies.push({
      type: 'sudden_spike',
      message: `Sudden spike detected: ${currentValue} (${increase}% above recent average of ${avg.toFixed(0)})`,
      severity: isCritical ? config.SEVERITY_LEVELS.CRITICAL : config.SEVERITY_LEVELS.WARNING
    });
  }

  // 2. Unusual Jump Detection
  if (history.length >= 2) {
    const lastValue = history[history.length - 1].value;
    const percentChange = ((currentValue - lastValue) / lastValue * 100);

    if (percentChange > config.ANOMALY_THRESHOLDS.JUMP_PERCENTAGE) {
      const isCritical = percentChange > config.ANOMALY_THRESHOLDS.CRITICAL_JUMP_PERCENTAGE;
      anomalies.push({
        type: 'unusual_jump',
        message: `Unusual jump: ${lastValue} → ${currentValue} (+${percentChange.toFixed(1)}% in 1 hour)`,
        severity: isCritical ? config.SEVERITY_LEVELS.CRITICAL : config.SEVERITY_LEVELS.WARNING
      });
    }
  }

  // 3. Trend Acceleration Detection
  if (history.length >= 4) {
    const recentGrowth = currentValue - history[history.length - 2].value;
    const previousGrowth = history[history.length - 2].value - history[history.length - 4].value;

    if (previousGrowth > 0 && recentGrowth > previousGrowth * config.ANOMALY_THRESHOLDS.ACCELERATION_MULTIPLIER) {
      anomalies.push({
        type: 'trend_acceleration',
        message: `Accelerating growth detected: Previous +${previousGrowth}, Recent +${recentGrowth}`,
        severity: config.SEVERITY_LEVELS.WARNING
      });
    }
  }

  // 4. Sustained High Usage
  if (history.length >= config.ANOMALY_THRESHOLDS.SUSTAINED_HIGH_HOURS) {
    const recentValues = values.slice(-config.ANOMALY_THRESHOLDS.SUSTAINED_HIGH_HOURS);
    const highThreshold = max * (config.ANOMALY_THRESHOLDS.SUSTAINED_HIGH_PERCENTAGE / 100);
    const sustainedHigh = recentValues.every(v => v >= highThreshold);

    if (sustainedHigh && currentValue >= highThreshold) {
      anomalies.push({
        type: 'sustained_high',
        message: `Sustained high usage: ${currentValue} maintained near max (${max}) for ${config.ANOMALY_THRESHOLDS.SUSTAINED_HIGH_HOURS}+ hours`,
        severity: config.SEVERITY_LEVELS.WARNING
      });
    }
  }

  return anomalies.length > 0 ? anomalies : null;
}

/**
 * Check if anomaly alert should be sent
 */
function shouldSendAnomalyAlert(resourceType, anomalies) {
  if (!anomalies || anomalies.length === 0) {
    return false;
  }

  const state = getAlertState(resourceType);
  const cooldownMs = config.getCooldownPeriod(config.EVENT_TYPES.ANOMALY_ALERT);

  // Don't spam anomaly alerts
  if (state.lastAnomalyAlert) {
    const elapsed = Date.now() - state.lastAnomalyAlert;
    if (elapsed < cooldownMs) {
      const remaining = config.formatDuration(cooldownMs - elapsed);
      console.log(`${LOG_PREFIX} Anomaly alert suppressed for ${resourceType} (cooldown: ${remaining} remaining)`);
      return false;
    }
  }

  return true;
}

/**
 * Update anomaly alert timestamp
 */
function recordAnomalyAlert(resourceType) {
  const current = getAlertState(resourceType);
  alertState.set(resourceType, {
    ...current,
    lastAnomalyAlert: Date.now()
  });
}

/**
 * Determine if alert should be sent (smart alerting logic)
 */
function shouldSendAlert(resourceType, severity, percentUsed, threshold, currentValue) {
  const state = getAlertState(resourceType);
  const cooldownMs = config.getCooldownPeriod(config.EVENT_TYPES.THRESHOLD_ALERT);

  // If below warning threshold, clear state
  if (percentUsed < config.SMART_ALERTING.CLEAR_STATE_PERCENTAGE) {
    if (state.lastSeverity) {
      console.log(`${LOG_PREFIX} ${resourceType} returned to normal (${percentUsed.toFixed(1)}%)`);
      clearAlertState(resourceType);
    }
    return false;
  }

  // First time crossing threshold
  if (!state.lastSeverity && config.SMART_ALERTING.ALERT_ON_FIRST_CROSSING) {
    console.log(`${LOG_PREFIX} ${resourceType} crossed ${severity} threshold for first time`);
    return true;
  }

  // Severity escalated (warning → critical)
  if (config.SMART_ALERTING.ALERT_ON_ESCALATION &&
      severity === config.SEVERITY_LEVELS.CRITICAL &&
      state.lastSeverity === config.SEVERITY_LEVELS.WARNING) {
    console.log(`${LOG_PREFIX} ${resourceType} escalated from warning to critical`);
    return true;
  }

  // Usage changed significantly
  if (state.lastValue) {
    const changePercent = Math.abs((currentValue - state.lastValue) / state.lastValue * 100);
    if (changePercent > config.SMART_ALERTING.SIGNIFICANT_CHANGE_PERCENTAGE) {
      console.log(`${LOG_PREFIX} ${resourceType} usage changed significantly: ${state.lastValue} → ${currentValue} (${changePercent.toFixed(1)}%)`);
      return true;
    }
  }

  // Check cooldown for same severity
  const elapsed = Date.now() - state.lastAlertTime;
  if (elapsed < cooldownMs) {
    const remaining = config.formatDuration(cooldownMs - elapsed);
    console.log(`${LOG_PREFIX} ${resourceType} ${severity} alert suppressed (cooldown: ${remaining} remaining)`);
    return false;
  }

  // Cooldown expired, resend alert
  console.log(`${LOG_PREFIX} ${resourceType} ${severity} alert: cooldown expired, resending`);
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
async function checkResourceThreshold(resourceType, currentValue, threshold, skipIndividualEmail = false) {
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
    console.log(`${LOG_PREFIX} 🚨 Anomalies detected for ${resourceType}:`);
    anomalies.forEach(a => console.log(`${LOG_PREFIX}   - ${a.type}: ${a.message}`));

    // Send anomaly alert (lower priority, informational)
    try {
      // Build anomaly message for email
      const anomalyMessage = anomalies.map(a => `• ${a.message}`).join('\n');

      // Note: Dedicated anomaly alert template to be implemented in future
      console.log(`${LOG_PREFIX} 📧 Anomaly detected: ${anomalyMessage}`);

      recordAnomalyAlert(resourceType);
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to record anomaly alert:`, error.message);
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

  // Send individual threshold alert only if not skipping (for consolidated emails)
  if (!skipIndividualEmail) {
    try {
      console.log(`${LOG_PREFIX} Sending ${severity} alert for ${resourceType}: ${percentUsed.toFixed(1)}%`);

      const result = await notificationService.sendThresholdAlert(
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
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to send alert for ${resourceType}:`, error.message);
      return {
        resourceType,
        currentValue,
        limit: threshold.limit,
        percentUsed: percentUsed.toFixed(1),
        severity,
        alerted: false,
        reason: 'Email send failed',
        error: error.message
      };
    }
  } else {
    // For consolidated emails, just update state without sending individual email
    updateAlertState(resourceType, severity, currentValue);
  }

  // Return alert object for consolidated reporting
  return {
    resourceType,
    currentValue,
    limit: threshold.limit,
    percentUsed: percentUsed.toFixed(1),
    severity,
    alerted: true,
    anomalies: anomalies ? anomalies.map(a => a.type) : []
  };
}

/**
 * Run threshold evaluation for all resources
 * This is the main entry point for scheduled checks
 */
async function runThresholdEvaluation(options = {}) {
  const startTime = Date.now();
  console.log(`${LOG_PREFIX} Starting license audit evaluation...`);

  try {
    // Get configuration
    const config = await configService.getConfig();
    const thresholds = config.thresholds;

    // Fetch all enterprise accounts usage data
    const month = options.month || new Date().toISOString().slice(0, 7);
    const allAccountsData = await enterpriseUsageService.getAllEnterpriseAccountsStructure(month);

    // Diagnostic logging
    console.log(`${LOG_PREFIX} Audit diagnostics:`, {
      accountsFound: allAccountsData.enterpriseAccounts?.length || 0,
      hasSummary: !!allAccountsData.summary,
      month
    });

    // Handle case: no enterprise accounts
    if (!allAccountsData.enterpriseAccounts || allAccountsData.enterpriseAccounts.length === 0) {
      console.log(`${LOG_PREFIX} No enterprise accounts configured`);
      return {
        checked: false,
        reason: 'No Enterprise Accounts Configured',
        detail: 'Add and monitor Enterprise Accounts to begin license auditing.',
        accountsScanned: 0,
        accountsRestricted: 0
      };
    }

    const totalAccounts = allAccountsData.enterpriseAccounts.length;
    const restrictedAccounts = allAccountsData.enterpriseAccounts.filter(
      acc => !acc.enterpriseAccount?.has_billing_access
    ).length;
    const monitoredAccounts = totalAccounts - restrictedAccounts;

    // Handle case: all accounts restricted
    if (monitoredAccounts === 0) {
      console.log(`${LOG_PREFIX} All enterprise accounts have restricted billing access`);
      return {
        checked: false,
        reason: 'Billing Access Restricted',
        detail: 'Usage-based license metrics are unavailable for all Enterprise Accounts.',
        accountsScanned: totalAccounts,
        accountsRestricted: restrictedAccounts,
        accountsMonitored: 0
      };
    }

    // Aggregate usage across all accounts using the summary
    const aggregatedUsage = allAccountsData.summary || {};

    // Handle case: no usage data in summary
    if (!aggregatedUsage.totalDynos && !aggregatedUsage.totalConnect &&
        !aggregatedUsage.totalDataAddons && !aggregatedUsage.totalOtherAddons) {
      console.log(`${LOG_PREFIX} No usage data in aggregated summary`);
      return {
        checked: false,
        reason: 'Usage data is still being collected',
        detail: 'Please retry the license audit shortly.',
        accountsScanned: totalAccounts,
        accountsRestricted: restrictedAccounts,
        accountsMonitored: monitoredAccounts
      };
    }

    const alerts = [];

    // Check each resource type using aggregated summary
    const checks = [
      {
        type: 'Dyno Units',
        key: 'dynoUnits',
        currentValue: aggregatedUsage.totalDynos || 0
      },
      {
        type: 'Connect Rows',
        key: 'connectRows',
        currentValue: aggregatedUsage.totalConnect || 0
      },
      {
        type: 'Data Add-ons',
        key: 'dataAddons',
        currentValue: aggregatedUsage.totalDataAddons || 0
      },
      {
        type: 'General Add-ons',
        key: 'generalAddons',
        currentValue: aggregatedUsage.totalOtherAddons || 0
      },
      {
        type: 'Private Spaces',
        key: 'privateSpaces',
        currentValue: aggregatedUsage.totalPrivateSpaces || 0
      },
      {
        type: 'Shield Spaces',
        key: 'shieldSpaces',
        currentValue: aggregatedUsage.totalShieldSpaces || 0
      }
    ];

    // Collect all resource conditions for consolidated email
    const resourceConditions = [];

    for (const check of checks) {
      if (thresholds[check.key].enabled) {
        const alert = await checkResourceThreshold(
          check.type,
          check.currentValue,
          thresholds[check.key],
          true // Skip individual email sending
        );
        if (alert) {
          alerts.push(alert);
          // Collect conditions that need to be reported
          if (alert.alerted && alert.severity) {
            resourceConditions.push({
              resourceType: check.type,
              currentUsage: check.currentValue,
              licensedCapacity: thresholds[check.key].limit,
              utilization: alert.percentUsed,
              severity: alert.severity,
              thresholdType: alert.severity === 'critical' ? 'Critical' : 'Warning'
            });
          }
        }
      }
    }

    // Determine cooldown status for UI feedback
    let consolidatedEmailSent = false;
    let cooldownActive = false;
    let cooldownRemainingSeconds = 0;

    // Calculate alert counts BEFORE using them
    const alertedCount = alerts.filter(a => a.alerted).length;
    const suppressedCount = alerts.filter(a => !a.alerted).length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;

    // Calculate maximum cooldown from all suppressed alerts
    const suppressedAlerts = alerts.filter(a => !a.alerted && a.reason === 'Suppressed by smart alerting');
    if (suppressedAlerts.length > 0 && alertedCount === 0) {
      cooldownActive = true;
      // Get cooldown info from alert states
      const thresholdCooldown = config.COOLDOWN_PERIODS.THRESHOLD_ALERT_MS;
      suppressedAlerts.forEach(alert => {
        const state = getAlertState(alert.resourceType);
        if (state.lastAlertTime) {
          const elapsed = Date.now() - state.lastAlertTime;
          const remaining = Math.max(0, Math.round((thresholdCooldown - elapsed) / 1000));
          cooldownRemainingSeconds = Math.max(cooldownRemainingSeconds, remaining);
        }
      });
    }

    // Send one consolidated license audit email if there are any triggered conditions
    if (resourceConditions.length > 0) {
      try {
        console.log(`${LOG_PREFIX} Sending consolidated license audit email with ${resourceConditions.length} condition(s)`);

        const consolidatedPayload = {
          accountName: 'Enterprise Accounts',
          generatedAt: new Date().toISOString(),
          warnings: resourceConditions.filter(r => r.severity === 'warning'),
          criticals: resourceConditions.filter(r => r.severity === 'critical'),
          resources: resourceConditions,
          accountsScanned: totalAccounts,
          accountsMonitored: monitoredAccounts,
          accountsRestricted: restrictedAccounts
        };

        const result = await notificationService.sendLicenseAuditSummary(consolidatedPayload);
        consolidatedEmailSent = result.sent;

        console.log(`${LOG_PREFIX} Consolidated email result:`, {
          sent: result.sent,
          provider: result.provider,
          messageId: result.messageId
        });

        // Log to notification history
        console.log(`${LOG_PREFIX} Persisting notification to history...`);
        const historyRecord = await notificationHistory.addEvent({
          accountName: consolidatedPayload.accountName,
          type: 'license-audit',
          severity: consolidatedPayload.criticals.length > 0 ? 'critical' : 'warning',
          resourceType: 'consolidated',
          recipients: result.recipients || [],
          subject: `[License Audit] ${consolidatedPayload.criticals.length} Critical, ${consolidatedPayload.warnings.length} Warning(s)`,
          provider: result.provider,
          status: result.sent ? 'sent' : 'failed',
          messageId: result.messageId,
          error: result.error || null,
          resourceSummary: {
            resources: resourceConditions
          },
          criticalCount: consolidatedPayload.criticals.length,
          warningCount: consolidatedPayload.warnings.length,
          metadata: {
            accountsScanned: totalAccounts,
            accountsMonitored: monitoredAccounts,
            accountsRestricted: restrictedAccounts,
            resourcesAlerted: resourceConditions.length
          }
        });

        if (historyRecord) {
          console.log(`${LOG_PREFIX} Notification history persisted (ID: ${historyRecord.id})`);
        } else {
          console.warn(`${LOG_PREFIX} Notification history persistence failed (continuing)`);
        }

      } catch (error) {
        console.error(`${LOG_PREFIX} Failed to send consolidated license audit email:`, error.message);
        console.error(`${LOG_PREFIX} Error stack:`, error.stack);
      }
    } else if (cooldownActive) {
      // Log suppressed audit to history
      console.log(`${LOG_PREFIX} License audit suppressed due to cooldown (${cooldownRemainingSeconds}s remaining)`);
      console.log(`${LOG_PREFIX} Persisting suppressed audit to history...`);

      const suppressedRecord = await notificationHistory.addEvent({
        accountName: 'Enterprise Accounts',
        type: 'license-audit',
        severity: 'info',
        resourceType: 'consolidated',
        recipients: [],
        subject: '[License Audit] Suppressed (Cooldown Active)',
        provider: null,
        status: 'suppressed',
        messageId: null,
        error: null,
        resourceSummary: {
          suppressedAlerts: suppressedAlerts.map(a => ({
            resourceType: a.resourceType,
            reason: a.reason
          }))
        },
        criticalCount: 0,
        warningCount: 0,
        metadata: {
          accountsScanned: totalAccounts,
          accountsMonitored: monitoredAccounts,
          accountsRestricted: restrictedAccounts,
          cooldownRemainingSeconds
        }
      });

      if (suppressedRecord) {
        console.log(`${LOG_PREFIX} Suppressed audit persisted to history (ID: ${suppressedRecord.id})`);
      } else {
        console.warn(`${LOG_PREFIX} Failed to persist suppressed audit to history`);
      }
    }

    const duration = Date.now() - startTime;
    // Alert counts already calculated above (moved to fix TDZ error)

    const logMessage = consolidatedEmailSent
      ? `License audit complete in ${duration}ms: ${alertedCount} alert(s) triggered, ${suppressedCount} suppressed, 1 consolidated email sent`
      : `License audit complete in ${duration}ms: ${alertedCount} alert(s) triggered, ${suppressedCount} suppressed, no email sent (cooldown active)`;

    console.log(`${LOG_PREFIX} ${logMessage}`);

    return {
      checked: true,
      duration,
      totalChecks: checks.length,
      alertsTriggered: alertedCount,
      alertsSuppressed: suppressedCount,
      accountsScanned: totalAccounts,
      accountsRestricted: restrictedAccounts,
      accountsMonitored: monitoredAccounts,
      warningConditions: warningCount,
      criticalConditions: criticalCount,
      consolidatedEmailSent,
      cooldownActive,
      cooldownRemainingMinutes: Math.ceil(cooldownRemainingSeconds / 60),
      cooldownRemainingSeconds,
      alerts
    };

  } catch (error) {
    console.error(`${LOG_PREFIX} License audit failed:`, error.message);
    console.error(`${LOG_PREFIX} Error stack:`, error.stack);

    return {
      checked: false,
      success: false,
      error: 'License audit failed',
      details: error.message,
      reason: 'Execution Failure',
      accountsScanned: 0,
      accountsMonitored: 0,
      accountsRestricted: 0,
      alertsTriggered: 0,
      alertsSuppressed: 0
    };
  }
}

/**
 * Send scheduled usage summary
 */
async function sendScheduledSummary(period = 'daily') {
  console.log(`${LOG_PREFIX} Sending ${period} usage summary...`);

  try {
    // Fetch usage data
    const month = new Date().toISOString().slice(0, 7);
    const usageData = await enterpriseUsageService.getEnterpriseStructure(month);

    if (!usageData || !usageData.resources) {
      console.log(`${LOG_PREFIX} No usage data for summary`);
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

    const result = await notificationService.sendUsageSummary(summaryData, period);

    console.log(`${LOG_PREFIX} ${period} summary sent successfully`);
    return result;

  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to send ${period} summary:`, error);
    throw error;
  }
}

/**
 * Send test notification (manual trigger)
 */
async function sendTestNotification() {
  console.log(`${LOG_PREFIX} Sending test notification...`);
  return await notificationService.sendTestNotification();
}

/**
 * Get current alert states with usage history (for debugging/monitoring)
 */
function getAlertStates() {
  const states = {};
  const thresholdCooldown = config.COOLDOWN_PERIODS.THRESHOLD_ALERT_MS;
  const anomalyCooldown = config.COOLDOWN_PERIODS.ANOMALY_ALERT_MS;

  for (const [resourceType, state] of alertState.entries()) {
    const history = getUsageHistory(resourceType);

    states[resourceType] = {
      ...state,
      cooldownRemaining: state.lastAlertTime
        ? Math.max(0, Math.round((thresholdCooldown - (Date.now() - state.lastAlertTime)) / 1000))
        : 0,
      anomalyCooldownRemaining: state.lastAnomalyAlert
        ? Math.max(0, Math.round((anomalyCooldown - (Date.now() - state.lastAnomalyAlert)) / 1000))
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
    console.log(`${LOG_PREFIX} Alert state reset for ${resourceType}`);
  } else {
    alertState.clear();
    console.log(`${LOG_PREFIX} All alert states reset`);
  }
}

module.exports = {
  runThresholdEvaluation,
  sendScheduledSummary,
  sendTestNotification,
  getAlertStates,
  resetAlertState
};
