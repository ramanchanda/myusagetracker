const express = require('express');
const router = express.Router();
const reportAggregationService = require('../services/reportAggregationService');
const enterpriseUsageService = require('../services/enterpriseUsageService');

/**
 * GET /api/reports/enterprise-summary/:accountEmail
 *
 * Returns fully normalized report dataset ready for rendering.
 * Contains ZERO rendering logic - only aggregated data.
 */
router.get('/enterprise-summary/:accountEmail', async (req, res) => {
  try {
    const { accountEmail } = req.params;
    const { month } = req.query;

    console.log('[Reports API] Generating enterprise summary for:', accountEmail);

    if (!accountEmail) {
      return res.status(400).json({ error: 'accountEmail is required' });
    }

    // Find account
    const client = enterpriseUsageService.createHerokuClient();
    const accounts = await enterpriseUsageService.getAllEnterpriseAccounts(client);
    const account = accounts.find(acc => acc.email === accountEmail || acc.name === accountEmail);

    if (!account) {
      return res.status(404).json({
        error: 'Enterprise account not found',
        availableAccounts: accounts.map(a => a.email || a.name)
      });
    }

    const accountId = account.id;
    const selectedMonth = month || new Date().toISOString().slice(0, 7);

    console.log('[Reports API] Account ID:', accountId);
    console.log('[Reports API] Selected month:', selectedMonth);

    // Generate report dataset
    const reportData = await reportAggregationService.generateEnterpriseSummaryReport(
      accountId,
      accountEmail,
      selectedMonth
    );

    console.log('[Reports API] Report generated successfully');

    res.json(reportData);

  } catch (error) {
    console.error('[Reports API] Error generating report:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      details: error.message
    });
  }
});

module.exports = router;
