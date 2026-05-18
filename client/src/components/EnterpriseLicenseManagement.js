import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EnterpriseLicenseManagement.css';

function EnterpriseLicenseManagement() {
  const [accounts, setAccounts] = useState([]);
  const [licenseConfigs, setLicenseConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [editMode, setEditMode] = useState({});
  const [editedConfigs, setEditedConfigs] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch current user
      const userResponse = await axios.get('/api/auth/user');
      setCurrentUser(userResponse.data);

      // Fetch enterprise accounts
      const accountsResponse = await axios.get('/api/enterprise/accounts');
      const accountsList = accountsResponse.data || [];
      setAccounts(accountsList);

      // Fetch license configs for each account
      const configs = {};
      for (const account of accountsList) {
        try {
          const configResponse = await axios.get(`/api/licenses/enterprise/${account.id}`);
          configs[account.id] = configResponse.data;
        } catch (err) {
          console.error(`Error fetching config for ${account.id}:`, err);
          // Use defaults if no config exists
          configs[account.id] = {
            account_id: account.id,
            account_name: account.name,
            dyno_units_limit: 0,
            connect_rows_limit: 0,
            data_addons_limit: 0,
            general_addons_limit: 0,
            private_spaces_limit: 0,
            shield_spaces_limit: 0,
            warning_percentage: 80,
            critical_percentage: 95
          };
        }
      }
      setLicenseConfigs(configs);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch license data');
      setLoading(false);
    }
  };

  const handleEditToggle = (accountId) => {
    setEditMode(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));

    if (!editMode[accountId]) {
      // Entering edit mode - copy current config to edited state
      setEditedConfigs(prev => ({
        ...prev,
        [accountId]: { ...licenseConfigs[accountId] }
      }));
    }
  };

  const handleInputChange = (accountId, field, value) => {
    setEditedConfigs(prev => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const handleSave = async (accountId) => {
    try {
      setSaving(true);
      setSaveMessage(null);

      const config = editedConfigs[accountId];
      await axios.put(`/api/licenses/enterprise/${accountId}`, config);

      // Refresh data
      await fetchData();

      setEditMode(prev => ({ ...prev, [accountId]: false }));
      setSaveMessage({ type: 'success', text: 'License configuration saved successfully' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save configuration'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (accountId) => {
    setEditMode(prev => ({ ...prev, [accountId]: false }));
    setEditedConfigs(prev => {
      const newConfigs = { ...prev };
      delete newConfigs[accountId];
      return newConfigs;
    });
  };

  const getAccountStatus = (accountId) => {
    const config = licenseConfigs[accountId];
    if (!config) return 'UNKNOWN';

    // This would need actual usage data - for now return based on limits
    if (config.source === 'env_fallback') return 'ENV FALLBACK';
    return 'LICENSE OK';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'LICENSE OK': return '#10b981';
      case 'WARNING': return '#f59e0b';
      case 'CRITICAL': return '#dc2626';
      case 'OVERAGE': return '#7f1d1d';
      case 'RESTRICTED': return '#64748b';
      default: return '#6b7280';
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  if (loading) {
    return (
      <div className="elm-loading">
        <div className="elm-spinner"></div>
        <p>Loading enterprise license configurations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="elm-error">
        <strong>Error:</strong> {error}
        <button onClick={fetchData} className="elm-retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="enterprise-license-management">
      <div className="elm-header">
        <h2>Enterprise Licenses</h2>
        <p className="elm-description">
          Configure license capacity limits and monitoring thresholds for each Enterprise Account
        </p>
        {!isAdmin && (
          <div className="elm-readonly-notice">
            <span className="elm-icon">👁️</span> Read-only mode - Admin access required to edit licenses
          </div>
        )}
      </div>

      {saveMessage && (
        <div className={`elm-message elm-message-${saveMessage.type}`}>
          {saveMessage.text}
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="elm-empty">
          <p>No Enterprise Accounts found</p>
        </div>
      ) : (
        <div className="elm-accounts">
          {accounts.map(account => {
            const config = licenseConfigs[account.id] || {};
            const isEditing = editMode[account.id];
            const displayConfig = isEditing ? editedConfigs[account.id] : config;
            const status = getAccountStatus(account.id);

            return (
              <div key={account.id} className="elm-account-section">
                <div className="elm-account-header">
                  <div className="elm-account-info">
                    <h3 className="elm-account-name">{account.name || account.email}</h3>
                    <span
                      className="elm-account-status"
                      style={{ backgroundColor: getStatusColor(status), color: 'white' }}
                    >
                      {status}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="elm-account-actions">
                      {!isEditing ? (
                        <button
                          onClick={() => handleEditToggle(account.id)}
                          className="elm-btn elm-btn-edit"
                        >
                          ✏️ Edit
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSave(account.id)}
                            className="elm-btn elm-btn-save"
                            disabled={saving}
                          >
                            {saving ? 'Saving...' : '💾 Save'}
                          </button>
                          <button
                            onClick={() => handleCancel(account.id)}
                            className="elm-btn elm-btn-cancel"
                            disabled={saving}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {config.updated_at && (
                  <div className="elm-account-meta">
                    Last updated: {new Date(config.updated_at).toLocaleString()}
                    {config.updated_by && ` by ${config.updated_by}`}
                  </div>
                )}

                <div className="elm-license-cards">
                  <LicenseCard
                    title="Dyno Units"
                    value={displayConfig.dyno_units_limit}
                    isEditing={isEditing}
                    onChange={(value) => handleInputChange(account.id, 'dyno_units_limit', value)}
                    icon="⚙️"
                  />
                  <LicenseCard
                    title="Connect Rows"
                    value={displayConfig.connect_rows_limit}
                    isEditing={isEditing}
                    onChange={(value) => handleInputChange(account.id, 'connect_rows_limit', value)}
                    icon="🔗"
                  />
                  <LicenseCard
                    title="Data Add-ons"
                    value={displayConfig.data_addons_limit}
                    isEditing={isEditing}
                    onChange={(value) => handleInputChange(account.id, 'data_addons_limit', value)}
                    icon="💾"
                  />
                  <LicenseCard
                    title="General Add-ons"
                    value={displayConfig.general_addons_limit}
                    isEditing={isEditing}
                    onChange={(value) => handleInputChange(account.id, 'general_addons_limit', value)}
                    icon="🔌"
                  />
                  <LicenseCard
                    title="Private Spaces"
                    value={displayConfig.private_spaces_limit}
                    isEditing={isEditing}
                    onChange={(value) => handleInputChange(account.id, 'private_spaces_limit', value)}
                    icon="🔒"
                  />
                  <LicenseCard
                    title="Shield Spaces"
                    value={displayConfig.shield_spaces_limit}
                    isEditing={isEditing}
                    onChange={(value) => handleInputChange(account.id, 'shield_spaces_limit', value)}
                    icon="🛡️"
                  />
                </div>

                <div className="elm-thresholds">
                  <h4>Monitoring Thresholds</h4>
                  <div className="elm-threshold-cards">
                    <ThresholdCard
                      label="Warning Threshold"
                      value={displayConfig.warning_percentage}
                      isEditing={isEditing}
                      onChange={(value) => handleInputChange(account.id, 'warning_percentage', value)}
                      color="#f59e0b"
                    />
                    <ThresholdCard
                      label="Critical Threshold"
                      value={displayConfig.critical_percentage}
                      isEditing={isEditing}
                      onChange={(value) => handleInputChange(account.id, 'critical_percentage', value)}
                      color="#dc2626"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LicenseCard({ title, value, isEditing, onChange, icon }) {
  return (
    <div className="elm-license-card">
      <div className="elm-card-icon">{icon}</div>
      <div className="elm-card-content">
        <div className="elm-card-title">{title}</div>
        <div className="elm-card-value">
          {isEditing ? (
            <input
              type="number"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="elm-input"
              min="0"
            />
          ) : (
            <span className="elm-value-display">{value.toLocaleString()}</span>
          )}
        </div>
        <div className="elm-card-label">Licensed Capacity</div>
      </div>
    </div>
  );
}

function ThresholdCard({ label, value, isEditing, onChange, color }) {
  return (
    <div className="elm-threshold-card" style={{ borderLeftColor: color }}>
      <div className="elm-threshold-label">{label}</div>
      <div className="elm-threshold-value">
        {isEditing ? (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="elm-input elm-input-small"
            min="0"
            max="100"
          />
        ) : (
          <span className="elm-value-display">{value}%</span>
        )}
      </div>
    </div>
  );
}

export default EnterpriseLicenseManagement;
