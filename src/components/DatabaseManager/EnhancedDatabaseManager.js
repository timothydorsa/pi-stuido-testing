import React, { useState, useEffect } from 'react';
import './DatabaseManager.scss';

const DatabaseManager = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    sortBy: '',
    sortOrder: 'asc',
    filter: '',
    filterColumn: ''
  });
  const [editingRow, setEditingRow] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchDatabaseStats();
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
    }
  }, [selectedTable, pagination.page, pagination.limit, filters]);

  const fetchDatabaseStats = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/database/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching database stats:', error);
    }
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8001/api/database/tables');
      const data = await response.json();
      setTables(data.tables || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tables:', error);
      setLoading(false);
    }
  };

  const fetchTableData = async () => {
    if (!selectedTable) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
        ...(filters.filter && { filter: filters.filter }),
        ...(filters.filterColumn && { filterColumn: filters.filterColumn })
      });

      const response = await fetch(`http://localhost:8001/api/database/data/${selectedTable.name}?${params}`);
      const data = await response.json();
      
      setTableData(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0
      }));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching table data:', error);
      setLoading(false);
    }
  };

  const handleSort = (columnName) => {
    const newSortOrder = filters.sortBy === columnName && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters(prev => ({
      ...prev,
      sortBy: columnName,
      sortOrder: newSortOrder
    }));
  };

  const handleFilter = (columnName, value) => {
    setFilters(prev => ({
      ...prev,
      filter: value,
      filterColumn: columnName
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleEdit = (row) => {
    setEditingRow(row);
    setEditFormData({ ...row });
  };

  const handleSave = async () => {
    try {
      const primaryKey = selectedTable.columns.find(col => col.primaryKey);
      if (!primaryKey) {
        alert('Cannot edit: Table has no primary key');
        return;
      }

      const id = editFormData[primaryKey.name];
      const response = await fetch(`http://localhost:8001/api/database/data/${selectedTable.name}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });

      const result = await response.json();
      if (result.success) {
        setEditingRow(null);
        setEditFormData({});
        fetchTableData();
      } else {
        alert('Error updating record: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Error saving record');
    }
  };

  const handleDelete = async (row) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const primaryKey = selectedTable.columns.find(col => col.primaryKey);
      if (!primaryKey) {
        alert('Cannot delete: Table has no primary key');
        return;
      }

      const id = row[primaryKey.name];
      const response = await fetch(`http://localhost:8001/api/database/data/${selectedTable.name}/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        fetchTableData();
      } else {
        alert('Error deleting record: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error deleting record');
    }
  };

  const handleAdd = async () => {
    try {
      const response = await fetch(`http://localhost:8001/api/database/data/${selectedTable.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addFormData)
      });

      const result = await response.json();
      if (result.success) {
        setShowAddForm(false);
        setAddFormData({});
        fetchTableData();
      } else {
        alert('Error adding record: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding record:', error);
      alert('Error adding record');
    }
  };

  const handleSearch = async () => {
    if (!searchTerm) return;

    try {
      const response = await fetch(`http://localhost:8001/api/database/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Error searching database:', error);
    }
  };

  const renderStats = () => (
    <div className="database-stats">
      <h3>Database Statistics</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Status:</span>
          <span className={`stat-value ${stats.status}`}>{stats.status || 'Unknown'}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Type:</span>
          <span className="stat-value">{stats.type || 'N/A'}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Entries:</span>
          <span className="stat-value">{stats.total_entries || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Manufacturers:</span>
          <span className="stat-value">{stats.unique_manufacturers || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Last Updated:</span>
          <span className="stat-value">{stats.last_updated || 'Never'}</span>
        </div>
      </div>
    </div>
  );

  const renderTableSelector = () => (
    <div className="table-selector">
      <h3>Database Tables ({tables.length})</h3>
      <div className="tables-list">
        {tables.map(table => (
          <div
            key={table.name}
            className={`table-item ${selectedTable?.name === table.name ? 'selected' : ''}`}
            onClick={() => setSelectedTable(table)}
          >
            <div className="table-name">{table.name}</div>
            <div className="table-info">
              <span className="row-count">{table.rowCount} rows</span>
              <span className="column-count">{table.columns.length} columns</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="filters-bar">
      <div className="search-section">
        <input
          type="text"
          placeholder="Global search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch}>Search</button>
      </div>
      
      {selectedTable && (
        <div className="table-filters">
          <select
            value={filters.filterColumn}
            onChange={(e) => setFilters(prev => ({ ...prev, filterColumn: e.target.value }))}
          >
            <option value="">Filter by column...</option>
            {selectedTable.columns.map(col => (
              <option key={col.name} value={col.name}>{col.name}</option>
            ))}
          </select>
          
          <input
            type="text"
            placeholder="Filter value..."
            value={filters.filter}
            onChange={(e) => handleFilter(filters.filterColumn, e.target.value)}
          />
          
          <button
            onClick={() => setFilters({ sortBy: '', sortOrder: 'asc', filter: '', filterColumn: '' })}
          >
            Clear Filters
          </button>
          
          <button onClick={() => setShowAddForm(true)}>Add Record</button>
        </div>
      )}
    </div>
  );

  const renderTableData = () => {
    if (!selectedTable || !tableData.length) {
      return <div className="no-data">No data available</div>;
    }

    return (
      <div className="table-data">
        <div className="table-controls">
          <div className="pagination-info">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} records
          </div>
          
          <div className="pagination-controls">
            <button
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Previous
            </button>
            
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {selectedTable.columns.map(column => (
                  <th
                    key={column.name}
                    onClick={() => handleSort(column.name)}
                    className={filters.sortBy === column.name ? `sorted-${filters.sortOrder}` : ''}
                  >
                    {column.name}
                    {column.primaryKey && <span className="pk-indicator">PK</span>}
                    {filters.sortBy === column.name && (
                      <span className="sort-indicator">
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                ))}
                <th className="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={index}>
                  {selectedTable.columns.map(column => (
                    <td key={column.name}>
                      {editingRow === row ? (
                        <input
                          type="text"
                          value={editFormData[column.name] || ''}
                          onChange={(e) => setEditFormData(prev => ({
                            ...prev,
                            [column.name]: e.target.value
                          }))}
                          disabled={column.primaryKey}
                        />
                      ) : (
                        <span className={`cell-value ${column.type.toLowerCase()}`}>
                          {row[column.name] !== null ? String(row[column.name]) : 'NULL'}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="actions-cell">
                    {editingRow === row ? (
                      <>
                        <button onClick={handleSave} className="save-btn">Save</button>
                        <button onClick={() => setEditingRow(null)} className="cancel-btn">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(row)} className="edit-btn">Edit</button>
                        <button onClick={() => handleDelete(row)} className="delete-btn">Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAddForm = () => {
    if (!showAddForm) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>Add New Record to {selectedTable.name}</h3>
          <div className="form-grid">
            {selectedTable.columns
              .filter(col => !col.primaryKey) // Don't show primary key fields for auto-increment
              .map(column => (
                <div key={column.name} className="form-field">
                  <label>{column.name} ({column.type})</label>
                  <input
                    type="text"
                    value={addFormData[column.name] || ''}
                    onChange={(e) => setAddFormData(prev => ({
                      ...prev,
                      [column.name]: e.target.value
                    }))}
                    placeholder={column.notNull ? 'Required' : 'Optional'}
                    required={column.notNull}
                  />
                </div>
              ))}
          </div>
          <div className="form-actions">
            <button onClick={handleAdd} className="save-btn">Add Record</button>
            <button onClick={() => setShowAddForm(false)} className="cancel-btn">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  const renderSearchResults = () => {
    if (!searchResults.length) return null;

    return (
      <div className="search-results">
        <h3>Search Results ({searchResults.length})</h3>
        <div className="results-list">
          {searchResults.map((result, index) => (
            <div key={index} className="result-item">
              <div className="result-table">Table: {result.source_table}</div>
              <div className="result-data">
                {Object.entries(result)
                  .filter(([key]) => key !== 'source_table')
                  .map(([key, value]) => (
                    <span key={key} className="result-field">
                      <strong>{key}:</strong> {value}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading && !selectedTable) {
    return (
      <div className="database-manager loading">
        <div className="loading-spinner">Loading database information...</div>
      </div>
    );
  }

  return (
    <div className="database-manager">
      <div className="database-header">
        <h2>Database Manager</h2>
        {renderStats()}
      </div>

      {renderFilters()}

      <div className="database-content">
        <div className="sidebar">
          {renderTableSelector()}
        </div>

        <div className="main-content">
          {searchResults.length > 0 ? (
            renderSearchResults()
          ) : selectedTable ? (
            <>
              <h3>
                {selectedTable.name} 
                <span className="table-meta">({selectedTable.rowCount} records)</span>
              </h3>
              {loading ? (
                <div className="loading-spinner">Loading table data...</div>
              ) : (
                renderTableData()
              )}
            </>
          ) : (
            <div className="no-selection">
              <h3>Select a table to view its data</h3>
              <p>Choose a table from the sidebar to explore its contents, or use the global search to find specific data.</p>
            </div>
          )}
        </div>
      </div>

      {renderAddForm()}
    </div>
  );
};

export default DatabaseManager;
