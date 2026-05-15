const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

class PuppeteerPDFService {
  constructor() {
    this.browser = null;
  }

  async launchBrowser() {
    if (this.browser) {
      return this.browser;
    }

    console.log('[Puppeteer PDF] Launching browser...');

    try {
      this.browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });

      console.log('[Puppeteer PDF] Browser launched successfully');
      return this.browser;
    } catch (error) {
      console.error('[Puppeteer PDF] Failed to launch browser:', error);
      throw error;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('[Puppeteer PDF] Browser closed');
    }
  }

  async generateDashboardPDF(url, options = {}) {
    const {
      format = 'A4',
      landscape = false,
      printBackground = true,
      margin = {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      timeout = 60000
    } = options;

    let page;

    try {
      console.log('[Puppeteer PDF] Generating PDF for URL:', url);

      const browser = await this.launchBrowser();
      page = await browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 2
      });

      console.log('[Puppeteer PDF] Navigating to URL...');

      // Navigate to the page
      await page.goto(url, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: timeout
      });

      console.log('[Puppeteer PDF] Page loaded, waiting for dashboard to be ready...');

      // Wait for dashboard to be fully loaded
      try {
        await page.waitForSelector('.dashboard-loaded', { timeout: 30000 });
        console.log('[Puppeteer PDF] Dashboard loaded marker found');
      } catch (err) {
        console.warn('[Puppeteer PDF] Dashboard loaded marker not found, proceeding anyway');
      }

      // Wait a bit more for charts to fully render
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

      console.log('[Puppeteer PDF] Generating PDF...');

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: format,
        landscape: landscape,
        printBackground: printBackground,
        margin: margin,
        preferCSSPageSize: false
      });

      console.log('[Puppeteer PDF] PDF generated successfully, size:', pdfBuffer.length, 'bytes');

      await page.close();

      return pdfBuffer;

    } catch (error) {
      console.error('[Puppeteer PDF] Error generating PDF:', error);
      if (page) {
        try {
          await page.close();
        } catch (closeErr) {
          console.error('[Puppeteer PDF] Error closing page:', closeErr);
        }
      }
      throw error;
    }
  }

  async generatePDFFromHTML(html, options = {}) {
    const {
      format = 'A4',
      landscape = false,
      printBackground = true,
      margin = {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    } = options;

    let page;

    try {
      console.log('[Puppeteer PDF] Generating PDF from HTML...');

      const browser = await this.launchBrowser();
      page = await browser.newPage();

      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 2
      });

      await page.setContent(html, {
        waitUntil: ['networkidle0', 'domcontentloaded']
      });

      // Wait for any dynamic content
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));

      const pdfBuffer = await page.pdf({
        format: format,
        landscape: landscape,
        printBackground: printBackground,
        margin: margin
      });

      console.log('[Puppeteer PDF] PDF generated from HTML, size:', pdfBuffer.length, 'bytes');

      await page.close();

      return pdfBuffer;

    } catch (error) {
      console.error('[Puppeteer PDF] Error generating PDF from HTML:', error);
      if (page) {
        try {
          await page.close();
        } catch (closeErr) {
          console.error('[Puppeteer PDF] Error closing page:', closeErr);
        }
      }
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getPuppeteerPDFService: () => {
    if (!instance) {
      instance = new PuppeteerPDFService();
    }
    return instance;
  },
  PuppeteerPDFService
};
