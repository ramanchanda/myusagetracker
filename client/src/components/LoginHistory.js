import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LoginHistory.css';

function LoginHistory() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    username: '',
    successOnly: ''
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
            username: filter.username || undefined,
            successOnly: filter.successOnly || undefined
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
        <p className="lh-subtitle">Track authentication attempts and monitor account security</p>
      </div>

      {stats && (
        <div className="lh-stats-grid">
          <div className="lh-stat-card">
            <div className="lh-stat-icon" style={{ color: '#10b981' }}>📊</div>
            <div className="lh-stat-content">
              <div className="lh-stat-value">{formatNumber(stats.total_attempts)}</div>
              <div className="lh-stat-label">Total Attempts (30d)</div>
            </div>
          </div>

          <div className="lh-stat-card">
            <div className="lh-stat-icon" style={{ color: '#10b981' }}>✅</div>
            <div className="lh-stat-content">
              <div className="lh-stat-value">{formatNumber(stats.successful_logins)}</div>
              <div className="lh-stat-label">Successful Logins</div>
            </div>
          </div>

          <div className="lh-stat-card">
            <div className="lh-stat-icon" style={{ color: '#ef4444' }}>❌</div>
            <div className="lh-stat-content">
              <div className="lh-stat-value">{formatNumber(stats.failed_logins)}</div>
              <div className="lh-stat-label">Failed Attempts</div>
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
            <div className="lh-stat-icon" style={{ color: '#8b5cf6' }}>🕐</div>
            <div className="lh-stat-content">
              <div className="lh-stat-value" style={{ fontSize: '0.75rem' }}>
                {stats.last_successful_login ? formatDate(stats.last_successful_login) : 'N/A'}
              </div>
              <div className="lh-stat-label">Last Successful Login</div>
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

        <div className="lh-filter-group">
          <label className="lh-filter-label">Status:</label>
          <select
            className="lh-filter-select"
            value={filter.successOnly}
            onChange={(e) => handleFilterChange('successOnly', e.target.value)}
          >
            <option value="">All Attempts</option>
            <option value="true">Successful Only</option>
            <option value="false">Failed Only</option>
          </select>
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
              <th>IP Address</th>
              <th>User Agent</th>
              <th>Status</th>
              <th>Failure Reason</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="7" className="lh-no-data">No login attempts found</td>
              </tr>
            ) : (
              history.map((entry) => (
                <tr key={entry.id} className={entry.success ? 'lh-row-success' : 'lh-row-failed'}>
                  <td className="lh-cell-time">{formatDate(entry.login_time)}</td>
                  <td className="lh-cell-username">{entry.username}</td>
                  <td className="lh-cell-role">
                    {entry.role && (
                      <span className={`lh-role-badge lh-role-${entry.role}`}>
                        {entry.role}
                      </span>
                    )}
                  </td>
                  <td className="lh-cell-ip">{entry.ip_address}</td>
                  <td className="lh-cell-ua" title={entry.user_agent}>
                    {entry.user_agent ? entry.user_agent.substring(0, 50) + '...' : 'N/A'}
                  </td>
                  <td className="lh-cell-status">
                    <span className={`lh-status-badge ${entry.success ? 'lh-status-success' : 'lh-status-failed'}`}>
                      {entry.success ? '✅ Success' : '❌ Failed'}
                    </span>
                  </td>
                  <td className="lh-cell-reason">{entry.failure_reason || '-'}</td>
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
