import React from 'react';
import './EnterpriseAccountSelector.css';

function EnterpriseAccountSelector({ accounts, selectedAccountId, onAccountChange, showAllAccounts, onShowAllToggle }) {
  if (!accounts || accounts.length === 0) {
    return null;
  }

  // Only show selector if there are multiple accounts
  if (accounts.length === 1) {
    return (
      <div className="enterprise-account-selector single">
        <div className="account-badge">
          <span className="account-icon">🏢</span>
          <span className="account-name">{accounts[0].name}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="enterprise-account-selector">
      <div className="selector-header">
        <span className="selector-icon">🏢</span>
        <label>Enterprise Account:</label>
      </div>

      <div className="selector-controls">
        {!showAllAccounts && (
          <select
            className="account-dropdown"
            value={selectedAccountId || ''}
            onChange={(e) => onAccountChange(e.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        )}

        <button
          className={`toggle-btn ${showAllAccounts ? 'active' : ''}`}
          onClick={() => onShowAllToggle(!showAllAccounts)}
        >
          {showAllAccounts ? '📋 Viewing All Accounts' : '📊 View All Accounts'}
        </button>

        {!showAllAccounts && (
          <div className="account-count">
            {accounts.findIndex(a => a.id === selectedAccountId) + 1} of {accounts.length}
          </div>
        )}
      </div>

      {showAllAccounts && (
        <div className="all-accounts-indicator">
          Showing data from {accounts.length} enterprise account{accounts.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export default EnterpriseAccountSelector;
