import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import EnterpriseAccountSelector from './EnterpriseAccountSelector';
import './EnterpriseView.css';

function EnterpriseView({ selectedMonth }) {
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [showAllAccounts, setShowAllAccounts] = useState(false);

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

  const formatCurrency = (value) => Number(value || 0).toLocaleString();
  const formatUsage = (value) => Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

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
            📅 Viewing: {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={fetchEnterpriseStructure} className="refresh-btn">
          🔄 Refresh
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
            <div className="summary-icon">🏢</div>
            <div className="summary-content">
              <div className="summary-value">{summaryData.totalEnterpriseAccounts || 0}</div>
              <div className="summary-label">Enterprise Accounts</div>
            </div>
          </div>
        )}
        <div className="summary-card">
          <div className="summary-icon">👥</div>
          <div className="summary-content">
            <div className="summary-value">{summaryData.totalTeams || enterpriseTeams.length}</div>
            <div className="summary-label">Enterprise Teams</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">⚡</div>
          <div className="summary-content">
            <div className="summary-value">{formatUsage(summaryData.totalDynos)}</div>
            <div className="summary-label">Dynos Usage</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">🔌</div>
          <div className="summary-content">
            <div className="summary-value">{formatUsage(summaryData.totalConnect)}</div>
            <div className="summary-label">Connect Usage</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">💾</div>
          <div className="summary-content">
            <div className="summary-value">{formatUsage(summaryData.totalDataAddons)}</div>
            <div className="summary-label">Data Add-ons Usage</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">🔧</div>
          <div className="summary-content">
            <div className="summary-value">{formatUsage(summaryData.totalOtherAddons)}</div>
            <div className="summary-label">Other Add-ons Usage</div>
          </div>
        </div>
        <div className="summary-card highlight">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <div className="summary-value">${formatCurrency(summaryData.totalMonthlyCost)}</div>
            <div className="summary-label">Monthly Cost</div>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="teams-section">
        <h2>📊 Enterprise Teams {showAllAccounts ? '(All Accounts)' : ''}</h2>
        {enterpriseTeams.length === 0 && (
          <div className="no-teams-message">
            <p>No enterprise teams found{billingRestrictions.length > 0 ? ' with billing access' : ''}.</p>
            {billingRestrictions.length > 0 && (
              <p>Contact your enterprise administrator to grant billing access.</p>
            )}
          </div>
        )}
        <div className="teams-grid">
          {enterpriseTeams.map((team, index) => {
            const resources = team.resources;
            return (
              <div key={index} className="team-card">
                <div className="team-header">
                  <div className="team-icon">🏢</div>
                  <div className="team-info">
                    <h3>{team.name}</h3>
                    {team.accountName && showAllAccounts && (
                      <div className="team-account-badge">{team.accountName}</div>
                    )}
                    <span className="team-type">Enterprise</span>
                  </div>
                </div>

                <div className="team-stats">
                  <div className="stat-row">
                    <span className="stat-label">⚡ Dynos Usage</span>
                    <span className="stat-value">{formatUsage(resources.dynos.count)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">🔌 Connect Usage</span>
                    <span className="stat-value">{formatUsage(resources.connect.used)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">💾 Data Add-ons Usage</span>
                    <span className="stat-value">{formatUsage(resources.dataAddons.count)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">🔧 Other Add-ons Usage</span>
                    <span className="stat-value">{formatUsage(resources.otherAddons.count)}</span>
                  </div>
                  <div className="stat-row total">
                    <span className="stat-label">💰 Monthly Cost</span>
                    <span className="stat-value cost">${formatCurrency(resources.totalMonthlyCost)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default EnterpriseView;
