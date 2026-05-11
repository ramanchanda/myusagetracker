const axios = require('axios');

const HEROKU_API_BASE = 'https://api.heroku.com';

// Create Heroku client
function createHerokuClient(apiKey) {
  return axios.create({
    baseURL: HEROKU_API_BASE,
    headers: {
      'Accept': 'application/vnd.heroku+json; version=3',
      'Authorization': `Bearer ${apiKey || process.env.HEROKU_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
}

// Helper to get date range for current month
function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayFormatted = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { start: firstDay, end: lastDayFormatted };
}

// Helper to get date range for specific month
function getMonthRange(month) {
  const [year, monthNum] = month.split('-').map(Number);
  const firstDay = `${year}-${String(monthNum).padStart(2, '0')}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const lastDayFormatted = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { start: firstDay, end: lastDayFormatted };
}

// Get account information
async function getAccountInfo(client) {
  const response = await client.get('/account');
  return response.data;
}

// Get enterprise account
async function getEnterpriseAccount(client) {
  try {
    const response = await client.get('/enterprise-accounts');
    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
    return null;
  } catch (error) {
    console.error('Error fetching enterprise account:', error.message);
    return null;
  }
}

// Get enterprise account daily usage
async function getEnterpriseDailyUsage(client, enterpriseAccountId, startDate, endDate) {
  try {
    const response = await client.get(
      `/enterprise-accounts/${enterpriseAccountId}/daily-usage`,
      {
        params: {
          start: startDate,
          end: endDate
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error(`Error fetching enterprise daily usage:`, error.message);
    throw error;
  }
}

// Get team daily usage
async function getTeamDailyUsage(client, teamId, startDate, endDate) {
  try {
    const response = await client.get(
      `/teams/${teamId}/daily-usage`,
      {
        params: {
          start: startDate,
          end: endDate
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error(`Error fetching team daily usage:`, error.message);
    return null;
  }
}

// Get app daily usage
async function getAppDailyUsage(client, appId, startDate, endDate) {
  try {
    const response = await client.get(
      `/apps/${appId}/daily-usage`,
      {
        params: {
          start: startDate,
          end: endDate
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error(`Error fetching app daily usage:`, error.message);
    return null;
  }
}

// Get all teams
async function getTeams(client) {
  try {
    const response = await client.get('/teams');
    return response.data;
  } catch (error) {
    console.error('Error fetching teams:', error.message);
    return [];
  }
}

// Get personal apps
async function getPersonalApps(client) {
  try {
    const allApps = await client.get('/apps');
    return allApps.data.filter(app => !app.team);
  } catch (error) {
    console.error('Error fetching personal apps:', error.message);
    return [];
  }
}

// Categorize add-on as Data or Other
function categorizeAddonType(addonServiceName) {
  const serviceName = addonServiceName.toLowerCase();

  const dataServices = [
    'postgres', 'postgresql', 'heroku-postgresql',
    'redis', 'heroku-redis',
    'mongodb', 'mongo', 'mlab',
    'mysql', 'cleardb',
    'elasticsearch', 'bonsai', 'searchbox',
    'memcache', 'memcached'
  ];

  const isDataAddon = dataServices.some(service => serviceName.includes(service));

  return {
    isData: isDataAddon,
    category: isDataAddon ? 'data' : 'other'
  };
}

// Parse daily usage data into aggregated format
function parseDailyUsage(dailyUsageData) {
  if (!dailyUsageData || !dailyUsageData.data) {
    return { days: [], summary: { totalCost: 0, avgDailyCost: 0 } };
  }

  // Group by date
  const dailyMap = {};

  dailyUsageData.data.forEach(item => {
    const date = item.date;

    if (!dailyMap[date]) {
      dailyMap[date] = {
        date: date,
        totalCost: 0,
        dynoCost: 0,
        addonCost: 0,
        dataCost: 0,
        otherCost: 0,
        items: []
      };
    }

    const dayData = dailyMap[date];
    dayData.totalCost += item.cost;
    dayData.items.push(item);

    // Categorize costs
    if (item.type === 'dyno') {
      dayData.dynoCost += item.cost;
    } else if (item.type === 'addon') {
      dayData.addonCost += item.cost;

      // Further categorize addons
      const addonType = categorizeAddonType(item.addon_service_name || '');
      if (addonType.isData) {
        dayData.dataCost += item.cost;
      } else {
        dayData.otherCost += item.cost;
      }
    }
  });

  // Convert to sorted array
  const days = Object.values(dailyMap).sort((a, b) =>
    new Date(a.date) - new Date(b.date)
  );

  // Format costs
  days.forEach(day => {
    day.totalCost = parseFloat(day.totalCost.toFixed(2));
    day.dynoCost = parseFloat(day.dynoCost.toFixed(2));
    day.addonCost = parseFloat(day.addonCost.toFixed(2));
    day.dataCost = parseFloat(day.dataCost.toFixed(2));
    day.otherCost = parseFloat(day.otherCost.toFixed(2));
  });

  // Calculate summary
  const totalCost = days.reduce((sum, day) => sum + day.totalCost, 0);
  const avgDailyCost = days.length > 0 ? totalCost / days.length : 0;

  return {
    days: days,
    summary: {
      totalCost: parseFloat(totalCost.toFixed(2)),
      avgDailyCost: parseFloat(avgDailyCost.toFixed(2)),
      totalDays: days.length,
      maxDailyCost: Math.max(...days.map(d => d.totalCost), 0),
      minDailyCost: Math.min(...days.map(d => d.totalCost), 0)
    }
  };
}

// Get enterprise daily usage structure
async function getEnterpriseDailyUsageStructure(month) {
  const client = createHerokuClient();

  try {
    const account = await getAccountInfo(client);
    const enterpriseAccount = await getEnterpriseAccount(client);

    if (!enterpriseAccount) {
      throw new Error('No enterprise account found');
    }

    // Get date range
    const dateRange = month ? getMonthRange(month) : getCurrentMonthRange();

    const structure = {
      account: {
        email: account.email,
        name: account.name,
        id: account.id,
        enterpriseAccountId: enterpriseAccount.id,
        enterpriseAccountName: enterpriseAccount.name
      },
      dateRange: dateRange,
      dailyUsage: null,
      teams: []
    };

    // Get enterprise-level daily usage
    const enterpriseUsage = await getEnterpriseDailyUsage(
      client,
      enterpriseAccount.id,
      dateRange.start,
      dateRange.end
    );

    structure.dailyUsage = parseDailyUsage(enterpriseUsage);

    // Get teams and their daily usage
    const teams = await getTeams(client);

    for (const team of teams) {
      try {
        const teamUsage = await getTeamDailyUsage(
          client,
          team.id,
          dateRange.start,
          dateRange.end
        );

        structure.teams.push({
          id: team.id,
          name: team.name,
          type: team.type,
          dailyUsage: parseDailyUsage(teamUsage)
        });
      } catch (error) {
        console.error(`Error processing team ${team.name}:`, error.message);
      }
    }

    return structure;
  } catch (error) {
    throw new Error(`Failed to fetch enterprise daily usage: ${error.message}`);
  }
}

// Get personal apps daily usage structure
async function getPersonalDailyUsageStructure(month) {
  const client = createHerokuClient();

  try {
    const account = await getAccountInfo(client);
    const personalApps = await getPersonalApps(client);

    // Get date range
    const dateRange = month ? getMonthRange(month) : getCurrentMonthRange();

    const structure = {
      account: {
        email: account.email,
        name: account.name,
        id: account.id
      },
      dateRange: dateRange,
      apps: []
    };

    // Get daily usage for each personal app
    for (const app of personalApps) {
      try {
        const appUsage = await getAppDailyUsage(
          client,
          app.id,
          dateRange.start,
          dateRange.end
        );

        structure.apps.push({
          id: app.id,
          name: app.name,
          dailyUsage: parseDailyUsage(appUsage)
        });
      } catch (error) {
        console.error(`Error processing app ${app.name}:`, error.message);
      }
    }

    // Calculate overall summary
    const allDays = {};
    structure.apps.forEach(app => {
      app.dailyUsage.days.forEach(day => {
        if (!allDays[day.date]) {
          allDays[day.date] = { date: day.date, totalCost: 0 };
        }
        allDays[day.date].totalCost += day.totalCost;
      });
    });

    const days = Object.values(allDays).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    const totalCost = days.reduce((sum, day) => sum + day.totalCost, 0);
    const avgDailyCost = days.length > 0 ? totalCost / days.length : 0;

    structure.summary = {
      totalApps: personalApps.length,
      totalCost: parseFloat(totalCost.toFixed(2)),
      avgDailyCost: parseFloat(avgDailyCost.toFixed(2)),
      totalDays: days.length
    };

    return structure;
  } catch (error) {
    throw new Error(`Failed to fetch personal daily usage: ${error.message}`);
  }
}

module.exports = {
  getEnterpriseDailyUsageStructure,
  getPersonalDailyUsageStructure,
  getEnterpriseDailyUsage,
  getTeamDailyUsage,
  getAppDailyUsage,
  parseDailyUsage
};
