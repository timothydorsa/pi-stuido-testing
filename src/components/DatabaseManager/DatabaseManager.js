import React, { useState, useEffect } from 'react';
import { apiRequest, apiUrl } from '../../utils/api';
import './DatabaseManager.scss';

const DatabaseManager = () => {
  const [stats, setStats] = useState(null);
  const [manufacturers, setManufacturers] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [coverage, setCoverage] = useState(null);
  const [newDevice, setNewDevice] = useState({
    oui: '',
    manufacturer: '',
    device_type: '',
    device_category: '',
    confidence: 80
  });

  useEffect(() => {
    loadDatabaseInfo();
  }, []);

  const loadDatabaseInfo = async () => {
    try {
      const [stats, manufacturers, deviceTypes, recentUpdates, coverage] = await Promise.all([
        apiRequest('database/stats'),
        apiRequest('database/manufacturers'),
        apiRequest('database/device-types'),
        apiRequest('database/updates'),
        apiRequest('database/coverage')
      ]);

      setStats(stats);
      setManufacturers(manufacturers);
      setDeviceTypes(deviceTypes);
      setRecentUpdates(recentUpdates);
      setCoverage(coverage);
      setLoading(false);
    } catch (error) {
      console.error('Error loading database info:', error);
      setLoading(false);
    }
  };

  const handleDatabaseUpdate = async (force = false) => {
    setIsUpdating(true);
    setUpdateStatus('Starting update...');

    try {
      const result = await apiRequest('database/update', {
        method: 'POST',
        body: JSON.stringify({ force })
      });

      setUpdateStatus(result.status === 'success' ? 'Update completed successfully!' : result.message);
      if (result.status === 'success') {
        await loadDatabaseInfo(); // Reload stats
      }
    } catch (error) {
      setUpdateStatus(`Update failed: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const results = await apiRequest(`database/search/manufacturer?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleAddDevice = async () => {
    try {
      const deviceResult = await apiRequest('database/devices', {
        method: 'POST',
        body: JSON.stringify(newDevice)
      });

      alert('Device added successfully!');
      setNewDevice({
        oui: '',
        manufacturer: '',
        device_type: '',
        device_category: '',
        confidence: 80
      });
      await loadDatabaseInfo();
    } catch (error) {
      alert(`Failed to add device: ${error.message}`);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/database/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'oui-database.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    }
  };

  const renderOverview = () => (
    <div className="overview-section">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Entries</h3>
          <div className="stat-value">{stats?.total_entries?.toLocaleString() || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Manufacturers</h3>
          <div className="stat-value">{stats?.unique_manufacturers || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Device Types</h3>
          <div className="stat-value">{stats?.device_types || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Last Updated</h3>
          <div className="stat-value">
            {stats?.last_updated ? new Date(stats.last_updated).toLocaleDateString() : 'Never'}
          </div>
        </div>
      </div>

      {coverage && (
        <div className="performance-section">
          <h3>🚀 Performance Optimization</h3>
          <div className="performance-grid">
            <div className="perf-card">
              <h4>Local Coverage</h4>
              <div className="perf-value">
                <span className={`percentage ${parseFloat(coverage.local_coverage_percentage) > 80 ? 'good' : 'warning'}`}>
                  {coverage.local_coverage_percentage}%
                </span>
                <small>Local database queries</small>
              </div>
            </div>
            <div className="perf-card">
              <h4>High Confidence</h4>
              <div className="perf-value">
                <span className={`percentage ${parseFloat(coverage.high_confidence_percentage) > 90 ? 'good' : 'warning'}`}>
                  {coverage.high_confidence_percentage}%
                </span>
                <small>Reliable identifications</small>
              </div>
            </div>
            <div className="perf-card">
              <h4>API Cached</h4>
              <div className="perf-value">
                <span className="count">{coverage.api_cached_entries?.toLocaleString()}</span>
                <small>Cached from APIs</small>
              </div>
            </div>
            <div className="perf-card">
              <h4>IEEE Registry</h4>
              <div className="perf-value">
                <span className="count">{coverage.ieee_entries?.toLocaleString()}</span>
                <small>Official entries</small>
              </div>
            </div>
          </div>
          
          {coverage.recommendedActions && coverage.recommendedActions.length > 0 && (
            <div className="recommendations">
              <h4>💡 Optimization Recommendations</h4>
              <ul>
                {coverage.recommendedActions.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="optimization-status">
            <div className={`status-badge ${coverage.performanceOptimized ? 'optimized' : 'needs-optimization'}`}>
              {coverage.performanceOptimized ? '✅ Optimized for Local Queries' : '⚠️ Consider Optimization'}
            </div>
            <p className="optimization-note">
              {coverage.performanceOptimized 
                ? 'Database is optimized for fast local lookups with minimal API dependencies.'
                : 'Database could benefit from local optimization to reduce API dependency.'
              }
            </p>
          </div>
        </div>
      )}

      <div className="update-section">
        <h3>Database Updates</h3>
        <div className="update-controls">
          <button 
            onClick={() => handleDatabaseUpdate(false)}
            disabled={isUpdating}
            className="update-btn primary"
          >
            {isUpdating ? 'Updating...' : 'Update from APIs'}
          </button>
          <button 
            onClick={() => handleDatabaseUpdate(true)}
            disabled={isUpdating}
            className="update-btn secondary"
          >
            Force Update
          </button>
        </div>
        {updateStatus && (
          <div className={`update-status ${isUpdating ? 'updating' : ''}`}>
            {updateStatus}
          </div>
        )}
      </div>

      <div className="recent-updates">
        <h3>Recent Updates</h3>
        <div className="updates-list">
          {recentUpdates.map((update, index) => (
            <div key={index} className="update-item">
              <div className="update-source">{update.api_source}</div>
              <div className="update-date">{new Date(update.last_update).toLocaleString()}</div>
              <div className="update-records">{update.records_updated} records</div>
              <div className={`update-status-badge ${update.status}`}>{update.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSearch = () => (
    <div className="search-section">
      <div className="search-controls">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search manufacturers..."
          className="search-input"
        />
        <button onClick={handleSearch} className="search-btn">Search</button>
      </div>

      <div className="search-results">
        {searchResults.map((result, index) => (
          <div key={index} className="result-item">
            <div className="result-oui">{result.oui}</div>
            <div className="result-manufacturer">{result.manufacturer}</div>
            <div className="result-type">{result.device_type}</div>
            <div className="result-category">{result.device_category}</div>
            <div className="result-confidence">{result.confidence}%</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderManage = () => (
    <div className="manage-section">
      <div className="add-device">
        <h3>Add Custom Device</h3>
        <div className="form-grid">
          <input
            type="text"
            placeholder="OUI (XX:XX:XX)"
            value={newDevice.oui}
            onChange={(e) => setNewDevice({...newDevice, oui: e.target.value})}
          />
          <input
            type="text"
            placeholder="Manufacturer"
            value={newDevice.manufacturer}
            onChange={(e) => setNewDevice({...newDevice, manufacturer: e.target.value})}
          />
          <select
            value={newDevice.device_type}
            onChange={(e) => setNewDevice({...newDevice, device_type: e.target.value})}
          >
            <option value="">Select Device Type</option>
            <option value="computer">Computer</option>
            <option value="mobile">Mobile</option>
            <option value="router">Router</option>
            <option value="printer">Printer</option>
            <option value="iot">IoT Device</option>
            <option value="server">Server</option>
            <option value="switch">Switch</option>
            <option value="accesspoint">Access Point</option>
          </select>
          <input
            type="text"
            placeholder="Device Category"
            value={newDevice.device_category}
            onChange={(e) => setNewDevice({...newDevice, device_category: e.target.value})}
          />
          <input
            type="number"
            placeholder="Confidence (0-100)"
            value={newDevice.confidence}
            onChange={(e) => setNewDevice({...newDevice, confidence: parseInt(e.target.value)})}
            min="0"
            max="100"
          />
          <button onClick={handleAddDevice} className="add-btn">Add Device</button>
        </div>
      </div>

      <div className="export-section">
        <h3>Export & Import</h3>
        <div className="export-controls">
          <button onClick={handleExport} className="export-btn">Export to CSV</button>
          <input type="file" accept=".csv" className="import-input" />
          <button className="import-btn">Import from CSV</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="database-manager">
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading database information...</p>
        </div>
      ) : (
        <>
          <div className="header">
            <h2>🗄️ Database Manager</h2>
            <p>Manage the OUI device intelligence database</p>
          </div>

          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
        <button 
          className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Search
        </button>
        <button 
          className={`tab ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          Manage
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'search' && renderSearch()}
        {activeTab === 'manage' && renderManage()}
      </div>
        </>
      )}
    </div>
  );
};

export default DatabaseManager;
