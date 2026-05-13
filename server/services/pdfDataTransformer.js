/**
 * PDF Data Transformer
 * Transforms API responses into the format expected by PDFExportService
 */

/**
 * Transform trend summary data for 12-month report
 */
function transformSummary12Data(trendData) {
  if (!trendData) {
    return {
      dateRange: 'Last 12 Months',
      overallSummary: {},
      trendAnalysis: {},
      chartData: [],
      resourceBreakdown: []
    };
  }

  // Extract overall totals
  const totalDynoUnits = trendData.totalDynoUnits || 0;
  const totalConnectRows = trendData.totalConnectRows || 0;
  const months = trendData.chartData || [];

  const avgMonthlyDyno = months.length > 0
    ? totalDynoUnits / months.length
    : 0;

  // Find peak month
  let peakMonthDyno = 0;
  let peakMonthLabel = '';
  months.forEach(m => {
    if (m.dynoUnits > peakMonthDyno) {
      peakMonthDyno = m.dynoUnits;
      peakMonthLabel = m.month;
    }
  });

  // Calculate trend
  let dynoTrend = 'Stable';
  let connectTrend = 'Stable';
  let growthRate = '0%';

  if (months.length >= 2) {
    const firstMonth = months[0];
    const lastMonth = months[months.length - 1];

    if (lastMonth.dynoUnits > firstMonth.dynoUnits * 1.1) {
      dynoTrend = 'Increasing';
    } else if (lastMonth.dynoUnits < firstMonth.dynoUnits * 0.9) {
      dynoTrend = 'Decreasing';
    }

    if (lastMonth.connectRows > firstMonth.connectRows * 1.1) {
      connectTrend = 'Increasing';
    } else if (lastMonth.connectRows < firstMonth.connectRows * 0.9) {
      connectTrend = 'Decreasing';
    }

    if (firstMonth.dynoUnits > 0) {
      const growth = ((lastMonth.dynoUnits - firstMonth.dynoUnits) / firstMonth.dynoUnits) * 100;
      growthRate = `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
    }
  }

  // Build resource breakdown
  const resourceBreakdown = [];
  const resourceTypes = ['dynoUnits', 'connectRows', 'dataAddons', 'generalAddons', 'privateSpaces', 'shieldSpaces'];
  const resourceLabels = {
    dynoUnits: 'Dyno Units',
    connectRows: 'Connect Rows',
    dataAddons: 'Data Add-ons',
    generalAddons: 'General Add-ons',
    privateSpaces: 'Private Spaces',
    shieldSpaces: 'Shield Spaces'
  };

  resourceTypes.forEach(type => {
    const values = months.map(m => m[type] || 0);
    const total = values.reduce((sum, val) => sum + val, 0);
    const avg = months.length > 0 ? total / months.length : 0;
    const peak = Math.max(...values);

    if (total > 0) {
      resourceBreakdown.push({
        resourceType: resourceLabels[type],
        totalUsage: total,
        avgMonthly: avg,
        peakMonth: peak
      });
    }
  });

  return {
    dateRange: months.length > 0
      ? `${months[0].month} to ${months[months.length - 1].month}`
      : 'Last 12 Months',
    overallSummary: {
      totalDynoUnits,
      totalConnectRows,
      avgMonthlyDyno,
      peakMonthDyno,
      peakMonthLabel
    },
    trendAnalysis: {
      dynoTrend,
      connectTrend,
      growthRate
    },
    chartData: months,
    resourceBreakdown
  };
}

/**
 * Transform monthly structure data for monthly report
 */
function transformMonthlyData(structureData, selectedMonth) {
  if (!structureData) {
    return {
      month: selectedMonth,
      summary: {},
      teams: []
    };
  }

  const teams = structureData.teams || [];
  const summary = structureData.summary || {};

  // Calculate totals
  let totalDynoUnits = 0;
  let totalConnectRows = 0;
  let totalApps = 0;

  const transformedTeams = teams.map(team => {
    const dyno = team.totalDynoUnits || 0;
    const connect = team.totalConnectRows || 0;
    const apps = team.appCount || 0;

    totalDynoUnits += dyno;
    totalConnectRows += connect;
    totalApps += apps;

    return {
      teamName: team.teamName || team.name || 'Unknown',
      totalDynoUnits: dyno,
      totalConnectRows: connect,
      appCount: apps
    };
  });

  return {
    month: selectedMonth,
    summary: {
      totalTeams: teams.length,
      totalApps: totalApps || summary.totalApps || 0,
      totalDynoUnits: totalDynoUnits || summary.totalDynoUnits || 0,
      totalConnectRows: totalConnectRows || summary.totalConnectRows || 0
    },
    teams: transformedTeams
  };
}

/**
 * Transform daily usage data for daily report
 */
function transformDailyData(dailyUsageData, startDate, endDate) {
  if (!dailyUsageData) {
    return {
      dateRange: `${startDate} to ${endDate}`,
      summary: {},
      dailyBreakdown: []
    };
  }

  const breakdown = dailyUsageData.dailyBreakdown || [];

  // Calculate daily summary
  const dates = [...new Set(breakdown.map(row => row.date))];
  const dailyTotals = {};

  breakdown.forEach(row => {
    if (!dailyTotals[row.date]) {
      dailyTotals[row.date] = 0;
    }
    dailyTotals[row.date] += row.dynoUnits || 0;
  });

  const dynoValues = Object.values(dailyTotals);
  const avgDailyDyno = dynoValues.length > 0
    ? dynoValues.reduce((sum, val) => sum + val, 0) / dynoValues.length
    : 0;

  let peakDayDyno = 0;
  let peakDate = '';
  Object.entries(dailyTotals).forEach(([date, dyno]) => {
    if (dyno > peakDayDyno) {
      peakDayDyno = dyno;
      peakDate = date;
    }
  });

  return {
    dateRange: `${startDate} to ${endDate}`,
    summary: {
      totalDays: dates.length,
      avgDailyDyno,
      peakDayDyno,
      peakDate
    },
    dailyBreakdown: breakdown.map(row => ({
      date: row.date || '',
      teamName: row.teamName || 'Unknown',
      appName: row.appName || 'Unknown',
      dynoUnits: row.dynoUnits || 0,
      connectRows: row.connectRows || 0
    }))
  };
}

module.exports = {
  transformSummary12Data,
  transformMonthlyData,
  transformDailyData
};
