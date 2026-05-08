import React from 'react';
import './GroupSelector.css';

function GroupSelector({ groups, selectedGroup, onGroupChange, showAllGroups, onShowAllToggle }) {
  const getGroupIcon = (type) => {
    switch (type) {
      case 'personal':
        return '👤';
      case 'team':
        return '👥';
      case 'enterprise':
        return '🏢';
      default:
        return '📊';
    }
  };

  const getGroupTypeLabel = (type) => {
    switch (type) {
      case 'personal':
        return 'Personal';
      case 'team':
        return 'Team';
      case 'enterprise':
        return 'Enterprise';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="group-selector">
      <div className="selector-header">
        <h3>📊 Dashboard View</h3>
      </div>

      <div className="view-toggle">
        <button
          className={!showAllGroups ? 'active' : ''}
          onClick={() => onShowAllToggle(false)}
        >
          Single Group
        </button>
        <button
          className={showAllGroups ? 'active' : ''}
          onClick={() => onShowAllToggle(true)}
        >
          All Groups
        </button>
      </div>

      {!showAllGroups && (
        <div className="group-dropdown">
          <label htmlFor="group-select">Select Group:</label>
          <select
            id="group-select"
            value={selectedGroup}
            onChange={(e) => onGroupChange(e.target.value)}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {getGroupIcon(group.type)} {group.name} ({getGroupTypeLabel(group.type)})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="groups-summary">
        <div className="summary-item">
          <span className="summary-label">Total Groups:</span>
          <span className="summary-value">{groups.length}</span>
        </div>
        <div className="summary-breakdown">
          {groups.filter(g => g.type === 'personal').length > 0 && (
            <span className="type-badge personal">
              👤 {groups.filter(g => g.type === 'personal').length} Personal
            </span>
          )}
          {groups.filter(g => g.type === 'team').length > 0 && (
            <span className="type-badge team">
              👥 {groups.filter(g => g.type === 'team').length} Team
            </span>
          )}
          {groups.filter(g => g.type === 'enterprise').length > 0 && (
            <span className="type-badge enterprise">
              🏢 {groups.filter(g => g.type === 'enterprise').length} Enterprise
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default GroupSelector;
