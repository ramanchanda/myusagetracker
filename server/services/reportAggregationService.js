/**
 * Report Aggregation Service
 *
 * Central service for preparing report-ready normalized datasets.
 * Contains NO rendering logic - only data aggregation, calculations,
 * trend analysis, rankings, rollups, and summaries.
 */

const enterpriseUsageService = require('./enterpriseUsageService');
const dailyUsageService = require('./dailyUsageService');

class ReportAggregationService {
  /**
   * Generate complete enterprise summary report dataset
   */
  async generateEnterpriseSummaryReport(accountId, accountEmail, selectedMonth) {
    console.log('[Report Aggregation] Generating enterprise summary for:', accountEmail);

    try {
      // Fetch all required data in parallel
      console.log('[Report Aggregation] Fetching data sources...');
      const [trendData, monthlyData] = await Promise.all([
        enterpriseUsageService.getEnterpriseTrendSummary(selectedMonth, accountId, false),
        enterpriseUsageService.getEnterpriseStructure(selectedMonth, accountId)
      ]);

      console.log('[Report Aggregation] Data fetched, aggregating report...');

      // Build normalized report dataset
      const report = {
        metadata: this.buildMetadata(accountEmail, selectedMonth),
        executiveSummary: this.buildExecutiveSummary(trendData, monthlyData),
        trendAnalysis: this.buildTrendAnalysis(trendData),
        monthlyUsage: this.buildMonthlyUsage(monthlyData, selectedMonth),
        resourceBreakdown: this.buildResourceBreakdown(trendData),
        teamAnalysis: this.buildTeamAnalysis(monthlyData)
      };

      console.log('[Report Aggregation] Report aggregation complete');
      return report;

    } catch (error) {
      console.error('[Report Aggregation] Error generating report:', error);
      throw error;
    }
  }

  /**
   * Build report metadata
   */
  buildMetadata(accountEmail, selectedMonth) {
    return {
      accountEmail,
      selectedMonth,
      generatedAt: new Date().toISOString(),
      generatedDate: new Date().toLocaleString(),
      reportType: 'enterprise-summary',
      version: '2.0'
    };
  }

  /**
   * Build executive summary section
   */
  buildExecutiveSummary(trendData, monthlyData) {
    const monthly = trendData.monthly || [];
    const summary = monthlyData.summary || {};

    // Calculate totals
    const totalDynoUnits = monthly.reduce((sum, m) => sum + (m.dynoUnits || 0), 0);
    const totalConnectRows = monthly.reduce((sum, m) => sum + (m.connectRows || 0), 0);
    const avgMonthlyDyno = monthly.length > 0 ? totalDynoUnits / monthly.length : 0;

    // Find peak month
    let peakMonthDyno = 0;
    let peakMonthLabel = '';
    monthly.forEach(m => {
      if (m.dynoUnits > peakMonthDyno) {
        peakMonthDyno = m.dynoUnits;
        peakMonthLabel = m.month;
      }
    });

    return {
      totalDynoUnits,
      totalConnectRows,
      avgMonthlyDyno,
      peakMonthDyno,
      peakMonthLabel,
      totalTeams: summary.totalTeams || 0,
      totalApps: summary.totalApps || 0,
      dateRange: monthly.length > 0
        ? `${monthly[0].month} to ${monthly[monthly.length - 1].month}`
        : 'Last 12 Months'
    };
  }

  /**
   * Build trend analysis section
   */
  buildTrendAnalysis(trendData) {
    const analysis = trendData.analysis || {};
    const monthly = trendData.monthly || [];

    const dynoTrendPct = analysis.dynoTrendPct || 0;
    const connectTrendPct = analysis.connectTrendPct || 0;

    let dynoTrend = 'Stable';
    if (dynoTrendPct > 10) dynoTrend = 'Increasing';
    else if (dynoTrendPct < -10) dynoTrend = 'Decreasing';

    let connectTrend = 'Stable';
    if (connectTrendPct > 10) connectTrend = 'Increasing';
    else if (connectTrendPct < -10) connectTrend = 'Decreasing';

    return {
      dynoTrend,
      connectTrend,
      dynoTrendPct,
      connectTrendPct,
      growthRate: `${dynoTrendPct > 0 ? '+' : ''}${dynoTrendPct.toFixed(1)}%`,
      monthlyData: monthly.map(m => ({
        month: m.month,
        dynoUnits: m.dynoUnits || 0,
        connectRows: m.connectRows || 0,
        dataAddons: m.dataAddons || 0,
        generalAddons: m.generalAddons || 0
      }))
    };
  }

  /**
   * Build monthly usage section
   */
  buildMonthlyUsage(monthlyData, selectedMonth) {
    const summary = monthlyData.summary || {};
    const teams = monthlyData.teams || [];

    return {
      month: selectedMonth,
      summary: {
        totalTeams: teams.length,
        totalApps: summary.totalApps || 0,
        totalDynoUnits: Number(summary.totalDynos || 0),
        totalConnectRows: Number(summary.totalConnect || 0),
        totalDataAddons: Number(summary.totalDataAddons || 0),
        totalGeneralAddons: Number(summary.totalOtherAddons || 0),
        totalPrivateSpaces: Number(summary.totalPrivateSpaces || 0),
        totalShieldSpaces: Number(summary.totalShieldSpaces || 0)
      },
      topTeams: this.rankTeamsByUsage(teams, 15)
    };
  }

  /**
   * Build resource breakdown section
   */
  buildResourceBreakdown(trendData) {
    const monthly = trendData.monthly || [];
    const resourceTypes = ['dynoUnits', 'connectRows', 'dataAddons', 'generalAddons', 'privateSpaces', 'shieldSpaces'];
    const resourceLabels = {
      dynoUnits: 'Dyno Units',
      connectRows: 'Connect Rows',
      dataAddons: 'Data Add-ons',
      generalAddons: 'General Add-ons',
      privateSpaces: 'Private Spaces',
      shieldSpaces: 'Shield Spaces'
    };

    const breakdown = [];

    resourceTypes.forEach(type => {
      const values = monthly.map(m => m[type] || 0);
      const total = values.reduce((sum, val) => sum + val, 0);
      const avg = monthly.length > 0 ? total / monthly.length : 0;
      const peak = Math.max(...values);

      if (total > 0) {
        breakdown.push({
          resourceType: resourceLabels[type],
          totalUsage: total,
          avgMonthly: avg,
          peakMonth: peak
        });
      }
    });

    return breakdown;
  }

  /**
   * Build team analysis section
   */
  buildTeamAnalysis(monthlyData) {
    const teams = monthlyData.teams || [];

    return {
      totalTeams: teams.length,
      teams: this.rankTeamsByUsage(teams, 20),
      topConsumers: this.identifyTopConsumers(teams, 5),
      resourceDistribution: this.calculateResourceDistribution(teams)
    };
  }

  /**
   * Rank teams by usage
   */
  rankTeamsByUsage(teams, limit) {
    return teams
      .map(team => {
        const resources = team.resources || {};
        return {
          teamName: team.teamName || team.name || 'Unknown',
          totalDynoUnits: Number(resources?.dynos?.count || 0),
          totalConnectRows: Number(resources?.connect?.used || 0),
          dataAddons: Number(resources?.dataAddons?.count || 0),
          generalAddons: Number(resources?.otherAddons?.count || 0),
          privateSpaces: Number(resources?.privateSpaces || 0),
          shieldSpaces: Number(resources?.shieldSpaces || 0),
          appCount: Number(resources?.totalApps || 0)
        };
      })
      .sort((a, b) => b.totalDynoUnits - a.totalDynoUnits)
      .slice(0, limit);
  }

  /**
   * Identify top resource consumers
   */
  identifyTopConsumers(teams, limit) {
    return teams
      .map(team => {
        const resources = team.resources || {};
        const totalUsage =
          Number(resources?.dynos?.count || 0) +
          Number(resources?.connect?.used || 0) +
          Number(resources?.dataAddons?.count || 0) +
          Number(resources?.otherAddons?.count || 0);

        return {
          teamName: team.teamName || team.name || 'Unknown',
          totalUsage,
          dynoUnits: Number(resources?.dynos?.count || 0),
          connectRows: Number(resources?.connect?.used || 0)
        };
      })
      .sort((a, b) => b.totalUsage - a.totalUsage)
      .slice(0, limit);
  }

  /**
   * Calculate resource distribution
   */
  calculateResourceDistribution(teams) {
    const totals = {
      dynoUnits: 0,
      connectRows: 0,
      dataAddons: 0,
      generalAddons: 0
    };

    teams.forEach(team => {
      const resources = team.resources || {};
      totals.dynoUnits += Number(resources?.dynos?.count || 0);
      totals.connectRows += Number(resources?.connect?.used || 0);
      totals.dataAddons += Number(resources?.dataAddons?.count || 0);
      totals.generalAddons += Number(resources?.otherAddons?.count || 0);
    });

    const total = totals.dynoUnits + totals.connectRows + totals.dataAddons + totals.generalAddons;

    if (total === 0) {
      return {
        dynoUnits: 0,
        connectRows: 0,
        dataAddons: 0,
        generalAddons: 0
      };
    }

    return {
      dynoUnits: ((totals.dynoUnits / total) * 100).toFixed(1),
      connectRows: ((totals.connectRows / total) * 100).toFixed(1),
      dataAddons: ((totals.dataAddons / total) * 100).toFixed(1),
      generalAddons: ((totals.generalAddons / total) * 100).toFixed(1)
    };
  }
}

module.exports = new ReportAggregationService();
