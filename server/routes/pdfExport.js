const express = require('express');
const router = express.Router();
const PDFExportService = require('../services/pdfExportService');
const usageService = require('../services/usageService');

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

    // Fetch all required data
    console.log('Fetching Summary of past 12 months data...');
    const summary12Data = await usageService.getSummaryOfPast12Months(enterpriseEmail);

    console.log('Fetching Monthly report data...');
    const monthlyData = await usageService.getMonthlyReport(
      enterpriseEmail,
      monthForMonthly || new Date().toISOString().slice(0, 7)
    );

    console.log('Fetching Daily report data...');
    const dailyData = await usageService.getDailyReport(
      enterpriseEmail,
      startDateForDaily || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDateForDaily || new Date().toISOString().split('T')[0]
    );

    // Generate PDF
    console.log('Generating PDF document...');
    const pdfService = new PDFExportService();
    const pdfDoc = await pdfService.generateReport(
      enterpriseEmail,
      summary12Data,
      monthlyData,
      dailyData
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

    // Fetch all required data
    console.log('Fetching Summary of past 12 months data...');
    const summary12Data = await usageService.getSummaryOfPast12Months(enterpriseEmail);

    console.log('Fetching Monthly report data...');
    const monthlyData = await usageService.getMonthlyReport(
      enterpriseEmail,
      monthForMonthly || new Date().toISOString().slice(0, 7)
    );

    console.log('Fetching Daily report data...');
    const dailyData = await usageService.getDailyReport(
      enterpriseEmail,
      startDateForDaily || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDateForDaily || new Date().toISOString().split('T')[0]
    );

    // Generate PDF
    console.log('Generating PDF document...');
    const pdfService = new PDFExportService();
    const pdfDoc = await pdfService.generateReport(
      enterpriseEmail,
      summary12Data,
      monthlyData,
      dailyData
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
