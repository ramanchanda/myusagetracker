const PDFDocument = require('pdfkit');
const { Chart } = require('chart.js');
const { createCanvas } = require('canvas');

// Register Chart.js components
const {
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} = require('chart.js');

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Clean, professional color palette
const COLORS = {
  primary: '#6f42c1',
  primaryLight: '#9b72d4',
  secondary: '#0ea5e9',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#1e293b',
  textLight: '#64748b',
  border: '#e2e8f0',
  bgLight: '#f8fafc',
  white: '#ffffff'
};

class SimplifiedPDFExportService {
  constructor() {
    this.doc = null;
    this.pageNumber = 0;
  }

  createDocument() {
    this.doc = new PDFDocument({
      size: 'A4',
      margin: 60,
      info: {
        Title: 'Heroku Usage Report',
        Author: 'Heroku Usage Tracker',
        Subject: 'Enterprise Usage Summary'
      }
    });
    this.pageNumber = 1;
    return this.doc;
  }

  // Add page header
  addPageHeader(title, subtitle = '') {
    const doc = this.doc;
    const pageWidth = doc.page.width;

    // Top border
    doc.rect(0, 0, pageWidth, 4).fill(COLORS.primary);

    // Title
    doc.fontSize(20)
      .fillColor(COLORS.primary)
      .font('Helvetica-Bold')
      .text(title, 60, 30);

    if (subtitle) {
      doc.fontSize(11)
        .fillColor(COLORS.textLight)
        .font('Helvetica')
        .text(subtitle, 60, 55);
    }

    doc.moveDown(3);
  }

  // Add page footer
  addPageFooter() {
    const doc = this.doc;
    const pageHeight = doc.page.height;
    const pageWidth = doc.page.width;

    // Bottom border
    doc.rect(0, pageHeight - 50, pageWidth, 1).fill(COLORS.border);

    // Page number and date
    doc.fontSize(9)
      .fillColor(COLORS.textLight)
      .font('Helvetica')
      .text(
        `Page ${this.pageNumber} | Generated ${new Date().toLocaleDateString()}`,
        60,
        pageHeight - 35,
        { align: 'center', width: pageWidth - 120 }
      );
  }

  // Section heading
  addSectionHeading(text) {
    const doc = this.doc;
    this.ensureValidY();

    doc.fontSize(14)
      .fillColor(COLORS.primary)
      .font('Helvetica-Bold')
      .text(text, 60);

    doc.moveDown(0.5);
  }

  // Metric card (single value display)
  addMetricCard(label, value, x, y, width = 160, height = 80) {
    const doc = this.doc;

    // Ensure value is safe to render
    const safeValue = (value === null || value === undefined || value === 'NaN' || String(value) === 'NaN')
      ? 'N/A'
      : String(value);

    // Card background
    doc.roundedRect(x, y, width, height, 5)
      .fillAndStroke(COLORS.white, COLORS.border);

    // Value (large)
    doc.fontSize(24)
      .fillColor(COLORS.primary)
      .font('Helvetica-Bold')
      .text(safeValue, x + 15, y + 20, { width: width - 30, align: 'left' });

    // Label (small)
    doc.fontSize(10)
      .fillColor(COLORS.textLight)
      .font('Helvetica')
      .text(label, x + 15, y + 52, { width: width - 30, align: 'left' });
  }

  // Key-value pair
  addKeyValue(key, value) {
    const doc = this.doc;
    const y = this.ensureValidY();

    // Ensure value is a valid string
    const safeValue = (value === null || value === undefined || value === 'NaN') ? 'N/A' : String(value);

    doc.fontSize(11)
      .fillColor(COLORS.textLight)
      .font('Helvetica')
      .text(key + ':', 60, y, { continued: true, width: 180 });

    doc.fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text(' ' + safeValue);

    doc.moveDown(0.3);
  }

  // Simple table with clean formatting
  addSimpleTable(headers, rows) {
    const doc = this.doc;
    const startX = 60;
    let y = this.ensureValidY();
    const tableWidth = doc.page.width - 120;
    const colWidth = tableWidth / headers.length;

    // Header row
    doc.rect(startX, y, tableWidth, 30)
      .fill(COLORS.primary);

    doc.fontSize(10)
      .fillColor(COLORS.white)
      .font('Helvetica-Bold');

    headers.forEach((header, i) => {
      doc.text(header, startX + (i * colWidth) + 10, y + 10, {
        width: colWidth - 20,
        align: 'left'
      });
    });

    y += 30;

    // Data rows
    doc.font('Helvetica').fontSize(9);

    rows.forEach((row, rowIndex) => {
      // Check for page break
      if (y > doc.page.height - 100) {
        doc.addPage();
        this.pageNumber++;
        this.addPageFooter();
        y = 80;

        // Re-draw header
        doc.rect(startX, y, tableWidth, 30).fill(COLORS.primary);
        doc.fontSize(10).fillColor(COLORS.white).font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(header, startX + (i * colWidth) + 10, y + 10, {
            width: colWidth - 20,
            align: 'left'
          });
        });
        y += 30;
        doc.font('Helvetica').fontSize(9);
      }

      // Alternate row background
      const bgColor = rowIndex % 2 === 0 ? COLORS.white : COLORS.bgLight;
      doc.rect(startX, y, tableWidth, 25).fill(bgColor);

      // Row data
      doc.fillColor(COLORS.text);
      row.forEach((cell, i) => {
        // Ensure cell is safe to render
        const safeCell = (cell === null || cell === undefined || String(cell) === 'NaN')
          ? 'N/A'
          : String(cell);

        doc.text(safeCell, startX + (i * colWidth) + 10, y + 8, {
          width: colWidth - 20,
          align: 'left'
        });
      });

      y += 25;
    });

    // Ensure y is valid before setting
    if (isNaN(y) || y === null || y === undefined) {
      console.warn('[PDF] Invalid Y in table, resetting');
      doc.y = 100;
    } else {
      doc.y = y + 10;
    }
    doc.moveDown(1);
  }

  // Create and add chart
  async addChart(type, data, options = {}) {
    const width = 500;
    const height = 250;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    const chartConfig = {
      type: type,
      data: data,
      options: {
        ...options,
        responsive: false,
        animation: false,
        plugins: {
          legend: {
            display: options.showLegend !== false,
            position: 'bottom'
          }
        }
      }
    };

    new Chart(ctx, chartConfig);
    const chartBuffer = canvas.toBuffer('image/png');

    const doc = this.doc;
    const x = (doc.page.width - 500) / 2;
    const y = this.ensureValidY();

    doc.image(chartBuffer, x, y, { width: 500, height: 250 });
    doc.moveDown(12);
  }

  // Ensure Y position is valid
  ensureValidY() {
    const doc = this.doc;
    if (isNaN(doc.y) || doc.y === null || doc.y === undefined) {
      console.warn('[PDF] Invalid Y position detected, resetting to 100');
      doc.y = 100;
    }
    return doc.y;
  }

  // Format large numbers with K/M suffix
  formatNumber(num) {
    // Handle NaN, null, undefined
    if (num === null || num === undefined || isNaN(num)) {
      return '0';
    }

    // Convert to number if string
    const n = Number(num);

    if (isNaN(n)) {
      return '0';
    }

    if (n >= 1000000) {
      return (n / 1000000).toFixed(1) + 'M';
    } else if (n >= 1000) {
      return (n / 1000).toFixed(1) + 'K';
    }
    return n.toLocaleString();
  }

  // ==================== MAIN REPORT GENERATOR ====================
  async generateReport(enterpriseEmail, summary12Data, monthlyData, dailyData) {
    this.createDocument();
    const doc = this.doc;

    // ========== PAGE 1: COVER PAGE ==========
    this.addPageHeader('Heroku Usage Report', `Account: ${enterpriseEmail}`);

    doc.moveDown(2);

    // Executive Summary Box
    doc.roundedRect(60, doc.y, doc.page.width - 120, 100, 5)
      .fillAndStroke(COLORS.bgLight, COLORS.border);

    doc.fontSize(12)
      .fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text('Executive Summary', 80, doc.y + 20);

    doc.fontSize(10)
      .fillColor(COLORS.textLight)
      .font('Helvetica')
      .text(
        'This report provides a comprehensive overview of your Heroku usage across ' +
        'compute resources, database connections, add-ons, and spaces.',
        80,
        doc.y + 15,
        { width: doc.page.width - 160 }
      );

    doc.moveDown(5);

    // Report Details
    this.addKeyValue('Generated On', new Date().toLocaleString());
    this.addKeyValue('Report Period', summary12Data.dateRange || 'Last 12 Months');
    this.addKeyValue('Account', enterpriseEmail);

    this.addPageFooter();

    // ========== PAGE 2: 12-MONTH SUMMARY ==========
    doc.addPage();
    this.pageNumber++;
    this.addPageHeader('Usage Trends', 'Past 12 Months Overview');

    // Key Metrics Cards
    const summaryStats = summary12Data.overallSummary || {};
    const currentY = this.ensureValidY();

    this.addMetricCard(
      'Total Dyno Units',
      this.formatNumber(summaryStats.totalDynoUnits || 0),
      60, currentY, 230, 80
    );

    this.addMetricCard(
      'Total Connect Rows',
      this.formatNumber(summaryStats.totalConnectRows || 0),
      310, currentY, 230, 80
    );

    doc.moveDown(6);

    // Trend Information
    const trendAnalysis = summary12Data.trendAnalysis || {};

    doc.roundedRect(60, doc.y, doc.page.width - 120, 80, 5)
      .fill(COLORS.bgLight);

    doc.fontSize(11)
      .fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text('Trend Analysis', 80, doc.y + 15);

    doc.fontSize(10)
      .fillColor(COLORS.textLight)
      .font('Helvetica')
      .text(
        `Dyno Usage: ${trendAnalysis.dynoTrend || 'Stable'} (${trendAnalysis.growthRate || '0%'})`,
        80, doc.y + 15
      );

    doc.text(
      `Connect Rows: ${trendAnalysis.connectTrend || 'Stable'}`,
      80, doc.y + 5
    );

    doc.moveDown(5);

    // Chart: Dyno Units Trend
    if (summary12Data.chartData && summary12Data.chartData.length > 0) {
      this.addSectionHeading('Dyno Units - Monthly Trend');

      await this.addChart('bar', {
        labels: summary12Data.chartData.map(d => d.month),
        datasets: [{
          label: 'Dyno Units',
          data: summary12Data.chartData.map(d => d.dynoUnits),
          backgroundColor: COLORS.primaryLight,
          borderColor: COLORS.primary,
          borderWidth: 2
        }]
      }, {
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Dyno Units' }
          }
        }
      });
    }

    this.addPageFooter();

    // ========== PAGE 3: RESOURCE BREAKDOWN ==========
    if (summary12Data.resourceBreakdown && summary12Data.resourceBreakdown.length > 0) {
      doc.addPage();
      this.pageNumber++;
      this.addPageHeader('Resource Breakdown', 'Usage by Resource Type');

      this.addSectionHeading('Summary by Resource');

      const headers = ['Resource', 'Total', 'Avg/Month', 'Peak'];
      const rows = summary12Data.resourceBreakdown.map(r => [
        r.resourceType || 'Unknown',
        this.formatNumber(r.totalUsage || 0),
        this.formatNumber(Math.round(r.avgMonthly || 0)),
        this.formatNumber(r.peakMonth || 0)
      ]);

      this.addSimpleTable(headers, rows);

      this.addPageFooter();
    }

    // ========== PAGE 4: MONTHLY REPORT ==========
    if (monthlyData && monthlyData.month) {
      doc.addPage();
      this.pageNumber++;
      this.addPageHeader('Monthly Report', monthlyData.month);

      const monthlySummary = monthlyData.summary || {};

      // Key metrics in a grid
      const monthlyY = this.ensureValidY();
      this.addMetricCard('Teams', String(monthlySummary.totalTeams || 0), 60, monthlyY, 120, 70);
      this.addMetricCard('Apps', String(monthlySummary.totalApps || 0), 200, monthlyY, 120, 70);
      this.addMetricCard('Dyno Units', this.formatNumber(monthlySummary.totalDynoUnits || 0), 340, monthlyY, 120, 70);

      doc.moveDown(5);

      // Top Teams (limit to 10)
      if (monthlyData.teams && monthlyData.teams.length > 0) {
        this.addSectionHeading('Top Teams by Usage');

        const headers = ['Team', 'Dyno Units', 'Connect Rows', 'Apps'];
        const topTeams = monthlyData.teams
          .sort((a, b) => (b.totalDynoUnits || 0) - (a.totalDynoUnits || 0))
          .slice(0, 10);

        const rows = topTeams.map(t => [
          (t.teamName || 'Unknown').substring(0, 30),
          this.formatNumber(t.totalDynoUnits || 0),
          this.formatNumber(t.totalConnectRows || 0),
          String(t.appCount || 0)
        ]);

        this.addSimpleTable(headers, rows);

        if (monthlyData.teams.length > 10) {
          doc.fontSize(9)
            .fillColor(COLORS.textLight)
            .font('Helvetica-Oblique')
            .text(`... and ${monthlyData.teams.length - 10} more teams`, 60);
        }
      }

      this.addPageFooter();
    }

    // ========== PAGE 5: DAILY REPORT (SUMMARY ONLY) ==========
    if (dailyData && dailyData.summary) {
      doc.addPage();
      this.pageNumber++;
      this.addPageHeader('Daily Report', dailyData.dateRange || '');

      const dailySummary = dailyData.summary || {};

      // Summary metrics
      const dailyY = this.ensureValidY();
      this.addMetricCard('Days', String(dailySummary.totalDays || 0), 60, dailyY, 150, 70);
      this.addMetricCard('Avg Daily Dyno', this.formatNumber(Math.round(dailySummary.avgDailyDyno || 0)), 230, dailyY, 150, 70);
      this.addMetricCard('Peak Day', dailySummary.peakDate || 'N/A', 400, dailyY, 140, 70);

      doc.moveDown(5);

      // Period Totals
      if (dailyData.periodTotals) {
        this.addSectionHeading('Period Totals');

        const pt = dailyData.periodTotals;
        this.addKeyValue('Dyno Units (Total)', this.formatNumber(pt.dynoUnits || 0));
        this.addKeyValue('Connect Rows (Max)', this.formatNumber(pt.connectRows || 0));
        this.addKeyValue('Data Add-ons (Total)', this.formatNumber(pt.dataAddons || 0));
        this.addKeyValue('General Add-ons (Total)', this.formatNumber(pt.generalAddons || 0));
        this.addKeyValue('Private Spaces', String(pt.privateSpaces || 0));
        this.addKeyValue('Shield Spaces', String(pt.shieldSpaces || 0));

        doc.moveDown(1);
      }

      // Top Teams/Apps Summary (instead of full breakdown)
      if (dailyData.dailyBreakdown && dailyData.dailyBreakdown.length > 0) {
        this.addSectionHeading('Top 10 Teams by Daily Usage');

        // Aggregate by team
        const teamTotals = {};
        dailyData.dailyBreakdown.forEach(row => {
          const team = row.teamName || 'Unknown';
          if (!teamTotals[team]) {
            teamTotals[team] = { dyno: 0, connect: 0, count: 0 };
          }
          teamTotals[team].dyno += row.dynoUnits || 0;
          teamTotals[team].connect += row.connectRows || 0;
          teamTotals[team].count += 1;
        });

        const topTeams = Object.entries(teamTotals)
          .sort((a, b) => b[1].dyno - a[1].dyno)
          .slice(0, 10);

        const headers = ['Team', 'Total Dyno', 'Total Connect', 'Records'];
        const rows = topTeams.map(([team, data]) => [
          team.substring(0, 35),
          this.formatNumber(Math.round(data.dyno)),
          this.formatNumber(Math.round(data.connect)),
          String(data.count)
        ]);

        this.addSimpleTable(headers, rows);

        doc.fontSize(9)
          .fillColor(COLORS.textLight)
          .font('Helvetica')
          .text(
            `Full breakdown: ${dailyData.dailyBreakdown.length.toLocaleString()} records available in web dashboard`,
            60
          );
      }

      this.addPageFooter();
    }

    // ========== FINAL PAGE: NOTES ==========
    doc.addPage();
    this.pageNumber++;
    this.addPageHeader('Report Notes');

    doc.fontSize(11)
      .fillColor(COLORS.text)
      .font('Helvetica')
      .text('About This Report', 60);

    doc.moveDown(0.5);

    doc.fontSize(10)
      .fillColor(COLORS.textLight)
      .font('Helvetica')
      .text(
        '• This report provides a high-level summary of your Heroku usage\n\n' +
        '• Dyno Units represent compute resources consumed\n\n' +
        '• Connect Rows indicate database connection usage\n\n' +
        '• For detailed breakdowns, please refer to the web dashboard\n\n' +
        '• All times and dates are in UTC unless otherwise specified',
        60,
        { width: doc.page.width - 120, lineGap: 4 }
      );

    doc.moveDown(2);

    doc.fontSize(9)
      .fillColor(COLORS.textLight)
      .font('Helvetica-Oblique')
      .text(
        'Generated by Heroku Usage Tracker',
        60,
        { align: 'center', width: doc.page.width - 120 }
      );

    this.addPageFooter();

    return this.doc;
  }
}

module.exports = SimplifiedPDFExportService;
