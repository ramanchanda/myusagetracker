const axios = require('axios');

const HEROKU_API_BASE = 'https://api.heroku.com';

// Create Heroku client
function createHerokuClient(apiKey) {
  const resolvedApiKey = apiKey || process.env.HEROKU_API_KEY;
  if (!resolvedApiKey || resolvedApiKey === 'your_heroku_api_key_here') {
    throw new Error('HEROKU_API_KEY is not configured. Update your .env with a valid Heroku API key.');
  }

  return axios.create({
    baseURL: HEROKU_API_BASE,
    headers: {
      'Accept': 'application/vnd.heroku+json; version=3',
      'Authorization': `Bearer ${resolvedApiKey}`,
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
async function getEnterpriseAccount(client, enterpriseAccountId) {
  try {
    if (enterpriseAccountId) {
      const singleResponse = await client.get(`/enterprise-accounts/${enterpriseAccountId}`);
      return singleResponse.data;
    }

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
    console.log(`Fetching daily usage: /enterprise-accounts/${enterpriseAccountId}/usage/daily?start=${startDate}&end=${endDate}`);

    const response = await client.get(
      `/enterprise-accounts/${enterpriseAccountId}/usage/daily`,
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
    console.error(`Date range: ${startDate} to ${endDate}`);
    console.error(`Status: ${error.response?.status}`);

    if (error.response?.status === 404) {
      console.error('404 Error: No daily usage data found for this date range.');
      return []; // Return empty array instead of throwing
    }

    throw error;
  }
}

// Get team daily usage
async function getTeamDailyUsage(client, teamId, startDate, endDate) {
  try {
    const response = await client.get(
      `/teams/${teamId}/usage/daily`,
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

async function getTeamSpaces(client, teamId) {
  try {
    const response = await client.get(`/teams/${teamId}/spaces`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error(`Error fetching spaces for team ${teamId}:`, error.message);
    return [];
  }
}

async function getTeamApps(client, teamId) {
  try {
    const response = await client.get(`/teams/${teamId}/apps`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error(`Error fetching apps for team ${teamId}:`, error.message);
    return [];
  }
}

// Get app daily usage
async function getAppDailyUsage(client, appId, startDate, endDate) {
  try {
    const response = await client.get(
      `/apps/${appId}/usage/daily`,
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
  if (!dailyUsageData || !Array.isArray(dailyUsageData)) {
    return { days: [], summary: { totalCost: 0, avgDailyCost: 0 } };
  }

  const days = dailyUsageData.map(day => {
    const dynoCost = Number(day.dynos || 0);
    const connectCost = Number(day.connect || 0);
    const dataCost = Number(day.data || 0);
    const partnerCost = Number(day.partner || 0);
    const addonCost = Number(day.addons || 0);
    const spaceCost = Number(day.space || 0);
    const otherCost = Math.max(addonCost - dataCost, partnerCost, 0);
    const totalCost = dynoCost + addonCost + connectCost + spaceCost;

    // Count spaces from teams data (if available)
    let privateSpaces = 0;
    let shieldSpaces = 0;
    if (day.teams && Array.isArray(day.teams)) {
      // Note: Daily usage API doesn't provide per-team space breakdown
      // We'll need to aggregate this differently
    }

    return {
      date: day.date,
      totalCost,
      dynoCost,
      connectCost,
      addonCost,
      dataCost,
      otherCost,
      spaceCost,
      privateSpaces,
      shieldSpaces
    };
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Format costs
  days.forEach(day => {
    day.totalCost = parseFloat(day.totalCost.toFixed(2));
    day.dynoCost = parseFloat(day.dynoCost.toFixed(2));
    day.connectCost = parseFloat(day.connectCost.toFixed(2));
    day.addonCost = parseFloat(day.addonCost.toFixed(2));
    day.dataCost = parseFloat(day.dataCost.toFixed(2));
    day.otherCost = parseFloat(day.otherCost.toFixed(2));
    day.spaceCost = parseFloat(day.spaceCost.toFixed(2));
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
      minDailyCost: days.length > 0 ? Math.min(...days.map(d => d.totalCost)) : 0
    }
  };
}

// Get enterprise daily usage structure
async function getEnterpriseDailyUsageStructure(month, enterpriseAccountId, customStart, customEnd) {
  const client = createHerokuClient();

  try {
    const account = await getAccountInfo(client);
    const enterpriseAccount = await getEnterpriseAccount(client, enterpriseAccountId);

    if (!enterpriseAccount) {
      throw new Error('No enterprise account found');
    }

    // Get date range - use custom dates if provided, otherwise use month
    let dateRange;
    if (customStart && customEnd) {
      dateRange = { start: customStart, end: customEnd };
    } else {
      dateRange = month ? getMonthRange(month) : getCurrentMonthRange();
    }

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
      teams: [],
      spaceSummary: {
        privateSpaces: 0,
        shieldSpaces: 0
      },
      dailyBreakdown: []
    };

    // Get enterprise-level daily usage
    const enterpriseUsage = await getEnterpriseDailyUsage(
      client,
      enterpriseAccount.id,
      dateRange.start,
      dateRange.end
    );

    structure.dailyUsage = parseDailyUsage(enterpriseUsage);

    const uniqueTeamIds = new Set();
    (enterpriseUsage || []).forEach(day => {
      (day.teams || []).forEach(team => {
        if (team?.id) uniqueTeamIds.add(team.id);
      });
    });

    const teamSpaceMap = new Map();
    const teamAppSpaceMap = new Map();
    for (const teamId of uniqueTeamIds) {
      const spaces = await getTeamSpaces(client, teamId);
      const shieldSpaces = spaces.filter(space => Boolean(space.shield));
      const privateSpaces = spaces.filter(space => !Boolean(space.shield));
      teamSpaceMap.set(teamId, {
        privateSpaces: privateSpaces.length,
        shieldSpaces: shieldSpaces.length
      });

      const appSpaceByName = new Map();
      const apps = await getTeamApps(client, teamId);
      apps.forEach(app => {
        const appName = app.name;
        const appSpace = app.space || null;
        const isInShieldSpace = Boolean(appSpace?.shield);
        const isInPrivateSpace = Boolean(appSpace) && !isInShieldSpace;
        appSpaceByName.set(appName, {
          inPrivateSpace: isInPrivateSpace,
          inShieldSpace: isInShieldSpace
        });
      });
      teamAppSpaceMap.set(teamId, appSpaceByName);
    }

    structure.spaceSummary = Array.from(teamSpaceMap.values()).reduce((acc, item) => ({
      privateSpaces: acc.privateSpaces + item.privateSpaces,
      shieldSpaces: acc.shieldSpaces + item.shieldSpaces
    }), { privateSpaces: 0, shieldSpaces: 0 });

    // Add space counts to each day (spaces don't change daily, so same count for all days)
    if (structure.dailyUsage && structure.dailyUsage.days) {
      structure.dailyUsage.days.forEach(day => {
        day.privateSpaces = structure.spaceSummary.privateSpaces;
        day.shieldSpaces = structure.spaceSummary.shieldSpaces;
      });
    }

    // Build team daily usage from enterprise payload directly
    const teamMap = new Map();
    (enterpriseUsage || []).forEach(day => {
      (day.teams || []).forEach(team => {
        if (!teamMap.has(team.id)) {
          teamMap.set(team.id, { id: team.id, name: team.name, days: [] });
        }

        teamMap.get(team.id).days.push({
          date: day.date,
          dynos: Number(team.dynos || 0),
          addons: Number(team.addons || 0),
          data: Number(team.data || 0),
          partner: Number(team.partner || 0),
          space: Number(team.space || 0)
        });
      });
    });

    structure.teams = Array.from(teamMap.values()).map(team => ({
      id: team.id,
      name: team.name,
      type: 'enterprise',
      dailyUsage: parseDailyUsage(team.days)
    }));

    // Datewise rows with Team Name, App Name, Private/Shield space context
    (enterpriseUsage || []).forEach(day => {
      (day.teams || []).forEach(team => {
        const apps = Array.isArray(team.apps) ? team.apps : [];
        const spaceInfo = teamSpaceMap.get(team.id) || { privateSpaces: 0, shieldSpaces: 0 };

        if (apps.length === 0) {
          structure.dailyBreakdown.push({
            date: day.date,
            teamName: team.name || '-',
            appName: '-',
            dynoUnits: Number(team.dynos || 0),
            connectRows: Number(team.connect || 0),
            dataAddons: Number(team.data || 0),
            generalAddons: Math.max(Number(team.addons || 0) - Number(team.data || 0), Number(team.partner || 0), 0),
            privateSpaces: spaceInfo.privateSpaces,
            shieldSpaces: spaceInfo.shieldSpaces
          });
          return;
        }

        apps.forEach(app => {
          const appName = app.app_name || app.name || '-';
          const appSpaceFlags = (teamAppSpaceMap.get(team.id) || new Map()).get(appName) || {
            inPrivateSpace: false,
            inShieldSpace: false
          };

          structure.dailyBreakdown.push({
            date: day.date,
            teamName: team.name || '-',
            appName,
            dynoUnits: Number(app.dynos || 0),
            connectRows: Number(app.connect || 0),
            dataAddons: Number(app.data || 0),
            generalAddons: Math.max(Number(app.addons || 0) - Number(app.data || 0), Number(app.partner || 0), 0),
            privateSpaces: appSpaceFlags.inPrivateSpace ? 1 : 0,
            shieldSpaces: appSpaceFlags.inShieldSpace ? 1 : 0
          });
        });
      });
    });

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
  getTeamSpaces,
  getAppDailyUsage,
  parseDailyUsage
};
