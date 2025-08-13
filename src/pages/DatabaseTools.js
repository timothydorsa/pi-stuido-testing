import React from 'react';
import DatabaseManager from '../components/DatabaseManager/DatabaseManager';

const DatabaseTools = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Database Tools</h1>
        <p>Database management and monitoring</p>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card full-width">
          <DatabaseManager />
        </div>
      </div>
    </div>
  );
};

export default DatabaseTools;
