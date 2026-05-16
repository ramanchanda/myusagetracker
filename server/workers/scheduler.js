/**
 * Heroku Clock Process - Scheduler Worker
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

// Track last run times for debugging
const lastRuns = {
  hourly: null,
  daily: null,
  weekly: null,
  monthly: null
};

console.log('='.repeat(60));
console.log('[Clock] Heroku Clock Process Starting...');
console.log('[Clock] Environment:', process.env.NODE_ENV || 'development');
console.log('[Clock] Timezone:', process.env.TZ || 'UTC');
console.log('='.repeat(60));

/**
 * Hourly Threshold Evaluation
 * Runs every hour at :00
 */
cron.schedule('0 * * * *', async () => {
  const now = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Clock] Hourly Threshold Evaluation - ${now}`);
  console.log('='.repeat(60));

  try {
    // Check if realtime alerts are enabled
    const config = await configService.getConfig();

    if (!config.triggerSchedule.realtimeAlerts.enabled) {
      console.log('[Clock] ⏸️  Realtime alerts disabled in config - skipping');
      return;
    }

    console.log('[Clock] ✓ Realtime alerts enabled - running evaluation');

    // Run threshold evaluation via orchestrator
    const result = await notificationOrchestrator.runThresholdEvaluation();

    lastRuns.hourly = now;

    if (result.checked) {
      console.log('[Clock] ✓ Threshold evaluation complete:');
      console.log(`[Clock]   - Duration: ${result.duration}ms`);
      console.log(`[Clock]   - Checks: ${result.totalChecks}`);
      console.log(`[Clock]   - Alerts sent: ${result.alertsTriggered}`);
      console.log(`[Clock]   - Alerts suppressed: ${result.alertsSuppressed}`);

      if (result.alerts && result.alerts.length > 0) {
        result.alerts.forEach(alert => {
          if (alert.alerted) {
            console.log(`[Clock]   ✉️  ${alert.resourceType}: ${alert.percentUsed}% (${alert.severity})`);
          }
        });
      }
    } else {
      console.log(`[Clock] ⚠️  Evaluation not completed: ${result.reason || result.error}`);
    }
  } catch (error) {
    console.error('[Clock] ❌ Hourly evaluation failed:', error.message);
    console.error('[Clock] Stack:', error.stack);
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
  console.log(`[Clock] Daily Summary - ${now}`);
  console.log('='.repeat(60));

  try {
    // Check if daily summaries are enabled
    const config = await configService.getConfig();

    if (!config.triggerSchedule.dailySummary.enabled) {
      console.log('[Clock] ⏸️  Daily summaries disabled in config - skipping');
      return;
    }

    console.log('[Clock] ✓ Daily summaries enabled - sending summary');

    // Send daily summary via orchestrator
    const result = await notificationOrchestrator.sendScheduledSummary('daily');

    lastRuns.daily = now;

    if (result.sent) {
      console.log('[Clock] ✓ Daily summary sent successfully');
      console.log(`[Clock]   - Recipients: ${result.recipients.join(', ')}`);
      console.log(`[Clock]   - Provider: ${result.provider}`);
    } else {
      console.log(`[Clock] ⚠️  Daily summary not sent: ${result.reason}`);
    }
  } catch (error) {
    console.error('[Clock] ❌ Daily summary failed:', error.message);
    console.error('[Clock] Stack:', error.stack);
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
  console.log(`[Clock] Weekly Summary - ${now}`);
  console.log('='.repeat(60));

  try {
    // Check if weekly summaries are enabled
    const config = await configService.getConfig();

    if (!config.triggerSchedule.weeklySummary.enabled) {
      console.log('[Clock] ⏸️  Weekly summaries disabled in config - skipping');
      return;
    }

    console.log('[Clock] ✓ Weekly summaries enabled - sending summary');

    // Send weekly summary via orchestrator
    const result = await notificationOrchestrator.sendScheduledSummary('weekly');

    lastRuns.weekly = now;

    if (result.sent) {
      console.log('[Clock] ✓ Weekly summary sent successfully');
      console.log(`[Clock]   - Recipients: ${result.recipients.join(', ')}`);
      console.log(`[Clock]   - Provider: ${result.provider}`);
    } else {
      console.log(`[Clock] ⚠️  Weekly summary not sent: ${result.reason}`);
    }
  } catch (error) {
    console.error('[Clock] ❌ Weekly summary failed:', error.message);
    console.error('[Clock] Stack:', error.stack);
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
  console.log(`[Clock] Monthly Summary - ${now}`);
  console.log('='.repeat(60));

  try {
    // Check if monthly summaries are enabled
    const config = await configService.getConfig();

    if (!config.triggerSchedule.monthlySummary.enabled) {
      console.log('[Clock] ⏸️  Monthly summaries disabled in config - skipping');
      return;
    }

    console.log('[Clock] ✓ Monthly summaries enabled - sending summary');

    // Send monthly summary via orchestrator
    const result = await notificationOrchestrator.sendScheduledSummary('monthly');

    lastRuns.monthly = now;

    if (result.sent) {
      console.log('[Clock] ✓ Monthly summary sent successfully');
      console.log(`[Clock]   - Recipients: ${result.recipients.join(', ')}`);
      console.log(`[Clock]   - Provider: ${result.provider}`);
    } else {
      console.log(`[Clock] ⚠️  Monthly summary not sent: ${result.reason}`);
    }
  } catch (error) {
    console.error('[Clock] ❌ Monthly summary failed:', error.message);
    console.error('[Clock] Stack:', error.stack);
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
  console.log(`[Clock] ❤️  Health Check - ${now}`);
  console.log('[Clock] Status: Running');
  console.log('[Clock] Last runs:');
  console.log(`[Clock]   - Hourly: ${lastRuns.hourly || 'Not yet run'}`);
  console.log(`[Clock]   - Daily: ${lastRuns.daily || 'Not yet run'}`);
  console.log(`[Clock]   - Weekly: ${lastRuns.weekly || 'Not yet run'}`);
  console.log(`[Clock]   - Monthly: ${lastRuns.monthly || 'Not yet run'}`);
}, {
  scheduled: true,
  timezone: process.env.TZ || 'UTC'
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Clock] Received SIGTERM - shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n[Clock] Received SIGINT - shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Clock] ❌ Uncaught Exception:', error);
  console.error('[Clock] Stack:', error.stack);
  // Don't exit - keep clock running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Clock] ❌ Unhandled Rejection at:', promise);
  console.error('[Clock] Reason:', reason);
  // Don't exit - keep clock running
});

console.log('[Clock] ✓ All scheduled jobs registered');
console.log('[Clock] ✓ Clock process ready');
console.log('[Clock] Scheduled jobs:');
console.log('[Clock]   - Hourly threshold evaluation: 0 * * * *');
console.log('[Clock]   - Daily summary: 0 9 * * *');
console.log('[Clock]   - Weekly summary: 0 9 * * 1 (Monday)');
console.log('[Clock]   - Monthly summary: 0 9 1 * * (1st of month)');
console.log('[Clock]   - Health check: */15 * * * * (every 15 min)');
console.log('='.repeat(60) + '\n');
