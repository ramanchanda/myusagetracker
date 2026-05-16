/**
 * Notification System Configuration
 *
 * Centralized configuration for the notification subsystem.
 * All timing, retry, and threshold values are defined here.
 */

/**
 * Alert cooldown periods (milliseconds)
 * Prevents alert spam by enforcing minimum time between alerts
 */
const COOLDOWN_PERIODS = {
  // Standard threshold alert cooldown (1 hour)
  THRESHOLD_ALERT_MS: 3600000,

  // Anomaly detection alert cooldown (2 hours)
  // Longer to avoid overwhelming with pattern-based alerts
  ANOMALY_ALERT_MS: 7200000,

  // Minimum time between same-severity alerts for same resource
  SAME_SEVERITY_MS: 3600000
};

/**
 * Anomaly detection thresholds
 * Statistical thresholds for detecting usage pattern anomalies
 */
const ANOMALY_THRESHOLDS = {
  // Sudden spike: value exceeds recent average by this multiplier
  SPIKE_MULTIPLIER: 1.5,

  // Critical spike threshold
  CRITICAL_SPIKE_MULTIPLIER: 2.0,

  // Unusual jump: hour-over-hour increase percentage
  JUMP_PERCENTAGE: 30,

  // Critical jump threshold
  CRITICAL_JUMP_PERCENTAGE: 50,

  // Trend acceleration: recent growth vs previous growth multiplier
  ACCELERATION_MULTIPLIER: 2.0,

  // Sustained high: percentage of max for sustained period
  SUSTAINED_HIGH_PERCENTAGE: 90,

  // Minimum data points required for anomaly detection
  MIN_DATA_POINTS: 3,

  // Sustained high period (number of consecutive hours)
  SUSTAINED_HIGH_HOURS: 3
};

/**
 * Usage history configuration
 * Controls how much historical data to retain for analysis
 */
const USAGE_HISTORY = {
  // Number of hourly data points to retain (24 hours)
  MAX_DATA_POINTS: 24,

  // Retention period in milliseconds
  RETENTION_PERIOD_MS: 86400000 // 24 hours
};

/**
 * Notification history persistence
 */
const HISTORY_PERSISTENCE = {
  // Maximum number of events to keep in JSON storage
  MAX_EVENTS: 1000,

  // Default retention period for cleanup (days)
  DEFAULT_RETENTION_DAYS: 30,

  // Auto-cleanup interval (milliseconds) - daily
  CLEANUP_INTERVAL_MS: 86400000
};

/**
 * Email retry configuration
 */
const EMAIL_RETRY = {
  // Number of retry attempts for failed email delivery
  MAX_ATTEMPTS: 2,

  // Base delay between retries (milliseconds)
  BASE_DELAY_MS: 1000,

  // Retry delay multiplier (exponential backoff)
  DELAY_MULTIPLIER: 1.5,

  // Maximum delay between retries (cap for exponential backoff)
  MAX_DELAY_MS: 5000
};

/**
 * Smart alerting configuration
 * Determines when to send or suppress alerts based on state
 */
const SMART_ALERTING = {
  // Percentage change threshold to trigger re-alert (even within cooldown)
  SIGNIFICANT_CHANGE_PERCENTAGE: 20,

  // Always alert on these severity escalations
  ALERT_ON_ESCALATION: true,

  // Alert on first threshold crossing
  ALERT_ON_FIRST_CROSSING: true,

  // Clear alert state when usage drops below this percentage
  CLEAR_STATE_PERCENTAGE: 80 // Below warning threshold
};

/**
 * Scheduler timing configuration
 */
const SCHEDULER = {
  // Threshold evaluation frequency (cron: every hour)
  THRESHOLD_CHECK_CRON: '0 * * * *',

  // Daily summary time (cron: 9:00 AM)
  DAILY_SUMMARY_CRON: '0 9 * * *',

  // Weekly summary time (cron: Monday 9:00 AM)
  WEEKLY_SUMMARY_CRON: '0 9 * * 1',

  // Monthly summary time (cron: 1st of month 9:00 AM)
  MONTHLY_SUMMARY_CRON: '0 9 1 * *',

  // Health check interval (cron: every 15 minutes)
  HEALTH_CHECK_CRON: '*/15 * * * *',

  // Default timezone
  DEFAULT_TIMEZONE: 'UTC'
};

/**
 * Logging configuration
 */
const LOGGING = {
  // Service name prefixes for structured logging
  PREFIXES: {
    SCHEDULER: '[Scheduler]',
    ORCHESTRATOR: '[Notification Orchestrator]',
    HISTORY: '[Notification History]',
    EMAIL_SERVICE: '[Email Service]',
    NOTIFICATION_SERVICE: '[Notification Service]',
    EMAIL_WORKER: '[Email Worker]'
  },

  // Log levels
  LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  }
};

/**
 * Notification event types
 */
const EVENT_TYPES = {
  THRESHOLD_ALERT: 'threshold-alert',
  ANOMALY_ALERT: 'anomaly-alert',
  DAILY_SUMMARY: 'daily-summary',
  WEEKLY_SUMMARY: 'weekly-summary',
  MONTHLY_SUMMARY: 'monthly-summary',
  TEST_NOTIFICATION: 'test-notification',
  PDF_REPORT: 'pdf-report'
};

/**
 * Severity levels
 */
const SEVERITY_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

/**
 * Notification delivery status
 */
const DELIVERY_STATUS = {
  QUEUED: 'queued',
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
  RETRYING: 'retrying'
};

/**
 * Get cooldown period for alert type
 */
function getCooldownPeriod(alertType) {
  switch (alertType) {
    case EVENT_TYPES.ANOMALY_ALERT:
      return COOLDOWN_PERIODS.ANOMALY_ALERT_MS;
    case EVENT_TYPES.THRESHOLD_ALERT:
      return COOLDOWN_PERIODS.THRESHOLD_ALERT_MS;
    default:
      return COOLDOWN_PERIODS.SAME_SEVERITY_MS;
  }
}

/**
 * Get retry delay with exponential backoff
 */
function getRetryDelay(attemptNumber) {
  const delay = EMAIL_RETRY.BASE_DELAY_MS * Math.pow(EMAIL_RETRY.DELAY_MULTIPLIER, attemptNumber);
  return Math.min(delay, EMAIL_RETRY.MAX_DELAY_MS);
}

/**
 * Format duration in human-readable format
 */
function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

module.exports = {
  COOLDOWN_PERIODS,
  ANOMALY_THRESHOLDS,
  USAGE_HISTORY,
  HISTORY_PERSISTENCE,
  EMAIL_RETRY,
  SMART_ALERTING,
  SCHEDULER,
  LOGGING,
  EVENT_TYPES,
  SEVERITY_LEVELS,
  DELIVERY_STATUS,

  // Helper functions
  getCooldownPeriod,
  getRetryDelay,
  formatDuration
};
