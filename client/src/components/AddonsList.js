import React, { useState } from 'react';
import './AddonsList.css';

function AddonsList({ addons }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const filteredAddons = addons
    .filter(addon =>
      addon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addon.appName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addon.addonService.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'app') return a.appName.localeCompare(b.appName);
      if (sortBy === 'cost') return (b.price?.cents || 0) - (a.price?.cents || 0);
      return 0;
    });

  const formatPrice = (price) => {
    if (!price || price.cents === 0) return 'Free';
    return `$${(price.cents / 100).toFixed(2)}/mo`;
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'provisioned': return '#28a745';
      case 'provisioning': return '#ffc107';
      case 'deprovisioned': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div className="addons-list card">
      <div className="addons-header">
        <h2>🔌 Add-ons ({addons.length})</h2>
        <div className="addons-controls">
          <input
            type="text"
            placeholder="Search add-ons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="name">Sort by Name</option>
            <option value="app">Sort by App</option>
            <option value="cost">Sort by Cost</option>
          </select>
        </div>
      </div>

      <div className="addons-table-container">
        {filteredAddons.length === 0 ? (
          <div className="no-results">
            {searchTerm ? 'No add-ons match your search.' : 'No add-ons found.'}
          </div>
        ) : (
          <table className="addons-table">
            <thead>
              <tr>
                <th>Add-on Name</th>
                <th>App</th>
                <th>Service</th>
                <th>Plan</th>
                <th>Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAddons.map((addon, index) => (
                <tr key={index}>
                  <td className="addon-name">{addon.name}</td>
                  <td>{addon.appName}</td>
                  <td>{addon.addonService}</td>
                  <td className="plan-name">{addon.plan.split(':')[1] || addon.plan}</td>
                  <td className="cost">{formatPrice(addon.price)}</td>
                  <td>
                    <span
                      className="state-badge"
                      style={{ backgroundColor: getStateColor(addon.state) }}
                    >
                      {addon.state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AddonsList;
