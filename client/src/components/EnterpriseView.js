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

    if (!dailyStartDate || !dailyEndDate) {
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
    }
  }, [reportView]);

  const formatUsage = (value) => Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  });
  const formatCount = (value) => Number(value || 0).toLocaleString();
  const groupedDailyBreakdown = (dailyReport?.dailyBreakdown || [])
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
            <h3>Summary of past 12 months - trend, analysis</h3>
            <p>Enterprise utilization trend, capacity pattern, and platform usage signals.</p>
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
              <div className="trend-chart-wrap summary12-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={summary12LineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="dynoUnits" stroke="#6f42c1" strokeWidth={2} name="Dyno Units" />
                    <Line type="monotone" dataKey="connectRowsThousands" stroke="#0ea5e9" strokeWidth={2} name="Connect Rows (K)" />
                    <Line type="monotone" dataKey="dataAddons" stroke="#22c55e" strokeWidth={2} name="Data Add-ons" />
                    <Line type="monotone" dataKey="generalAddons" stroke="#f97316" strokeWidth={2} name="General Add-ons" />
                    <Line type="monotone" dataKey="privateSpaces" stroke="#3b82f6" strokeWidth={2} name="Private Spaces" />
                    <Line type="monotone" dataKey="shieldSpaces" stroke="#f59e0b" strokeWidth={2} name="Shield Spaces" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <h3 className="summary12-subtitle">12-Month Resource Breakdown</h3>

              <div className="resource-charts-grid">
                <div className="resource-chart-item">
                  <h4>Dyno Units</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trendSummary.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="dynoUnits" fill="#6f42c1" name="Dyno Units" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="resource-chart-item">
                  <h4>Connect Rows</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trendSummary.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="connectRows" fill="#0ea5e9" name="Connect Rows" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="resource-chart-item">
                  <h4>Data Add-ons</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trendSummary.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="dataAddons" fill="#22c55e" name="Data Add-ons" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="resource-chart-item">
                  <h4>General Add-ons</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trendSummary.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="generalAddons" fill="#f97316" name="General Add-ons" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="resource-chart-item">
                  <h4>Private Spaces</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trendSummary.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="privateSpaces" fill="#3b82f6" name="Private Spaces" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="resource-chart-item">
                  <h4>Shield Spaces</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trendSummary.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
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
                  onChange={(e) => setDailyStartDate(e.target.value)}
                  className="date-input"
                />
              </label>
              <label>
                To:
                <input
                  type="date"
                  value={dailyEndDate}
                  onChange={(e) => setDailyEndDate(e.target.value)}
                  className="date-input"
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
                  }}
                  className="clear-dates-btn"
                >
                  Clear Dates
                </button>
              )}
            </div>
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
                  <span className="trend-label">Avg Daily Usage</span>
                  <span className="trend-value">{formatUsage(dailyReport.dailyUsage.summary.avgDailyCost)}</span>
                </div>
                <div className="trend-analysis-card">
                  <span className="trend-label">Max Daily Usage</span>
                  <span className="trend-value">{formatUsage(dailyReport.dailyUsage.summary.maxDailyCost)}</span>
                </div>
                <div className="trend-analysis-card">
                  <span className="trend-label">Min Daily Usage</span>
                  <span className="trend-value">{formatUsage(dailyReport.dailyUsage.summary.minDailyCost)}</span>
                </div>
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
                    <Bar dataKey="connectCost" fill="#0ea5e9" name="Connect Rows" />
                    <Bar dataKey="dataCost" fill="#22c55e" name="Data Add-ons" />
                    <Bar dataKey="otherCost" fill="#f97316" name="General Add-ons" />
                    <Bar dataKey="privateSpaces" fill="#3b82f6" name="Private Spaces" />
                    <Bar dataKey="shieldSpaces" fill="#f59e0b" name="Shield Spaces" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="daily-table-wrap">
                <table className="daily-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Dyno Units</th>
                      <th>Connect Rows</th>
                      <th>Data Add-ons</th>
                      <th>General Add-ons</th>
                      <th>Private Spaces</th>
                      <th>Shield Spaces</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyReport.dailyUsage.days.map((day) => (
                      <tr key={day.date}>
                        <td>{day.date}</td>
                        <td>{formatUsage(day.dynoCost)}</td>
                        <td>{formatUsage(day.connectCost)}</td>
                        <td>{formatUsage(day.dataCost)}</td>
                        <td>{formatUsage(day.otherCost)}</td>
                        <td>{formatCount(dailyReport.spaceSummary?.privateSpaces)}</td>
                        <td>{formatCount(dailyReport.spaceSummary?.shieldSpaces)}</td>
                        <td>{formatUsage(day.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="daily-table-wrap breakdown-table-wrap">
                <table className="daily-table breakdown-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Team Name</th>
                      <th>App Name</th>
                      <th>Dyno Units</th>
                      <th>Connect Rows</th>
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
                        <td>{formatUsage(row.connectRows)}</td>
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
