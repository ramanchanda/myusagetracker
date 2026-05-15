import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './PrintableDashboard.css';

function PrintableDashboard() {
  const { accountEmail } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [data, setData] = useState({
    summary12: null,
    monthly: null,
    daily: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[Printable Dashboard] Fetching data for:', accountEmail);

        // Get current month
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        console.log('[Printable Dashboard] Step 1: Fetching 12-month summary...');
        // Fetch 12-month summary
        const summary12Response = await fetch(
          `/api/enterprise/trend-summary?month=${currentMonth}&email=${accountEmail}`
        );
        const summary12Data = await summary12Response.json();
        console.log('[Printable Dashboard] ✓ 12-month summary fetched');

        console.log('[Printable Dashboard] Step 2: Fetching monthly structure...');
        // Fetch monthly structure
        const monthlyResponse = await fetch(
          `/api/enterprise/structure?month=${currentMonth}&email=${accountEmail}`
        );
        const monthlyData = await monthlyResponse.json();
        console.log('[Printable Dashboard] ✓ Monthly structure fetched');

        console.log('[Printable Dashboard] Step 3: Setting data state...');
        setData({
          summary12: summary12Data,
          monthly: monthlyData,
          daily: null
        });

        console.log('[Printable Dashboard] Step 4: Marking loading complete...');
        setLoading(false);

      } catch (err) {
        console.error('[Printable Dashboard] Error fetching data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (accountEmail) {
      fetchData();
    }
  }, [accountEmail]);

  // Separate effect to mark dashboard as ready AFTER data is set and rendered
  useEffect(() => {
    if (!loading && data.summary12 && data.monthly && !error) {
      console.log('[Printable Dashboard] Step 5: Data loaded, waiting for render...');

      // Wait for DOM to update and content to render
      const timer = setTimeout(() => {
        console.log('[Printable Dashboard] Step 6: Marking dashboard as ready...');
        setDashboardReady(true);
      }, 3000); // 3 seconds to ensure all content renders

      return () => clearTimeout(timer);
    }
  }, [loading, data.summary12, data.monthly, error]);

  if (loading) {
    console.log('[Printable Dashboard] Rendering: Loading state');
    return (
      <div className="printable-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    console.log('[Printable Dashboard] Rendering: Error state');
    return (
      <div className="printable-error">
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  // Don't render dashboard until data is available
  if (!data.summary12 || !data.monthly) {
    console.log('[Printable Dashboard] Rendering: Waiting for data...');
    return (
      <div className="printable-loading">
        <div className="loading-spinner"></div>
        <p>Preparing dashboard...</p>
      </div>
    );
  }

  console.log('[Printable Dashboard] Rendering: Full dashboard');
  const { summary12, monthly } = data;

  return (
    <div className="printable-dashboard">
      {/* Page 1: Cover & Summary */}
      <div className="print-page">
        <div className="report-header">
          <h1>Heroku Usage Report</h1>
          <p className="report-subtitle">Account: {accountEmail}</p>
          <p className="report-date">Generated: {new Date().toLocaleString()}</p>
        </div>

        <div className="executive-summary">
          <h2>Executive Summary</h2>
          <p>
            This report provides a comprehensive overview of your Heroku usage across
            compute resources, database connections, add-ons, and spaces.
          </p>
        </div>

        <div className="report-details">
          <div className="detail-row">
            <span className="detail-label">Report Period:</span>
            <span className="detail-value">
              {summary12?.dateRange || 'Last 12 Months'}
            </span>
          </div>
        </div>
      </div>

      {/* Page 2: 12-Month Summary */}
      <div className="print-page">
        <h2 className="page-title">Usage Trends - Past 12 Months</h2>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">
              {formatNumber(summary12?.overallSummary?.totalDynoUnits || 0)}
            </div>
            <div className="metric-label">Total Dyno Units</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {formatNumber(summary12?.overallSummary?.totalConnectRows || 0)}
            </div>
            <div className="metric-label">Total Connect Rows</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {formatNumber(summary12?.overallSummary?.avgMonthlyDyno || 0)}
            </div>
            <div className="metric-label">Avg Monthly Dyno</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {formatNumber(summary12?.overallSummary?.peakMonthDyno || 0)}
            </div>
            <div className="metric-label">Peak Month Dyno</div>
            <div className="metric-subtext">
              {summary12?.overallSummary?.peakMonthLabel || ''}
            </div>
          </div>
        </div>

        <div className="trend-analysis">
          <h3>Trend Analysis</h3>
          <div className="trend-row">
            <span className="trend-label">Dyno Trend:</span>
            <span className="trend-value">
              {summary12?.trendAnalysis?.dynoTrend || 'Stable'}
              {' '}({summary12?.trendAnalysis?.growthRate || '0%'})
            </span>
          </div>
          <div className="trend-row">
            <span className="trend-label">Connect Trend:</span>
            <span className="trend-value">
              {summary12?.trendAnalysis?.connectTrend || 'Stable'}
            </span>
          </div>
        </div>

        {summary12?.resourceBreakdown && summary12.resourceBreakdown.length > 0 && (
          <div className="resource-table">
            <h3>Resource Breakdown</h3>
            <table>
              <thead>
                <tr>
                  <th>Resource Type</th>
                  <th>Total Usage</th>
                  <th>Avg/Month</th>
                  <th>Peak</th>
                </tr>
              </thead>
              <tbody>
                {summary12.resourceBreakdown.map((resource, idx) => (
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
      </div>

      {/* Page 3: Monthly Report */}
      {monthly && (
        <div className="print-page">
          <h2 className="page-title">Monthly Report - {monthly.month}</h2>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-value">{monthly.summary?.totalTeams || 0}</div>
              <div className="metric-label">Teams</div>
            </div>

            <div className="metric-card">
              <div className="metric-value">{monthly.summary?.totalApps || 0}</div>
              <div className="metric-label">Apps</div>
            </div>

            <div className="metric-card">
              <div className="metric-value">
                {formatNumber(monthly.summary?.totalDynoUnits || 0)}
              </div>
              <div className="metric-label">Dyno Units</div>
            </div>

            <div className="metric-card">
              <div className="metric-value">
                {formatNumber(monthly.summary?.totalConnectRows || 0)}
              </div>
              <div className="metric-label">Connect Rows</div>
            </div>
          </div>

          {monthly.teams && monthly.teams.length > 0 && (
            <div className="teams-table">
              <h3>Top Teams by Usage</h3>
              <table>
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Dyno Units</th>
                    <th>Connect Rows</th>
                    <th>Apps</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.teams.slice(0, 15).map((team, idx) => (
                    <tr key={idx}>
                      <td>{team.teamName || team.name || 'Unknown'}</td>
                      <td>{formatNumber(team.totalDynoUnits || 0)}</td>
                      <td>{formatNumber(team.totalConnectRows || 0)}</td>
                      <td>{team.appCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {monthly.teams.length > 15 && (
                <p className="table-note">
                  ... and {monthly.teams.length - 15} more teams
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Page 4: Report Notes */}
      <div className="print-page">
        <h2 className="page-title">Report Notes</h2>

        <div className="notes-section">
          <h3>About This Report</h3>
          <ul>
            <li>This report provides a high-level summary of your Heroku usage</li>
            <li>Dyno Units represent compute resources consumed</li>
            <li>Connect Rows indicate database connection usage</li>
            <li>For detailed breakdowns, please refer to the web dashboard</li>
            <li>All times and dates are in UTC unless otherwise specified</li>
          </ul>
        </div>

        <div className="report-footer">
          <p>Generated by Heroku Usage Tracker</p>
        </div>
      </div>

      {/* Dashboard loaded marker - only render when truly ready */}
      {dashboardReady && (
        <div className="dashboard-loaded" style={{ display: 'none' }}>
          Dashboard Ready for PDF Capture
        </div>
      )}
    </div>
  );
}

// Helper function to format large numbers
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

export default PrintableDashboard;
