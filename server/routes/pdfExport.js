const express = require('express');
const router = express.Router();
const { getPuppeteerPDFService } = require('../services/puppeteerPdfService');
const enterpriseUsageService = require('../services/enterpriseUsageService');

/**
 * POST /api/pdf/export
 * Generate PDF report using Puppeteer
 *
 * Body:
 * {
 *   "enterpriseEmail": "account@example.com"
 * }
 */
router.post('/export', async (req, res) => {
  try {
    const { enterpriseEmail } = req.body;

    if (!enterpriseEmail) {
      return res.status(400).json({ error: 'enterpriseEmail is required' });
    }

    console.log(`[PDF Export Puppeteer POST] Generating PDF report for ${enterpriseEmail}`);

    // Verify account exists
    const client = enterpriseUsageService.createHerokuClient();
    const accounts = await enterpriseUsageService.getAllEnterpriseAccounts(client);
    const account = accounts.find(acc => acc.email === enterpriseEmail || acc.name === enterpriseEmail);

    if (!account) {
      return res.status(404).json({ error: 'Enterprise account not found' });
    }

    // Construct the printable dashboard URL
    const protocol = req.protocol;
    const host = req.get('host');
    const printableUrl = `${protocol}://${host}/report/print/${encodeURIComponent(enterpriseEmail)}`;

    console.log(`[PDF Export Puppeteer POST] Printable URL: ${printableUrl}`);

    // Generate PDF using Puppeteer
    const pdfService = getPuppeteerPDFService();
    const pdfBuffer = await pdfService.generateDashboardPDF(printableUrl, {
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      timeout: 90000
    });

    // Set response headers
    const filename = `Heroku_Usage_Report_${enterpriseEmail.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send PDF buffer
    res.send(pdfBuffer);

    console.log(`[PDF Export Puppeteer POST] PDF report generated successfully: ${filename}`);
  } catch (error) {
    console.error('[PDF Export Puppeteer POST] Error generating PDF report:', error);
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
    const { monthForMonthly } = req.query;

    console.log(`[PDF Export Puppeteer] Starting PDF generation for: ${enterpriseEmail}`);
    console.log(`[PDF Export Puppeteer] Parameters:`, { monthForMonthly });

    if (!enterpriseEmail) {
      console.error('[PDF Export Puppeteer] Error: enterpriseEmail is required');
      return res.status(400).json({ error: 'enterpriseEmail is required' });
    }

    // Verify account exists
    console.log('[PDF Export Puppeteer] Verifying account...');
    let client, accounts, account;
    try {
      client = enterpriseUsageService.createHerokuClient();
      accounts = await enterpriseUsageService.getAllEnterpriseAccounts(client);
      account = accounts.find(acc => acc.email === enterpriseEmail || acc.name === enterpriseEmail);
      console.log(`[PDF Export Puppeteer] Found ${accounts.length} accounts, matching: ${account ? 'YES' : 'NO'}`);
    } catch (err) {
      console.error('[PDF Export Puppeteer] Error finding account:', err.message);
      throw new Error(`Failed to find enterprise account: ${err.message}`);
    }

    if (!account) {
      console.error(`[PDF Export Puppeteer] Account not found for: ${enterpriseEmail}`);
      return res.status(404).json({
        error: 'Enterprise account not found',
        availableAccounts: accounts.map(a => a.email || a.name).join(', ')
      });
    }

    // Construct the printable dashboard URL
    const protocol = req.protocol;
    const host = req.get('host');
    const printableUrl = `${protocol}://${host}/report/print/${encodeURIComponent(enterpriseEmail)}`;

    console.log(`[PDF Export Puppeteer] Printable URL: ${printableUrl}`);

    // Generate PDF using Puppeteer
    console.log('[PDF Export Puppeteer] Generating PDF with Puppeteer...');
    const pdfService = getPuppeteerPDFService();

    const pdfBuffer = await pdfService.generateDashboardPDF(printableUrl, {
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      timeout: 90000 // 90 seconds
    });

    console.log('[PDF Export Puppeteer] ✓ PDF generated successfully');

    // Set response headers
    const filename = `Heroku_Usage_Report_${enterpriseEmail.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send PDF buffer
    res.send(pdfBuffer);

    console.log(`[PDF Export Puppeteer] ✓ SUCCESS: ${filename}`);
  } catch (error) {
    console.error('[PDF Export Puppeteer] ✗ FAILED:', error.message);
    console.error('[PDF Export Puppeteer] Stack:', error.stack);

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
