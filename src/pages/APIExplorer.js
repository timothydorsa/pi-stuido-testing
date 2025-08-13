import React from 'react';
import ApiClient from '../components/APIClient/ApiClient';

const APIExplorer = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>API Explorer</h1>
        <p>Test and explore APIs</p>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card full-width">
          <ApiClient />
        </div>
      </div>
    </div>
  );
};

export default APIExplorer;
