import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import EnterpriseAccountSelector from './EnterpriseAccountSelector';
import MonthSelector from './MonthSelector';
import {
  EnterpriseIcon,
  TeamsIcon,
  DynoIcon,
  PostgresIcon,
  AddonsIcon,
  ConnectIcon
} from './HerokuIcons';
import './EnterpriseView.css';
import './DailyReportStyles.css';

function EnterpriseView({ selectedMonth, onMonthChange, reportView, onReportViewChange }) {
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [expandedTeams, setExpandedTeams] = useState({});
  const [teamAppsCache, setTeamAppsCache] = useState({});
  const [loadingTeamApps, setLoadingTeamApps] = useState({});
  const [trendSummary, setTrendSummary] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [dailyReport, setDailyReport] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyStartDate, setDailyStartDate] = useState('');
  const [dailyEndDate, setDailyEndDate] = useState('');
  const [dailyFetchAttempted, setDailyFetchAttempted] = useState(false);
  const [dailyDateError, setDailyDateError] = useState('');
  const [selectedBreakdownDate, setSelectedBreakdownDate] = useState('all');
  const [selectedBreakdownTeam, setSelectedBreakdownTeam] = useState('all');
  const [selectedBreakdownApp, setSelectedBreakdownApp] = useState('all');
  const [exportingPDF, setExportingPDF] = useState(false);

  // Fetch available enterprise accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const response = await axios.get('/api/enterprise/accounts');
      setAccounts(response.data || []);
      if (response.data && response.data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(response.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching enterprise accounts:', err);
    }
  }, [selectedAccountId]);

  const fetchEnterpriseStructure = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (showAllAccounts) {
        // Fetch all accounts structure
        response = await axios.get('/api/enterprise/all-accounts', {
          params: { month: selectedMonth }
        });
      } else {
        // Fetch single account structure
        response = await axios.get('/api/enterprise/structure', {
          params: {
            month: selectedMonth,
            accountId: selectedAccountId
          }
        });
      }

      setStructure(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  }, [selectedMonth, selectedAccountId, showAllAccounts]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (accounts.length > 0) {
      fetchEnterpriseStructure();
    }
  }, [fetchEnterpriseStructure, accounts]);

  const fetchTrendSummary = useCallback(async () => {
    try {
      setTrendLoading(true);
      const response = await axios.get('/api/enterprise/trend-summary', {
        params: {
          month: selectedMonth,
          accountId: selectedAccountId,
          allAccounts: showAllAccounts
        }
      });
      setTrendSummary(response.data);
    } catch (err) {
      console.error('Error fetching trend summary:', err);
    } finally {
      setTrendLoading(false);
    }
  }, [selectedMonth, selectedAccountId, showAllAccounts]);

  useEffect(() => {
    if (accounts.length > 0 && reportView === 'summary12') {
      fetchTrendSummary();
    }
  }, [accounts, reportView, fetchTrendSummary]);

  const fetchDailyReport = useCallback(async () => {
    setDailyFetchAttempted(true);
    setDailyDateError('');

    if (!dailyStartDate || !dailyEndDate) {
      setDailyReport(null);
      return;
    }

    // Validate date range (max 31 days)
    const start = new Date(dailyStartDate);
    const end = new Date(dailyEndDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 31) {
      setDailyDateError('Start and end date invalid. Cannot request more than 31 days of usage');
      setDailyReport(null);
      return;
    }

    if (start > end) {
      setDailyDateError('Start date must be before end date');
      setDailyReport(null);
      return;
    }

    try {
      setDailyLoading(true);
      const params = {
        accountId: selectedAccountId,
        start: dailyStartDate,
        end: dailyEndDate
      };

      const response = await axios.get('/api/enterprise/daily-usage', { params });
      setDailyReport(response.data);
      // Reset filters when new data is fetched
      setSelectedBreakdownDate('all');
      setSelectedBreakdownTeam('all');
      setSelectedBreakdownApp('all');
    } catch (err) {
      console.error('Error fetching daily report:', err);
      setDailyReport(null);
    } finally {
      setDailyLoading(false);
    }
  }, [selectedAccountId, dailyStartDate, dailyEndDate]);

  useEffect(() => {
    if (reportView === 'daily') {
      setDailyReport(null);
      setDailyStartDate('');
      setDailyEndDate('');
      setDailyFetchAttempted(false);
      setDailyDateError('');
      setSelectedBreakdownDate('all');
      setSelectedBreakdownTeam('all');
      setSelectedBreakdownApp('all');
    }
  }, [reportView]);

  // Reset team filter when date filter changes
  useEffect(() => {
    if (dailyReport && selectedBreakdownDate !== 'all') {
      setSelectedBreakdownTeam('all');
      setSelectedBreakdownApp('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBreakdownDate]);

  // Reset app filter when team filter changes
  useEffect(() => {
    if (dailyReport && selectedBreakdownTeam !== 'all') {
      setSelectedBreakdownApp('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBreakdownTeam]);

  // PDF Export function
  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);

      const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
      const enterpriseEmail = selectedAccount?.email || selectedAccount?.name || 'unknown';

      // Build query parameters
      const params = new URLSearchParams();
      params.append('monthForMonthly', selectedMonth);

      if (dailyStartDate && dailyEndDate) {
        params.append('startDateForDaily', dailyStartDate);
        params.append('endDateForDaily', dailyEndDate);
      }

      // Make request to download PDF
      const response = await axios.get(`/api/pdf/export/${encodeURIComponent(enterpriseEmail)}?${params.toString()}`, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Heroku_Usage_Report_${enterpriseEmail.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exporting PDF:', error);

      // Extract detailed error message
      let errorMessage = 'Failed to export PDF report. ';

      if (error.response) {
        // Server responded with error
        console.error('Server error response:', error.response.data);
        if (error.response.data?.details) {
          errorMessage += `\n\nDetails: ${error.response.data.details}`;
        } else if (error.response.data?.error) {
          errorMessage += `\n\nError: ${error.response.data.error}`;
        }
        errorMessage += `\n\nStatus: ${error.response.status}`;
      } else if (error.request) {
        // Request made but no response
        errorMessage += '\n\nNo response from server. Please check your connection.';
      } else {
        // Error setting up request
        errorMessage += `\n\nError: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setExportingPDF(false);
    }
  };

  const formatUsage = (value) => Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  });
  const formatCount = (value) => Number(value || 0).toLocaleString();

  // Get unique dates (always all dates)
  const uniqueDates = [...new Set((dailyReport?.dailyBreakdown || []).map(row => row.date))].sort();

  // Get unique teams based on selected date
  const uniqueTeams = [...new Set(
    (dailyReport?.dailyBreakdown || [])
      .filter(row => selectedBreakdownDate === 'all' || row.date === selectedBreakdownDate)
      .map(row => row.teamName)
  )].sort();

  // Get unique apps based on selected date and team
  const uniqueApps = [...new Set(
    (dailyReport?.dailyBreakdown || [])
      .filter(row => {
        const dateMatch = selectedBreakdownDate === 'all' || row.date === selectedBreakdownDate;
        const teamMatch = selectedBreakdownTeam === 'all' || row.teamName === selectedBreakdownTeam;
        return dateMatch && teamMatch;
      })
      .map(row => row.appName)
  )].sort();

  const groupedDailyBreakdown = (dailyReport?.dailyBreakdown || [])
    .filter(row => {
      const dateMatch = selectedBreakdownDate === 'all' || row.date === selectedBreakdownDate;
      const teamMatch = selectedBreakdownTeam === 'all' || row.teamName === selectedBreakdownTeam;
      const appMatch = selectedBreakdownApp === 'all' || row.appName === selectedBreakdownApp;
      return dateMatch && teamMatch && appMatch;
    })
    .slice()
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.teamName !== b.teamName) return a.teamName.localeCompare(b.teamName);
      const aPrivate = Number(a.privateSpaces) > 0 ? 1 : 0;
      const bPrivate = Number(b.privateSpaces) > 0 ? 1 : 0;
      if (aPrivate !== bPrivate) return bPrivate - aPrivate;
      const aShield = Number(a.shieldSpaces) > 0 ? 1 : 0;
      const bShield = Number(b.shieldSpaces) > 0 ? 1 : 0;
      if (aShield !== bShield) return bShield - aShield;
      return a.appName.localeCompare(b.appName);
    })
    .map((row, idx, arr) => {
      const prev = idx > 0 ? arr[idx - 1] : null;
      const privateLabel = Number(row.privateSpaces) > 0 ? 'Yes' : 'No';
      const shieldLabel = Number(row.shieldSpaces) > 0 ? 'Yes' : 'No';
      const showDate = !prev || prev.date !== row.date;
      const showTeam = !prev || prev.date !== row.date || prev.teamName !== row.teamName;
      return { ...row, privateLabel, shieldLabel, showDate, showTeam };
    });
  const summary12LineData = (trendSummary?.monthly || []).map(item => ({
    ...item,
    connectRowsThousands: Number(item.connectRows || 0) / 1000
  }));

  if (loading) {
    return (
      <div className="enterprise-view">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading enterprise usage/utilization report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enterprise-view">
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={fetchEnterpriseStructure} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  if (!structure) return null;

  // Handle multiple accounts structure
  const isMultiAccount = structure.enterpriseAccounts && Array.isArray(structure.enterpriseAccounts);

  let enterpriseTeams = [];
  let summaryData = structure.summary || {};
  let billingRestrictions = [];

  if (isMultiAccount) {
    // Aggregate teams from all accounts
    structure.enterpriseAccounts.forEach(account => {
      if (!account.enterpriseAccount.has_billing_access && account.enterpriseAccount.billing_status === 403) {
        billingRestrictions.push(account.enterpriseAccount);
      }
      if (account.teams) {
        enterpriseTeams.push(...account.teams.map(team => ({
          ...team,
          accountName: account.enterpriseAccount.name,
          hasBillingAccess: account.enterpriseAccount.has_billing_access
        })));
      }
    });
  } else {
    // Single account structure
    enterpriseTeams = (structure.teams || []).map(team => ({
      ...team,
      accountName: structure.enterpriseAccount?.name
    }));

    if (structure.enterpriseAccount && !structure.enterpriseAccount.has_billing_access && structure.enterpriseAccount.billing_status === 403) {
      billingRestrictions.push(structure.enterpriseAccount);
    }
  }

  const displayedTeams = selectedTeamFilter === 'all'
    ? enterpriseTeams
    : enterpriseTeams.filter(team => team.id === selectedTeamFilter);

  const fetchTeamApps = async (teamId) => {
    if (teamAppsCache[teamId]) {
      return; // Already cached
    }

    setLoadingTeamApps(prev => ({ ...prev, [teamId]: true }));

    try {
      const response = await axios.get(`/api/enterprise/team/${teamId}/apps`);
      const appsSpaceMap = {};
      response.data.forEach(app => {
        appsSpaceMap[app.name] = {
          isInPrivateSpace: app.isInPrivateSpace,
          isInShieldSpace: app.isInShieldSpace
        };
      });
      setTeamAppsCache(prev => ({ ...prev, [teamId]: appsSpaceMap }));
    } catch (err) {
      console.error(`Error fetching apps for team ${teamId}:`, err);
      setTeamAppsCache(prev => ({ ...prev, [teamId]: {} }));
    } finally {
      setLoadingTeamApps(prev => ({ ...prev, [teamId]: false }));
    }
  };

  const toggleTeamDetails = async (teamKey, teamId) => {
    const isExpanding = !expandedTeams[teamKey];

    setExpandedTeams(prev => ({
      ...prev,
      [teamKey]: isExpanding
    }));

    // Fetch team apps when expanding
    if (isExpanding && teamId) {
      await fetchTeamApps(teamId);
    }
  };

  return (
    <div className="enterprise-view">
      <div className="account-meta-strip">
        <p className="account-email">{structure.account.email}</p>
        {reportView === 'monthly' && selectedMonth && (
          <p className="selected-month">
            Viewing: {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Enterprise Account Selector */}
      {accounts.length > 0 && (
        <EnterpriseAccountSelector
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onAccountChange={setSelectedAccountId}
          showAllAccounts={showAllAccounts}
          onShowAllToggle={setShowAllAccounts}
        />
      )}

      {billingRestrictions.length === 0 && (
        <div className="report-options">
          <button
            type="button"
            className={`report-option-btn ${reportView === 'summary12' ? 'active' : ''}`}
            onClick={() => onReportViewChange('summary12')}
          >
            Summary of past 12 months
          </button>
          <button
            type="button"
            className={`report-option-btn ${reportView === 'monthly' ? 'active' : ''}`}
            onClick={() => onReportViewChange('monthly')}
          >
            Monthly Report
          </button>
          <button
            type="button"
            className={`report-option-btn ${reportView === 'daily' ? 'active' : ''}`}
            onClick={() => onReportViewChange('daily')}
          >
            Daily - Datewise Report
          </button>
          <button
            type="button"
            className="report-option-btn export-pdf-btn"
            onClick={handleExportPDF}
            disabled={exportingPDF}
          >
            {exportingPDF ? '📄 Generating PDF...' : '📥 Export PDF Report'}
          </button>
        </div>
      )}

      {billingRestrictions.length === 0 && reportView === 'monthly' && (
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
        />
      )}

      {billingRestrictions.length === 0 && reportView === 'monthly' && (
        <>
          <h3 className="monthly-summary-title">Enterprise Account Usage Summary</h3>
          <p className="usage-note">
            <strong>Note:</strong> Enterprise Team count includes only teams with active resource utilization. Teams with no applications or 0 resource usage are not listed.
          </p>
        </>
      )}

      {billingRestrictions.length === 0 && reportView === 'summary12' && (
        <div className="trend-summary-panel summary12-panel">
          <div className="summary12-header">
            <h2 className="summary12-title">12-Month Trend Analysis</h2>
            <p className="summary12-description">Enterprise utilization trends, capacity patterns, and platform usage insights</p>
          </div>
          {trendLoading ? (
            <p className="trend-loading">Loading trend summary...</p>
          ) : trendSummary ? (
            <>
              <div className="trend-analysis-grid">
                <div className="trend-analysis-card">
                  <span className="trend-label">Avg Teams / Month</span>
                  <span className="trend-value">{formatUsage(trendSummary.analysis.avgTeamsPerMonth)}</span>
                </div>
                <div className="trend-analysis-card">
                  <span className="trend-label">Avg Dyno Units / Month</span>
                  <span className="trend-value">{formatUsage(trendSummary.analysis.avgDynoUnitsPerMonth)}</span>
                </div>
                <div className="trend-analysis-card">
                  <span className="trend-label">Avg Connect Rows / Month</span>
                  <span className="trend-value">{formatUsage(trendSummary.analysis.avgConnectRowsPerMonth)}</span>
                </div>
                <div className="trend-analysis-card">
                  <span className="trend-label">Dyno Trend (12M)</span>
                  <span className="trend-value">{formatUsage(trendSummary.analysis.dynoTrendPct)}%</span>
                </div>
                <div className="trend-analysis-card">
                  <span className="trend-label">Avg Private Spaces / Month</span>
                  <span className="trend-value">{formatUsage(trendSummary.analysis.avgPrivateSpacesPerMonth)}</span>
                </div>
                <div className="trend-analysis-card">
                  <span className="trend-label">Avg Shield Spaces / Month</span>
                  <span className="trend-value">{formatUsage(trendSummary.analysis.avgShieldSpacesPerMonth)}</span>
                </div>
                <div className="trend-analysis-card">
                  <span className="trend-label">Private Spaces Trend (12M)</span>
                  <span className="trend-value">{formatUsage(trendSummary.analysis.privateSpacesTrendPct)}%</span>
                </div>
                <div className="trend-analysis-card">
                  <span className="trend-label">Shield Spaces Trend (12M)</span>
                  <span className="trend-value">{formatUsage(trendSummary.analysis.shieldSpacesTrendPct)}%</span>
                </div>
              </div>
              <div className="main-trend-chart">
                <h3 className="chart-section-title">Overall Trend (12 Months)</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={summary12LineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <Tooltip
                      contentStyle={{ fontSize: '13px', borderRadius: '8px' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }}
                    />
                    <Line type="monotone" dataKey="dynoUnits" stroke="#6f42c1" strokeWidth={2.5} name="Dyno Units" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="connectRowsThousands" stroke="#0ea5e9" strokeWidth={2.5} name="Connect Rows (K)" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="dataAddons" stroke="#22c55e" strokeWidth={2.5} name="Data Add-ons" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="generalAddons" stroke="#f97316" strokeWidth={2.5} name="General Add-ons" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="privateSpaces" stroke="#3b82f6" strokeWidth={2.5} name="Private Spaces" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="shieldSpaces" stroke="#f59e0b" strokeWidth={2.5} name="Shield Spaces" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <h2 className="summary12-resources-title">Resource Breakdown by Type</h2>

              <div className="resource-charts-grid">
                <div className="resource-chart-item">
                  <h4>Dyno Units</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trendSummary.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="dynoUnits" fill="#6f42c1" name="Dyno Units" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="resource-chart-item">
                  <h4>Connect Rows</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={summary12LineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="connectRowsThousands" fill="#0ea5e9" name="Connect Rows (K)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="resource-chart-item">
                  <h4>Data Add-ons</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trendSummary.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="dataAddons" fill="#22c55e" name="Data Add-ons" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="resource-chart-item">
                  <h4>General Add-ons</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trendSummary.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="generalAddons" fill="#f97316" name="General Add-ons" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="resource-chart-item">
                  <h4>Private Spaces</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trendSummary.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="privateSpaces" fill="#3b82f6" name="Private Spaces" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="resource-chart-item">
                  <h4>Shield Spaces</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trendSummary.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="shieldSpaces" fill="#f59e0b" name="Shield Spaces" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <p className="trend-loading">No trend data available.</p>
          )}
        </div>
      )}

      {billingRestrictions.length === 0 && reportView === 'daily' && (
        <div className="trend-summary-panel">
          <div className="daily-header">
            <h3>Daily - Datewise Report</h3>
            <div className="date-range-selector">
              <label>
                From:
                <input
                  type="date"
                  value={dailyStartDate}
                  onChange={(e) => {
                    setDailyStartDate(e.target.value);
                    setDailyDateError('');
                  }}
                  className="date-input"
                  max={dailyEndDate || undefined}
                />
              </label>
              <label>
                To:
                <input
                  type="date"
                  value={dailyEndDate}
                  onChange={(e) => {
                    setDailyEndDate(e.target.value);
                    setDailyDateError('');
                  }}
                  className="date-input"
                  min={dailyStartDate || undefined}
                />
              </label>
              <button
                onClick={fetchDailyReport}
                className="fetch-daily-btn"
                disabled={!dailyStartDate || !dailyEndDate || dailyLoading}
              >
                {dailyLoading ? 'Loading...' : 'Fetch Data'}
              </button>
              {(dailyStartDate || dailyEndDate) && (
                <button
                  onClick={() => {
                    setDailyStartDate('');
                    setDailyEndDate('');
                    setDailyReport(null);
                    setDailyFetchAttempted(false);
                    setDailyDateError('');
                  }}
                  className="clear-dates-btn"
                >
                  Clear Dates
                </button>
              )}
            </div>
            <p className="usage-note" style={{ fontSize: '0.85rem', marginTop: '8px' }}>
              <strong>Note:</strong> Cannot request more than 31 days of usage
            </p>
            {dailyDateError && (
              <div className="error-banner" style={{ marginTop: '12px' }}>
                <span>{dailyDateError}</span>
              </div>
            )}
          </div>
          {dailyFetchAttempted && dailyLoading ? (
            <p className="trend-loading">Loading daily report...</p>
          ) : dailyFetchAttempted && dailyReport?.dailyUsage?.days?.length ? (
            <>
              <div className="trend-analysis-grid">
                <div className="trend-analysis-card">
                  <span className="trend-label">Total Days</span>
                  <span className="trend-value">{formatCount(dailyReport.dailyUsage.summary.totalDays)}</span>
                </div>
                <div className="trend-analysis-card">
                  <span className="trend-label">Dyno Units (Total)</span>
                  <span className="trend-value">{formatUsage(dailyReport.dailyUsage.summary.periodTotals?.dynoUnits || 0)}</span>
                </div>
                <div className="trend-analysis-card">
                  <span className="trend-label">Connect Rows (Total)</span>
                  <span className="trend-value">{formatUsage(dailyReport.dailyUsage.summary.periodTotals?.connectRows || 0)}</span>
                </div>
                <div className="trend-analysis-card">
                  <span className="trend-label">Private Spaces (Total)</span>
                  <span className="trend-value">{formatCount(dailyReport.dailyUsage.summary.periodTotals?.privateSpaces || 0)}</span>
                </div>
                <div className="trend-analysis-card">
                  <span className="trend-label">Shield Spaces (Total)</span>
                  <span className="trend-value">{formatCount(dailyReport.dailyUsage.summary.periodTotals?.shieldSpaces || 0)}</span>
                </div>
              </div>

              <h4 className="chart-section-title" style={{ marginTop: '32px', marginBottom: '16px' }}>Total Usage (Period)</h4>
              <div className="daily-table-wrap">
                <table className="daily-table">
                  <thead>
                    <tr>
                      <th>Dyno Units (Total)</th>
                      <th>Data Add-ons (Total)</th>
                      <th>General Add-ons (Total)</th>
                      <th>Private Spaces (Total)</th>
                      <th>Shield Spaces (Total)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>{formatUsage(dailyReport.dailyUsage.summary.periodTotals?.dynoUnits || 0)}</strong></td>
                      <td><strong>{formatUsage(dailyReport.dailyUsage.summary.periodTotals?.dataAddons || 0)}</strong></td>
                      <td><strong>{formatUsage(dailyReport.dailyUsage.summary.periodTotals?.generalAddons || 0)}</strong></td>
                      <td><strong>{formatCount(dailyReport.dailyUsage.summary.periodTotals?.privateSpaces || 0)}</strong></td>
                      <td><strong>{formatCount(dailyReport.dailyUsage.summary.periodTotals?.shieldSpaces || 0)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h4 className="chart-section-title" style={{ marginTop: '32px', marginBottom: '16px' }}>Resource Usage Statistics</h4>
              <div className="daily-table-wrap">
                <table className="daily-table">
                  <thead>
                    <tr>
                      <th>Resource</th>
                      <th>Avg Daily</th>
                      <th>Max Daily</th>
                      <th>Min Daily</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Dyno Units</strong></td>
                      <td>{formatUsage(dailyReport.dailyUsage.summary.dynoUnits?.avg || 0)}</td>
                      <td>{formatUsage(dailyReport.dailyUsage.summary.dynoUnits?.max || 0)}</td>
                      <td>{formatUsage(dailyReport.dailyUsage.summary.dynoUnits?.min || 0)}</td>
                    </tr>
                    <tr>
                      <td><strong>Data Add-ons</strong></td>
                      <td>{formatUsage(dailyReport.dailyUsage.summary.dataAddons?.avg || 0)}</td>
                      <td>{formatUsage(dailyReport.dailyUsage.summary.dataAddons?.max || 0)}</td>
                      <td>{formatUsage(dailyReport.dailyUsage.summary.dataAddons?.min || 0)}</td>
                    </tr>
                    <tr>
                      <td><strong>General Add-ons</strong></td>
                      <td>{formatUsage(dailyReport.dailyUsage.summary.generalAddons?.avg || 0)}</td>
                      <td>{formatUsage(dailyReport.dailyUsage.summary.generalAddons?.max || 0)}</td>
                      <td>{formatUsage(dailyReport.dailyUsage.summary.generalAddons?.min || 0)}</td>
                    </tr>
                    <tr>
                      <td><strong>Private Spaces</strong></td>
                      <td>{formatCount(dailyReport.dailyUsage.summary.privateSpaces?.avg || 0)}</td>
                      <td>{formatCount(dailyReport.dailyUsage.summary.privateSpaces?.max || 0)}</td>
                      <td>{formatCount(dailyReport.dailyUsage.summary.privateSpaces?.min || 0)}</td>
                    </tr>
                    <tr>
                      <td><strong>Shield Spaces</strong></td>
                      <td>{formatCount(dailyReport.dailyUsage.summary.shieldSpaces?.avg || 0)}</td>
                      <td>{formatCount(dailyReport.dailyUsage.summary.shieldSpaces?.max || 0)}</td>
                      <td>{formatCount(dailyReport.dailyUsage.summary.shieldSpaces?.min || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="trend-chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dailyReport.dailyUsage.days}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v) => v.slice(8)} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="dynoCost" fill="#6f42c1" name="Dyno Units" />
                    <Bar dataKey="dataCost" fill="#22c55e" name="Data Add-ons" />
                    <Bar dataKey="otherCost" fill="#f97316" name="General Add-ons" />
                    <Bar dataKey="privateSpaces" fill="#3b82f6" name="Private Spaces" />
                    <Bar dataKey="shieldSpaces" fill="#f59e0b" name="Shield Spaces" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <h4 className="chart-section-title" style={{ marginTop: '60px' }}>Daily Usage Summary</h4>
              <div className="daily-table-wrap">
                <table className="daily-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Dyno Units</th>
                      <th>Data Add-ons</th>
                      <th>General Add-ons</th>
                      <th>Private Spaces</th>
                      <th>Shield Spaces</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyReport.dailyUsage.days.map((day) => (
                      <tr key={day.date}>
                        <td>{day.date}</td>
                        <td>{formatUsage(day.dynoCost)}</td>
                        <td>{formatUsage(day.dataCost)}</td>
                        <td>{formatUsage(day.otherCost)}</td>
                        <td>{formatCount(dailyReport.spaceSummary?.privateSpaces)}</td>
                        <td>{formatCount(dailyReport.spaceSummary?.shieldSpaces)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 className="chart-section-title" style={{ marginTop: '40px' }}>Detailed Team & App Breakdown</h4>

              <div className="breakdown-filters">
                <div className="filter-group">
                  <label htmlFor="breakdown-date-filter">Filter by Date:</label>
                  <select
                    id="breakdown-date-filter"
                    value={selectedBreakdownDate}
                    onChange={(e) => setSelectedBreakdownDate(e.target.value)}
                    className="breakdown-filter-select"
                  >
                    <option value="all">All Dates ({uniqueDates.length})</option>
                    {uniqueDates.map(date => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="breakdown-team-filter">Filter by Team Name:</label>
                  <select
                    id="breakdown-team-filter"
                    value={selectedBreakdownTeam}
                    onChange={(e) => setSelectedBreakdownTeam(e.target.value)}
                    className="breakdown-filter-select"
                  >
                    <option value="all">All Teams ({uniqueTeams.length})</option>
                    {uniqueTeams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="breakdown-app-filter">Filter by App:</label>
                  <select
                    id="breakdown-app-filter"
                    value={selectedBreakdownApp}
                    onChange={(e) => setSelectedBreakdownApp(e.target.value)}
                    className="breakdown-filter-select"
                  >
                    <option value="all">All Apps ({uniqueApps.length})</option>
                    {uniqueApps.map(app => (
                      <option key={app} value={app}>{app}</option>
                    ))}
                  </select>
                </div>

                {(selectedBreakdownDate !== 'all' || selectedBreakdownTeam !== 'all' || selectedBreakdownApp !== 'all') && (
                  <button
                    onClick={() => {
                      setSelectedBreakdownDate('all');
                      setSelectedBreakdownTeam('all');
                      setSelectedBreakdownApp('all');
                    }}
                    className="clear-filters-btn"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <div className="daily-table-wrap breakdown-table-wrap">
                <table className="daily-table breakdown-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Team Name</th>
                      <th>App Name</th>
                      <th>Dyno Units</th>
                      <th>Data Add-ons</th>
                      <th>General Add-ons</th>
                      <th>App in Private Spaces</th>
                      <th>App in Shield Spaces</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedDailyBreakdown.map((row, idx) => (
                      <tr
                        key={`${row.date}-${row.teamName}-${row.appName}-${idx}`}
                        className={[
                          row.showDate ? 'date-group-start' : '',
                          row.showTeam ? 'team-group-start' : ''
                        ].filter(Boolean).join(' ')}
                      >
                        <td className={row.showDate ? 'group-value' : 'group-continued'}>
                          {row.showDate ? <span className="group-pill date">{row.date}</span> : ''}
                        </td>
                        <td className={row.showTeam ? 'group-value' : 'group-continued'}>
                          {row.showTeam ? <span className="group-pill team">{row.teamName}</span> : ''}
                        </td>
                        <td>{row.appName}</td>
                        <td>{formatUsage(row.dynoUnits)}</td>
                        <td>{formatUsage(row.dataAddons)}</td>
                        <td>{formatUsage(row.generalAddons)}</td>
                        <td className="group-value">
                          <span className={`group-pill ${row.privateLabel === 'Yes' ? 'private-yes' : 'private-no'}`}>{row.privateLabel}</span>
                        </td>
                        <td className="group-value">
                          <span className={`group-pill ${row.shieldLabel === 'Yes' ? 'shield-yes' : 'shield-no'}`}>{row.shieldLabel}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : dailyFetchAttempted ? (
            <p className="trend-loading">
              {dailyStartDate && dailyEndDate
                ? 'No daily datewise data available for the selected range.'
                : 'Select From and To dates, then click Fetch Data.'}
            </p>
          ) : null}
        </div>
      )}

      {/* Billing Restrictions Warning */}
      {billingRestrictions.length > 0 && (
        <div className="billing-restrictions-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h3>Billing Access Restricted</h3>
            <p>
              You don't have billing permissions for {billingRestrictions.length} enterprise account{billingRestrictions.length !== 1 ? 's' : ''}:
            </p>
            <ul>
              {billingRestrictions.map((account, idx) => (
                <li key={idx}>
                  <strong>{account.name}</strong> - {account.billing_error}
                </li>
              ))}
            </ul>
            <p className="warning-note">
              💡 Contact your enterprise administrator to grant billing access for these accounts.
            </p>
          </div>
        </div>
      )}

      {billingRestrictions.length === 0 && reportView === 'monthly' && (
        <>
          {/* Overall Summary */}
          <div className="overall-summary">
            {isMultiAccount && (
              <div className="summary-card">
                <EnterpriseIcon className="summary-icon-svg" />
                <div className="summary-content">
                  <div className="summary-value">{summaryData.totalEnterpriseAccounts || 0}</div>
                  <div className="summary-label">Enterprise Accounts</div>
                </div>
              </div>
            )}
            <div className="summary-card">
              <TeamsIcon className="summary-icon-svg" />
              <div className="summary-content">
                <div className="summary-value">{summaryData.totalTeams || enterpriseTeams.length}</div>
                <div className="summary-label">Enterprise Teams</div>
              </div>
            </div>
            <div className="summary-card">
              <EnterpriseIcon className="summary-icon-svg" />
              <div className="summary-content">
                <div className="summary-value">{formatCount(summaryData.totalPrivateSpaces)}</div>
                <div className="summary-label">Private Spaces</div>
              </div>
            </div>
            <div className="summary-card">
              <EnterpriseIcon className="summary-icon-svg" />
              <div className="summary-content">
                <div className="summary-value">{formatCount(summaryData.totalShieldSpaces)}</div>
                <div className="summary-label">Shield Spaces</div>
              </div>
            </div>
            <div className="summary-card">
              <DynoIcon className="summary-icon-svg" />
              <div className="summary-content">
                <div className="summary-value">{formatUsage(summaryData.totalDynos)}</div>
                <div className="summary-label">Dyno Units</div>
              </div>
            </div>
            <div className="summary-card">
              <ConnectIcon className="summary-icon-svg" />
              <div className="summary-content">
                <div className="summary-value">{formatUsage(summaryData.totalConnect)}</div>
                <div className="summary-label">Connect Rows</div>
              </div>
            </div>
            <div className="summary-card">
              <PostgresIcon className="summary-icon-svg" />
              <div className="summary-content">
                <div className="summary-value">{formatUsage(summaryData.totalDataAddons)}</div>
                <div className="summary-label">Data Add-ons</div>
              </div>
            </div>
            <div className="summary-card">
              <AddonsIcon className="summary-icon-svg" />
              <div className="summary-content">
                <div className="summary-value">{formatUsage(summaryData.totalOtherAddons)}</div>
                <div className="summary-label">General Add-ons Usage</div>
              </div>
            </div>
          </div>

          {/* Teams Grid */}
          <div className="teams-section">
            <div className="teams-section-header">
              <h2>Enterprise Teams {showAllAccounts ? '(All Accounts)' : ''}</h2>
              <div className="team-filter-dropdown">
                <label htmlFor="teamFilter">Filter Team: </label>
                <select
                  id="teamFilter"
                  value={selectedTeamFilter}
                  onChange={(e) => setSelectedTeamFilter(e.target.value)}
                  className="team-filter-select"
                >
                  <option value="all">All Teams ({enterpriseTeams.length})</option>
                  {enterpriseTeams.map((team, idx) => (
                    <option key={idx} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="usage-note">
              <strong>Note:</strong> Only applications with resource usage/utilization are listed. Applications with no or 0 resource usage/utilization are excluded.
            </p>
            {displayedTeams.length === 0 && (
              <div className="no-teams-message">
                <p>No enterprise teams found{billingRestrictions.length > 0 ? ' with billing access' : ''}.</p>
                {billingRestrictions.length > 0 && (
                  <p>Contact your enterprise administrator to grant billing access.</p>
                )}
              </div>
            )}
            <div className="teams-grid">
              {displayedTeams.map((team, index) => {
                const resources = team.resources;
                const teamKey = `${team.accountName || 'single'}-${team.name}-${index}`;
                const isExpanded = Boolean(expandedTeams[teamKey]);
                return (
                  <div key={index} className="team-card">
                    <div className="team-header">
                      <EnterpriseIcon className="team-icon-svg" />
                      <div className="team-info">
                        <h3>{team.name}</h3>
                        {team.accountName && showAllAccounts && (
                          <div className="team-account-badge">{team.accountName}</div>
                        )}
                        <span className="team-type">Enterprise</span>
                      </div>
                      <button
                        type="button"
                        className="team-details-toggle"
                        onClick={() => toggleTeamDetails(teamKey, team.id)}
                      >
                        {isExpanded ? 'Hide details' : 'View details'}
                      </button>
                    </div>

                    <div className="team-stats">
                      <div className="stat-row">
                        <span className="stat-label"><DynoIcon className="inline-stat-icon" /> Dyno Units</span>
                        <span className="stat-value">{formatUsage(resources.dynos.count)}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label"><ConnectIcon className="inline-stat-icon" /> Connect Rows</span>
                        <span className="stat-value">{formatUsage(resources.connect.used)}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label"><PostgresIcon className="inline-stat-icon" /> Data Add-ons</span>
                        <span className="stat-value">{formatUsage(resources.dataAddons.count)}</span>
                      </div>
                    <div className="stat-row">
                      <span className="stat-label"><EnterpriseIcon className="inline-stat-icon" /> Private Spaces</span>
                      <span className="stat-value">{formatCount(resources.privateSpaces)}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label"><EnterpriseIcon className="inline-stat-icon" /> Shield Spaces</span>
                      <span className="stat-value">{formatCount(resources.shieldSpaces)}</span>
                    </div>
                      <div className="stat-row last">
                        <span className="stat-label"><AddonsIcon className="inline-stat-icon" /> General Add-ons Usage</span>
                        <span className="stat-value">{formatUsage(resources.otherAddons.count)}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="team-details">
                        <h4>Granular Breakdown</h4>
                        <div className="team-detail-grid">
                          <div className="team-detail-item">
                            <span className="detail-label">Total Apps</span>
                            <span className="detail-value">{resources.totalApps || 0}</span>
                          </div>
                          <div className="team-detail-item">
                            <span className="detail-label">Dyno Units</span>
                            <span className="detail-value">{formatUsage(resources.dynos.count)}</span>
                          </div>
                          <div className="team-detail-item">
                            <span className="detail-label">Connect Rows</span>
                            <span className="detail-value">{formatUsage(resources.connect.used)}</span>
                          </div>
                          <div className="team-detail-item">
                            <span className="detail-label">Data Add-ons</span>
                            <span className="detail-value">{formatUsage(resources.dataAddons.count)}</span>
                          </div>
                          <div className="team-detail-item">
                            <span className="detail-label">General Add-ons Usage</span>
                            <span className="detail-value">{formatUsage(resources.otherAddons.count)}</span>
                          </div>
                          <div className="team-detail-item">
                            <span className="detail-label">Private Spaces</span>
                            <span className="detail-value">{formatCount(resources.privateSpaces)}</span>
                          </div>
                          <div className="team-detail-item">
                            <span className="detail-label">Shield Spaces</span>
                            <span className="detail-value">{formatCount(resources.shieldSpaces)}</span>
                          </div>
                        </div>

                        <div className="team-apps-breakdown">
                          <h5>App-level Usage</h5>
                          {loadingTeamApps[team.id] && (
                            <p className="no-app-breakdown">Loading space information...</p>
                          )}
                          {!loadingTeamApps[team.id] && resources.appsUsage && resources.appsUsage.length > 0 ? (
                            <div className="apps-usage-table">
                              {resources.appsUsage.map((app, appIdx) => {
                                const spaceInfo = teamAppsCache[team.id]?.[app.name] || {};
                                return (
                                  <div key={appIdx} className="apps-usage-row">
                                    <span className="app-name">
                                      {app.name}
                                      {spaceInfo.isInPrivateSpace && <span className="space-badge private">Private Space</span>}
                                      {spaceInfo.isInShieldSpace && <span className="space-badge shield">Shield Space</span>}
                                    </span>
                                    <span className="app-usage">Dyno: {formatUsage(app.dynos)}</span>
                                    <span className="app-usage">Connect: {formatUsage(app.connect)}</span>
                                    <span className="app-usage">Data: {formatUsage(app.dataAddons)}</span>
                                    <span className="app-usage">General: {formatUsage(app.generalAddons)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : !loadingTeamApps[team.id] ? (
                            <p className="no-app-breakdown">No apps found for this team.</p>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default EnterpriseView;
