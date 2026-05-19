import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LoginHistory.css';

function LoginHistory() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    username: ''
  });
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0
  });

  useEffect(() => {
    fetchData();
  }, [pagination.offset, filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [historyResponse, statsResponse] = await Promise.all([
        axios.get('/api/auth/login-history', {
          params: {
            limit: pagination.limit,
            offset: pagination.offset,
            username: filter.username || undefined
          }
        }),
        axios.get('/api/auth/login-stats')
      ]);

      setHistory(historyResponse.data);
      setStats(statsResponse.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch login history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilter(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
  };

  const handleNextPage = () => {
    setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
  };

  const handlePrevPage = () => {
    setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatNumber = (num) => {
    return parseInt(num || 0).toLocaleString();
  };

  if (loading && !history.length) {
    return (
      <div className="login-history-loading">
        <div className="lh-spinner"></div>
        <p>Loading login history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="login-history-error">
        <strong>Error:</strong> {error}
        <button onClick={fetchData} className="lh-retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="login-history">
      <div className="lh-header">
        <h2 className="lh-title">Login History & Security Audit</h2>
        <p className="lh-subtitle">Track successful logins and monitor account security</p>
        <div className="lh-privacy-note">
          <span className="lh-privacy-icon">🔒</span>
          <strong>Privacy:</strong> IP addresses are hashed (SHA256) for privacy. System IDs are device fingerprints for security monitoring.
        </div>
      </div>

      {stats && (
        <div className="lh-stats-grid">
          <div className="lh-stat-card">
            <div className="lh-stat-icon" style={{ color: '#10b981' }}>✅</div>
            <div className="lh-stat-content">
              <div className="lh-stat-value">{formatNumber(stats.total_logins)}</div>
              <div className="lh-stat-label">Total Logins (30d)</div>
            </div>
          </div>

          <div className="lh-stat-card">
            <div className="lh-stat-icon" style={{ color: '#6366f1' }}>👥</div>
            <div className="lh-stat-content">
              <div className="lh-stat-value">{formatNumber(stats.unique_users)}</div>
              <div className="lh-stat-label">Unique Users</div>
            </div>
          </div>

          <div className="lh-stat-card">
            <div className="lh-stat-icon" style={{ color: '#f59e0b' }}>🌐</div>
            <div className="lh-stat-content">
              <div className="lh-stat-value">{formatNumber(stats.unique_ips)}</div>
              <div className="lh-stat-label">Unique IP Addresses</div>
            </div>
          </div>

          <div className="lh-stat-card">
            <div className="lh-stat-icon" style={{ color: '#8b5cf6' }}>💻</div>
            <div className="lh-stat-content">
              <div className="lh-stat-value">{formatNumber(stats.unique_systems)}</div>
              <div className="lh-stat-label">Unique Systems</div>
            </div>
          </div>

          <div className="lh-stat-card">
            <div className="lh-stat-icon" style={{ color: '#10b981' }}>🕐</div>
            <div className="lh-stat-content">
              <div className="lh-stat-value" style={{ fontSize: '0.75rem' }}>
                {stats.last_login ? formatDate(stats.last_login) : 'N/A'}
              </div>
              <div className="lh-stat-label">Last Login</div>
            </div>
          </div>
        </div>
      )}

      <div className="lh-filters">
        <div className="lh-filter-group">
          <label className="lh-filter-label">Username:</label>
          <input
            type="text"
            className="lh-filter-input"
            placeholder="Filter by username"
            value={filter.username}
            onChange={(e) => handleFilterChange('username', e.target.value)}
          />
        </div>

        <button onClick={fetchData} className="lh-refresh-btn" disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      <div className="lh-table-container">
        <table className="lh-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Username</th>
              <th>Role</th>
              <th>User Agent</th>
              <th>IP Hash</th>
              <th>System ID</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="6" className="lh-no-data">No login history found</td>
              </tr>
            ) : (
              history.map((entry) => (
                <tr key={entry.id} className="lh-row-success">
                  <td className="lh-cell-time">{formatDate(entry.login_time)}</td>
                  <td className="lh-cell-username">{entry.username}</td>
                  <td className="lh-cell-role">
                    {entry.role && (
                      <span className={`lh-role-badge lh-role-${entry.role}`}>
                        {entry.role}
                      </span>
                    )}
                  </td>
                  <td className="lh-cell-user-agent">{entry.user_agent || 'Unknown'}</td>
                  <td className="lh-cell-ip">{entry.ip_address}</td>
                  <td className="lh-cell-system-id">
                    <code>{entry.system_id}</code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="lh-pagination">
        <button
          onClick={handlePrevPage}
          disabled={pagination.offset === 0 || loading}
          className="lh-page-btn"
        >
          ← Previous
        </button>
        <span className="lh-page-info">
          Showing {pagination.offset + 1} - {pagination.offset + history.length}
        </span>
        <button
          onClick={handleNextPage}
          disabled={history.length < pagination.limit || loading}
          className="lh-page-btn"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default LoginHistory;
