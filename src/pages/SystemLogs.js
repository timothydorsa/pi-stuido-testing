import React from 'react';
import SystemLogMonitor from '../components/SystemLogMonitor';

const SystemLogs = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>System Logs</h1>
        <p>Monitor system logs and events</p>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card full-width">
          <SystemLogMonitor />
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;
