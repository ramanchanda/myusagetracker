const axios = require('axios');

const HEROKU_API_BASE = 'https://api.heroku.com';

// Helper to get current month in YYYY-MM format
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

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

// Get account information
async function getAccountInfo(client) {
  const response = await client.get('/account');
  return response.data;
}

// Get enterprise account
async function getEnterpriseAccount(client) {
  try {
    // First get the account to find enterprise account ID
    const account = await getAccountInfo(client);

    // Try to get enterprise accounts
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

// Get enterprise account monthly usage
async function getEnterpriseMonthlyUsage(client, enterpriseAccountId, month) {
  try {
    const year = month.split('-')[0];
    const monthNum = month.split('-')[1];

    const response = await client.get(
      `/enterprise-accounts/${enterpriseAccountId}/monthly-usage/${year}/${monthNum}`
    );

    return response.data;
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
async function parseTeamUsage(client, team, teamUsage) {
  const resources = {
    teamName: team.name,
    teamType: team.type || 'team',
    totalApps: 0,

    dynos: {
      count: 0,
      totalQuantity: 0,
      formations: [],
      cost: 0
    },

    dataAddons: {
      count: 0,
      addons: [],
      totalCost: 0
    },

    otherAddons: {
      count: 0,
      addons: [],
      totalCost: 0
    },

    totalMonthlyCost: 0
  };

  if (!teamUsage) {
    return resources;
  }

  // Get team apps for details
  const apps = await getTeamApps(client, team.id);
  resources.totalApps = apps.length;

  // Map to store app details
  const appDetailsMap = {};

  // Fetch detailed info for each app
  for (const app of apps) {
    try {
      const [dynos, addons] = await Promise.all([
        getAppDynos(client, app.id),
        getAppAddons(client, app.id)
      ]);

      appDetailsMap[app.id] = {
        name: app.name,
        dynos: dynos,
        addons: addons
      };
    } catch (error) {
      console.error(`Error fetching details for app ${app.name}:`, error.message);
    }
  }

  // Process data from team usage API
  if (teamUsage.data) {
    resources.totalMonthlyCost = teamUsage.data.reduce((sum, item) => sum + item.cost, 0);

    // Process each usage item
    for (const item of teamUsage.data) {
      const appDetails = appDetailsMap[item.app_id] || { name: 'Unknown' };

      // Dyno usage
      if (item.type === 'dyno') {
        resources.dynos.cost += item.cost;
        resources.dynos.count++;

        // Add formation details if available
        if (appDetails.dynos) {
          appDetails.dynos.forEach(dyno => {
            resources.dynos.formations.push({
              appName: appDetails.name,
              type: dyno.type,
              quantity: dyno.quantity,
              size: dyno.size,
              cost: item.cost / appDetails.dynos.length // Split cost evenly
            });
            resources.dynos.totalQuantity += dyno.quantity;
          });
        }
      }

      // Add-on usage
      else if (item.type === 'addon') {
        // Find the addon details to categorize
        let addonService = 'unknown';
        let addonPlan = 'unknown';

        if (appDetails.addons) {
          const addon = appDetails.addons.find(a => a.id === item.addon_id);
          if (addon) {
            addonService = addon.addon_service.name;
            addonPlan = addon.plan.name;
          }
        }

        const addonType = categorizeAddonType(addonService);

        const addonData = {
          name: item.addon_name || 'Unknown',
          service: addonService,
          plan: addonPlan,
          cost: item.cost,
          appName: appDetails.name,
          quantity: item.quantity || 1
        };

        if (addonType.isData) {
          resources.dataAddons.addons.push(addonData);
          resources.dataAddons.count++;
          resources.dataAddons.totalCost += item.cost;
        } else {
          resources.otherAddons.addons.push(addonData);
          resources.otherAddons.count++;
          resources.otherAddons.totalCost += item.cost;
        }
      }
    }
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
    try {
      const enterpriseUsage = await getEnterpriseMonthlyUsage(
        client,
        enterpriseAccount.id,
        targetMonth
      );

      console.log(`Enterprise usage for ${targetMonth}:`, JSON.stringify(enterpriseUsage, null, 2));
    } catch (error) {
      console.error('Could not fetch enterprise-level usage:', error.message);
    }

    // Get all teams
    const teams = await getTeams(client);
    structure.summary.totalTeams = teams.length;

    // Get usage for each team
    for (const team of teams) {
      try {
        const teamUsage = await getTeamMonthlyUsage(client, team.id, targetMonth);
        const teamResources = await parseTeamUsage(client, team, teamUsage);

        structure.teams.push({
          id: team.id,
          name: team.name,
          type: team.type,
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
  getTeams
};
