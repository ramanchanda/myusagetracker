/**
 * Heroku Scheduler Worker (Clock Process)
 *
 * Dedicated process for scheduled notification tasks.
 * Runs independently from web dyno.
 *
 * Responsibilities:
 * - Hourly threshold evaluations
 * - Daily usage summaries
 * - Weekly usage summaries
 * - Monthly executive reports
 *
 * Does NOT directly send emails - orchestrator handles that.
 */

const cron = require('node-cron');
const notificationOrchestrator = require('../services/notificationOrchestrator');
const configService = require('../services/configService');
const config = require('../config/notificationConfig');

const LOG_PREFIX = config.LOGGING.PREFIXES.SCHEDULER;

// Track last run times for debugging
const lastRuns = {
  hourly: null,
  daily: null,
  weekly: null,
  monthly: null
};

console.log('='.repeat(60));
console.log(`${LOG_PREFIX} Heroku Clock Process Starting...`);
console.log(`${LOG_PREFIX} Environment:`, process.env.NODE_ENV || 'development');
console.log(`${LOG_PREFIX} Timezone:`, process.env.TZ || config.SCHEDULER.DEFAULT_TIMEZONE);
console.log('='.repeat(60));

/**
 * Hourly Threshold Evaluation
 * Runs every hour at :00
 */
cron.schedule('0 * * * *', async () => {
  const now = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${LOG_PREFIX} Hourly Threshold Evaluation - ${now}`);
  console.log('='.repeat(60));

  try {
    // Check if realtime alerts are enabled
    const config = await configService.getConfig();

    if (!config.triggerSchedule.realtimeAlerts.enabled) {
      console.log('${LOG_PREFIX} ⏸️  Realtime alerts disabled in config - skipping');
      return;
    }

    console.log('${LOG_PREFIX} ✓ Realtime alerts enabled - running evaluation');

    // Run threshold evaluation via orchestrator
    const result = await notificationOrchestrator.runThresholdEvaluation();

    lastRuns.hourly = now;

    if (result.checked) {
      console.log('${LOG_PREFIX} ✓ Threshold evaluation complete:');
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
    console.error('${LOG_PREFIX} ❌ Hourly evaluation failed:', error.message);
    console.error('${LOG_PREFIX} Stack:', error.stack);
  }

  console.log('='.repeat(60) + '\n');
}, {
  scheduled: true,
  timezone: process.env.TZ || 'UTC'
});

/**
 * Daily Summary
 * Runs every day at configured time (default: 9:00 AM)
 */
cron.schedule('0 9 * * *', async () => {
  const now = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${LOG_PREFIX} Daily Summary - ${now}`);
  console.log('='.repeat(60));

  try {
    // Check if daily summaries are enabled
    const config = await configService.getConfig();

    if (!config.triggerSchedule.dailySummary.enabled) {
      console.log('${LOG_PREFIX} ⏸️  Daily summaries disabled in config - skipping');
      return;
    }

    console.log('${LOG_PREFIX} ✓ Daily summaries enabled - sending summary');

    // Send daily summary via orchestrator
    const result = await notificationOrchestrator.sendScheduledSummary('daily');

    lastRuns.daily = now;

    if (result.sent) {
      console.log('${LOG_PREFIX} ✓ Daily summary sent successfully');
      console.log(`${LOG_PREFIX}   - Recipients: ${result.recipients.join(', ')}`);
      console.log(`${LOG_PREFIX}   - Provider: ${result.provider}`);
    } else {
      console.log(`${LOG_PREFIX} ⚠️  Daily summary not sent: ${result.reason}`);
    }
  } catch (error) {
    console.error('${LOG_PREFIX} ❌ Daily summary failed:', error.message);
    console.error('${LOG_PREFIX} Stack:', error.stack);
  }

  console.log('='.repeat(60) + '\n');
}, {
  scheduled: true,
  timezone: process.env.TZ || 'UTC'
});

/**
 * Weekly Summary
 * Runs every Monday at configured time (default: 9:00 AM)
 */
cron.schedule('0 9 * * 1', async () => {
  const now = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${LOG_PREFIX} Weekly Summary - ${now}`);
  console.log('='.repeat(60));

  try {
    // Check if weekly summaries are enabled
    const config = await configService.getConfig();

    if (!config.triggerSchedule.weeklySummary.enabled) {
      console.log('${LOG_PREFIX} ⏸️  Weekly summaries disabled in config - skipping');
      return;
    }

    console.log('${LOG_PREFIX} ✓ Weekly summaries enabled - sending summary');

    // Send weekly summary via orchestrator
    const result = await notificationOrchestrator.sendScheduledSummary('weekly');

    lastRuns.weekly = now;

    if (result.sent) {
      console.log('${LOG_PREFIX} ✓ Weekly summary sent successfully');
      console.log(`${LOG_PREFIX}   - Recipients: ${result.recipients.join(', ')}`);
      console.log(`${LOG_PREFIX}   - Provider: ${result.provider}`);
    } else {
      console.log(`${LOG_PREFIX} ⚠️  Weekly summary not sent: ${result.reason}`);
    }
  } catch (error) {
    console.error('${LOG_PREFIX} ❌ Weekly summary failed:', error.message);
    console.error('${LOG_PREFIX} Stack:', error.stack);
  }

  console.log('='.repeat(60) + '\n');
}, {
  scheduled: true,
  timezone: process.env.TZ || 'UTC'
});

/**
 * Monthly Summary
 * Runs on 1st of every month at configured time (default: 9:00 AM)
 */
cron.schedule('0 9 1 * *', async () => {
  const now = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${LOG_PREFIX} Monthly Summary - ${now}`);
  console.log('='.repeat(60));

  try {
    // Check if monthly summaries are enabled
    const config = await configService.getConfig();

    if (!config.triggerSchedule.monthlySummary.enabled) {
      console.log('${LOG_PREFIX} ⏸️  Monthly summaries disabled in config - skipping');
      return;
    }

    console.log('${LOG_PREFIX} ✓ Monthly summaries enabled - sending summary');

    // Send monthly summary via orchestrator
    const result = await notificationOrchestrator.sendScheduledSummary('monthly');

    lastRuns.monthly = now;

    if (result.sent) {
      console.log('${LOG_PREFIX} ✓ Monthly summary sent successfully');
      console.log(`${LOG_PREFIX}   - Recipients: ${result.recipients.join(', ')}`);
      console.log(`${LOG_PREFIX}   - Provider: ${result.provider}`);
    } else {
      console.log(`${LOG_PREFIX} ⚠️  Monthly summary not sent: ${result.reason}`);
    }
  } catch (error) {
    console.error('${LOG_PREFIX} ❌ Monthly summary failed:', error.message);
    console.error('${LOG_PREFIX} Stack:', error.stack);
  }

  console.log('='.repeat(60) + '\n');
}, {
  scheduled: true,
  timezone: process.env.TZ || 'UTC'
});

/**
 * Health check - log status every 15 minutes
 */
cron.schedule('*/15 * * * *', () => {
  const now = new Date().toISOString();
  console.log(`${LOG_PREFIX} ❤️  Health Check - ${now}`);
  console.log('${LOG_PREFIX} Status: Running');
  console.log('${LOG_PREFIX} Last runs:');
  console.log(`${LOG_PREFIX}   - Hourly: ${lastRuns.hourly || 'Not yet run'}`);
  console.log(`${LOG_PREFIX}   - Daily: ${lastRuns.daily || 'Not yet run'}`);
  console.log(`${LOG_PREFIX}   - Weekly: ${lastRuns.weekly || 'Not yet run'}`);
  console.log(`${LOG_PREFIX}   - Monthly: ${lastRuns.monthly || 'Not yet run'}`);
}, {
  scheduled: true,
  timezone: process.env.TZ || 'UTC'
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n${LOG_PREFIX} Received SIGTERM - shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n${LOG_PREFIX} Received SIGINT - shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('${LOG_PREFIX} ❌ Uncaught Exception:', error);
  console.error('${LOG_PREFIX} Stack:', error.stack);
  // Don't exit - keep clock running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('${LOG_PREFIX} ❌ Unhandled Rejection at:', promise);
  console.error('${LOG_PREFIX} Reason:', reason);
  // Don't exit - keep clock running
});

console.log('${LOG_PREFIX} ✓ All scheduled jobs registered');
console.log('${LOG_PREFIX} ✓ Clock process ready');
console.log('${LOG_PREFIX} Scheduled jobs:');
console.log('${LOG_PREFIX}   - Hourly threshold evaluation: 0 * * * *');
console.log('${LOG_PREFIX}   - Daily summary: 0 9 * * *');
console.log('${LOG_PREFIX}   - Weekly summary: 0 9 * * 1 (Monday)');
console.log('${LOG_PREFIX}   - Monthly summary: 0 9 1 * * (1st of month)');
console.log('${LOG_PREFIX}   - Health check: */15 * * * * (every 15 min)');
console.log('='.repeat(60) + '\n');
