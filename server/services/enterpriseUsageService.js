const axios = require('axios');
const { createHerokuClient, HEROKU_API_BASE } = require('./herokuClient');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(endpoint, params) {
  return `${endpoint}-${JSON.stringify(params)}`;
}

function getFromCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Helper to get current month in YYYY-MM format
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month, deltaMonths) {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 1, 1);
  date.setMonth(date.getMonth() + deltaMonths);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getPastMonths(endMonth, count) {
  const months = [];
  for (let i = count - 1; i >= 0; i--) {
    months.push(shiftMonth(endMonth, -i));
  }
  return months;
}

// Add delay between API calls to avoid rate limiting
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get account information
async function getAccountInfo(client) {
  const response = await client.get('/account');
  return response.data;
}

// Get all enterprise accounts
async function getAllEnterpriseAccounts(client) {
  try {
    console.log('Fetching all enterprise accounts...');
    const response = await client.get('/enterprise-accounts');

    console.log(`Found ${response.data?.length || 0} enterprise account(s)`);

    return response.data || [];
  } catch (error) {
    console.error('Error fetching enterprise accounts:', error.message);
    console.error('Status:', error.response?.status);
    console.error('This may indicate no enterprise subscription or insufficient permissions.');
    return [];
  }
}

// Get specific enterprise account by ID
async function getEnterpriseAccount(client, accountId) {
  try {
    console.log(`Fetching enterprise account: ${accountId}`);
    const response = await client.get(`/enterprise-accounts/${accountId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching enterprise account ${accountId}:`, error.message);
    return null;
  }
}

// Test billing access for an enterprise account
async function testBillingAccess(client, accountId, month) {
  try {
    await client.get(`/enterprise-accounts/${accountId}/usage/monthly`, {
      params: { start: month, end: month }
    });
    return { hasAccess: true, error: null };
  } catch (error) {
    if (error.response?.status === 403) {
      return {
        hasAccess: false,
        error: 'Billing access restricted. You may not have permissions to view billing data for this enterprise account.',
        status: 403
      };
    } else if (error.response?.status === 404) {
      return {
        hasAccess: true, // Access is OK, just no data
        error: 'No usage data available for this month.',
        status: 404
      };
    }
    return {
      hasAccess: false,
      error: error.message,
      status: error.response?.status
    };
  }
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Get enterprise account monthly usage
async function getEnterpriseMonthlyUsage(client, enterpriseAccountId, month, endMonth = month) {
  const cacheKey = getCacheKey(`enterprise-${enterpriseAccountId}`, { month, endMonth });
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log(`✅ Using cached enterprise usage for ${enterpriseAccountId}`);
    return cached;
  }

  try {
    console.log(`Fetching monthly usage: /enterprise-accounts/${enterpriseAccountId}/usage/monthly?start=${month}&end=${endMonth}`);

    await delay(100); // Small delay to avoid rate limiting

    const response = await client.get(
      `/enterprise-accounts/${enterpriseAccountId}/usage/monthly`,
      {
        params: {
          start: month,
          end: endMonth
        }
      }
    );

    setCache(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching enterprise monthly usage for ${month}:`, error.message);
    console.error(`Enterprise Account ID: ${enterpriseAccountId}`);
    console.error(`Full URL attempted: /enterprise-accounts/${enterpriseAccountId}/usage/monthly?start=${month}&end=${month}`);

    if (error.response?.status === 404) {
      console.error('404 Error: Either the enterprise account does not exist, or there is no usage data for this month.');
      return null; // Return null instead of throwing
    }

    if (error.response?.status === 429) {
      console.error('⚠️ Rate limit hit! Too many API calls.');
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }

    throw error;
  }
}

// Get team monthly usage
async function getTeamMonthlyUsage(client, teamId, month) {
  try {
    console.log(`  Fetching team usage: /teams/${teamId}/usage/monthly?start=${month}&end=${month}`);

    const response = await client.get(
      `/teams/${teamId}/usage/monthly`,
      {
        params: {
          start: month,
          end: month
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error(`  Error fetching team monthly usage for ${month}:`, error.message);
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

// Get canonical teams for a specific enterprise account.
// Monthly usage can omit zero-usage teams, so we use /teams as source of truth.
async function getEnterpriseAccountTeams(client, enterpriseAccountId) {
  const allTeams = await getTeams(client);
  return allTeams.filter(team => {
    const enterpriseRef = team.enterprise_account || team.enterpriseAccount || {};
    const teamEnterpriseId =
      team.enterprise_account_id ||
      team.enterpriseAccountId ||
      enterpriseRef.id ||
      enterpriseRef.uuid;

    return teamEnterpriseId === enterpriseAccountId;
  });
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

async function getTeamSpaces(client, teamId) {
  try {
    const response = await client.get(`/teams/${teamId}/spaces`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error(`Error fetching spaces for team ${teamId}:`, error.message);
    return [];
  }
}

async function getEnterpriseSpacesSummary(client, teams) {
  const summary = {
    totalPrivateSpaces: 0,
    totalShieldSpaces: 0
  };

  for (const team of teams) {
    const spaces = await getTeamSpaces(client, team.id);
    const shieldSpaces = spaces.filter(space => Boolean(space.shield));
    const privateSpaces = spaces.filter(space => !Boolean(space.shield));
    summary.totalPrivateSpaces += privateSpaces.length;
    summary.totalShieldSpaces += shieldSpaces.length;
  }

  return summary;
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
  const privateSpaceCount = toNumber(team.private_space);
  const shieldSpaceCount = toNumber(team.shield_space);
  const otherAddonsUsage = Math.max(addonsUsage - dataUsage, partnerUsage, 0);

  const teamApps = Array.isArray(team.apps) ? team.apps : [];
  const appsUsage = teamApps.map(app => {
    const appDynos = toNumber(app.dynos);
    const appConnect = toNumber(app.connect);
    const appData = toNumber(app.data);
    const appPartner = toNumber(app.partner);
    const appAddons = toNumber(app.addons);
    const appOtherAddons = Math.max(appAddons - appData, appPartner, 0);
    const appTotal = appDynos + appAddons + appConnect;

    return {
      name: app.app_name || app.name || 'Unknown',
      dynos: appDynos,
      connect: appConnect,
      dataAddons: appData,
      generalAddons: appOtherAddons,
      total: appTotal
    };
  }).sort((a, b) => b.total - a.total);

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
    appsUsage,

    connect: {
      used: connectUsage
    },

    space: {
      used: spaceUsage
    },

    privateSpaces: privateSpaceCount,
    shieldSpaces: shieldSpaceCount,

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

// Get structure for all enterprise accounts
async function getAllEnterpriseAccountsStructure(month) {
  const client = createHerokuClient();
  const targetMonth = month || getCurrentMonth();

  try {
    const account = await getAccountInfo(client);
    const enterpriseAccounts = await getAllEnterpriseAccounts(client);

    if (enterpriseAccounts.length === 0) {
      throw new Error('No enterprise accounts found. This account may not have enterprise access.');
    }

    const allAccountsData = [];

    // Process each enterprise account
    for (const enterpriseAccount of enterpriseAccounts) {
      console.log(`\n=== Processing Enterprise Account: ${enterpriseAccount.name} ===`);

      // Test billing access first
      const accessCheck = await testBillingAccess(client, enterpriseAccount.id, targetMonth);

      const accountStructure = {
        enterpriseAccount: {
          id: enterpriseAccount.id,
          name: enterpriseAccount.name,
          identity_provider: enterpriseAccount.identity_provider,
          has_billing_access: accessCheck.hasAccess,
          billing_error: accessCheck.error,
          billing_status: accessCheck.status
        },
        teams: [],
        summary: {
          totalTeams: 0,
          totalActiveTeams: 0,
          totalPrivateSpaces: 0,
          totalShieldSpaces: 0,
          totalApps: 0,
          totalDynos: 0,
          totalConnect: 0,
          totalDataAddons: 0,
          totalOtherAddons: 0,
          totalMonthlyCost: 0
        }
      };

      // If no billing access, skip usage data
      if (!accessCheck.hasAccess && accessCheck.status === 403) {
        console.log(`⚠️  Billing access restricted for ${enterpriseAccount.name}`);
        accountStructure.summary.error = 'Billing access restricted';
        allAccountsData.push(accountStructure);
        continue;
      }

      // Get enterprise-level monthly usage for selected month ONLY
      let selectedMonthTeams = [];

      try {
        const enterpriseUsage = await getEnterpriseMonthlyUsage(
          client,
          enterpriseAccount.id,
          targetMonth
        );

        const usageRows = Array.isArray(enterpriseUsage)
          ? enterpriseUsage
          : (enterpriseUsage ? [enterpriseUsage] : []);
        const selectedMonthData = usageRows.find(row => row.month === targetMonth) || usageRows[0];
        selectedMonthTeams = Array.isArray(selectedMonthData?.teams) ? selectedMonthData.teams : [];
        console.log(`✅ Found ${selectedMonthTeams.length} teams with usage in ${targetMonth}`);
      } catch (error) {
        console.error(`Error fetching usage for ${enterpriseAccount.name}:`, error.message);
      }

      if (selectedMonthTeams.length === 0) {
        console.log(`📋 No usage data found for ${enterpriseAccount.name} in ${targetMonth}`);
        allAccountsData.push(accountStructure);
        continue;
      }

      // Use only teams from monthly usage API (teams with actual usage)
      const teamsWithUsage = selectedMonthTeams
        .filter(team => team && team.id)
        .map(team => ({
          id: team.id,
          name: team.name || 'Unknown Team',
          type: team.type || 'enterprise',
          ...team
        }));

      accountStructure.summary.totalTeams = teamsWithUsage.length;
      accountStructure.summary.totalActiveTeams = teamsWithUsage.length;

      // Build team resources from usage data only
      for (const team of teamsWithUsage) {
        try {
          const teamResources = parseTeamUsage(team);

          // Apps come directly from usage API (only apps with usage)
          // Space info will be fetched lazily when user clicks "View details"
          const appsFromUsage = (team.apps || []).map(app => ({
            name: app.app_name || app.name || 'Unknown App',
            dynos: toNumber(app.dynos),
            connect: toNumber(app.connect),
            dataAddons: toNumber(app.data),
            generalAddons: Math.max(toNumber(app.addons) - toNumber(app.data), toNumber(app.partner), 0),
            total: toNumber(app.dynos) + toNumber(app.addons) + toNumber(app.connect)
          })).sort((a, b) => b.total - a.total);

          teamResources.appsUsage = appsFromUsage;
          teamResources.totalApps = appsFromUsage.length;

          // Space info is already in teamResources from parseTeamUsage
          teamResources.appsInPrivateSpaces = 0;
          teamResources.appsInShieldSpaces = 0;

          accountStructure.teams.push({
            id: team.id,
            name: team.name,
            type: 'enterprise',
            enterpriseAccountId: enterpriseAccount.id,
            enterpriseAccountName: enterpriseAccount.name,
            resources: teamResources
          });

          // Update summary - aggregate space counts across all teams
          accountStructure.summary.totalApps += teamResources.totalApps;
          accountStructure.summary.totalDynos += teamResources.dynos.count;
          accountStructure.summary.totalConnect += teamResources.connect.used;
          accountStructure.summary.totalDataAddons += teamResources.dataAddons.count;
          accountStructure.summary.totalOtherAddons += teamResources.otherAddons.count;
          accountStructure.summary.totalMonthlyCost += parseFloat(teamResources.totalMonthlyCost);
          accountStructure.summary.totalPrivateSpaces += teamResources.privateSpaces;
          accountStructure.summary.totalShieldSpaces += teamResources.shieldSpaces;
        } catch (error) {
          console.error(`Error processing team ${team.name}:`, error.message);
        }
      }

      accountStructure.summary.totalMonthlyCost = accountStructure.summary.totalMonthlyCost.toFixed(2);

      allAccountsData.push(accountStructure);
    }

    // Calculate overall summary across all accounts
    const overallSummary = {
      totalEnterpriseAccounts: enterpriseAccounts.length,
      accountsWithBillingAccess: allAccountsData.filter(a => a.enterpriseAccount.has_billing_access).length,
      accountsWithoutBillingAccess: allAccountsData.filter(a => !a.enterpriseAccount.has_billing_access).length,
      totalTeams: allAccountsData.reduce((sum, a) => sum + a.summary.totalTeams, 0),
      totalActiveTeams: allAccountsData.reduce((sum, a) => sum + (a.summary.totalActiveTeams || 0), 0),
      totalPrivateSpaces: allAccountsData.reduce((sum, a) => sum + (a.summary.totalPrivateSpaces || 0), 0),
      totalShieldSpaces: allAccountsData.reduce((sum, a) => sum + (a.summary.totalShieldSpaces || 0), 0),
      totalApps: allAccountsData.reduce((sum, a) => sum + a.summary.totalApps, 0),
      totalDynos: allAccountsData.reduce((sum, a) => sum + a.summary.totalDynos, 0),
      totalConnect: allAccountsData.reduce((sum, a) => sum + a.summary.totalConnect, 0),
      totalDataAddons: allAccountsData.reduce((sum, a) => sum + a.summary.totalDataAddons, 0),
      totalOtherAddons: allAccountsData.reduce((sum, a) => sum + a.summary.totalOtherAddons, 0),
      totalMonthlyCost: allAccountsData.reduce((sum, a) => sum + parseFloat(a.summary.totalMonthlyCost || 0), 0).toFixed(2)
    };

    return {
      account: {
        email: account.email,
        name: account.name,
        id: account.id
      },
      enterpriseAccounts: allAccountsData,
      summary: overallSummary
    };

  } catch (error) {
    throw new Error(`Failed to fetch enterprise structure: ${error.message}`);
  }
}

function extractUsageTeamsFromMonthlyResponse(enterpriseUsage, month) {
  const usageRows = Array.isArray(enterpriseUsage)
    ? enterpriseUsage
    : (enterpriseUsage ? [enterpriseUsage] : []);
  const monthData = usageRows.find(row => row.month === month) || usageRows[0];
  return Array.isArray(monthData?.teams) ? monthData.teams : [];
}

async function getEnterpriseTrendSummary(month, enterpriseAccountId, includeAllAccounts = false) {
  const client = createHerokuClient();
  // Always use the last 12 months from current date, not from selected month
  const currentMonth = getCurrentMonth();
  const months = getPastMonths(currentMonth, 12);

  let accounts = [];
  if (includeAllAccounts) {
    accounts = await getAllEnterpriseAccounts(client);
  } else if (enterpriseAccountId) {
    const account = await getEnterpriseAccount(client, enterpriseAccountId);
    if (account) accounts = [account];
  } else {
    const all = await getAllEnterpriseAccounts(client);
    if (all[0]) accounts = [all[0]];
  }

  // Fetch usage data for all 12 months in a single API call
  // Note: API now provides private_space_credits and shield_space_credits directly,
  // so we no longer need to fetch team spaces individually
  const startMonth = months[0];
  const endMonth = months[months.length - 1];

  // Build monthly data structure with all months initialized
  const monthlyMap = new Map();
  months.forEach(m => {
    monthlyMap.set(m, {
      month: m,
      teams: 0,
      dynoUnits: 0,
      connectRows: 0,
      dataAddons: 0,
      generalAddons: 0,
      privateSpaces: 0,
      shieldSpaces: 0,
      dataAddonsCredits: 0,
      generalAddonsCredits: 0,
      privateSpaceCredits: 0,
      shieldSpaceCredits: 0
    });
  });

  // Fetch usage for all accounts
  for (const account of accounts) {
    try {
      // Single API call to get all 12 months of data
      const usageData = await getEnterpriseMonthlyUsage(client, account.id, startMonth, endMonth);

      // usageData is an array of monthly usage objects
      const usageArray = Array.isArray(usageData) ? usageData : [usageData];

      usageArray.forEach(monthData => {
        const m = monthData.month;
        if (!monthlyMap.has(m)) return; // Skip months outside our range

        const row = monthlyMap.get(m);
        const usageTeams = monthData.teams || [];
        row.teams += usageTeams.length;

        // Use account-level totals directly from API (not team aggregation)
        row.dynoUnits += toNumber(monthData.dynos);
        row.connectRows += toNumber(monthData.connect);
        row.dataAddons += toNumber(monthData.data);

        // Calculate general addons from account-level data
        const accountAddons = toNumber(monthData.addons);
        const accountData = toNumber(monthData.data);
        const accountPartner = toNumber(monthData.partner);
        row.generalAddons += Math.max(accountAddons - accountData, accountPartner, 0);

        // Use space counts from account-level fields
        const privateSpaceCount = toNumber(monthData.private_space);
        const shieldSpaceCount = toNumber(monthData.shield_space);
        row.privateSpaces += privateSpaceCount;
        row.shieldSpaces += shieldSpaceCount;

        // Add credit fields for bar chart
        row.dataAddonsCredits += toNumber(monthData.data);
        row.generalAddonsCredits += Math.max(accountAddons - accountData, accountPartner, 0);
        row.privateSpaceCredits += toNumber(monthData.private_space_credits);
        row.shieldSpaceCredits += toNumber(monthData.shield_space_credits);
      });
    } catch (error) {
      console.error(`Trend summary fetch failed for ${account.id}:`, error.message);
    }
  }

  // Convert map to array in correct order
  const monthly = months.map(m => {
    const monthData = monthlyMap.get(m);
    return {
      ...monthData,
      connectRowsMillions: monthData.connectRows / 1000000
    };
  });

  const total = monthly.reduce((acc, item) => ({
    teams: acc.teams + item.teams,
    dynoUnits: acc.dynoUnits + item.dynoUnits,
    connectRows: acc.connectRows + item.connectRows,
    dataAddons: acc.dataAddons + item.dataAddons,
    generalAddons: acc.generalAddons + item.generalAddons,
    privateSpaces: acc.privateSpaces + item.privateSpaces,
    shieldSpaces: acc.shieldSpaces + item.shieldSpaces,
    dataAddonsCredits: acc.dataAddonsCredits + item.dataAddonsCredits,
    generalAddonsCredits: acc.generalAddonsCredits + item.generalAddonsCredits,
    privateSpaceCredits: acc.privateSpaceCredits + item.privateSpaceCredits,
    shieldSpaceCredits: acc.shieldSpaceCredits + item.shieldSpaceCredits
  }), { teams: 0, dynoUnits: 0, connectRows: 0, dataAddons: 0, generalAddons: 0, privateSpaces: 0, shieldSpaces: 0, dataAddonsCredits: 0, generalAddonsCredits: 0, privateSpaceCredits: 0, shieldSpaceCredits: 0 });

  const first = monthly[0] || { dynoUnits: 0, connectRows: 0, privateSpaces: 0, shieldSpaces: 0 };
  const last = monthly[monthly.length - 1] || { dynoUnits: 0, connectRows: 0, privateSpaces: 0, shieldSpaces: 0 };
  const safePct = (a, b) => (a > 0 ? (((b - a) / a) * 100) : 0);

  return {
    months,
    monthly,
    analysis: {
      avgTeamsPerMonth: monthly.length ? total.teams / monthly.length : 0,
      avgDynoUnitsPerMonth: monthly.length ? total.dynoUnits / monthly.length : 0,
      avgConnectRowsPerMonth: monthly.length ? total.connectRows / monthly.length : 0,
      avgPrivateSpacesPerMonth: monthly.length ? total.privateSpaces / monthly.length : 0,
      avgShieldSpacesPerMonth: monthly.length ? total.shieldSpaces / monthly.length : 0,
      dynoTrendPct: safePct(first.dynoUnits, last.dynoUnits),
      connectTrendPct: safePct(first.connectRows, last.connectRows),
      privateSpacesTrendPct: safePct(first.privateSpaces, last.privateSpaces),
      shieldSpacesTrendPct: safePct(first.shieldSpaces, last.shieldSpaces)
    }
  };
}

// Get structure for single enterprise account (for backward compatibility)
async function getEnterpriseStructure(month, enterpriseAccountId) {
  const allData = await getAllEnterpriseAccountsStructure(month);

  // If specific account requested, return just that one
  if (enterpriseAccountId) {
    const specificAccount = allData.enterpriseAccounts.find(
      acc => acc.enterpriseAccount.id === enterpriseAccountId
    );

    if (!specificAccount) {
      throw new Error(`Enterprise account ${enterpriseAccountId} not found`);
    }

    return {
      account: allData.account,
      enterpriseAccount: specificAccount.enterpriseAccount,
      teams: specificAccount.teams,
      summary: specificAccount.summary
    };
  }

  // Otherwise return all accounts
  return allData;
}

// Get team apps with space information (for lazy loading)
async function getTeamAppsWithSpaceInfo(teamId) {
  const client = createHerokuClient();

  try {
    const appsResponse = await client.get(`/teams/${teamId}/apps`);
    const teamApps = Array.isArray(appsResponse.data) ? appsResponse.data : [];

    // Map apps to include space information
    const appsWithSpaceInfo = teamApps.map(app => {
      const appSpace = app.space || null;
      return {
        name: app.name,
        id: app.id,
        isInPrivateSpace: Boolean(appSpace) && !Boolean(appSpace.shield),
        isInShieldSpace: Boolean(appSpace?.shield)
      };
    });

    return appsWithSpaceInfo;
  } catch (error) {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    console.warn(`⚠️  Warning: Cannot fetch apps for team ${teamId}`);
    console.warn(`   Status: ${status} ${statusText || ''}`);
    console.warn(`   Message: ${error.message}`);
    if (status === 404) {
      console.warn(`   Reason: Team may be deleted, renamed, or API key lacks access`);
    }
    throw error;
  }
}

module.exports = {
  getEnterpriseStructure,
  getAllEnterpriseAccountsStructure,
  getAllEnterpriseAccounts,
  getEnterpriseAccount,
  getEnterpriseMonthlyUsage,
  getTeamMonthlyUsage,
  getTeams,
  getEnterpriseAccountTeams,
  getTeamSpaces,
  getEnterpriseSpacesSummary,
  getEnterpriseTrendSummary,
  getTeamAppsWithSpaceInfo,
  testBillingAccess,
  createHerokuClient,
  getCurrentMonth
};
