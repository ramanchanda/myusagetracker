const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const cron = require('node-cron');
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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors());
app.use(express.json());

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

cron.schedule('0 */6 * * *', async () => {
  console.log('Running scheduled usage check...');
  await usageMonitor.checkAndNotify();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Scheduled monitoring: Every 6 hours');
});
