const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

async function generatePDF(url) {
  let browser;
  let page;

  try {
    console.log('[PDF] Step 1: Starting Chromium browser...');

    // Launch browser with Heroku-optimized settings
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote'
      ],
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true
    });

    console.log('[PDF] ✓ Browser launched successfully');
    console.log('[PDF] Step 2: Creating new page...');

    page = await browser.newPage();

    // Set viewport
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2
    });

    console.log('[PDF] Step 3: Loading URL:', url);

    // Navigate to the page
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 120000
    });

    console.log('[PDF] ✓ Page loaded');
    console.log('[PDF] Step 4: Waiting for report to render...');

    // Wait for report-ready marker
    try {
      await page.waitForSelector('#report-ready', {
        timeout: 60000 // 60 seconds for data fetching + rendering
      });
      console.log('[PDF] ✓ Report ready marker found');
    } catch (err) {
      console.error('[PDF] ✗ Report ready marker not found after 60s');
      throw new Error('Report failed to render - data may not be available');
    }

    console.log('[PDF] ✓ Report fully rendered');

    console.log('[PDF] Step 5: Generating PDF...');

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    console.log('[PDF] ✓ PDF generated successfully');
    console.log('[PDF] PDF buffer size:', pdfBuffer.length, 'bytes');

    // Validate PDF buffer (trust Puppeteer output, just check it exists)
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }

    // Log header bytes for debugging
    const headerBytes = pdfBuffer.slice(0, 5);
    console.log('[PDF] PDF header bytes:', Array.from(headerBytes));
    console.log('[PDF] ✓ PDF validation passed');

    // Close page and browser
    console.log('[PDF] Step 6: Cleaning up...');
    await page.close();
    await browser.close();
    console.log('[PDF] ✓ Cleanup complete');

    return pdfBuffer;

  } catch (error) {
    console.error('[PDF] ✗ Error generating PDF:', error.message);
    console.error('[PDF] Error stack:', error.stack);

    // Cleanup on error
    if (page) {
      try {
        await page.close();
      } catch (closeErr) {
        console.error('[PDF] Error closing page:', closeErr.message);
      }
    }

    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error('[PDF] Error closing browser:', closeErr.message);
      }
    }

    throw error;
  }
}

module.exports = {
  generatePDF
};
