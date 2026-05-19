const axios = require('axios');
const { createHerokuClient, HEROKU_API_BASE } = require('./herokuClient');

/**
 * Multi-Group Service
 * Supports monitoring multiple Heroku accounts/teams/enterprises
 */

// Parse groups from environment variable
function getGroupsConfig() {
  const groupsEnv = process.env.HEROKU_GROUPS;

  if (!groupsEnv) {
    // Fallback to single account (backward compatible)
    return [{
      id: 'default',
      name: process.env.GROUP_NAME || 'Default Account',
      type: 'personal',
      apiKey: process.env.HEROKU_API_KEY,
      accountEmail: process.env.HEROKU_ACCOUNT_EMAIL,
      teamName: null
    }];
  }

  try {
    return JSON.parse(groupsEnv);
  } catch (error) {
    console.error('Error parsing HEROKU_GROUPS:', error.message);
    return [];
  }
}

// Get account info for a group
async function getAccountInfo(client) {
  const response = await client.get('/account');
  return response.data;
}

// Get apps for a group (with optional team filter)
async function getApps(client, teamName = null) {
  let apps;

  if (teamName) {
    // Fetch team apps
    const response = await client.get(`/teams/${teamName}/apps`);
    apps = response.data;
  } else {
    // Fetch personal apps
    const response = await client.get('/apps');
    apps = response.data;
  }

  return apps;
}

// Get teams for an account
async function getTeams(client) {
  try {
    const response = await client.get('/teams');
    return response.data;
  } catch (error) {
    console.error('Error fetching teams:', error.message);
    return [];
  }
}

// Get usage data for a specific group
async function getGroupUsage(group) {
  const client = createHerokuClient(group.apiKey);

  try {
    const account = await getAccountInfo(client);
    const apps = await getApps(client, group.teamName);

    // Dyno usage
    const dynoData = {
      totalApps: apps.length,
      dynos: [],
      used: account.dyno_hours_used || 0,
      limit: account.dyno_hours_limit || 1000,
      usagePercentage: '0.00',
      remaining: 0
    };

    // Fetch formation for each app
    for (const app of apps) {
      try {
        const formations = await client.get(`/apps/${app.id}/formation`);
        const appDynos = formations.data.map(formation => ({
          appName: app.name,
          type: formation.type,
          quantity: formation.quantity,
          size: formation.size
        }));
        dynoData.dynos.push(...appDynos);
      } catch (error) {
        console.error(`Error fetching formation for ${app.name}:`, error.message);
      }
    }

    dynoData.usagePercentage = ((dynoData.used / dynoData.limit) * 100).toFixed(2);
    dynoData.remaining = dynoData.limit - dynoData.used;

    // Import categorization and pricing functions
    const { categorizeAddon, calculateMonthlyCost } = require('./herokuService');

    // Addon usage
    const addons = [];
    for (const app of apps) {
      try {
        const appAddons = await client.get(`/apps/${app.id}/addons`);
        for (const addon of appAddons.data) {
          const categorization = categorizeAddon(addon.addon_service.name);
          const monthlyCost = calculateMonthlyCost(addon.plan.price);
          addons.push({
            appName: app.name,
            name: addon.name,
            addonService: addon.addon_service.name,
            plan: addon.plan.name,
            price: addon.plan.price,
            monthlyCost: monthlyCost,
            state: addon.state,
            createdAt: addon.created_at,
            category: categorization.category,
            categoryType: categorization.type,
            categoryIcon: categorization.icon
          });
        }
      } catch (error) {
        console.error(`Error fetching addons for ${app.name}:`, error.message);
      }
    }

    const totalMonthlyCost = addons.reduce((sum, addon) => {
      return sum + (addon.monthlyCost || 0);
    }, 0);

    // Group addons by category
    const addonsByCategory = addons.reduce((acc, addon) => {
      const cat = addon.category;
      if (!acc[cat]) {
        acc[cat] = {
          category: cat,
          count: 0,
          addons: [],
          totalCost: 0
        };
      }
      acc[cat].count++;
      acc[cat].addons.push(addon);
      acc[cat].totalCost += (addon.monthlyCost || 0);
      return acc;
    }, {});

    // Convert to array and sort by cost
    const categorySummary = Object.values(addonsByCategory).map(cat => ({
      ...cat,
      totalCost: cat.totalCost.toFixed(2)
    })).sort((a, b) => parseFloat(b.totalCost) - parseFloat(a.totalCost));

    const addonData = {
      totalAddons: addons.length,
      addons,
      totalMonthlyCost: totalMonthlyCost.toFixed(2),
      addonsByCategory: addonsByCategory,
      categorySummary: categorySummary
    };

    // Connect usage
    const connectData = {
      connectUsed: account.connect_hours_used || 0,
      connectLimit: account.connect_hours_limit || 0,
      usagePercentage: '0.00',
      remaining: 0
    };

    if (connectData.connectLimit > 0) {
      connectData.usagePercentage =
        ((connectData.connectUsed / connectData.connectLimit) * 100).toFixed(2);
      connectData.remaining = connectData.connectLimit - connectData.connectUsed;
    }

    return {
      groupId: group.id,
      groupName: group.name,
      groupType: group.type,
      accountEmail: account.email,
      dynos: dynoData,
      addons: addonData,
      connect: connectData,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to fetch usage for group ${group.name}: ${error.message}`);
  }
}

// Get usage for all configured groups
async function getAllGroupsUsage() {
  const groups = getGroupsConfig();
  const results = [];

  for (const group of groups) {
    try {
      const usage = await getGroupUsage(group);
      results.push(usage);
    } catch (error) {
      console.error(`Error fetching usage for ${group.name}:`, error.message);
      results.push({
        groupId: group.id,
        groupName: group.name,
        groupType: group.type,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  return results;
}

// Get list of configured groups (without usage data)
function getGroupsList() {
  const groups = getGroupsConfig();
  return groups.map(g => ({
    id: g.id,
    name: g.name,
    type: g.type,
    teamName: g.teamName
  }));
}

// Auto-discover teams and suggest groups
async function discoverGroups() {
  const apiKey = process.env.HEROKU_API_KEY;
  if (!apiKey) {
    throw new Error('HEROKU_API_KEY not set');
  }

  const client = createHerokuClient(apiKey);
  const account = await getAccountInfo(client);
  const teams = await getTeams(client);

  const suggestions = [
    {
      id: 'personal',
      name: `Personal Apps (${account.email})`,
      type: 'personal',
      apiKey: apiKey,
      accountEmail: account.email,
      teamName: null
    }
  ];

  for (const team of teams) {
    suggestions.push({
      id: `team-${team.name}`,
      name: team.name,
      type: team.type === 'enterprise' ? 'enterprise' : 'team',
      apiKey: apiKey, // Same API key can access teams
      accountEmail: account.email,
      teamName: team.name
    });
  }

  return suggestions;
}

module.exports = {
  getGroupsConfig,
  getGroupUsage,
  getAllGroupsUsage,
  getGroupsList,
  discoverGroups
};
