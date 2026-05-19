const axios = require('axios');
const { calculateMonthlyCost } = require('./herokuService');
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
    // Filter for personal apps (those without team)
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
    category: isDataAddon ? 'data' : 'other',
    icon: isDataAddon ? '💾' : '🔧'
  };
}

// Get personal apps structure
async function getPersonalAppsStructure(month) {
  const client = createHerokuClient();

  // Check if requesting historical data
  const isHistorical = month && month !== getCurrentMonth();
  let invoiceData = null;

  if (isHistorical) {
    const invoiceService = require('./invoiceService');
    try {
      const invoice = await invoiceService.getInvoiceForMonth(month);
      if (invoice) {
        invoiceData = invoiceService.parseInvoiceCosts(invoice);
      }
    } catch (error) {
      console.error(`Error fetching invoice for ${month}:`, error.message);
    }
  }

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

    // Fetch resources for each personal app
    for (const app of personalApps) {
      try {
        const appResources = {
          name: app.name,
          id: app.id,
          dynos: { count: 0, formations: [] },
          dataAddons: { count: 0, addons: [], totalCost: 0 },
          otherAddons: { count: 0, addons: [], totalCost: 0 },
          totalMonthlyCost: 0
        };

        // Get dyno formations
        const formations = await client.get(`/apps/${app.id}/formation`);
        formations.data.forEach(formation => {
          appResources.dynos.formations.push({
            type: formation.type,
            quantity: formation.quantity,
            size: formation.size
          });
          appResources.dynos.count++;
          structure.summary.totalDynos++;
        });

        // Get add-ons
        const appAddons = await client.get(`/apps/${app.id}/addons`);
        appAddons.data.forEach(addon => {
          const addonType = categorizeAddonType(addon.addon_service.name);

          // Use invoice data for cost if available, otherwise use API price
          let cost;
          if (invoiceData) {
            const addonName = addon.name;
            const planName = addon.plan.name;
            const servicePlan = `${addon.addon_service.name}:${planName.split(':')[1] || planName}`;

            if (invoiceData.addons[addonName]) {
              cost = invoiceData.addons[addonName].cost;
            } else if (invoiceData.addons[planName]) {
              cost = invoiceData.addons[planName].cost;
            } else if (invoiceData.addons[servicePlan]) {
              cost = invoiceData.addons[servicePlan].cost;
            } else {
              const matchingAddon = Object.entries(invoiceData.addons).find(
                ([key, value]) => value.app === app.name && key.includes(addon.addon_service.name)
              );
              cost = matchingAddon ? matchingAddon[1].cost : calculateMonthlyCost(addon.plan.price);
            }
          } else {
            cost = calculateMonthlyCost(addon.plan.price);
          }

          const addonData = {
            name: addon.name,
            service: addon.addon_service.name,
            plan: addon.plan.name,
            cost: cost,
            state: addon.state
          };

          if (addonType.isData) {
            appResources.dataAddons.addons.push(addonData);
            appResources.dataAddons.count++;
            appResources.dataAddons.totalCost += cost;
          } else {
            appResources.otherAddons.addons.push(addonData);
            appResources.otherAddons.count++;
            appResources.otherAddons.totalCost += cost;
          }

          appResources.totalMonthlyCost += cost;
        });

        // Round costs
        appResources.dataAddons.totalCost = appResources.dataAddons.totalCost.toFixed(2);
        appResources.otherAddons.totalCost = appResources.otherAddons.totalCost.toFixed(2);
        appResources.totalMonthlyCost = appResources.totalMonthlyCost.toFixed(2);

        structure.apps.push(appResources);

        // Update summary
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
  categorizeAddonType
};
