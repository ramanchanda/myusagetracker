import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import EnterpriseAccountSelector from './EnterpriseAccountSelector';
import {
  EnterpriseIcon,
  TeamsIcon,
  DynoIcon,
  PostgresIcon,
  AddonsIcon,
  ConnectIcon
} from './HerokuIcons';
import './EnterpriseView.css';

function EnterpriseView({ selectedMonth }) {
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [showAllTeamsInAccount, setShowAllTeamsInAccount] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState({});
  const [reportView, setReportView] = useState('summary12');
  const [trendSummary, setTrendSummary] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);

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

  const formatUsage = (value) => Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const formatCount = (value) => Number(value || 0).toLocaleString();
  const isTeamActive = (team) => Boolean(team?.hasDirectAccess);

  if (loading) {
    return (
      <div className="enterprise-view">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading enterprise structure...</p>
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

    if (structure.enterpriseAccount && !structure.enterpriseAccount.has_billing_access) {
      billingRestrictions.push(structure.enterpriseAccount);
    }
  }

  const activeTeams = enterpriseTeams.filter(team => isTeamActive(team));
  const displayedTeams = showAllTeamsInAccount ? enterpriseTeams : activeTeams;
  const toggleTeamDetails = (teamKey) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamKey]: !prev[teamKey]
    }));
  };

  return (
    <div className="enterprise-view">
      <div className="account-meta-strip">
        <p className="account-email">{structure.account.email}</p>
        <p className="selected-month">
          Viewing: {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
        </p>
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

      <div className="report-options">
        <button
          type="button"
          className={`report-option-btn ${reportView === 'summary12' ? 'active' : ''}`}
          onClick={() => setReportView('summary12')}
        >
          Summary of past 12 months - trend, analysis
        </button>
        <button
          type="button"
          className={`report-option-btn ${reportView === 'monthly' ? 'active' : ''}`}
          onClick={() => setReportView('monthly')}
        >
          Monthly Report
        </button>
        <button
          type="button"
          className={`report-option-btn ${reportView === 'daily' ? 'active' : ''}`}
          onClick={() => setReportView('daily')}
        >
          Daily - Datewise Report
        </button>
      </div>

      {reportView === 'summary12' && (
        <div className="trend-summary-panel">
          <h3>Summary of past 12 months - trend, analysis</h3>
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
              </div>
              <div className="trend-chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trendSummary.monthly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="dynoUnits" stroke="#6f42c1" strokeWidth={2} />
                    <Line type="monotone" dataKey="connectRows" stroke="#0ea5e9" strokeWidth={2} />
                    <Line type="monotone" dataKey="dataAddons" stroke="#22c55e" strokeWidth={2} />
                    <Line type="monotone" dataKey="generalAddons" stroke="#f97316" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="trend-loading">No trend data available.</p>
          )}
        </div>
      )}

      {reportView === 'monthly' && (
        <div className="report-placeholder">Monthly Report view coming next.</div>
      )}

      {reportView === 'daily' && (
        <div className="report-placeholder">Daily - Datewise Report view coming next.</div>
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
            <div className="summary-subtext">
              Active: {activeTeams.length}
            </div>
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
          <div className="teams-view-toggle">
            <button
              type="button"
              className={`teams-filter-btn ${!showAllTeamsInAccount ? 'active' : ''}`}
              onClick={() => setShowAllTeamsInAccount(false)}
            >
              Active Teams ({activeTeams.length})
            </button>
            <button
              type="button"
              className={`teams-filter-btn ${showAllTeamsInAccount ? 'active' : ''}`}
              onClick={() => setShowAllTeamsInAccount(true)}
            >
              All Teams ({enterpriseTeams.length})
            </button>
          </div>
        </div>
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
                    onClick={() => toggleTeamDetails(teamKey)}
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
                    </div>

                    <div className="team-apps-breakdown">
                      <h5>App-level Usage</h5>
                      {resources.appsUsage && resources.appsUsage.length > 0 ? (
                        <div className="apps-usage-table">
                          {resources.appsUsage.map((app, appIdx) => (
                            <div key={appIdx} className="apps-usage-row">
                              <span className="app-name">{app.name}</span>
                              <span className="app-usage">Dyno: {formatUsage(app.dynos)}</span>
                              <span className="app-usage">Connect: {formatUsage(app.connect)}</span>
                              <span className="app-usage">Data: {formatUsage(app.dataAddons)}</span>
                              <span className="app-usage">General: {formatUsage(app.generalAddons)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-app-breakdown">No app-level usage found for this team in selected month.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default EnterpriseView;
