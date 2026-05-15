import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './EnterpriseReport.css';

/**
 * Unified Enterprise Report Template
 *
 * Renders professional PDF-ready reports from normalized report datasets.
 * Contains ZERO business logic - only presentation.
 */
function EnterpriseReport() {
  const { accountEmail } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportReady, setReportReady] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        console.log('[Enterprise Report] Fetching report data for:', accountEmail);

        const response = await fetch(`/api/reports/enterprise-summary/${encodeURIComponent(accountEmail)}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch report: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[Enterprise Report] Report data received');

        setReportData(data);
        setLoading(false);

      } catch (err) {
        console.error('[Enterprise Report] Error fetching report:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (accountEmail) {
      fetchReportData();
    }
  }, [accountEmail]);

  // Mark report as ready after data loads and render completes
  useEffect(() => {
    if (!loading && reportData && !error) {
      console.log('[Enterprise Report] Data loaded, waiting for render...');

      const timer = setTimeout(() => {
        console.log('[Enterprise Report] Marking report as ready');
        setReportReady(true);
      }, 2000); // Wait 2 seconds for full render

      return () => clearTimeout(timer);
    }
  }, [loading, reportData, error]);

  if (loading) {
    return (
      <div className="report-loading">
        <div className="loading-spinner"></div>
        <p>Generating report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-error">
        <h2>Error Loading Report</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="report-loading">
        <p>Preparing report data...</p>
      </div>
    );
  }

  const { metadata, executiveSummary, trendAnalysis, monthlyUsage, resourceBreakdown, teamAnalysis } = reportData;

  return (
    <div className="enterprise-report">
      {/* Cover Page */}
      <div className="report-page cover-page">
        <div className="report-header">
          <h1>Heroku Usage Report</h1>
          <p className="subtitle">Enterprise Account Analysis</p>
        </div>

        <div className="cover-info">
          <div className="info-row">
            <span className="label">Account:</span>
            <span className="value">{metadata.accountEmail}</span>
          </div>
          <div className="info-row">
            <span className="label">Report Period:</span>
            <span className="value">{executiveSummary.dateRange}</span>
          </div>
          <div className="info-row">
            <span className="label">Generated:</span>
            <span className="value">{metadata.generatedDate}</span>
          </div>
        </div>

        <div className="cover-summary">
          <h2>Executive Summary</h2>
          <p>
            This report provides a comprehensive analysis of Heroku resource consumption
            across {executiveSummary.totalTeams} teams and {executiveSummary.totalApps} applications.
          </p>
        </div>
      </div>

      {/* Executive Summary Page */}
      <div className="report-page">
        <h2 className="page-title">Executive Summary</h2>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{formatNumber(executiveSummary.totalDynoUnits)}</div>
            <div className="metric-label">Total Dyno Units</div>
            <div className="metric-subtext">12-month total</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">{formatNumber(executiveSummary.totalConnectRows)}</div>
            <div className="metric-label">Total Connect Rows</div>
            <div className="metric-subtext">12-month total</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">{formatNumber(Math.round(executiveSummary.avgMonthlyDyno))}</div>
            <div className="metric-label">Avg Monthly Dyno</div>
            <div className="metric-subtext">Per month</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">{formatNumber(executiveSummary.peakMonthDyno)}</div>
            <div className="metric-label">Peak Month</div>
            <div className="metric-subtext">{executiveSummary.peakMonthLabel}</div>
          </div>
        </div>

        <div className="summary-section">
          <h3>Organization Overview</h3>
          <div className="overview-stats">
            <div className="stat-item">
              <span className="stat-label">Teams:</span>
              <span className="stat-value">{executiveSummary.totalTeams}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Applications:</span>
              <span className="stat-value">{executiveSummary.totalApps}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Analysis Page */}
      <div className="report-page">
        <h2 className="page-title">Usage Trends</h2>

        <div className="trend-summary">
          <div className="trend-item">
            <span className="trend-label">Dyno Usage Trend:</span>
            <span className={`trend-value trend-${trendAnalysis.dynoTrend.toLowerCase()}`}>
              {trendAnalysis.dynoTrend} ({trendAnalysis.growthRate})
            </span>
          </div>
          <div className="trend-item">
            <span className="trend-label">Connect Rows Trend:</span>
            <span className={`trend-value trend-${trendAnalysis.connectTrend.toLowerCase()}`}>
              {trendAnalysis.connectTrend}
            </span>
          </div>
        </div>

        {trendAnalysis.monthlyData && trendAnalysis.monthlyData.length > 0 && (
          <div className="monthly-trend-table">
            <h3>12-Month Trend</h3>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Dyno Units</th>
                  <th>Connect Rows</th>
                  <th>Data Add-ons</th>
                  <th>General Add-ons</th>
                </tr>
              </thead>
              <tbody>
                {trendAnalysis.monthlyData.map((month, idx) => (
                  <tr key={idx}>
                    <td>{month.month}</td>
                    <td>{formatNumber(month.dynoUnits)}</td>
                    <td>{formatNumber(month.connectRows)}</td>
                    <td>{formatNumber(month.dataAddons)}</td>
                    <td>{formatNumber(month.generalAddons)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resource Breakdown Page */}
      {resourceBreakdown && resourceBreakdown.length > 0 && (
        <div className="report-page">
          <h2 className="page-title">Resource Breakdown</h2>

          <table className="resource-table">
            <thead>
              <tr>
                <th>Resource Type</th>
                <th>Total Usage</th>
                <th>Avg/Month</th>
                <th>Peak</th>
              </tr>
            </thead>
            <tbody>
              {resourceBreakdown.map((resource, idx) => (
                <tr key={idx}>
                  <td>{resource.resourceType}</td>
                  <td>{formatNumber(resource.totalUsage)}</td>
                  <td>{formatNumber(Math.round(resource.avgMonthly))}</td>
                  <td>{formatNumber(resource.peakMonth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Monthly Usage Page */}
      <div className="report-page">
        <h2 className="page-title">Monthly Report - {monthlyUsage.month}</h2>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{monthlyUsage.summary.totalTeams}</div>
            <div className="metric-label">Active Teams</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">{monthlyUsage.summary.totalApps}</div>
            <div className="metric-label">Applications</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">{formatNumber(monthlyUsage.summary.totalDynoUnits)}</div>
            <div className="metric-label">Dyno Units</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">{formatNumber(monthlyUsage.summary.totalConnectRows)}</div>
            <div className="metric-label">Connect Rows</div>
          </div>
        </div>
      </div>

      {/* Team Analysis Page */}
      {monthlyUsage.topTeams && monthlyUsage.topTeams.length > 0 && (
        <div className="report-page">
          <h2 className="page-title">Team Analysis</h2>

          <h3>Top Teams by Usage</h3>
          <table className="team-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Dyno Units</th>
                <th>Connect Rows</th>
                <th>Apps</th>
              </tr>
            </thead>
            <tbody>
              {monthlyUsage.topTeams.slice(0, 15).map((team, idx) => (
                <tr key={idx}>
                  <td>{team.teamName}</td>
                  <td>{formatNumber(team.totalDynoUnits)}</td>
                  <td>{formatNumber(team.totalConnectRows)}</td>
                  <td>{team.appCount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {monthlyUsage.topTeams.length > 15 && (
            <p className="table-note">
              ... and {monthlyUsage.topTeams.length - 15} more teams
            </p>
          )}
        </div>
      )}

      {/* Report Footer */}
      <div className="report-page">
        <h2 className="page-title">Report Notes</h2>

        <div className="notes-content">
          <h3>About This Report</h3>
          <ul>
            <li>This report provides enterprise-level usage analysis</li>
            <li>Dyno Units represent compute resource consumption</li>
            <li>Connect Rows indicate database connection usage</li>
            <li>Data is aggregated from Heroku Enterprise API</li>
            <li>All times are in UTC unless otherwise specified</li>
          </ul>

          <p className="report-footer">
            Generated by Heroku Usage Tracker
          </p>
        </div>
      </div>

      {/* Report Ready Marker */}
      {reportReady && (
        <div id="report-ready" style={{ display: 'none' }}>
          Report Ready for PDF
        </div>
      )}
    </div>
  );
}

// Helper function to format numbers
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }

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

export default EnterpriseReport;
