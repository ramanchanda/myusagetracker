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
    const startDate = startDateForDaily || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = endDateForDaily || new Date().toISOString().split('T')[0];

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

    console.log('Fetching Daily report data...');
    const dailyData = await dailyUsageService.getEnterpriseDailyUsageStructure(
      selectedMonth,
      accountId,
      startDate,
      endDate
    );

    // Transform data to PDF format
    console.log('Transforming data for PDF...');
    const transformedSummary12 = transformSummary12Data(summary12Data);
    const transformedMonthly = transformMonthlyData(monthlyData, selectedMonth);
    const transformedDaily = transformDailyData(dailyData, startDate, endDate);

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
    const startDate = startDateForDaily || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = endDateForDaily || new Date().toISOString().split('T')[0];

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

    console.log('Fetching Daily report data...');
    const dailyData = await dailyUsageService.getEnterpriseDailyUsageStructure(
      selectedMonth,
      accountId,
      startDate,
      endDate
    );

    // Transform data to PDF format
    console.log('Transforming data for PDF...');
    const transformedSummary12 = transformSummary12Data(summary12Data);
    const transformedMonthly = transformMonthlyData(monthlyData, selectedMonth);
    const transformedDaily = transformDailyData(dailyData, startDate, endDate);

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

module.exports = router;
