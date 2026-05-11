const axios = require('axios');

const HEROKU_API_BASE = 'https://api.heroku.com';

// Helper to get current month in YYYY-MM format
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

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

// Get account information
async function getAccountInfo(client) {
  const response = await client.get('/account');
  return response.data;
}

// Get enterprise account
async function getEnterpriseAccount(client) {
  try {
    const configuredEnterpriseId = process.env.ENTERPRISE_ACCOUNT_ID_OR_NAME;
    if (configuredEnterpriseId) {
      const configuredResponse = await client.get(`/enterprise-accounts/${configuredEnterpriseId}`);
      return configuredResponse.data;
    }

    // Otherwise, resolve from the list of enterprise accounts
    const response = await client.get('/enterprise-accounts');

    if (response.data && response.data.length > 0) {
      return response.data[0]; // Return first enterprise account
    }

    return null;
  } catch (error) {
    console.error('Error fetching enterprise account:', error.message);
    return null;
  }
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Get enterprise account monthly usage
async function getEnterpriseMonthlyUsage(client, enterpriseAccountId, month) {
  try {
    const response = await client.get(
      `/enterprise-accounts/${enterpriseAccountId}/usage/monthly`,
      {
        params: {
          start: month,
          end: month
        }
      }
    );

    const usageRows = Array.isArray(response.data) ? response.data : [];
    return usageRows.find(row => row.month === month) || usageRows[0] || null;
  } catch (error) {
    console.error(`Error fetching enterprise monthly usage for ${month}:`, error.message);
    throw error;
  }
}

// Get team monthly usage
async function getTeamMonthlyUsage(client, teamId, month) {
  try {
    const year = month.split('-')[0];
    const monthNum = month.split('-')[1];

    const response = await client.get(
      `/teams/${teamId}/monthly-usage/${year}/${monthNum}`
    );

    return response.data;
  } catch (error) {
    console.error(`Error fetching team monthly usage for ${month}:`, error.message);
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

// Get team apps for resource details
async function getTeamApps(client, teamId) {
  try {
    const response = await client.get(`/teams/${teamId}/apps`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching apps for team ${teamId}:`, error.message);
    return [];
  }
}

// Get app addons for categorization
async function getAppAddons(client, appId) {
  try {
    const response = await client.get(`/apps/${appId}/addons`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching addons for app ${appId}:`, error.message);
    return [];
  }
}

// Get app dynos for details
async function getAppDynos(client, appId) {
  try {
    const response = await client.get(`/apps/${appId}/formation`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching dynos for app ${appId}:`, error.message);
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
    category: isDataAddon ? 'data' : 'other',
    icon: isDataAddon ? '💾' : '🔧'
  };
}

// Parse team usage data into our structure
function parseTeamUsage(team) {
  const dynosUsage = toNumber(team.dynos);
  const dataUsage = toNumber(team.data);
  const partnerUsage = toNumber(team.partner);
  const addonsUsage = toNumber(team.addons);
  const connectUsage = toNumber(team.connect);
  const spaceUsage = toNumber(team.space);
  const otherAddonsUsage = Math.max(addonsUsage - dataUsage, partnerUsage, 0);

  const teamApps = Array.isArray(team.apps) ? team.apps : [];

  const resources = {
    teamName: team.name,
    teamType: team.type || 'team',
    totalApps: teamApps.length,

    dynos: {
      count: dynosUsage,
      totalQuantity: 0,
      formations: [],
      cost: dynosUsage
    },

    dataAddons: {
      count: dataUsage,
      addons: [],
      totalCost: dataUsage
    },

    otherAddons: {
      count: otherAddonsUsage,
      addons: [],
      totalCost: otherAddonsUsage
    },

    connect: {
      used: connectUsage
    },

    space: {
      used: spaceUsage
    },

    totalMonthlyCost: dynosUsage + addonsUsage + connectUsage + spaceUsage
  };

  // Fallback if addon total is missing in API response
  if (addonsUsage === 0 && resources.totalMonthlyCost === dynosUsage + connectUsage + spaceUsage) {
    resources.totalMonthlyCost += dataUsage + partnerUsage;
  }

  // Format costs
  resources.dynos.cost = resources.dynos.cost.toFixed(2);
  resources.dataAddons.totalCost = resources.dataAddons.totalCost.toFixed(2);
  resources.otherAddons.totalCost = resources.otherAddons.totalCost.toFixed(2);
  resources.totalMonthlyCost = resources.totalMonthlyCost.toFixed(2);

  return resources;
}

// Get complete enterprise structure using Enterprise APIs
async function getEnterpriseStructure(month) {
  const client = createHerokuClient();
  const targetMonth = month || getCurrentMonth();

  try {
    const account = await getAccountInfo(client);
    const enterpriseAccount = await getEnterpriseAccount(client);

    if (!enterpriseAccount) {
      throw new Error('No enterprise account found');
    }

    const structure = {
      account: {
        email: account.email,
        name: account.name,
        id: account.id,
        enterpriseAccountId: enterpriseAccount.id,
        enterpriseAccountName: enterpriseAccount.name
      },
      teams: [],
      summary: {
        totalTeams: 0,
        totalApps: 0,
        totalDynos: 0,
        totalDataAddons: 0,
        totalOtherAddons: 0,
        totalMonthlyCost: 0
      }
    };

    // Get enterprise-level monthly usage
    const enterpriseUsage = await getEnterpriseMonthlyUsage(
      client,
      enterpriseAccount.id,
      targetMonth
    );

    if (!enterpriseUsage || !Array.isArray(enterpriseUsage.teams)) {
      return structure;
    }

    const enterpriseTeams = enterpriseUsage.teams;
    structure.summary.totalTeams = enterpriseTeams.length;

    // Build team resources from enterprise monthly usage payload
    for (const team of enterpriseTeams) {
      try {
        const teamResources = parseTeamUsage(team);

        structure.teams.push({
          id: team.id,
          name: team.name,
          type: 'enterprise',
          resources: teamResources
        });

        // Update summary
        structure.summary.totalApps += teamResources.totalApps;
        structure.summary.totalDynos += teamResources.dynos.count;
        structure.summary.totalDataAddons += teamResources.dataAddons.count;
        structure.summary.totalOtherAddons += teamResources.otherAddons.count;
        structure.summary.totalMonthlyCost += parseFloat(teamResources.totalMonthlyCost);
      } catch (error) {
        console.error(`Error processing team ${team.name}:`, error.message);
      }
    }

    structure.summary.totalMonthlyCost = structure.summary.totalMonthlyCost.toFixed(2);

    return structure;
  } catch (error) {
    throw new Error(`Failed to fetch enterprise structure: ${error.message}`);
  }
}

module.exports = {
  getEnterpriseStructure,
  getEnterpriseAccount,
  getEnterpriseMonthlyUsage,
  getTeamMonthlyUsage,
  getTeams,
  createHerokuClient
};
