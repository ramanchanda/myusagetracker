const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
// PHASE 2: cron removed - now in clock process (server/workers/scheduler.js)
require('dotenv').config();

const herokuService = require('./services/herokuService');
const multiGroupService = require('./services/multiGroupService');
const enterpriseService = require('./services/enterpriseService');
const personalService = require('./services/personalService');
const invoiceService = require('./services/invoiceService');
const enterpriseUsageService = require('./services/enterpriseUsageService');
const personalUsageService = require('./services/personalUsageService');
const dailyUsageService = require('./services/dailyUsageService');
const configService = require('./services/configService');
const notificationService = require('./services/notificationService');
const thresholdMonitor = require('./services/thresholdMonitor');
const autoThresholdMonitor = require('./services/autoThresholdMonitor');
const notificationOrchestrator = require('./services/notificationOrchestrator');
const notificationHistory = require('./services/notificationHistoryDB');
const db = require('./services/databaseService');
const pdfExportRouter = require('./routes/pdfExport');
const reportsRouter = require('./routes/reports');
const enterpriseLicenseService = require('./services/enterpriseLicenseService');
const { isAuthenticated, redirectIfAuthenticated, checkSessionTimeout, requireAdmin } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - required for Heroku (app is behind a proxy)
app.set('trust proxy', 1);

// Session configuration
app.use(session({
  secret: process.env.APP_SESSION_SECRET || 'heroku-usage-tracker-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    sameSite: 'lax'
  }
}));

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors());
app.use(express.json());

// Check for session timeout on every request
app.use(checkSessionTimeout);

// Authentication routes (public)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  const adminUsername = process.env.APP_ADMIN_USERNAME;
  const adminPassword = process.env.APP_ADMIN_PASSWORD;
  const generalUsername = process.env.APP_GENERAL_USERNAME;
  const generalPassword = process.env.APP_GENERAL_PASSWORD;

  // Validate admin credentials
  if (username === adminUsername && password === adminPassword && adminUsername && adminPassword) {
    req.session.authenticated = true;
    req.session.user = {
      username: username,
      role: 'admin'
    };
    req.session.lastActivity = Date.now();
    console.log('[Auth] Admin login successful for user:', username);
    return res.json({ success: true, role: 'admin' });
  }

  // Validate general user credentials
  if (username === generalUsername && password === generalPassword && generalUsername && generalPassword) {
    req.session.authenticated = true;
    req.session.user = {
      username: username,
      role: 'general'
    };
    req.session.lastActivity = Date.now();
    console.log('[Auth] General user login successful for user:', username);
    return res.json({ success: true, role: 'general' });
  }

  res.status(401).json({ error: 'Invalid username or password' });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Simple logout route - destroys session and redirects
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

app.get('/api/auth/status', (req, res) => {
  res.json({
    authenticated: Boolean(req.session && req.session.authenticated),
    user: req.session?.user || null
  });
});

// Get current user info
app.get('/api/auth/user', isAuthenticated, (req, res) => {
  res.json(req.session.user);
});

// Serve login page (public)
app.get('/login', redirectIfAuthenticated, (req, res) => {
  console.log('[Auth] Serving login page');
  res.sendFile(path.join(__dirname, '../client/public/login.html'));
});

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Protect all API routes except auth and health
app.use('/api', (req, res, next) => {
  // Allow auth and health endpoints
  if (req.path.startsWith('/auth/') || req.path === '/health') {
    return next();
  }
  // Require authentication for all other API routes
  return isAuthenticated(req, res, next);
});

// Protected API routes
app.use('/api/pdf', pdfExportRouter);
app.use('/api/reports', reportsRouter);

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
    const result = await notificationOrchestrator.sendTestNotification();
    res.json({
      message: 'Test notification sent successfully',
      ...result
    });
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

// List enterprise accounts with billing access check
app.get('/api/enterprise/accounts', async (req, res) => {
  try {
    const client = enterpriseUsageService.createHerokuClient();
    const accounts = await enterpriseUsageService.getAllEnterpriseAccounts(client);

    // Test billing access for each account
    const accountsWithAccess = await Promise.all(
      accounts.map(async (account) => {
        const accessCheck = await enterpriseUsageService.testBillingAccess(
          client,
          account.id,
          enterpriseUsageService.getCurrentMonth()
        );
        return {
          ...account,
          has_billing_access: accessCheck.hasAccess,
          billing_error: accessCheck.error,
          billing_status: accessCheck.status
        };
      })
    );

    res.json(accountsWithAccess);
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
    const updatedBy = req.session?.user?.username || 'anonymous';
    const config = await configService.updateConfig(req.body, updatedBy);
    res.json(config);
  } catch (error) {
    console.error('Error updating notification config:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Restart clock dyno (requires admin)
// Scale clock dyno (enable/disable scheduling)
app.post('/api/scheduler/scale', requireAdmin, async (req, res) => {
  try {
    const { enabled } = req.body;
    const herokuToken = process.env.HEROKU_API_TOKEN || process.env.HEROKU_API_KEY;
    const appName = process.env.HEROKU_APP_NAME || 'herokuusagetracker';

    if (!herokuToken) {
      return res.status(500).json({
        success: false,
        message: 'HEROKU_API_TOKEN or HEROKU_API_KEY not configured.'
      });
    }

    const axios = require('axios');
    const quantity = enabled ? 1 : 0;

    // Scale clock dyno via Heroku Platform API
    await axios.patch(
      `https://api.heroku.com/apps/${appName}/formation/clock`,
      { quantity },
      {
        headers: {
          'Authorization': `Bearer ${herokuToken}`,
          'Accept': 'application/vnd.heroku+json; version=3',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[Scheduler] Clock dyno scaled to ${quantity} by ${req.session?.user?.username}`);

    res.json({
      success: true,
      message: enabled
        ? 'Scheduling enabled. Clock dyno starting...'
        : 'Scheduling disabled. Clock dyno stopped.'
    });
  } catch (error) {
    console.error('Error scaling clock dyno:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || 'Failed to scale clock dyno',
      details: error.message
    });
  }
});

// Restart clock dyno
app.post('/api/scheduler/restart', requireAdmin, async (req, res) => {
  try {
    const herokuToken = process.env.HEROKU_API_TOKEN || process.env.HEROKU_API_KEY;
    const appName = process.env.HEROKU_APP_NAME || 'herokuusagetracker';

    if (!herokuToken) {
      return res.status(500).json({
        success: false,
        message: 'HEROKU_API_TOKEN or HEROKU_API_KEY not configured. Please set this environment variable.'
      });
    }

    // Call Heroku Platform API to restart clock dyno
    const axios = require('axios');
    const response = await axios.delete(
      `https://api.heroku.com/apps/${appName}/dynos/clock.1`,
      {
        headers: {
          'Authorization': `Bearer ${herokuToken}`,
          'Accept': 'application/vnd.heroku+json; version=3',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[Scheduler] Clock dyno restart triggered by ${req.session?.user?.username}`);

    res.json({
      success: true,
      message: 'Clock dyno restarted successfully. New schedule will be applied in ~30 seconds.'
    });
  } catch (error) {
    console.error('Error restarting clock dyno:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || 'Failed to restart clock dyno',
      details: error.message
    });
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
    const testResult = await notificationService.testEmailConfiguration();
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

// Note: Threshold endpoints removed - license limits are now managed per-account
// via /api/licenses/enterprise/:accountId endpoints using enterprise_license_config table

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

// Get last audit time
app.get('/api/notifications/last-audit', async (req, res) => {
  try {
    // Query directly to order by triggered_at (most recent audit execution time)
    const query = `
      SELECT triggered_at, id
      FROM notification_history
      WHERE notification_type = 'license-audit'
        AND triggered_at IS NOT NULL
      ORDER BY triggered_at DESC
      LIMIT 1
    `;

    const db = require('./services/databaseService');
    const result = await db.query(query);

    if (result.rows.length > 0) {
      res.json({
        lastAuditTime: result.rows[0].triggered_at,
        lastAuditId: result.rows[0].id
      });
    } else {
      res.json({ lastAuditTime: null, lastAuditId: null });
    }
  } catch (error) {
    console.error('Error fetching last audit time:', error.message);
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

// ========================================
// Enterprise License Management API
// ========================================

// Get all enterprise license configs
app.get('/api/licenses/enterprise', async (req, res) => {
  try {
    const configs = await enterpriseLicenseService.getAllLicenseConfigs();
    res.json(configs);
  } catch (error) {
    console.error('Error fetching enterprise license configs:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get license config for specific enterprise account
app.get('/api/licenses/enterprise/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const config = await enterpriseLicenseService.getLicenseConfig(accountId);

    // If config doesn't have proper account_name, fetch it from Heroku
    if (!config.account_name || config.account_name === accountId) {
      try {
        const client = enterpriseUsageService.createHerokuClient();
        const account = await enterpriseUsageService.getEnterpriseAccount(client, accountId);
        if (account && account.name) {
          config.account_name = account.name;
        }
      } catch (err) {
        console.warn(`Could not fetch account name for ${accountId}:`, err.message);
      }
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching license config:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update license config (admin only)
app.put('/api/licenses/enterprise/:accountId', requireAdmin, async (req, res) => {
  try {
    const { accountId } = req.params;

    // Fetch actual account name from Heroku API
    const client = enterpriseUsageService.createHerokuClient();
    const account = await enterpriseUsageService.getEnterpriseAccount(client, accountId);

    const config = {
      ...req.body, // Spread body first
      account_id: accountId, // Then override with correct values
      account_name: account?.name || accountId // Use actual name from Heroku
    };

    const updatedBy = req.session.user.username;
    const result = await enterpriseLicenseService.upsertLicenseConfig(config, updatedBy);
    res.json(result);
  } catch (error) {
    console.error('Error updating license config:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Bulk update license configs (admin only)
app.post('/api/licenses/enterprise/bulk', requireAdmin, async (req, res) => {
  try {
    const { configs } = req.body;
    const updatedBy = req.session.user.username;
    const results = [];

    for (const config of configs) {
      const result = await enterpriseLicenseService.upsertLicenseConfig(config, updatedBy);
      results.push(result);
    }

    res.json({ success: true, updated: results.length, configs: results });
  } catch (error) {
    console.error('Error bulk updating license configs:', error.message);
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

// Production: Serve React app
if (process.env.NODE_ENV === 'production') {
  // Serve static assets EXCEPT index.html (JS, CSS, images, etc.)
  // index.html is served only after authentication via wildcard route
  app.use(express.static(path.join(__dirname, '../client/build'), {
    index: false // Don't serve index.html from static middleware
  }));

  // Wildcard route for React app - must be LAST
  // Requires authentication to serve the dashboard
  app.get('*', isAuthenticated, (req, res) => {
    console.log('[Auth] Serving dashboard - authenticated');
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// PHASE 2: Cron jobs removed from web process
// All scheduled jobs now run in dedicated clock process (server/workers/scheduler.js)
// Web dyno focuses only on HTTP requests

// Initialize database on startup
async function initializeDatabase() {
  if (process.env.DATABASE_URL) {
    try {
      console.log('[Database] Initializing PostgreSQL schema...');
      await db.initializeSchema();
      console.log('[Database] Schema initialized successfully');

      // Initialize enterprise license schema
      await enterpriseLicenseService.initializeSchema();
      console.log('[Database] Enterprise license schema initialized');

      // Health check
      const health = await db.healthCheck();
      if (health.healthy) {
        console.log('[Database] Connection healthy');
      } else {
        console.error('[Database] Health check failed:', health.error);
      }
    } catch (error) {
      console.error('[Database] Initialization failed:', error.message);
      console.error('[Database] Falling back to JSON-based history');
    }
  } else {
    console.log('[Database] DATABASE_URL not configured, using JSON-based history');
  }
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('PHASE 2: Scheduled jobs run in separate clock process');
  console.log('To enable clock: heroku ps:scale clock=1');

  // Initialize database schema
  await initializeDatabase();
});
