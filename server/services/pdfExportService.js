const PDFDocument = require('pdfkit');
const { Chart } = require('chart.js');
const { createCanvas } = require('canvas');

// Register Chart.js components
const { CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } = require('chart.js');
Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

// Color palette matching the app design
const COLORS = {
  primary: '#6f42c1',
  secondary: '#5a31a3',
  accent: '#c4b5fd',
  warning: '#f59e0b',
  danger: '#ef4444',
  success: '#10b981',
  text: '#0f172a',
  textLight: '#64748b',
  background: '#f8f5ff',
  border: '#e9defd'
};

class PDFExportService {
  constructor() {
    this.doc = null;
    this.pageNumber = 0;
  }

  // Initialize PDF document
  createDocument() {
    this.doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: 'Heroku Usage Report',
        Author: 'Heroku Usage Tracker',
        Subject: 'Enterprise Usage Analysis'
      }
    });
    this.pageNumber = 1;
    return this.doc;
  }

  // Add header to each page
  addHeader(title, subtitle = '') {
    const doc = this.doc;

    // Purple gradient header bar
    doc.rect(0, 0, doc.page.width, 80)
      .fillAndStroke(COLORS.primary, COLORS.secondary);

    // Title
    doc.fontSize(24)
      .fillColor('white')
      .font('Helvetica-Bold')
      .text(title, 50, 25);

    if (subtitle) {
      doc.fontSize(12)
        .fillColor('white')
        .font('Helvetica')
        .text(subtitle, 50, 55);
    }

    doc.moveDown(2);
  }

  // Add footer to each page
  addFooter() {
    const doc = this.doc;
    const pageHeight = doc.page.height;

    doc.fontSize(8)
      .fillColor(COLORS.textLight)
      .font('Helvetica')
      .text(
        `Page ${this.pageNumber} | Generated on ${new Date().toLocaleString()}`,
        50,
        pageHeight - 30,
        { align: 'center', width: doc.page.width - 100 }
      );
  }

  // Add section header
  addSectionHeader(text, icon = '') {
    const doc = this.doc;

    doc.moveDown(1);

    // Section background
    const y = doc.y;
    doc.rect(40, y - 5, doc.page.width - 80, 30)
      .fillAndStroke(COLORS.background, COLORS.border);

    // Section title
    doc.fontSize(16)
      .fillColor(COLORS.primary)
      .font('Helvetica-Bold')
      .text(`${icon} ${text}`, 50, y, { continued: false });

    doc.moveDown(1.5);
  }

  // Add key-value pair
  addKeyValue(key, value, options = {}) {
    const doc = this.doc;
    const { bold = false, color = COLORS.text, fontSize = 11 } = options;

    const y = doc.y;

    // Key
    doc.fontSize(fontSize)
      .fillColor(COLORS.textLight)
      .font('Helvetica-Bold')
      .text(key + ':', 50, y, { continued: true, width: 200 });

    // Value
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fillColor(color)
      .text(' ' + value, { width: 300 });

    doc.moveDown(0.5);
  }

  // Add summary card (for overall summary)
  addSummaryCard(label, value, subtext = '', x, y, width = 120, height = 80) {
    const doc = this.doc;

    // Card background with gradient effect
    doc.rect(x, y, width, height)
      .fillAndStroke(COLORS.background, COLORS.border);

    // Value
    doc.fontSize(20)
      .fillColor(COLORS.primary)
      .font('Helvetica-Bold')
      .text(value, x + 10, y + 15, { width: width - 20, align: 'center' });

    // Label
    doc.fontSize(9)
      .fillColor(COLORS.textLight)
      .font('Helvetica')
      .text(label, x + 10, y + 42, { width: width - 20, align: 'center' });

    // Subtext
    if (subtext) {
      doc.fontSize(7)
        .fillColor(COLORS.textLight)
        .text(subtext, x + 10, y + 60, { width: width - 20, align: 'center' });
    }
  }

  // Add table
  addTable(headers, rows, options = {}) {
    const doc = this.doc;
    const { columnWidths = [], fontSize = 9, startY = null } = options;

    const startX = 50;
    let y = startY || doc.y;
    const tableWidth = doc.page.width - 100;

    // Calculate column widths if not provided
    const numCols = headers.length;
    const colWidths = columnWidths.length === numCols
      ? columnWidths
      : Array(numCols).fill(tableWidth / numCols);

    // Draw header
    doc.rect(startX, y, tableWidth, 25)
      .fillAndStroke(COLORS.primary, COLORS.secondary);

    let x = startX;
    doc.fontSize(fontSize)
      .fillColor('white')
      .font('Helvetica-Bold');

    headers.forEach((header, i) => {
      doc.text(header, x + 5, y + 8, { width: colWidths[i] - 10, align: 'left' });
      x += colWidths[i];
    });

    y += 25;

    // Draw rows
    doc.fillColor(COLORS.text).font('Helvetica');

    rows.forEach((row, rowIndex) => {
      // Check if we need a new page
      if (y > doc.page.height - 100) {
        doc.addPage();
        this.pageNumber++;
        this.addFooter();
        y = 50;

        // Redraw header on new page
        doc.rect(startX, y, tableWidth, 25)
          .fillAndStroke(COLORS.primary, COLORS.secondary);

        x = startX;
        doc.fontSize(fontSize)
          .fillColor('white')
          .font('Helvetica-Bold');

        headers.forEach((header, i) => {
          doc.text(header, x + 5, y + 8, { width: colWidths[i] - 10, align: 'left' });
          x += colWidths[i];
        });

        y += 25;
        doc.fillColor(COLORS.text).font('Helvetica');
      }

      // Alternate row colors
      const bgColor = rowIndex % 2 === 0 ? '#ffffff' : COLORS.background;
      doc.rect(startX, y, tableWidth, 20)
        .fill(bgColor);

      x = startX;
      row.forEach((cell, i) => {
        doc.fillColor(COLORS.text)
          .text(String(cell), x + 5, y + 5, { width: colWidths[i] - 10, align: 'left' });
        x += colWidths[i];
      });

      y += 20;
    });

    doc.moveDown(1);
  }

  // Generate chart and embed as image
  async createChart(type, data, options = {}) {
    const width = 400;
    const height = 250;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Set white background
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
            display: true,
            position: 'bottom'
          }
        }
      }
    };

    new Chart(ctx, chartConfig);

    return canvas.toBuffer('image/png');
  }

  // Add chart to PDF
  async addChart(type, data, options = {}) {
    const doc = this.doc;
    const chartBuffer = await this.createChart(type, data, options);

    const x = (doc.page.width - 400) / 2;
    const y = doc.y;

    doc.image(chartBuffer, x, y, { width: 400, height: 250 });
    doc.moveDown(10);
  }

  // Generate complete PDF report
  async generateReport(enterpriseEmail, summary12Data, monthlyData, dailyData) {
    this.createDocument();
    const doc = this.doc;

    // ========== COVER PAGE ==========
    this.addHeader('Heroku Usage Report', `Enterprise Account: ${enterpriseEmail}`);

    doc.moveDown(3);

    // Report metadata
    doc.fontSize(14)
      .fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text('Report Information', 50);

    doc.moveDown(1);

    this.addKeyValue('Generated On', new Date().toLocaleString());
    this.addKeyValue('Report Period', summary12Data.dateRange || 'Last 12 Months');
    this.addKeyValue('Enterprise Account', enterpriseEmail);

    this.addFooter();

    // ========== SUMMARY OF PAST 12 MONTHS ==========
    doc.addPage();
    this.pageNumber++;

    this.addHeader('Summary of Past 12 Months');
    this.addFooter();

    doc.moveDown(2);

    // Overall Summary Cards
    this.addSectionHeader('Overall Summary', '📊');

    const summaryStats = summary12Data.overallSummary || {};
    const cardWidth = 130;
    const cardHeight = 85;
    const spacing = 15;
    const startX = 50;
    let currentX = startX;
    let currentY = doc.y;

    const summaryCards = [
      { label: 'Total Dyno Units', value: (summaryStats.totalDynoUnits || 0).toLocaleString(), subtext: 'Across all months' },
      { label: 'Total Connect Rows', value: (summaryStats.totalConnectRows || 0).toLocaleString(), subtext: 'Database usage' },
      { label: 'Avg Monthly Dyno', value: (summaryStats.avgMonthlyDyno || 0).toFixed(0), subtext: 'Per month' },
      { label: 'Peak Month Dyno', value: (summaryStats.peakMonthDyno || 0).toLocaleString(), subtext: summaryStats.peakMonthLabel || '' }
    ];

    summaryCards.forEach((card, index) => {
      if (index > 0 && index % 3 === 0) {
        currentY += cardHeight + spacing;
        currentX = startX;
      }
      this.addSummaryCard(card.label, card.value, card.subtext, currentX, currentY, cardWidth, cardHeight);
      currentX += cardWidth + spacing;
    });

    doc.y = currentY + cardHeight + spacing + 20;

    // Trend Analysis
    this.addSectionHeader('Trend Analysis', '📈');

    const trendAnalysis = summary12Data.trendAnalysis || {};
    this.addKeyValue('Dyno Trend', trendAnalysis.dynoTrend || 'N/A', { color: COLORS.primary });
    this.addKeyValue('Connect Trend', trendAnalysis.connectTrend || 'N/A', { color: COLORS.primary });
    this.addKeyValue('Growth Rate', trendAnalysis.growthRate || 'N/A', { color: COLORS.success });

    // Dyno Units Chart
    if (summary12Data.chartData && summary12Data.chartData.length > 0) {
      doc.moveDown(1);
      this.addSectionHeader('Dyno Units - 12 Month Trend', '📊');

      const chartData = {
        labels: summary12Data.chartData.map(d => d.month),
        datasets: [{
          label: 'Dyno Units',
          data: summary12Data.chartData.map(d => d.dynoUnits),
          backgroundColor: COLORS.accent,
          borderColor: COLORS.primary,
          borderWidth: 2
        }]
      };

      await this.addChart('bar', chartData, {
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Dyno Units'
            }
          }
        }
      });
    }

    // Resource Breakdown Table
    if (summary12Data.resourceBreakdown && summary12Data.resourceBreakdown.length > 0) {
      doc.addPage();
      this.pageNumber++;
      this.addHeader('Summary of Past 12 Months (cont.)');
      this.addFooter();

      doc.moveDown(2);
      this.addSectionHeader('Resource Breakdown by Type', '🔧');

      const headers = ['Resource Type', 'Total Usage', 'Avg Monthly', 'Peak Month'];
      const rows = summary12Data.resourceBreakdown.map(r => [
        r.resourceType || 'Unknown',
        (r.totalUsage || 0).toLocaleString(),
        (r.avgMonthly || 0).toFixed(2),
        (r.peakMonth || 0).toLocaleString()
      ]);

      this.addTable(headers, rows, { columnWidths: [150, 120, 120, 105] });
    }

    // ========== MONTHLY REPORT ==========
    if (monthlyData && monthlyData.month) {
      doc.addPage();
      this.pageNumber++;

      this.addHeader('Monthly Report', `${monthlyData.month}`);
      this.addFooter();

      doc.moveDown(2);

      // Monthly Summary Cards
      this.addSectionHeader('Monthly Summary', '📅');

      const monthlySummary = monthlyData.summary || {};
      currentX = startX;
      currentY = doc.y;

      const monthlyCards = [
        { label: 'Total Teams', value: String(monthlySummary.totalTeams || 0), subtext: 'Active teams' },
        { label: 'Total Apps', value: String(monthlySummary.totalApps || 0), subtext: 'Applications' },
        { label: 'Total Dyno Units', value: (monthlySummary.totalDynoUnits || 0).toLocaleString(), subtext: 'This month' },
        { label: 'Total Connect Rows', value: (monthlySummary.totalConnectRows || 0).toLocaleString(), subtext: 'Database usage' }
      ];

      monthlyCards.forEach((card, index) => {
        if (index > 0 && index % 3 === 0) {
          currentY += cardHeight + spacing;
          currentX = startX;
        }
        this.addSummaryCard(card.label, card.value, card.subtext, currentX, currentY, cardWidth, cardHeight);
        currentX += cardWidth + spacing;
      });

      doc.y = currentY + cardHeight + spacing + 20;

      // Teams Table
      if (monthlyData.teams && monthlyData.teams.length > 0) {
        doc.moveDown(1);
        this.addSectionHeader('Teams Usage', '👥');

        const headers = ['Team Name', 'Dyno Units', 'Connect Rows', 'Apps'];
        const rows = monthlyData.teams.slice(0, 15).map(t => [
          t.teamName || 'Unknown',
          (t.totalDynoUnits || 0).toLocaleString(),
          (t.totalConnectRows || 0).toLocaleString(),
          String(t.appCount || 0)
        ]);

        this.addTable(headers, rows, { columnWidths: [200, 110, 110, 75] });

        if (monthlyData.teams.length > 15) {
          doc.fontSize(9)
            .fillColor(COLORS.textLight)
            .font('Helvetica-Oblique')
            .text(`... and ${monthlyData.teams.length - 15} more teams`, 50, doc.y);
        }
      }
    }

    // ========== DAILY REPORT ==========
    if (dailyData && dailyData.dateRange) {
      doc.addPage();
      this.pageNumber++;

      this.addHeader('Daily Report', `${dailyData.dateRange}`);
      this.addFooter();

      doc.moveDown(2);

      // Daily Summary
      this.addSectionHeader('Daily Summary', '📆');

      const dailySummary = dailyData.summary || {};
      currentX = startX;
      currentY = doc.y;

      const dailyCards = [
        { label: 'Total Days', value: String(dailySummary.totalDays || 0), subtext: 'In period' },
        { label: 'Avg Daily Dyno', value: (dailySummary.avgDailyDyno || 0).toFixed(1), subtext: 'Per day' },
        { label: 'Peak Day Dyno', value: (dailySummary.peakDayDyno || 0).toLocaleString(), subtext: dailySummary.peakDate || '' }
      ];

      dailyCards.forEach((card, index) => {
        this.addSummaryCard(card.label, card.value, card.subtext, currentX, currentY, cardWidth, cardHeight);
        currentX += cardWidth + spacing;
      });

      doc.y = currentY + cardHeight + spacing + 20;

      // Daily Breakdown Table
      if (dailyData.dailyBreakdown && dailyData.dailyBreakdown.length > 0) {
        doc.moveDown(1);
        this.addSectionHeader('Daily Breakdown', '📋');

        const headers = ['Date', 'Team', 'App', 'Dyno', 'Connect'];
        const rows = dailyData.dailyBreakdown.slice(0, 30).map(d => [
          d.date || '',
          d.teamName || '',
          d.appName || '',
          (d.dynoUnits || 0).toFixed(2),
          (d.connectRows || 0).toLocaleString()
        ]);

        this.addTable(headers, rows, {
          columnWidths: [90, 130, 130, 70, 75],
          fontSize: 8
        });

        if (dailyData.dailyBreakdown.length > 30) {
          doc.fontSize(9)
            .fillColor(COLORS.textLight)
            .font('Helvetica-Oblique')
            .text(`... and ${dailyData.dailyBreakdown.length - 30} more records`, 50, doc.y);
        }
      }
    }

    // ========== FINAL PAGE - SUMMARY ==========
    doc.addPage();
    this.pageNumber++;

    this.addHeader('Report Summary');
    this.addFooter();

    doc.moveDown(3);

    doc.fontSize(12)
      .fillColor(COLORS.text)
      .font('Helvetica')
      .text('This report was automatically generated by Heroku Usage Tracker.', 50, doc.y, {
        align: 'center',
        width: doc.page.width - 100
      });

    doc.moveDown(2);

    doc.fontSize(10)
      .fillColor(COLORS.textLight)
      .text('For questions or support, please contact your system administrator.', 50, doc.y, {
        align: 'center',
        width: doc.page.width - 100
      });

    return doc;
  }
}

module.exports = PDFExportService;
