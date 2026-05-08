import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import GroupSelector from './components/GroupSelector';
import MultiGroupDashboard from './components/MultiGroupDashboard';
import './App.css';

function App() {
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Multi-group state
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [allGroupsData, setAllGroupsData] = useState([]);
  const [multiGroupMode, setMultiGroupMode] = useState(false);

  // Fetch available groups
  const fetchGroups = async () => {
    try {
      const response = await axios.get('/api/groups');
      setGroups(response.data);

      if (response.data.length > 1) {
        setMultiGroupMode(true);
        setSelectedGroup(response.data[0].id);
      } else if (response.data.length === 1) {
        setMultiGroupMode(false);
        setSelectedGroup(response.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setMultiGroupMode(false);
    }
  };

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (showAllGroups && multiGroupMode) {
        // Fetch all groups data
        const response = await axios.get('/api/groups/all/usage');
        setAllGroupsData(response.data);
        setUsageData(null);
      } else if (selectedGroup && multiGroupMode) {
        // Fetch single group data
        const response = await axios.get(`/api/groups/${selectedGroup}/usage`);
        setUsageData(response.data);
        setAllGroupsData([]);
      } else {
        // Fallback to default endpoint (backward compatible)
        const response = await axios.get('/api/usage/summary');
        setUsageData(response.data);
        setAllGroupsData([]);
      }

      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch usage data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (groups.length > 0) {
      fetchUsageData();
      const interval = setInterval(fetchUsageData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [selectedGroup, showAllGroups, groups]);

  const handleRefresh = () => {
    fetchUsageData();
  };

  const handleTestNotification = async () => {
    try {
      await axios.post('/api/test-notification');
      alert('Test notification sent! Check your email.');
    } catch (err) {
      alert(`Failed to send test notification: ${err.message}`);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Heroku Usage Tracker</h1>
        <div className="header-actions">
          <button onClick={handleRefresh} className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
          <button onClick={handleTestNotification} className="btn btn-secondary">
            📧 Test Notification
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={fetchUsageData} className="retry-btn">Retry</button>
        </div>
      )}

      {lastUpdate && (
        <div className="last-update">
          Last updated: {lastUpdate.toLocaleString()}
        </div>
      )}

      {multiGroupMode && groups.length > 0 && (
        <GroupSelector
          groups={groups}
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
          showAllGroups={showAllGroups}
          onShowAllToggle={setShowAllGroups}
        />
      )}

      {loading && !usageData && !allGroupsData.length ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading usage data...</p>
        </div>
      ) : showAllGroups && allGroupsData.length > 0 ? (
        <MultiGroupDashboard groupsData={allGroupsData} />
      ) : usageData ? (
        <Dashboard data={usageData} />
      ) : null}
    </div>
  );
}

export default App;
