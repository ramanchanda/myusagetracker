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
async function getEnterpriseMonthlyUsage(client, enterpriseAccountId, month) {
  try {
    console.log(`Fetching monthly usage: /enterprise-accounts/${enterpriseAccountId}/usage/monthly?start=${month}&end=${month}`);

    const response = await client.get(
      `/enterprise-accounts/${enterpriseAccountId}/usage/monthly`,
      {
        params: {
          start: month,
          end: month
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error(`Error fetching enterprise monthly usage for ${month}:`, error.message);
    console.error(`Enterprise Account ID: ${enterpriseAccountId}`);
    console.error(`Full URL attempted: /enterprise-accounts/${enterpriseAccountId}/usage/monthly?start=${month}&end=${month}`);

    if (error.response?.status === 404) {
      console.error('404 Error: Either the enterprise account does not exist, or there is no usage data for this month.');
      return null; // Return null instead of throwing
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
          totalApps: 0,
          totalDynos: 0,
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

      // Get enterprise-level monthly usage
      let enterpriseTeams = [];

      try {
        const enterpriseUsage = await getEnterpriseMonthlyUsage(
          client,
          enterpriseAccount.id,
          targetMonth
        );

        // The /usage/monthly endpoint returns an array of month data
        if (enterpriseUsage && Array.isArray(enterpriseUsage)) {
          // Get the first (and should be only) month's data
          const monthData = enterpriseUsage[0];
          if (monthData && Array.isArray(monthData.teams)) {
            enterpriseTeams = monthData.teams;
            console.log(`✅ Found ${enterpriseTeams.length} teams with usage data`);
          }
        } else if (enterpriseUsage && Array.isArray(enterpriseUsage.teams)) {
          // Fallback for different response structure
          enterpriseTeams = enterpriseUsage.teams;
          console.log(`✅ Found ${enterpriseTeams.length} teams with usage data`);
        }
      } catch (error) {
        console.error(`Error fetching usage for ${enterpriseAccount.name}:`, error.message);
      }

      // Fallback: If no usage data, fetch teams directly and get individual team usage
      if (enterpriseTeams.length === 0) {
        console.log(`📋 No usage data, fetching teams directly for ${enterpriseAccount.name}`);
        try {
          const allTeams = await getTeams(client);
          // Filter teams belonging to this enterprise account
          const filteredTeams = allTeams.filter(team =>
            team.type === 'enterprise' &&
            team.enterprise_account &&
            team.enterprise_account.id === enterpriseAccount.id
          );
          console.log(`✅ Found ${filteredTeams.length} enterprise teams via direct fetch`);

          // Fetch individual team monthly usage for each team
          for (const team of filteredTeams) {
            try {
              const teamUsageResponse = await getTeamMonthlyUsage(client, team.id, targetMonth);
              if (teamUsageResponse && Array.isArray(teamUsageResponse)) {
                // /usage/monthly returns array of months
                const monthData = teamUsageResponse[0];
                if (monthData) {
                  // Merge team metadata with usage data
                  enterpriseTeams.push({
                    ...team,
                    ...monthData
                  });
                  console.log(`  ✅ Got usage data for team: ${team.name}`);
                } else {
                  enterpriseTeams.push(team);
                  console.log(`  ⚠️  No usage data for team: ${team.name}`);
                }
              } else {
                // No usage data but include team anyway
                enterpriseTeams.push(team);
                console.log(`  ⚠️  No usage data for team: ${team.name}`);
              }
            } catch (error) {
              console.error(`  ❌ Error fetching usage for team ${team.name}:`, error.message);
              // Include team without usage data
              enterpriseTeams.push(team);
            }
          }
        } catch (error) {
          console.error(`Error fetching teams directly:`, error.message);
        }
      }

      // Process teams
      if (enterpriseTeams.length === 0) {
        console.log(`No teams found for ${enterpriseAccount.name}`);
        allAccountsData.push(accountStructure);
        continue;
      }

      accountStructure.summary.totalTeams = enterpriseTeams.length;

      // Build team resources
      for (const team of enterpriseTeams) {
        try {
          const teamResources = parseTeamUsage(team);

          accountStructure.teams.push({
            id: team.id,
            name: team.name,
            type: 'enterprise',
            enterpriseAccountId: enterpriseAccount.id,
            enterpriseAccountName: enterpriseAccount.name,
            resources: teamResources
          });

          // Update summary
          accountStructure.summary.totalApps += teamResources.totalApps;
          accountStructure.summary.totalDynos += teamResources.dynos.count;
          accountStructure.summary.totalDataAddons += teamResources.dataAddons.count;
          accountStructure.summary.totalOtherAddons += teamResources.otherAddons.count;
          accountStructure.summary.totalMonthlyCost += parseFloat(teamResources.totalMonthlyCost);
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
      totalApps: allAccountsData.reduce((sum, a) => sum + a.summary.totalApps, 0),
      totalDynos: allAccountsData.reduce((sum, a) => sum + a.summary.totalDynos, 0),
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

module.exports = {
  getEnterpriseStructure,
  getAllEnterpriseAccountsStructure,
  getAllEnterpriseAccounts,
  getEnterpriseAccount,
  getEnterpriseMonthlyUsage,
  getTeamMonthlyUsage,
  getTeams,
  testBillingAccess,
  createHerokuClient
};
