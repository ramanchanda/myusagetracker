const axios = require('axios');

const HEROKU_API_BASE = 'https://api.heroku.com';

const herokuClient = axios.create({
  baseURL: HEROKU_API_BASE,
  headers: {
    'Accept': 'application/vnd.heroku+json; version=3',
    'Authorization': `Bearer ${process.env.HEROKU_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function getAccountInfo() {
  try {
    const response = await herokuClient.get('/account');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch account info: ${error.message}`);
  }
}

async function getApps() {
  try {
    const response = await herokuClient.get('/apps');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch apps: ${error.message}`);
  }
}

async function getDynoUsage() {
  try {
    const account = await getAccountInfo();
    const apps = await getApps();

    const dynoData = {
      totalApps: apps.length,
      dynos: [],
      totalDynoHours: 0,
      limit: account.dyno_hours_limit || 1000,
      used: account.dyno_hours_used || 0
    };

    for (const app of apps) {
      try {
        const formations = await herokuClient.get(`/apps/${app.id}/formation`);
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

    return dynoData;
  } catch (error) {
    throw new Error(`Failed to fetch dyno usage: ${error.message}`);
  }
}

async function getAddonUsage() {
  try {
    const apps = await getApps();
    const addons = [];

    for (const app of apps) {
      try {
        const appAddons = await herokuClient.get(`/apps/${app.id}/addons`);
        for (const addon of appAddons.data) {
          addons.push({
            appName: app.name,
            name: addon.name,
            addonService: addon.addon_service.name,
            plan: addon.plan.name,
            price: addon.plan.price,
            state: addon.state,
            createdAt: addon.created_at
          });
        }
      } catch (error) {
        console.error(`Error fetching addons for ${app.name}:`, error.message);
      }
    }

    const totalMonthlyCost = addons.reduce((sum, addon) => {
      const price = addon.price?.cents || 0;
      return sum + (price / 100);
    }, 0);

    return {
      totalAddons: addons.length,
      addons,
      totalMonthlyCost: totalMonthlyCost.toFixed(2)
    };
  } catch (error) {
    throw new Error(`Failed to fetch addon usage: ${error.message}`);
  }
}

async function getConnectUsage() {
  try {
    const account = await getAccountInfo();

    const connectData = {
      connectUsed: account.connect_hours_used || 0,
      connectLimit: account.connect_hours_limit || 0,
      usagePercentage: 0,
      remaining: 0
    };

    if (connectData.connectLimit > 0) {
      connectData.usagePercentage =
        ((connectData.connectUsed / connectData.connectLimit) * 100).toFixed(2);
      connectData.remaining = connectData.connectLimit - connectData.connectUsed;
    }

    return connectData;
  } catch (error) {
    throw new Error(`Failed to fetch connect usage: ${error.message}`);
  }
}

async function getQuotaInfo() {
  try {
    const account = await getAccountInfo();
    return {
      dyno: {
        used: account.dyno_hours_used || 0,
        limit: account.dyno_hours_limit || 0,
        remaining: (account.dyno_hours_limit || 0) - (account.dyno_hours_used || 0)
      },
      connect: {
        used: account.connect_hours_used || 0,
        limit: account.connect_hours_limit || 0,
        remaining: (account.connect_hours_limit || 0) - (account.connect_hours_used || 0)
      }
    };
  } catch (error) {
    throw new Error(`Failed to fetch quota info: ${error.message}`);
  }
}

module.exports = {
  getAccountInfo,
  getApps,
  getDynoUsage,
  getAddonUsage,
  getConnectUsage,
  getQuotaInfo
};
