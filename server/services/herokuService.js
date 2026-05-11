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

// Categorize add-ons by type
function categorizeAddon(addonServiceName) {
  const serviceName = addonServiceName.toLowerCase();

  // Data stores
  if (serviceName.includes('postgres') || serviceName.includes('heroku-postgresql')) {
    return { category: 'data', type: 'PostgreSQL Database', icon: '🐘' };
  }
  if (serviceName.includes('redis') || serviceName.includes('heroku-redis')) {
    return { category: 'data', type: 'Redis Cache', icon: '🔴' };
  }
  if (serviceName.includes('mongo') || serviceName.includes('mongodb')) {
    return { category: 'data', type: 'MongoDB Database', icon: '🍃' };
  }
  if (serviceName.includes('mysql')) {
    return { category: 'data', type: 'MySQL Database', icon: '🐬' };
  }

  // Connect
  if (serviceName.includes('connect')) {
    return { category: 'connect', type: 'Heroku Connect', icon: '🔌' };
  }

  // Monitoring & Logging
  if (serviceName.includes('papertrail')) {
    return { category: 'monitoring', type: 'Logging (Papertrail)', icon: '📋' };
  }
  if (serviceName.includes('newrelic') || serviceName.includes('new-relic')) {
    return { category: 'monitoring', type: 'APM (New Relic)', icon: '📊' };
  }
  if (serviceName.includes('sentry')) {
    return { category: 'monitoring', type: 'Error Tracking (Sentry)', icon: '🐛' };
  }
  if (serviceName.includes('logentries')) {
    return { category: 'monitoring', type: 'Logging (Logentries)', icon: '📝' };
  }

  // Email
  if (serviceName.includes('sendgrid')) {
    return { category: 'email', type: 'Email (SendGrid)', icon: '📧' };
  }
  if (serviceName.includes('mailgun')) {
    return { category: 'email', type: 'Email (Mailgun)', icon: '✉️' };
  }
  if (serviceName.includes('mailtogo')) {
    return { category: 'email', type: 'Email (Mailtogo)', icon: '📮' };
  }

  // Search
  if (serviceName.includes('elasticsearch') || serviceName.includes('bonsai')) {
    return { category: 'search', type: 'Search (Elasticsearch)', icon: '🔍' };
  }
  if (serviceName.includes('searchbox')) {
    return { category: 'search', type: 'Search (Searchbox)', icon: '🔎' };
  }

  // Queue & Workers
  if (serviceName.includes('cloudamqp') || serviceName.includes('rabbitmq')) {
    return { category: 'queue', type: 'Message Queue (RabbitMQ)', icon: '📬' };
  }
  if (serviceName.includes('iron') || serviceName.includes('worker')) {
    return { category: 'queue', type: 'Background Jobs', icon: '⚙️' };
  }

  // Scheduler
  if (serviceName.includes('scheduler')) {
    return { category: 'scheduler', type: 'Heroku Scheduler', icon: '⏰' };
  }

  // Storage
  if (serviceName.includes('bucketeer') || serviceName.includes('s3')) {
    return { category: 'storage', type: 'File Storage (S3)', icon: '🗄️' };
  }

  // Analytics
  if (serviceName.includes('segment')) {
    return { category: 'analytics', type: 'Analytics (Segment)', icon: '📈' };
  }
  if (serviceName.includes('keen')) {
    return { category: 'analytics', type: 'Analytics (Keen)', icon: '📉' };
  }

  // SSL/Security
  if (serviceName.includes('ssl') || serviceName.includes('expedited')) {
    return { category: 'security', type: 'SSL/Security', icon: '🔒' };
  }

  // Default
  return { category: 'other', type: 'Other Service', icon: '🔧' };
}

async function getAddonUsage() {
  try {
    const apps = await getApps();
    const addons = [];

    for (const app of apps) {
      try {
        const appAddons = await herokuClient.get(`/apps/${app.id}/addons`);
        for (const addon of appAddons.data) {
          const categorization = categorizeAddon(addon.addon_service.name);
          addons.push({
            appName: app.name,
            name: addon.name,
            addonService: addon.addon_service.name,
            plan: addon.plan.name,
            price: addon.plan.price,
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
      let cost = 0;
      if (addon.price) {
        if (typeof addon.price === 'number') {
          cost = addon.price;
        } else if (addon.price.cents !== undefined) {
          cost = addon.price.cents / 100;
        } else if (addon.price.unit !== undefined) {
          cost = parseFloat(addon.price.unit) || 0;
        }
      }
      return sum + cost;
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
      acc[cat].totalCost += (addon.price?.cents || 0) / 100;
      return acc;
    }, {});

    // Convert to array and sort by cost
    const categorySummary = Object.values(addonsByCategory).map(cat => ({
      ...cat,
      totalCost: cat.totalCost.toFixed(2)
    })).sort((a, b) => parseFloat(b.totalCost) - parseFloat(a.totalCost));

    return {
      totalAddons: addons.length,
      addons,
      totalMonthlyCost: totalMonthlyCost.toFixed(2),
      addonsByCategory: addonsByCategory,
      categorySummary: categorySummary
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
  getQuotaInfo,
  categorizeAddon
};
