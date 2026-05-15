const express = require('express');
const router = express.Router();
const { generatePDF } = require('../services/puppeteerPdfService');
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
    const pdfBuffer = await generatePDF(printableUrl);

    console.log('[PDF Export Puppeteer POST] ✓ PDF generated successfully');
    console.log('[PDF Export Puppeteer POST] Buffer size:', pdfBuffer.length, 'bytes');

    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }

    // Verify PDF header
    const pdfHeader = pdfBuffer.slice(0, 10).toString();
    console.log('[PDF Export Puppeteer POST] PDF header:', pdfHeader);

    if (!pdfHeader.startsWith('%PDF-')) {
      throw new Error('Generated buffer is not a valid PDF');
    }

    // Set response headers
    const filename = `Heroku_Usage_Report_${enterpriseEmail.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
      'Content-Disposition': `attachment; filename="${filename}"`
    });

    // Send PDF buffer as binary
    res.end(pdfBuffer, 'binary');

    console.log(`[PDF Export Puppeteer POST] ✓ SUCCESS: ${filename}`);
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

    const pdfBuffer = await generatePDF(printableUrl);

    console.log('[PDF Export Puppeteer] ✓ PDF generated successfully');
    console.log('[PDF Export Puppeteer] Buffer size:', pdfBuffer.length, 'bytes');
    console.log('[PDF Export Puppeteer] Buffer type:', typeof pdfBuffer);
    console.log('[PDF Export Puppeteer] Is Buffer:', Buffer.isBuffer(pdfBuffer));

    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }

    // Verify PDF header
    const pdfHeader = pdfBuffer.slice(0, 10).toString();
    console.log('[PDF Export Puppeteer] PDF header:', pdfHeader);

    if (!pdfHeader.startsWith('%PDF-')) {
      console.error('[PDF Export Puppeteer] Invalid PDF buffer:', pdfBuffer.slice(0, 100).toString());
      throw new Error('Generated buffer is not a valid PDF');
    }

    // Set response headers
    const filename = `Heroku_Usage_Report_${enterpriseEmail.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
      'Content-Disposition': `attachment; filename="${filename}"`
    });

    // Send PDF buffer as binary
    res.end(pdfBuffer, 'binary');

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
