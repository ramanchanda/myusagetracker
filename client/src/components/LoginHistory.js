import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Info } from 'lucide-react';
import './LoginHistory.css';

function LoginHistory({ currentUser }) {
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

  // User management state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'viewer'
  });

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchData();
    if (currentUser && currentUser.role === 'admin') {
      fetchUsers();
    }
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

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // User Management Functions
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      showMessage('error', 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const openUserModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        username: user.username,
        password: '', // Don't populate password on edit
        fullName: user.full_name || '',
        email: user.email || '',
        role: user.role
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: '',
        password: '',
        fullName: '',
        email: '',
        role: 'viewer'
      });
    }
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    setUserForm({
      username: '',
      password: '',
      fullName: '',
      email: '',
      role: 'viewer'
    });
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingUser) {
        // Update existing user
        const updates = {
          fullName: userForm.fullName,
          email: userForm.email,
          role: userForm.role
        };

        // Only include password if it was changed
        if (userForm.password) {
          updates.password = userForm.password;
        }

        await axios.put(`/api/users/${editingUser.username}`, updates);
        showMessage('success', 'User updated successfully');
      } else {
        // Create new user
        if (!userForm.username || !userForm.password) {
          showMessage('error', 'Username and password are required');
          return;
        }

        await axios.post('/api/users', userForm);
        showMessage('success', 'User created successfully');
      }

      closeUserModal();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      showMessage('error', error.response?.data?.error || 'Failed to save user');
    }
  };

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/api/users/${username}`);
      showMessage('success', 'User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showMessage('error', error.response?.data?.error || 'Failed to delete user');
    }
  };

  const toggleUserStatus = async (username, currentStatus) => {
    try {
      await axios.put(`/api/users/${username}`, { isActive: !currentStatus });
      showMessage('success', `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      showMessage('error', 'Failed to update user status');
    }
  };

  // Password Change Functions
  const openPasswordModal = () => {
    setPasswordForm({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    // Validation
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showMessage('error', 'All fields are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showMessage('error', 'New password must be at least 6 characters');
      return;
    }

    try {
      setPasswordChanging(true);

      await axios.post('/api/users/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });

      showMessage('success', 'Password changed successfully');
      closePasswordModal();
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.error || 'Failed to change password';
      showMessage('error', errorMessage);
    } finally {
      setPasswordChanging(false);
    }
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
        <h2 className="lh-title">Security Management</h2>
        <p className="lh-subtitle">User management, account security, and login audit</p>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`lh-message lh-message-${message.type}`}>
          <span className="lh-message-icon">
            {message.type === 'success' && '✓'}
            {message.type === 'error' && '✗'}
            {message.type === 'warning' && '⚠'}
          </span>
          <span>{message.text}</span>
        </div>
      )}

      {/* User Management (Admin Only) */}
      {currentUser && currentUser.role === 'admin' && (
        <div className="lh-section">
          <div className="lh-section-header">
            <div>
              <h3 className="lh-section-title">User Management</h3>
              <p className="lh-section-desc">Create and manage application users</p>
            </div>
            <button
              onClick={() => openUserModal()}
              className="lh-btn lh-btn-primary"
            >
              + Add User
            </button>
          </div>

          {usersLoading ? (
            <div className="lh-loading">Loading users...</div>
          ) : (
            <div className="lh-users-table-wrap">
              <table className="lh-users-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                        No users created yet. Click "Add User" to create your first user.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.username}>
                        <td><strong>{user.username}</strong></td>
                        <td>{user.full_name || '—'}</td>
                        <td>{user.email || '—'}</td>
                        <td>
                          <span className={`lh-role-badge lh-role-${user.role}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <span className={`lh-status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td>
                          <div className="lh-user-actions">
                            <button
                              onClick={() => openUserModal(user)}
                              className="lh-btn-icon"
                              title="Edit user"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => toggleUserStatus(user.username, user.is_active)}
                              className="lh-btn-icon"
                              title={user.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {user.is_active ? '🔓' : '🔒'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.username)}
                              className="lh-btn-icon lh-btn-danger"
                              title="Delete user"
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="lh-info-box" style={{ marginTop: '1rem' }}>
            <Info size={16} />
            <div>
              <strong>Note:</strong> Admin user (from config vars) is not shown here.
              Viewer role = read-only access. Editor role = can configure notifications/licenses.
            </div>
          </div>
        </div>
      )}

      {/* Account Security (Non-Admin Users) */}
      {currentUser && currentUser.role !== 'admin' && (
        <div className="lh-section">
          <div className="lh-section-header">
            <div>
              <h3 className="lh-section-title">Account Security</h3>
              <p className="lh-section-desc">Manage your password and account settings</p>
            </div>
            <button
              onClick={openPasswordModal}
              className="lh-btn lh-btn-primary"
            >
              Change Password
            </button>
          </div>

          <div className="lh-info-box">
            <Info size={16} />
            <div>
              <strong>Password Policy:</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem' }}>
                <li>You can change your password if you remember your current password</li>
                <li>Minimum password length: 6 characters</li>
                <li>If you forget your password, contact the administrator to reset it</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Login History Section */}
      <div className="lh-section">
        <div className="lh-section-header">
          <div>
            <h3 className="lh-section-title">Login History & Audit</h3>
            <p className="lh-section-desc">Track successful logins and monitor account security</p>
          </div>
        </div>

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

      {/* User Modal */}
      {showUserModal && (
        <div className="lh-modal-overlay" onClick={closeUserModal}>
          <div className="lh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lh-modal-header">
              <h3>{editingUser ? 'Edit User' : 'Create New User'}</h3>
              <button onClick={closeUserModal} className="lh-modal-close">&times;</button>
            </div>

            <form onSubmit={handleUserSubmit} className="lh-modal-body">
              <div className="lh-form-group">
                <label htmlFor="username">Username *</label>
                <input
                  id="username"
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  disabled={editingUser !== null}
                  required
                  className="lh-input"
                  placeholder="johndoe"
                />
                {editingUser && (
                  <small style={{ color: '#666' }}>Username cannot be changed</small>
                )}
              </div>

              <div className="lh-form-group">
                <label htmlFor="password">
                  Password {editingUser ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  id="password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required={!editingUser}
                  className="lh-input"
                  placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password'}
                />
              </div>

              <div className="lh-form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  className="lh-input"
                  placeholder="John Doe"
                />
              </div>

              <div className="lh-form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="lh-input"
                  placeholder="john@example.com"
                />
              </div>

              <div className="lh-form-group">
                <label htmlFor="role">Role *</label>
                <select
                  id="role"
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  required
                  className="lh-input"
                >
                  <option value="viewer">Viewer (Read-only)</option>
                  <option value="editor">Editor (Can configure)</option>
                </select>
                <small style={{ color: '#666', marginTop: '0.25rem', display: 'block' }}>
                  Viewer: Read-only dashboard access<br/>
                  Editor: Can configure notifications, licenses, and schedules
                </small>
              </div>

              <div className="lh-modal-footer">
                <button type="button" onClick={closeUserModal} className="lh-btn lh-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="lh-btn lh-btn-primary">
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="lh-modal-overlay" onClick={closePasswordModal}>
          <div className="lh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lh-modal-header">
              <h3>Change Password</h3>
              <button onClick={closePasswordModal} className="lh-modal-close">&times;</button>
            </div>

            <form onSubmit={handlePasswordChange} className="lh-modal-body">
              <div className="lh-info-box" style={{ marginBottom: '1.5rem' }}>
                <Info size={16} />
                <div>
                  <strong>Note:</strong> You need your current password to change it.
                  If you've forgotten your current password, please contact the administrator.
                </div>
              </div>

              <div className="lh-form-group">
                <label htmlFor="oldPassword">Current Password *</label>
                <input
                  id="oldPassword"
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                  required
                  className="lh-input"
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
              </div>

              <div className="lh-form-group">
                <label htmlFor="newPassword">New Password *</label>
                <input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength="6"
                  className="lh-input"
                  placeholder="Enter new password (min. 6 characters)"
                  autoComplete="new-password"
                />
              </div>

              <div className="lh-form-group">
                <label htmlFor="confirmPassword">Confirm New Password *</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  minLength="6"
                  className="lh-input"
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                />
              </div>

              <div className="lh-modal-footer">
                <button type="button" onClick={closePasswordModal} className="lh-btn lh-btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="lh-btn lh-btn-primary"
                  disabled={passwordChanging}
                >
                  {passwordChanging ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginHistory;
