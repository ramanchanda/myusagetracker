const axios = require('axios');
const { createHerokuClient, HEROKU_API_BASE } = require('./herokuClient');

// Helper to get current month in YYYY-MM format
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get account information
async function getAccountInfo(client) {
  const response = await client.get('/account');
  return response.data;
}

// Get personal apps (non-team)
async function getPersonalApps(client) {
  try {
    const allApps = await client.get('/apps');
    return allApps.data.filter(app => !app.team);
  } catch (error) {
    console.error('Error fetching personal apps:', error.message);
    return [];
  }
}

// Get app monthly usage
async function getAppMonthlyUsage(client, appId, month) {
  try {
    const year = month.split('-')[0];
    const monthNum = month.split('-')[1];

    const response = await client.get(
      `/apps/${appId}/monthly-usage/${year}/${monthNum}`
    );

    return response.data;
  } catch (error) {
    console.error(`Error fetching app monthly usage for ${appId}:`, error.message);
    return null;
  }
}

// Get app addons for details
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

// Parse app usage data
async function parseAppUsage(client, app, appUsage, addons, dynos) {
  const appResources = {
    name: app.name,
    id: app.id,
    dynos: { count: 0, formations: [], cost: 0 },
    dataAddons: { count: 0, addons: [], totalCost: 0 },
    otherAddons: { count: 0, addons: [], totalCost: 0 },
    totalMonthlyCost: 0
  };

  if (!appUsage || !appUsage.data) {
    // Fallback to just showing configured resources without costs
    dynos.forEach(dyno => {
      appResources.dynos.formations.push({
        type: dyno.type,
        quantity: dyno.quantity,
        size: dyno.size,
        cost: 0
      });
      appResources.dynos.count++;
    });

    addons.forEach(addon => {
      const addonType = categorizeAddonType(addon.addon_service.name);
      const addonData = {
        name: addon.name,
        service: addon.addon_service.name,
        plan: addon.plan.name,
        cost: 0,
        state: addon.state
      };

      if (addonType.isData) {
        appResources.dataAddons.addons.push(addonData);
        appResources.dataAddons.count++;
      } else {
        appResources.otherAddons.addons.push(addonData);
        appResources.otherAddons.count++;
      }
    });

    return appResources;
  }

  // Process usage data from API
  appResources.totalMonthlyCost = appUsage.data.reduce((sum, item) => sum + item.cost, 0);

  // Create addon lookup map
  const addonMap = {};
  addons.forEach(addon => {
    addonMap[addon.id] = addon;
  });

  for (const item of appUsage.data) {
    // Dyno usage
    if (item.type === 'dyno') {
      appResources.dynos.cost += item.cost;

      // Match with formation details
      const dyno = dynos.find(d => d.type === item.dyno_type);
      if (dyno) {
        appResources.dynos.formations.push({
          type: dyno.type,
          quantity: dyno.quantity,
          size: dyno.size,
          cost: item.cost
        });
        appResources.dynos.count++;
      }
    }

    // Add-on usage
    else if (item.type === 'addon') {
      const addon = addonMap[item.addon_id];

      if (addon) {
        const addonType = categorizeAddonType(addon.addon_service.name);

        const addonData = {
          name: addon.name,
          service: addon.addon_service.name,
          plan: addon.plan.name,
          cost: item.cost,
          state: addon.state,
          quantity: item.quantity || 1
        };

        if (addonType.isData) {
          appResources.dataAddons.addons.push(addonData);
          appResources.dataAddons.count++;
          appResources.dataAddons.totalCost += item.cost;
        } else {
          appResources.otherAddons.addons.push(addonData);
          appResources.otherAddons.count++;
          appResources.otherAddons.totalCost += item.cost;
        }
      }
    }
  }

  // Format costs
  appResources.dynos.cost = appResources.dynos.cost.toFixed(2);
  appResources.dataAddons.totalCost = appResources.dataAddons.totalCost.toFixed(2);
  appResources.otherAddons.totalCost = appResources.otherAddons.totalCost.toFixed(2);
  appResources.totalMonthlyCost = appResources.totalMonthlyCost.toFixed(2);

  return appResources;
}

// Get personal apps structure using monthly usage APIs
async function getPersonalAppsStructure(month) {
  const client = createHerokuClient();
  const targetMonth = month || getCurrentMonth();

  try {
    const account = await getAccountInfo(client);
    const personalApps = await getPersonalApps(client);

    const structure = {
      account: {
        email: account.email,
        name: account.name,
        id: account.id
      },
      apps: [],
      summary: {
        totalApps: personalApps.length,
        totalDynos: 0,
        totalDataAddons: 0,
        totalOtherAddons: 0,
        totalMonthlyCost: 0
      }
    };

    // Fetch usage for each personal app
    for (const app of personalApps) {
      try {
        const [appUsage, addons, dynos] = await Promise.all([
          getAppMonthlyUsage(client, app.id, targetMonth),
          getAppAddons(client, app.id),
          getAppDynos(client, app.id)
        ]);

        const appResources = await parseAppUsage(client, app, appUsage, addons, dynos);

        structure.apps.push(appResources);

        // Update summary
        structure.summary.totalDynos += appResources.dynos.count;
        structure.summary.totalDataAddons += appResources.dataAddons.count;
        structure.summary.totalOtherAddons += appResources.otherAddons.count;
        structure.summary.totalMonthlyCost += parseFloat(appResources.totalMonthlyCost);
      } catch (error) {
        console.error(`Error fetching resources for app ${app.name}:`, error.message);
      }
    }

    structure.summary.totalMonthlyCost = structure.summary.totalMonthlyCost.toFixed(2);

    return structure;
  } catch (error) {
    throw new Error(`Failed to fetch personal apps structure: ${error.message}`);
  }
}

module.exports = {
  getPersonalAppsStructure,
  getPersonalApps,
  getAppMonthlyUsage
};
