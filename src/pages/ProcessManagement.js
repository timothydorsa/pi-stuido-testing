import React from 'react';
import ProcessMonitor from '../components/ProcessMonitor';
import ProcessList from '../components/ProcessList';
import ProcessGauges from '../components/ProcessGauges';

const ProcessManagement = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Process Management</h1>
        <p>Monitor and manage system processes with real-time gauges</p>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card full-width">
          <ProcessGauges maxProcesses={16} />
        </div>
        
        <div className="dashboard-card">
          <ProcessMonitor />
        </div>
        
        <div className="dashboard-card full-width">
          <ProcessList />
        </div>
      </div>
    </div>
  );
};

export default ProcessManagement;
