/**
 * PDF Generation Test Script
 * Run this locally to test PDF generation without deploying
 *
 * Usage: node test-pdf-generation.js
 */

require('dotenv').config();
const PDFExportService = require('./server/services/pdfExportService');
const { transformSummary12Data, transformMonthlyData, transformDailyData } = require('./server/services/pdfDataTransformer');
const fs = require('fs');

// Mock data for testing
const mockSummary12Data = {
  monthly: [
    { month: '2025-05', dynoUnits: 1234, connectRows: 5678, dataAddons: 100, generalAddons: 50, privateSpaces: 2, shieldSpaces: 1 },
    { month: '2025-06', dynoUnits: 1456, connectRows: 6789, dataAddons: 120, generalAddons: 60, privateSpaces: 2, shieldSpaces: 1 },
    { month: '2025-07', dynoUnits: 1567, connectRows: 7890, dataAddons: 130, generalAddons: 65, privateSpaces: 3, shieldSpaces: 1 },
    { month: '2025-08', dynoUnits: 1678, connectRows: 8901, dataAddons: 140, generalAddons: 70, privateSpaces: 3, shieldSpaces: 2 },
    { month: '2025-09', dynoUnits: 1789, connectRows: 9012, dataAddons: 150, generalAddons: 75, privateSpaces: 3, shieldSpaces: 2 },
    { month: '2025-10', dynoUnits: 1890, connectRows: 10123, dataAddons: 160, generalAddons: 80, privateSpaces: 4, shieldSpaces: 2 },
    { month: '2025-11', dynoUnits: 1901, connectRows: 11234, dataAddons: 170, generalAddons: 85, privateSpaces: 4, shieldSpaces: 2 },
    { month: '2025-12', dynoUnits: 2012, connectRows: 12345, dataAddons: 180, generalAddons: 90, privateSpaces: 4, shieldSpaces: 3 },
    { month: '2026-01', dynoUnits: 2123, connectRows: 13456, dataAddons: 190, generalAddons: 95, privateSpaces: 5, shieldSpaces: 3 },
    { month: '2026-02', dynoUnits: 2234, connectRows: 14567, dataAddons: 200, generalAddons: 100, privateSpaces: 5, shieldSpaces: 3 },
    { month: '2026-03', dynoUnits: 2345, connectRows: 15678, dataAddons: 210, generalAddons: 105, privateSpaces: 5, shieldSpaces: 3 },
    { month: '2026-04', dynoUnits: 2456, connectRows: 16789, dataAddons: 220, generalAddons: 110, privateSpaces: 6, shieldSpaces: 4 }
  ],
  analysis: {
    avgDynoUnitsPerMonth: 1895,
    avgConnectRowsPerMonth: 10542,
    dynoTrendPct: 15.5,
    connectTrendPct: 8.2,
    privateSpacesTrendPct: 10.0,
    shieldSpacesTrendPct: 12.5
  }
};

const mockMonthlyData = {
  account: {
    email: 'test@example.com',
    name: 'Test Account'
  },
  enterpriseAccount: {
    id: 'test-enterprise-id',
    name: 'Test Enterprise'
  },
  teams: [
    { teamName: 'Team Alpha', totalDynoUnits: 500, totalConnectRows: 2000, appCount: 10 },
    { teamName: 'Team Beta', totalDynoUnits: 300, totalConnectRows: 1500, appCount: 5 },
    { teamName: 'Team Gamma', totalDynoUnits: 400, totalConnectRows: 1800, appCount: 8 }
  ],
  summary: {
    totalTeams: 3,
    totalApps: 23,
    totalDynoUnits: 1200,
    totalConnectRows: 5300
  }
};

const mockDailyData = {
  dailyBreakdown: [
    { date: '2026-05-01', teamName: 'Team Alpha', appName: 'app-1', dynoUnits: 50, connectRows: 200, dataAddons: 10, generalAddons: 5 },
    { date: '2026-05-01', teamName: 'Team Beta', appName: 'app-2', dynoUnits: 30, connectRows: 150, dataAddons: 8, generalAddons: 4 },
    { date: '2026-05-02', teamName: 'Team Alpha', appName: 'app-1', dynoUnits: 55, connectRows: 220, dataAddons: 11, generalAddons: 5 },
    { date: '2026-05-02', teamName: 'Team Beta', appName: 'app-2', dynoUnits: 32, connectRows: 160, dataAddons: 9, generalAddons: 4 }
  ]
};

async function testPDFGeneration() {
  console.log('🧪 Testing PDF Generation...\n');

  try {
    // Step 1: Transform data
    console.log('Step 1: Transforming data...');
    const transformedSummary12 = transformSummary12Data(mockSummary12Data);
    const transformedMonthly = transformMonthlyData(mockMonthlyData, '2026-05');
    const transformedDaily = transformDailyData(mockDailyData, '2026-05-01', '2026-05-02');

    console.log('✓ Data transformation complete');
    console.log(`  - Summary12 chartData: ${transformedSummary12?.chartData?.length || 0} months`);
    console.log(`  - Monthly teams: ${transformedMonthly?.teams?.length || 0}`);
    console.log(`  - Daily breakdown: ${transformedDaily?.dailyBreakdown?.length || 0} rows\n`);

    // Step 2: Generate PDF
    console.log('Step 2: Generating PDF...');
    const pdfService = new PDFExportService();
    const pdfDoc = await pdfService.generateReport(
      'test@example.com',
      transformedSummary12,
      transformedMonthly,
      transformedDaily
    );

    // Step 3: Save to file
    const outputFile = './test-output.pdf';
    console.log(`Step 3: Saving to ${outputFile}...`);

    const writeStream = fs.createWriteStream(outputFile);
    pdfDoc.pipe(writeStream);
    pdfDoc.end();

    writeStream.on('finish', () => {
      console.log('✓ PDF generated successfully!');
      console.log(`\n✅ Test complete! Check ${outputFile}\n`);
    });

    writeStream.on('error', (err) => {
      console.error('✗ Error writing PDF:', err.message);
      process.exit(1);
    });

  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run test
testPDFGeneration();
