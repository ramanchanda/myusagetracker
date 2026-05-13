const express = require('express');
const router = express.Router();
const PDFExportService = require('../services/pdfExportService');
const enterpriseUsageService = require('../services/enterpriseUsageService');
const dailyUsageService = require('../services/dailyUsageService');
const { transformSummary12Data, transformMonthlyData, transformDailyData } = require('../services/pdfDataTransformer');

/**
 * POST /api/pdf/export
 * Generate PDF report with all data
 *
 * Body:
 * {
 *   "enterpriseEmail": "account@example.com",
 *   "monthForMonthly": "2024-01",  // optional
 *   "startDateForDaily": "2024-01-01",  // optional
 *   "endDateForDaily": "2024-01-31"  // optional
 * }
 */
router.post('/export', async (req, res) => {
  try {
    const { enterpriseEmail, monthForMonthly, startDateForDaily, endDateForDaily } = req.body;

    if (!enterpriseEmail) {
      return res.status(400).json({ error: 'enterpriseEmail is required' });
    }

    console.log(`Generating PDF report for ${enterpriseEmail}`);

    // Find account ID from email
    const client = enterpriseUsageService.createHerokuClient();
    const accounts = await enterpriseUsageService.getAllEnterpriseAccounts(client);
    const account = accounts.find(acc => acc.email === enterpriseEmail || acc.name === enterpriseEmail);

    if (!account) {
      return res.status(404).json({ error: 'Enterprise account not found' });
    }

    const accountId = account.id;
    const selectedMonth = monthForMonthly || new Date().toISOString().slice(0, 7);
    const shouldIncludeDaily = Boolean(startDateForDaily && endDateForDaily);
    const startDate = startDateForDaily || '';
    const endDate = endDateForDaily || '';

    // Fetch all required data
    console.log('Fetching Summary of past 12 months data...');
    const summary12Data = await enterpriseUsageService.getEnterpriseTrendSummary(
      selectedMonth,
      accountId,
      false
    );

    console.log('Fetching Monthly report data...');
    const monthlyData = await enterpriseUsageService.getEnterpriseStructure(
      selectedMonth,
      accountId
    );

    let dailyData = null;
    if (shouldIncludeDaily) {
      console.log('Fetching Daily report data...');
      dailyData = await dailyUsageService.getEnterpriseDailyUsageStructure(
        selectedMonth,
        accountId,
        startDate,
        endDate
      );
    }

    // Transform data to PDF format
    console.log('Transforming data for PDF...');
    const transformedSummary12 = transformSummary12Data(summary12Data);
    const transformedMonthly = transformMonthlyData(monthlyData, selectedMonth);
    const transformedDaily = transformDailyData(dailyData, startDate, endDate, shouldIncludeDaily);

    console.log('Summary12 data:', JSON.stringify(transformedSummary12, null, 2).substring(0, 500));
    console.log('Monthly data:', JSON.stringify(transformedMonthly, null, 2).substring(0, 500));
    console.log('Daily data:', JSON.stringify(transformedDaily, null, 2).substring(0, 500));

    // Generate PDF
    console.log('Generating PDF document...');
    const pdfService = new PDFExportService();
    const pdfDoc = await pdfService.generateReport(
      enterpriseEmail,
      transformedSummary12,
      transformedMonthly,
      transformedDaily
    );

    // Set response headers
    const filename = `Heroku_Usage_Report_${enterpriseEmail.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    pdfDoc.pipe(res);
    pdfDoc.end();

    console.log(`PDF report generated successfully: ${filename}`);
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({
      error: 'Failed to generate PDF report',
      details: error.message
    });
  }
});

/**
 * GET /api/pdf/export/:enterpriseEmail
 * Generate PDF report with all data (GET version)
 *
 * Query params:
 *   - monthForMonthly: YYYY-MM (optional)
 *   - startDateForDaily: YYYY-MM-DD (optional)
 *   - endDateForDaily: YYYY-MM-DD (optional)
 */
router.get('/export/:enterpriseEmail', async (req, res) => {
  try {
    const { enterpriseEmail } = req.params;
    const { monthForMonthly, startDateForDaily, endDateForDaily } = req.query;

    console.log(`[PDF Export] Starting PDF generation for: ${enterpriseEmail}`);
    console.log(`[PDF Export] Parameters:`, { monthForMonthly, startDateForDaily, endDateForDaily });

    if (!enterpriseEmail) {
      console.error('[PDF Export] Error: enterpriseEmail is required');
      return res.status(400).json({ error: 'enterpriseEmail is required' });
    }

    // Find account ID from email
    console.log('[PDF Export] Step 1: Finding account...');
    let client, accounts, account;
    try {
      client = enterpriseUsageService.createHerokuClient();
      accounts = await enterpriseUsageService.getAllEnterpriseAccounts(client);
      account = accounts.find(acc => acc.email === enterpriseEmail || acc.name === enterpriseEmail);
      console.log(`[PDF Export] Found ${accounts.length} accounts, matching: ${account ? 'YES' : 'NO'}`);
    } catch (err) {
      console.error('[PDF Export] Error finding account:', err.message);
      throw new Error(`Failed to find enterprise account: ${err.message}`);
    }

    if (!account) {
      console.error(`[PDF Export] Account not found for: ${enterpriseEmail}`);
      return res.status(404).json({
        error: 'Enterprise account not found',
        availableAccounts: accounts.map(a => a.email || a.name).join(', ')
      });
    }

    const accountId = account.id;
    const selectedMonth = monthForMonthly || new Date().toISOString().slice(0, 7);
    const shouldIncludeDaily = Boolean(startDateForDaily && endDateForDaily);
    const startDate = startDateForDaily || '';
    const endDate = endDateForDaily || '';

    console.log(`[PDF Export] Account ID: ${accountId}`);
    console.log(`[PDF Export] Date ranges: Month=${selectedMonth}, Daily=${startDate} to ${endDate}`);

    // Fetch all required data with error handling
    let summary12Data, monthlyData, dailyData;

    try {
      console.log('[PDF Export] Step 2: Fetching 12-month summary...');
      summary12Data = await enterpriseUsageService.getEnterpriseTrendSummary(
        selectedMonth,
        accountId,
        false
      );
      console.log(`[PDF Export] ✓ 12-month data fetched: ${summary12Data?.monthly?.length || 0} months`);
    } catch (err) {
      console.error('[PDF Export] Error fetching 12-month data:', err.message);
      throw new Error(`Failed to fetch 12-month summary: ${err.message}`);
    }

    try {
      console.log('[PDF Export] Step 3: Fetching monthly structure...');
      monthlyData = await enterpriseUsageService.getEnterpriseStructure(
        selectedMonth,
        accountId
      );
      console.log(`[PDF Export] ✓ Monthly data fetched: ${monthlyData?.teams?.length || 0} teams`);
    } catch (err) {
      console.error('[PDF Export] Error fetching monthly data:', err.message);
      throw new Error(`Failed to fetch monthly structure: ${err.message}`);
    }

    if (shouldIncludeDaily) {
      try {
        console.log('[PDF Export] Step 4: Fetching daily usage...');
        dailyData = await dailyUsageService.getEnterpriseDailyUsageStructure(
          selectedMonth,
          accountId,
          startDate,
          endDate
        );
        console.log(`[PDF Export] ✓ Daily data fetched: ${dailyData?.dailyBreakdown?.length || 0} rows`);
      } catch (err) {
        console.error('[PDF Export] Error fetching daily data:', err.message);
        throw new Error(`Failed to fetch daily usage: ${err.message}`);
      }
    } else {
      console.log('[PDF Export] Step 4: Daily usage skipped (date range not selected)');
    }

    // Transform data to PDF format
    console.log('[PDF Export] Step 5: Transforming data...');
    let transformedSummary12, transformedMonthly, transformedDaily;
    try {
      transformedSummary12 = transformSummary12Data(summary12Data);
      transformedMonthly = transformMonthlyData(monthlyData, selectedMonth);
      transformedDaily = transformDailyData(dailyData, startDate, endDate, shouldIncludeDaily);
      console.log('[PDF Export] ✓ Data transformation complete');
      console.log(`[PDF Export] Summary12 chartData: ${transformedSummary12?.chartData?.length || 0} months`);
      console.log(`[PDF Export] Monthly teams: ${transformedMonthly?.teams?.length || 0}`);
      console.log(`[PDF Export] Daily breakdown: ${transformedDaily?.dailyBreakdown?.length || 0} rows`);
    } catch (err) {
      console.error('[PDF Export] Error transforming data:', err.message);
      throw new Error(`Failed to transform data: ${err.message}`);
    }

    // Generate PDF
    console.log('[PDF Export] Step 6: Generating PDF document...');
    let pdfDoc;
    try {
      const pdfService = new PDFExportService();
      pdfDoc = await pdfService.generateReport(
        enterpriseEmail,
        transformedSummary12,
        transformedMonthly,
        transformedDaily
      );
      console.log('[PDF Export] ✓ PDF document generated');
    } catch (err) {
      console.error('[PDF Export] Error generating PDF:', err.message);
      console.error('[PDF Export] Stack:', err.stack);
      throw new Error(`Failed to generate PDF document: ${err.message}`);
    }

    // Set response headers
    const filename = `Heroku_Usage_Report_${enterpriseEmail.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    pdfDoc.pipe(res);
    pdfDoc.end();

    console.log(`[PDF Export] ✓ SUCCESS: ${filename}`);
  } catch (error) {
    console.error('[PDF Export] ✗ FAILED:', error.message);
    console.error('[PDF Export] Stack:', error.stack);

    // Send detailed error response
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate PDF report',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

module.exports = router;
