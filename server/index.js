const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
// PHASE 2: cron removed - now in clock process (server/workers/scheduler.js)
require('dotenv').config();

const herokuService = require('./services/herokuService');
const notificationService = require('./services/notificationService');
const usageMonitor = require('./services/usageMonitor');
const multiGroupService = require('./services/multiGroupService');
const enterpriseService = require('./services/enterpriseService');
const personalService = require('./services/personalService');
const invoiceService = require('./services/invoiceService');
const enterpriseUsageService = require('./services/enterpriseUsageService');
const personalUsageService = require('./services/personalUsageService');
const dailyUsageService = require('./services/dailyUsageService');
const configService = require('./services/configService');
const enhancedNotificationService = require('./services/enhancedNotificationService');
const thresholdMonitor = require('./services/thresholdMonitor');
const autoThresholdMonitor = require('./services/autoThresholdMonitor');
const notificationOrchestrator = require('./services/notificationOrchestrator');
const notificationHistory = require('./services/notificationHistory'); // PHASE 4
const pdfExportRouter = require('./routes/pdfExport');
const reportsRouter = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors());
app.use(express.json());

// PDF Export Routes
app.use('/api/pdf', pdfExportRouter);

// Reports API Routes
app.use('/api/reports', reportsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/usage/dynos', async (req, res) => {
  try {
    const data = await herokuService.getDynoUsage();
    res.json(data);
  } catch (error) {
    console.error('Error fetching dyno usage:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/usage/addons', async (req, res) => {
  try {
    const data = await herokuService.getAddonUsage();
    res.json(data);
  } catch (error) {
    console.error('Error fetching addon usage:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/usage/connect', async (req, res) => {
  try {
    const data = await herokuService.getConnectUsage();
    res.json(data);
  } catch (error) {
    console.error('Error fetching connect usage:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/usage/summary', async (req, res) => {
  try {
    const [dynos, addons, connect] = await Promise.all([
      herokuService.getDynoUsage(),
      herokuService.getAddonUsage(),
      herokuService.getConnectUsage()
    ]);

    res.json({
      dynos,
      addons,
      connect,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching usage summary:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/apps', async (req, res) => {
  try {
    const apps = await herokuService.getApps();
    res.json(apps);
  } catch (error) {
    console.error('Error fetching apps:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/test-notification', async (req, res) => {
  try {
    await notificationService.sendTestNotification();
    res.json({ message: 'Test notification sent successfully' });
  } catch (error) {
    console.error('Error sending test notification:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Multi-group endpoints
app.get('/api/groups', async (req, res) => {
  try {
    const groups = multiGroupService.getGroupsList();
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/groups/discover', async (req, res) => {
  try {
    const suggestions = await multiGroupService.discoverGroups();
    res.json(suggestions);
  } catch (error) {
    console.error('Error discovering groups:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/groups/:groupId/usage', async (req, res) => {
  try {
    const groups = multiGroupService.getGroupsConfig();
    const group = groups.find(g => g.id === req.params.groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const usage = await multiGroupService.getGroupUsage(group);
    res.json(usage);
  } catch (error) {
    console.error('Error fetching group usage:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/groups/all/usage', async (req, res) => {
  try {
    const allUsage = await multiGroupService.getAllGroupsUsage();
    res.json(allUsage);
  } catch (error) {
    console.error('Error fetching all groups usage:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Personal apps endpoints (using Monthly Usage API)
app.get('/api/personal/structure', async (req, res) => {
  try {
    const month = req.query.month;
    const structure = await personalUsageService.getPersonalAppsStructure(month);
    res.json(structure);
  } catch (error) {
    console.error('Error fetching personal apps structure:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Enterprise endpoints (using Enterprise Monthly Usage API)
app.get('/api/enterprise/structure', async (req, res) => {
  try {
    const month = req.query.month;
    const enterpriseAccountId = req.query.accountId; // Optional: specific account
    const structure = await enterpriseUsageService.getEnterpriseStructure(month, enterpriseAccountId);

    // PHASE 1: Dashboard refresh no longer triggers notifications
    // Notifications are now handled by scheduled orchestrator
    // This endpoint only fetches and returns data

    res.json(structure);
  } catch (error) {
    console.error('Error fetching enterprise structure:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all enterprise accounts structure
app.get('/api/enterprise/all-accounts', async (req, res) => {
  try {
    const month = req.query.month;
    const structure = await enterpriseUsageService.getAllEnterpriseAccountsStructure(month);

    // PHASE 1: Dashboard refresh no longer triggers notifications
    // Notifications are now handled by scheduled orchestrator

    res.json(structure);
  } catch (error) {
    console.error('Error fetching all enterprise accounts:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/enterprise/trend-summary', async (req, res) => {
  try {
    const month = req.query.month;
    const enterpriseAccountId = req.query.accountId;
    const includeAllAccounts = req.query.allAccounts === 'true';
    const trend = await enterpriseUsageService.getEnterpriseTrendSummary(
      month,
      enterpriseAccountId,
      includeAllAccounts
    );
    res.json(trend);
  } catch (error) {
    console.error('Error fetching enterprise trend summary:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// List enterprise accounts
app.get('/api/enterprise/accounts', async (req, res) => {
  try {
    const client = enterpriseUsageService.createHerokuClient();
    const accounts = await enterpriseUsageService.getAllEnterpriseAccounts(client);
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching enterprise accounts list:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/enterprise/teams', async (req, res) => {
  try {
    const teams = await enterpriseUsageService.getTeams();
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get team apps with space information (lazy loading for Monthly Report)
app.get('/api/enterprise/team/:teamId/apps', async (req, res) => {
  try {
    const { teamId } = req.params;
    const appsWithSpaceInfo = await enterpriseUsageService.getTeamAppsWithSpaceInfo(teamId);
    res.json(appsWithSpaceInfo);
  } catch (error) {
    console.error(`Error fetching team apps for ${req.params.teamId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Enterprise account info
app.get('/api/enterprise/account', async (req, res) => {
  try {
    const client = require('./services/enterpriseUsageService').createHerokuClient();
    const enterpriseAccount = await enterpriseUsageService.getEnterpriseAccount();
    res.json(enterpriseAccount);
  } catch (error) {
    console.error('Error fetching enterprise account:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Daily usage endpoints
app.get('/api/enterprise/daily-usage', async (req, res) => {
  try {
    const month = req.query.month;
    const enterpriseAccountId = req.query.accountId;
    const startDate = req.query.start;
    const endDate = req.query.end;
    const structure = await dailyUsageService.getEnterpriseDailyUsageStructure(month, enterpriseAccountId, startDate, endDate);
    res.json(structure);
  } catch (error) {
    console.error('Error fetching enterprise daily usage:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/personal/daily-usage', async (req, res) => {
  try {
    const month = req.query.month;
    const structure = await dailyUsageService.getPersonalDailyUsageStructure(month);
    res.json(structure);
  } catch (error) {
    console.error('Error fetching personal daily usage:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// NOTIFICATION CONFIGURATION ENDPOINTS
// ============================================

// Get full notification configuration
app.get('/api/notifications/config', async (req, res) => {
  try {
    const config = await configService.getConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching notification config:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update full notification configuration
app.put('/api/notifications/config', async (req, res) => {
  try {
    const config = await configService.updateConfig(req.body);
    res.json(config);
  } catch (error) {
    console.error('Error updating notification config:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get email configuration
app.get('/api/notifications/email-config', async (req, res) => {
  try {
    const emailConfig = await configService.getEmailConfig();
    res.json(emailConfig);
  } catch (error) {
    console.error('Error fetching email config:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update email configuration
app.put('/api/notifications/email-config', async (req, res) => {
  try {
    const emailConfig = await configService.updateEmailConfig(req.body);
    res.json(emailConfig);
  } catch (error) {
    console.error('Error updating email config:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Test email configuration
app.post('/api/notifications/test-email', async (req, res) => {
  try {
    const testResult = await enhancedNotificationService.testEmailConfiguration();
    res.json(testResult);
  } catch (error) {
    console.error('Error testing email:', error.message);
    res.status(500).json({ error: error.message, success: false });
  }
});

// Send test notification
app.post('/api/notifications/send-test', async (req, res) => {
  try {
    // PHASE 1: Route through orchestrator
    const result = await notificationOrchestrator.sendTestNotification();
    res.json(result);
  } catch (error) {
    console.error('Error sending test notification:', error.message);
    res.status(500).json({ error: error.message, sent: false });
  }
});

// Get thresholds
app.get('/api/notifications/thresholds', async (req, res) => {
  try {
    const thresholds = await configService.getThresholds();
    res.json(thresholds);
  } catch (error) {
    console.error('Error fetching thresholds:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update thresholds
app.put('/api/notifications/thresholds', async (req, res) => {
  try {
    const thresholds = await configService.updateThresholds(req.body);
    res.json(thresholds);
  } catch (error) {
    console.error('Error updating thresholds:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update single threshold
app.put('/api/notifications/thresholds/:resourceType', async (req, res) => {
  try {
    const { resourceType } = req.params;
    const threshold = await configService.updateThreshold(resourceType, req.body);
    res.json(threshold);
  } catch (error) {
    console.error('Error updating threshold:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get trigger schedule
app.get('/api/notifications/schedule', async (req, res) => {
  try {
    const schedule = await configService.getTriggerSchedule();
    res.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update trigger schedule
app.put('/api/notifications/schedule', async (req, res) => {
  try {
    const schedule = await configService.updateTriggerSchedule(req.body);
    res.json(schedule);
  } catch (error) {
    console.error('Error updating schedule:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get alert history
app.get('/api/notifications/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await configService.getAlertHistory(limit);
    res.json(history);
  } catch (error) {
    console.error('Error fetching alert history:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Clear alert history
app.delete('/api/notifications/history', async (req, res) => {
  try {
    const result = await configService.clearAlertHistory();
    res.json(result);
  } catch (error) {
    console.error('Error clearing alert history:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger threshold monitoring
app.post('/api/notifications/check-thresholds', async (req, res) => {
  try {
    // PHASE 1: Route through orchestrator
    const result = await notificationOrchestrator.runThresholdEvaluation();
    res.json(result);
  } catch (error) {
    console.error('Error checking thresholds:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get orchestrator alert states (replaces cooldown-status)
app.get('/api/notifications/cooldown-status', async (req, res) => {
  try {
    // PHASE 1: Use orchestrator's smart alert states
    const status = notificationOrchestrator.getAlertStates();
    res.json(status);
  } catch (error) {
    console.error('Error fetching alert status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Reset alert state for testing (useful for development)
app.post('/api/notifications/reset-cooldown', async (req, res) => {
  try {
    const { resourceType } = req.body;
    // PHASE 1: Reset via orchestrator (no longer needs severity)
    notificationOrchestrator.resetAlertState(resourceType || null);
    res.json({
      success: true,
      message: resourceType
        ? `Alert state reset for ${resourceType}`
        : 'All alert states reset'
    });
  } catch (error) {
    console.error('Error resetting alert state:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Manually send usage summary
app.post('/api/notifications/send-summary', async (req, res) => {
  try {
    const period = req.body.period || 'daily';
    // PHASE 1: Route through orchestrator
    const result = await notificationOrchestrator.sendScheduledSummary(period);
    res.json(result);
  } catch (error) {
    console.error('Error sending summary:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PHASE 4: Notification History API Endpoints

// Get notification history with filters
app.get('/api/notifications/history-v2', async (req, res) => {
  try {
    const options = {
      type: req.query.type,
      status: req.query.status,
      resourceType: req.query.resourceType,
      since: req.query.since,
      until: req.query.until,
      limit: parseInt(req.query.limit) || 100
    };

    const history = await notificationHistory.getHistory(options);
    res.json(history);
  } catch (error) {
    console.error('Error fetching notification history:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get notification statistics
app.get('/api/notifications/stats', async (req, res) => {
  try {
    const options = {
      since: req.query.since,
      until: req.query.until
    };

    const stats = await notificationHistory.getStatistics(options);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching notification statistics:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get single notification event
app.get('/api/notifications/event/:id', async (req, res) => {
  try {
    const event = await notificationHistory.getEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error fetching notification event:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Clear old notification history
app.post('/api/notifications/history/cleanup', async (req, res) => {
  try {
    const daysToKeep = parseInt(req.body.daysToKeep) || 30;
    const result = await notificationHistory.clearOldHistory(daysToKeep);
    res.json(result);
  } catch (error) {
    console.error('Error clearing old history:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check addon pricing
app.get('/api/debug/addons', async (req, res) => {
  try {
    const apps = await herokuService.getApps();
    const debugInfo = [];

    for (const app of apps) {
      try {
        const axios = require('axios');
        const response = await axios.get(`https://api.heroku.com/apps/${app.id}/addons`, {
          headers: {
            'Accept': 'application/vnd.heroku+json; version=3',
            'Authorization': `Bearer ${process.env.HEROKU_API_KEY}`
          }
        });

        response.data.forEach(addon => {
          debugInfo.push({
            app: app.name,
            addon: addon.name,
            service: addon.addon_service.name,
            plan: addon.plan.name,
            priceStructure: addon.plan.price,
            state: addon.state
          });
        });
      } catch (error) {
        console.error(`Error fetching addons for ${app.name}:`, error.message);
      }
    }

    res.json(debugInfo);
  } catch (error) {
    console.error('Error in debug endpoint:', error.message);
    res.status(500).json({ error: error.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// PHASE 2: Cron jobs removed from web process
// All scheduled jobs now run in dedicated clock process (server/workers/scheduler.js)
// Web dyno focuses only on HTTP requests

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('PHASE 2: Scheduled jobs run in separate clock process');
  console.log('To enable clock: heroku ps:scale clock=1');
});
