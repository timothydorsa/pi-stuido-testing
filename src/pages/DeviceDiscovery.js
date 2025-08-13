import React from 'react';
import NetworkScanner from '../components/NetworkScanner/NetworkScanner';

const DeviceDiscovery = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Device Discovery</h1>
        <p>Network scanning and device intelligence</p>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card full-width">
          <NetworkScanner />
        </div>
      </div>
    </div>
  );
};

export default DeviceDiscovery;
