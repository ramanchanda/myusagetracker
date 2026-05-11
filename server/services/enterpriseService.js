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

// Get account information
async function getAccountInfo(client) {
  const response = await client.get('/account');
  return response.data;
}

// Get all teams the user is part of
async function getTeams(client) {
  try {
    const response = await client.get('/teams');
    return response.data;
  } catch (error) {
    console.error('Error fetching teams:', error.message);
    return [];
  }
}

// Get team details
async function getTeamDetails(client, teamName) {
  try {
    const response = await client.get(`/teams/${teamName}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching team ${teamName}:`, error.message);
    return null;
  }
}

// Get apps for a team
async function getTeamApps(client, teamName) {
  try {
    const response = await client.get(`/teams/${teamName}/apps`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching apps for team ${teamName}:`, error.message);
    return [];
  }
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

  // Data add-ons (databases, caches, etc.)
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

// Get resource usage for a specific team
async function getTeamResourceUsage(client, teamName, teamType = 'team') {
  try {
    const apps = await getTeamApps(client, teamName);

    // Initialize resource summary
    const resources = {
      teamName: teamName,
      teamType: teamType,
      totalApps: apps.length,

      // Dynos
      dynos: {
        count: 0,
        totalQuantity: 0,
        formations: []
      },

      // Connect (if applicable)
      connect: {
        used: 0,
        limit: 0,
        percentage: 0
      },

      // Data Add-ons
      dataAddons: {
        count: 0,
        addons: [],
        totalCost: 0
      },

      // Other Add-ons
      otherAddons: {
        count: 0,
        addons: [],
        totalCost: 0
      },

      // Total
      totalMonthlyCost: 0
    };

    // Fetch dynos and add-ons for each app
    for (const app of apps) {
      try {
        // Get dyno formations
        const formations = await client.get(`/apps/${app.id}/formation`);
        formations.data.forEach(formation => {
          resources.dynos.formations.push({
            appName: app.name,
            type: formation.type,
            quantity: formation.quantity,
            size: formation.size
          });
          resources.dynos.count++;
          resources.dynos.totalQuantity += formation.quantity;
        });

        // Get add-ons
        const appAddons = await client.get(`/apps/${app.id}/addons`);
        appAddons.data.forEach(addon => {
          const addonType = categorizeAddonType(addon.addon_service.name);

          // Handle different price formats from Heroku API
          let cost = 0;
          if (addon.plan && addon.plan.price) {
            if (typeof addon.plan.price === 'number') {
              cost = addon.plan.price;
            } else if (addon.plan.price.cents !== undefined) {
              cost = addon.plan.price.cents / 100;
            } else if (addon.plan.price.unit !== undefined) {
              // Some plans have unit pricing
              cost = parseFloat(addon.plan.price.unit) || 0;
            }
          }

          // Log for debugging
          if (cost === 0 && addon.plan) {
            console.log(`Zero cost for addon: ${addon.name}, plan: ${addon.plan.name}, price structure:`, JSON.stringify(addon.plan.price));
          }

          const addonData = {
            name: addon.name,
            service: addon.addon_service.name,
            plan: addon.plan.name,
            cost: cost,
            appName: app.name,
            state: addon.state,
            priceInfo: addon.plan.price // Include for debugging
          };

          if (addonType.isData) {
            resources.dataAddons.addons.push(addonData);
            resources.dataAddons.count++;
            resources.dataAddons.totalCost += cost;
          } else {
            resources.otherAddons.addons.push(addonData);
            resources.otherAddons.count++;
            resources.otherAddons.totalCost += cost;
          }

          resources.totalMonthlyCost += cost;
        });
      } catch (error) {
        console.error(`Error fetching resources for app ${app.name}:`, error.message);
      }
    }

    // Round costs
    resources.dataAddons.totalCost = resources.dataAddons.totalCost.toFixed(2);
    resources.otherAddons.totalCost = resources.otherAddons.totalCost.toFixed(2);
    resources.totalMonthlyCost = resources.totalMonthlyCost.toFixed(2);

    return resources;
  } catch (error) {
    throw new Error(`Failed to fetch team resources: ${error.message}`);
  }
}

// Get complete enterprise structure with all teams and resources
async function getEnterpriseStructure() {
  const client = createHerokuClient();

  try {
    const account = await getAccountInfo(client);
    const teams = await getTeams(client);

    const structure = {
      account: {
        email: account.email,
        name: account.name,
        id: account.id
      },
      personalApps: null,
      teams: [],
      summary: {
        totalTeams: teams.length,
        totalApps: 0,
        totalDynos: 0,
        totalDataAddons: 0,
        totalOtherAddons: 0,
        totalMonthlyCost: 0
      }
    };

    // Get personal apps (non-team)
    const personalApps = await getPersonalApps(client);
    if (personalApps.length > 0) {
      // Create a "personal" pseudo-team for personal apps
      const personalResources = {
        teamName: 'Personal Apps',
        teamType: 'personal',
        totalApps: personalApps.length,
        dynos: { count: 0, totalQuantity: 0, formations: [] },
        connect: { used: 0, limit: 0, percentage: 0 },
        dataAddons: { count: 0, addons: [], totalCost: '0.00' },
        otherAddons: { count: 0, addons: [], totalCost: '0.00' },
        totalMonthlyCost: '0.00'
      };

      // Fetch resources for personal apps
      for (const app of personalApps) {
        try {
          const formations = await client.get(`/apps/${app.id}/formation`);
          formations.data.forEach(formation => {
            personalResources.dynos.formations.push({
              appName: app.name,
              type: formation.type,
              quantity: formation.quantity,
              size: formation.size
            });
            personalResources.dynos.count++;
            personalResources.dynos.totalQuantity += formation.quantity;
          });

          const appAddons = await client.get(`/apps/${app.id}/addons`);
          appAddons.data.forEach(addon => {
            const addonType = categorizeAddonType(addon.addon_service.name);

            // Handle different price formats
            let cost = 0;
            if (addon.plan && addon.plan.price) {
              if (typeof addon.plan.price === 'number') {
                cost = addon.plan.price;
              } else if (addon.plan.price.cents !== undefined) {
                cost = addon.plan.price.cents / 100;
              } else if (addon.plan.price.unit !== undefined) {
                cost = parseFloat(addon.plan.price.unit) || 0;
              }
            }

            const addonData = {
              name: addon.name,
              service: addon.addon_service.name,
              plan: addon.plan.name,
              cost: cost,
              appName: app.name,
              state: addon.state
            };

            if (addonType.isData) {
              personalResources.dataAddons.addons.push(addonData);
              personalResources.dataAddons.count++;
              personalResources.dataAddons.totalCost = (parseFloat(personalResources.dataAddons.totalCost) + cost).toFixed(2);
            } else {
              personalResources.otherAddons.addons.push(addonData);
              personalResources.otherAddons.count++;
              personalResources.otherAddons.totalCost = (parseFloat(personalResources.otherAddons.totalCost) + cost).toFixed(2);
            }

            personalResources.totalMonthlyCost = (parseFloat(personalResources.totalMonthlyCost) + cost).toFixed(2);
          });
        } catch (error) {
          console.error(`Error fetching resources for personal app ${app.name}:`, error.message);
        }
      }

      structure.personalApps = personalResources;
      structure.summary.totalApps += personalApps.length;
      structure.summary.totalDynos += personalResources.dynos.count;
      structure.summary.totalDataAddons += personalResources.dataAddons.count;
      structure.summary.totalOtherAddons += personalResources.otherAddons.count;
      structure.summary.totalMonthlyCost += parseFloat(personalResources.totalMonthlyCost);
    }

    // Get resources for each team
    for (const team of teams) {
      try {
        const teamDetails = await getTeamDetails(client, team.name);
        const teamResources = await getTeamResourceUsage(client, team.name, team.type);

        structure.teams.push({
          ...teamDetails,
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
  getTeams,
  getTeamResourceUsage,
  getTeamDetails,
  categorizeAddonType
};
