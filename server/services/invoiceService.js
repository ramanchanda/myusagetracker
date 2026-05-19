const axios = require('axios');
const { createHerokuClient, HEROKU_API_BASE } = require('./herokuClient');

// Get account invoices
async function getInvoices(client) {
  try {
    const response = await client.get('/account/invoices');
    return response.data;
  } catch (error) {
    console.error('Error fetching invoices:', error.message);
    return [];
  }
}

// Get specific invoice details
async function getInvoice(client, invoiceNumber) {
  try {
    const response = await client.get(`/account/invoices/${invoiceNumber}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching invoice ${invoiceNumber}:`, error.message);
    return null;
  }
}

// Get invoice for a specific month
async function getInvoiceForMonth(month) {
  const client = createHerokuClient();

  try {
    const invoices = await getInvoices(client);

    // Parse requested month (format: YYYY-MM)
    const [year, monthNum] = month.split('-').map(Number);

    // Find invoice matching the month
    const invoice = invoices.find(inv => {
      const invDate = new Date(inv.period_start);
      return invDate.getFullYear() === year && invDate.getMonth() + 1 === monthNum;
    });

    if (!invoice) {
      return null;
    }

    // Get detailed invoice
    const detailedInvoice = await getInvoice(client, invoice.number);
    return detailedInvoice;
  } catch (error) {
    throw new Error(`Failed to fetch invoice for ${month}: ${error.message}`);
  }
}

// Parse invoice to extract costs by app and addon
function parseInvoiceCosts(invoice) {
  if (!invoice || !invoice.charges) {
    return { apps: {}, addons: {}, dynos: {}, total: 0 };
  }

  const costs = {
    apps: {},
    addons: {},
    dynos: {},
    total: 0
  };

  invoice.charges.forEach(charge => {
    const amount = charge.amount / 100; // Convert cents to dollars

    // Categorize charge based on description
    if (charge.description.includes('Dyno') || charge.description.includes('dyno')) {
      // Dyno charges
      const appMatch = charge.description.match(/for (.+?)(?:\s|$)/);
      const appName = appMatch ? appMatch[1] : 'unknown';

      if (!costs.dynos[appName]) {
        costs.dynos[appName] = 0;
      }
      costs.dynos[appName] += amount;
    } else {
      // Addon charges - descriptions vary but usually include addon name
      // Common formats:
      // - "heroku-postgresql:standard-0 for app-name"
      // - "heroku-redis:premium-0 for app-name"
      // - "addon-name for app-name"
      const addonMatch = charge.description.match(/^(.+?)\s+for\s+(.+?)$/);
      if (addonMatch) {
        const addonIdentifier = addonMatch[1].trim();
        const appName = addonMatch[2].trim();

        // Store by addon identifier (could be plan name or addon name)
        if (!costs.addons[addonIdentifier]) {
          costs.addons[addonIdentifier] = {
            cost: 0,
            app: appName
          };
        }
        costs.addons[addonIdentifier].cost += amount;
      }
    }

    costs.total += amount;
  });

  return costs;
}

module.exports = {
  getInvoices,
  getInvoice,
  getInvoiceForMonth,
  parseInvoiceCosts
};
