import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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

  const formatUsage = (value) => Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const formatCount = (value) => Number(value || 0).toLocaleString();
  const isTeamActive = (resources) => {
    if (!resources) return false;
    return (
      Number(resources.dynos?.count || 0) > 0 ||
      Number(resources.connect?.used || 0) > 0 ||
      Number(resources.dataAddons?.count || 0) > 0 ||
      Number(resources.otherAddons?.count || 0) > 0
    );
  };

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
      name: team.name,
      type: team.type,
      resources: team.resources,
      accountName: structure.enterpriseAccount?.name
    }));

    if (structure.enterpriseAccount && !structure.enterpriseAccount.has_billing_access) {
      billingRestrictions.push(structure.enterpriseAccount);
    }
  }

  const activeTeams = enterpriseTeams.filter(team => isTeamActive(team.resources));
  const displayedTeams = showAllTeamsInAccount ? enterpriseTeams : activeTeams;
  const toggleTeamDetails = (teamKey) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamKey]: !prev[teamKey]
    }));
  };

  return (
    <div className="enterprise-view">
      {/* Account Header */}
      <div className="account-header">
        <div className="account-info">
          <h1>Heroku Enterprise Teams Usage</h1>
          <p className="account-email">
            {structure.account.enterpriseAccountName || 'Enterprise Account'}
          </p>
          <p className="account-email">{structure.account.email}</p>
          <p className="selected-month">
            Viewing: {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={fetchEnterpriseStructure} className="refresh-btn">
          Refresh
        </button>
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
              Active: {summaryData.totalActiveTeams ?? activeTeams.length}
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
