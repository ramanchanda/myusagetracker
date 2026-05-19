/**
 * Heroku Scheduler Worker (Clock Process) - DYNAMIC SCHEDULING
 *
 * Dedicated process for scheduled notification tasks.
 * Runs independently from web dyno.
 *
 * IMPORTANT: Configuration is loaded from database on startup.
 * To apply config changes, restart the clock dyno:
 *   heroku ps:restart clock
 *
 * Responsibilities:
 * - Real-time threshold evaluations (configurable interval)
 * - Daily usage summaries (configurable time)
 * - Weekly usage summaries (configurable day/time)
 * - Monthly executive reports (configurable day/time)
 */

const cron = require('node-cron');
const notificationOrchestrator = require('../services/notificationOrchestrator');
const configService = require('../services/configService');
const config = require('../config/notificationConfig');

const LOG_PREFIX = config.LOGGING.PREFIXES.SCHEDULER;

// Track scheduled jobs
const scheduledJobs = {
  realtime: null,
  daily: null,
  weekly: null,
  monthly: null
};

// Track last run times for debugging
const lastRuns = {
  realtime: null,
  daily: null,
  weekly: null,
  monthly: null
};

/**
 * Convert day name to cron day number (0 = Sunday, 1 = Monday, etc.)
 */
function dayNameToCronDay(dayName) {
  const days = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };
  return days[dayName] || 1; // Default to Monday
}

/**
 * Convert time string (HH:MM) to cron minute/hour
 */
function parseTime(timeString) {
  const [hour, minute] = timeString.split(':').map(Number);
  return { minute: minute || 0, hour: hour || 9 };
}

/**
 * Convert interval minutes to cron expression
 */
function intervalToCron(minutes) {
  if (minutes < 60) {
    // Every X minutes
    return `*/${minutes} * * * *`;
  } else {
    // Every X hours
    const hours = Math.floor(minutes / 60);
    return `0 */${hours} * * *`;
  }
}

/**
 * Initialize dynamic scheduling based on database config
 */
async function initializeScheduler() {
  console.log('='.repeat(60));
  console.log(`${LOG_PREFIX} Heroku Clock Process Starting (Dynamic Scheduling)...`);
  console.log(`${LOG_PREFIX} Environment:`, process.env.NODE_ENV || 'development');
  console.log(`${LOG_PREFIX} Timezone:`, process.env.TZ || config.SCHEDULER.DEFAULT_TIMEZONE);
  console.log('='.repeat(60));

  try {
    // Load configuration from database
    const notificationConfig = await configService.getConfig();
    const scheduleConfig = notificationConfig.triggerSchedule;

    console.log(`${LOG_PREFIX} Loading schedule configuration from database...`);
    console.log(`${LOG_PREFIX} Configuration loaded:`, JSON.stringify(scheduleConfig, null, 2));

    // Setup Real-time Alerts
    if (scheduleConfig.realtimeAlerts.enabled) {
      const interval = scheduleConfig.realtimeAlerts.checkIntervalMinutes;
      const cronExpression = intervalToCron(interval);

      console.log(`${LOG_PREFIX} ✓ Real-time Alerts: ENABLED`);
      console.log(`${LOG_PREFIX}   - Interval: ${interval} minutes`);
      console.log(`${LOG_PREFIX}   - Cron: ${cronExpression}`);

      scheduledJobs.realtime = cron.schedule(cronExpression, async () => {
        await runRealtimeAlerts();
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'UTC'
      });
    } else {
      console.log(`${LOG_PREFIX} ⏸️  Real-time Alerts: DISABLED`);
    }

    // Setup Daily Summary
    if (scheduleConfig.dailySummary.enabled) {
      const { hour, minute } = parseTime(scheduleConfig.dailySummary.time);
      const cronExpression = `${minute} ${hour} * * *`;

      console.log(`${LOG_PREFIX} ✓ Daily Summary: ENABLED`);
      console.log(`${LOG_PREFIX}   - Time: ${scheduleConfig.dailySummary.time} UTC`);
      console.log(`${LOG_PREFIX}   - Cron: ${cronExpression}`);

      scheduledJobs.daily = cron.schedule(cronExpression, async () => {
        await runDailySummary();
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'UTC'
      });
    } else {
      console.log(`${LOG_PREFIX} ⏸️  Daily Summary: DISABLED`);
    }

    // Setup Weekly Summary
    if (scheduleConfig.weeklySummary.enabled) {
      const { hour, minute } = parseTime(scheduleConfig.weeklySummary.time);
      const dayOfWeek = dayNameToCronDay(scheduleConfig.weeklySummary.dayOfWeek);
      const cronExpression = `${minute} ${hour} * * ${dayOfWeek}`;

      console.log(`${LOG_PREFIX} ✓ Weekly Summary: ENABLED`);
      console.log(`${LOG_PREFIX}   - Day: ${scheduleConfig.weeklySummary.dayOfWeek}`);
      console.log(`${LOG_PREFIX}   - Time: ${scheduleConfig.weeklySummary.time} UTC`);
      console.log(`${LOG_PREFIX}   - Cron: ${cronExpression}`);

      scheduledJobs.weekly = cron.schedule(cronExpression, async () => {
        await runWeeklySummary();
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'UTC'
      });
    } else {
      console.log(`${LOG_PREFIX} ⏸️  Weekly Summary: DISABLED`);
    }

    // Setup Monthly Summary
    if (scheduleConfig.monthlySummary.enabled) {
      const { hour, minute } = parseTime(scheduleConfig.monthlySummary.time);
      const dayOfMonth = scheduleConfig.monthlySummary.dayOfMonth;
      const cronExpression = `${minute} ${hour} ${dayOfMonth} * *`;

      console.log(`${LOG_PREFIX} ✓ Monthly Summary: ENABLED`);
      console.log(`${LOG_PREFIX}   - Day of Month: ${dayOfMonth}`);
      console.log(`${LOG_PREFIX}   - Time: ${scheduleConfig.monthlySummary.time} UTC`);
      console.log(`${LOG_PREFIX}   - Cron: ${cronExpression}`);

      scheduledJobs.monthly = cron.schedule(cronExpression, async () => {
        await runMonthlySummary();
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'UTC'
      });
    } else {
      console.log(`${LOG_PREFIX} ⏸️  Monthly Summary: DISABLED`);
    }

    console.log('='.repeat(60));
    console.log(`${LOG_PREFIX} Scheduler initialized successfully!`);
    console.log(`${LOG_PREFIX} To update schedules, change settings in UI then run:`);
    console.log(`${LOG_PREFIX}   heroku ps:restart clock`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Failed to initialize scheduler:`, error);
    console.error(`${LOG_PREFIX} Stack:`, error.stack);
    process.exit(1);
  }
}

/**
 * Real-time Alerts Handler
 */
async function runRealtimeAlerts() {
  const now = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${LOG_PREFIX} Real-time Threshold Evaluation - ${now}`);
  console.log('='.repeat(60));

  try {
    const result = await notificationOrchestrator.runThresholdEvaluation();
    lastRuns.realtime = now;

    if (result.checked) {
      console.log(`${LOG_PREFIX} ✓ Threshold evaluation complete:`);
      console.log(`${LOG_PREFIX}   - Duration: ${result.duration}ms`);
      console.log(`${LOG_PREFIX}   - Checks: ${result.totalChecks}`);
      console.log(`${LOG_PREFIX}   - Alerts sent: ${result.alertsTriggered}`);
      console.log(`${LOG_PREFIX}   - Alerts suppressed: ${result.alertsSuppressed}`);

      if (result.alerts && result.alerts.length > 0) {
        result.alerts.forEach(alert => {
          if (alert.alerted) {
            console.log(`${LOG_PREFIX}   ✉️  ${alert.resourceType}: ${alert.percentUsed}% (${alert.severity})`);
          }
        });
      }
    } else {
      console.log(`${LOG_PREFIX} ⚠️  Evaluation not completed: ${result.reason || result.error}`);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Real-time evaluation failed:`, error.message);
    console.error(`${LOG_PREFIX} Stack:`, error.stack);
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * Daily Summary Handler
 */
async function runDailySummary() {
  const now = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${LOG_PREFIX} Daily Summary - ${now}`);
  console.log('='.repeat(60));

  try {
    const result = await notificationOrchestrator.sendScheduledSummary('daily');
    lastRuns.daily = now;

    if (result.sent) {
      console.log(`${LOG_PREFIX} ✓ Daily summary sent successfully`);
      console.log(`${LOG_PREFIX}   - Recipients: ${result.recipients.join(', ')}`);
      console.log(`${LOG_PREFIX}   - Provider: ${result.provider}`);
    } else {
      console.log(`${LOG_PREFIX} ⚠️  Daily summary not sent: ${result.reason}`);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Daily summary failed:`, error.message);
    console.error(`${LOG_PREFIX} Stack:`, error.stack);
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * Weekly Summary Handler
 */
async function runWeeklySummary() {
  const now = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${LOG_PREFIX} Weekly Summary - ${now}`);
  console.log('='.repeat(60));

  try {
    const result = await notificationOrchestrator.sendScheduledSummary('weekly');
    lastRuns.weekly = now;

    if (result.sent) {
      console.log(`${LOG_PREFIX} ✓ Weekly summary sent successfully`);
      console.log(`${LOG_PREFIX}   - Recipients: ${result.recipients.join(', ')}`);
      console.log(`${LOG_PREFIX}   - Provider: ${result.provider}`);
    } else {
      console.log(`${LOG_PREFIX} ⚠️  Weekly summary not sent: ${result.reason}`);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Weekly summary failed:`, error.message);
    console.error(`${LOG_PREFIX} Stack:`, error.stack);
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * Monthly Summary Handler
 */
async function runMonthlySummary() {
  const now = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${LOG_PREFIX} Monthly Summary - ${now}`);
  console.log('='.repeat(60));

  try {
    const result = await notificationOrchestrator.sendScheduledSummary('monthly');
    lastRuns.monthly = now;

    if (result.sent) {
      console.log(`${LOG_PREFIX} ✓ Monthly summary sent successfully`);
      console.log(`${LOG_PREFIX}   - Recipients: ${result.recipients.join(', ')}`);
      console.log(`${LOG_PREFIX}   - Provider: ${result.provider}`);
    } else {
      console.log(`${LOG_PREFIX} ⚠️  Monthly summary not sent: ${result.reason}`);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Monthly summary failed:`, error.message);
    console.error(`${LOG_PREFIX} Stack:`, error.stack);
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * Graceful shutdown handler
 */
process.on('SIGTERM', () => {
  console.log(`\n${LOG_PREFIX} Received SIGTERM signal. Shutting down gracefully...`);

  // Stop all cron jobs
  Object.keys(scheduledJobs).forEach(key => {
    if (scheduledJobs[key]) {
      scheduledJobs[key].stop();
      console.log(`${LOG_PREFIX} Stopped ${key} job`);
    }
  });

  console.log(`${LOG_PREFIX} Scheduler stopped. Goodbye!`);
  process.exit(0);
});

// Initialize scheduler on startup
initializeScheduler().catch(error => {
  console.error(`${LOG_PREFIX} Fatal error during initialization:`, error);
  process.exit(1);
});
