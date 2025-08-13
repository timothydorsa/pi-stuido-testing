import React from 'react';
import NetworkMonitor from '../components/NetworkMonitor';
import NetworkScanner from '../components/NetworkScanner';

const NetworkAnalytics = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Network Analytics</h1>
        <p>Monitor network traffic, connections, and scan for devices</p>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <NetworkMonitor />
        </div>
        
        <div className="dashboard-card full-width">
          <NetworkScanner />
        </div>
      </div>
    </div>
  );
};

export default NetworkAnalytics;
