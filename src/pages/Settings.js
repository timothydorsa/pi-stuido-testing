import React from 'react';
import ThemeToggle from '../components/ThemeToggle/ThemeToggle';
import SSHConnection from '../components/SSHConnection/SSHConnection';

const Settings = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Application settings and configuration</p>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Theme Settings</h3>
          <div style={{ padding: '20px' }}>
            <ThemeToggle />
          </div>
        </div>
        
        <div className="dashboard-card full-width">
          <SSHConnection />
        </div>
      </div>
    </div>
  );
};

export default Settings;
