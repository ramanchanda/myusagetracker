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

  // Extract monthly data - API returns { months, monthly, analysis }
  const months = trendData.monthly || [];

  // Calculate overall totals from monthly data
  const totalDynoUnits = months.reduce((sum, m) => sum + (m.dynoUnits || 0), 0);
  const totalConnectRows = months.reduce((sum, m) => sum + (m.connectRows || 0), 0);

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

  // Extract trend from analysis object or calculate
  const analysis = trendData.analysis || {};

  const dynoTrendPct = analysis.dynoTrendPct || 0;
  const connectTrendPct = analysis.connectTrendPct || 0;

  let dynoTrend = 'Stable';
  if (dynoTrendPct > 10) dynoTrend = 'Increasing';
  else if (dynoTrendPct < -10) dynoTrend = 'Decreasing';

  let connectTrend = 'Stable';
  if (connectTrendPct > 10) connectTrend = 'Increasing';
  else if (connectTrendPct < -10) connectTrend = 'Decreasing';

  const growthRate = `${dynoTrendPct > 0 ? '+' : ''}${dynoTrendPct.toFixed(1)}%`;

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
    const resources = team.resources || {};
    const dyno = Number(resources?.dynos?.count || 0);
    const connect = Number(resources?.connect?.used || 0);
    const dataAddons = Number(resources?.dataAddons?.count || 0);
    const generalAddons = Number(resources?.otherAddons?.count || 0);
    const privateSpaces = Number(resources?.privateSpaces || 0);
    const shieldSpaces = Number(resources?.shieldSpaces || 0);
    const apps = Number(resources?.totalApps || 0);

    totalDynoUnits += dyno;
    totalConnectRows += connect;
    totalApps += apps;

    return {
      teamName: team.teamName || team.name || 'Unknown',
      totalDynoUnits: dyno,
      totalConnectRows: connect,
      dataAddons,
      generalAddons,
      privateSpaces,
      shieldSpaces,
      appCount: apps
    };
  });

  return {
    month: selectedMonth,
    summary: {
      totalTeams: teams.length,
      totalApps: totalApps || summary.totalApps || 0,
      totalDynoUnits: totalDynoUnits || Number(summary.totalDynos || 0),
      totalConnectRows: totalConnectRows || Number(summary.totalConnect || 0),
      totalDataAddons: Number(summary.totalDataAddons || 0),
      totalGeneralAddons: Number(summary.totalOtherAddons || 0),
      totalPrivateSpaces: Number(summary.totalPrivateSpaces || 0),
      totalShieldSpaces: Number(summary.totalShieldSpaces || 0)
    },
    teams: transformedTeams
  };
}

/**
 * Transform daily usage data for daily report
 */
function transformDailyData(dailyUsageData, startDate, endDate, includeDaily = true) {
  if (!includeDaily) {
    return {
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : '',
      summary: {},
      dailyBreakdown: [],
      periodTotals: {},
      message: 'Daily report not generated: please select both From and To dates in Daily - Datewise Report before exporting.'
    };
  }

  if (!dailyUsageData) {
    return {
      dateRange: `${startDate} to ${endDate}`,
      summary: {},
      dailyBreakdown: [],
      periodTotals: {},
      message: 'No daily data available for the selected date range.'
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
    periodTotals: dailyUsageData?.dailyUsage?.summary?.periodTotals || {},
    dailyBreakdown: breakdown.map(row => ({
      date: row.date || '',
      teamName: row.teamName || 'Unknown',
      appName: row.appName || 'Unknown',
      dynoUnits: row.dynoUnits || 0,
      connectRows: row.connectRows || 0,
      dataAddons: row.dataAddons || 0,
      generalAddons: row.generalAddons || 0,
      privateSpaces: row.privateSpaces || 0,
      shieldSpaces: row.shieldSpaces || 0
    })),
    message: ''
  };
}

module.exports = {
  transformSummary12Data,
  transformMonthlyData,
  transformDailyData
};
