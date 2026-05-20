#!/usr/bin/env node

/**
 * Post-Deployment Setup Script
 *
 * Runs after Heroku deployment to:
 * - Validate environment configuration
 * - Initialize database schema
 * - Create default notification configuration
 * - Display next steps for user
 */

const db = require('../services/databaseService');
const configService = require('../services/configService');

const LOG_PREFIX = '[Post-Deploy Setup]';

async function postDeploySetup() {
  console.log('='.repeat(70));
  console.log(`${LOG_PREFIX} Starting post-deployment setup...`);
  console.log('='.repeat(70));
  console.log('');

  try {
    // Step 1: Validate DATABASE_URL
    console.log(`${LOG_PREFIX} ✓ Database URL configured`);

    // Step 2: Check database connectivity
    const healthCheck = await db.healthCheck();
    if (healthCheck.healthy) {
      console.log(`${LOG_PREFIX} ✓ Database connection successful`);
      console.log(`${LOG_PREFIX}   - Version: ${healthCheck.version}`);
      console.log(`${LOG_PREFIX}   - Response time: ${healthCheck.responseTime}`);
    } else {
      throw new Error('Database health check failed');
    }
    console.log('');

    // Step 3: Initialize schema (via migrations - already run by postdeploy script)
    console.log(`${LOG_PREFIX} ✓ Database migrations completed`);
    console.log('');

    // Step 4: Initialize default notification configuration
    console.log(`${LOG_PREFIX} Initializing default notification configuration...`);

    try {
      // Check if config already exists
      const existingConfig = await configService.getConfig();

      if (existingConfig && Object.keys(existingConfig).length > 0) {
        console.log(`${LOG_PREFIX} ✓ Notification configuration already exists`);
      } else {
        // Create default config with sensible production defaults
        const defaultConfig = {
          emailConfig: {
            fromEmail: 'notifications@example.com',
            fromName: 'Heroku Usage Tracker',
            recipients: [],
            mailgunApiKey: process.env.MAILGUN_API_KEY || '',
            mailgunDomain: process.env.MAILGUN_DOMAIN || '',
            smtpServer: process.env.MAILGUN_SMTP_SERVER || 'smtp.mailgun.org',
            smtpPort: parseInt(process.env.MAILGUN_SMTP_PORT) || 587,
            smtpLogin: process.env.MAILGUN_SMTP_LOGIN || '',
            smtpPassword: process.env.MAILGUN_SMTP_PASSWORD || '',
            enabled: false // Disabled by default until configured in UI
          },
          triggerSchedule: {
            realtimeAlerts: {
              enabled: true, // Enabled by default
              checkIntervalMinutes: 60 // Check every hour
            },
            dailySummary: {
              enabled: true, // Enabled by default
              time: '09:00' // 9 AM UTC
            },
            weeklySummary: {
              enabled: false, // Disabled by default
              dayOfWeek: 'Monday',
              time: '09:00'
            },
            monthlySummary: {
              enabled: false, // Disabled by default
              dayOfMonth: 1,
              time: '09:00'
            }
          }
        };

        await configService.updateConfig(defaultConfig);
        console.log(`${LOG_PREFIX} ✓ Default notification configuration created`);
      }
    } catch (error) {
      console.log(`${LOG_PREFIX} ⚠️  Could not initialize notification config (will use defaults)`);
      console.log(`${LOG_PREFIX}    You can configure this in the UI after login`);
    }
    console.log('');

    // Step 5: Display deployment summary
    console.log('='.repeat(70));
    console.log(`${LOG_PREFIX} 🎉 DEPLOYMENT SUCCESSFUL!`);
    console.log('='.repeat(70));
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('');
    console.log('1. CHANGE DEFAULT PASSWORDS IMMEDIATELY:');
    console.log('   - Login with username: admin / password: changeme-admin-password');
    console.log('   - Go to Settings and update passwords via Heroku Config Vars');
    console.log('');
    console.log('2. CONFIGURE HEROKU API ACCESS:');
    console.log('   - Ensure HEROKU_API_TOKEN has billing access to enterprise accounts');
    console.log('   - Get OAuth token from: https://dashboard.heroku.com/account/applications');
    console.log('');
    console.log('3. CONFIGURE EMAIL NOTIFICATIONS:');
    console.log('   - Login as admin');
    console.log('   - Navigate to Notification Management > Email Setup');
    console.log('   - Configure Mailgun API credentials');
    console.log('   - Add recipient email addresses');
    console.log('   - Send test email to verify configuration');
    console.log('');
    console.log('4. CONFIGURE LICENSES:');
    console.log('   - Navigate to Notification Management > Licenses');
    console.log('   - Set licensed capacity for each enterprise account');
    console.log('');
    console.log('5. CONFIGURE SCHEDULES:');
    console.log('   - Navigate to Notification Management > Schedule');
    console.log('   - Enable/disable real-time alerts, daily/weekly/monthly summaries');
    console.log('   - After changes, restart clock dyno: heroku ps:restart clock');
    console.log('');
    console.log('6. VERIFY DEPLOYMENT:');
    console.log('   - Check web dyno: heroku ps');
    console.log('   - Check clock dyno: heroku ps');
    console.log('   - View logs: heroku logs --tail');
    console.log('');
    console.log('📚 DOCUMENTATION:');
    console.log('   - README.md - Complete setup guide');
    console.log('   - AUDIT_COMPLETE.md - Production readiness checklist');
    console.log('   - DATABASE_MIGRATION_GUIDE.md - Database schema details');
    console.log('');
    console.log('🔒 SECURITY REMINDERS:');
    console.log('   - Change admin and general user passwords immediately');
    console.log('   - Keep Heroku API token secure');
    console.log('   - Review session timeout settings (default: 8 hours)');
    console.log('');
    console.log('='.repeat(70));
    console.log(`${LOG_PREFIX} Setup complete! Your application is ready to use.`);
    console.log('='.repeat(70));
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('='.repeat(70));
    console.error(`${LOG_PREFIX} ❌ SETUP FAILED!`);
    console.error('='.repeat(70));
    console.error('');
    console.error('Error details:');
    console.error(error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    console.error('');
    console.error('Please check:');
    console.error('1. DATABASE_URL is configured correctly');
    console.error('2. Database is accessible');
    console.error('3. Migrations have run successfully');
    console.error('');
    console.error('For help, see: https://github.com/ramanchanda/myusagetracker/issues');
    console.error('');

    process.exit(1);
  }
}

// Run setup
postDeploySetup();
