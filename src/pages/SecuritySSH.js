import React from 'react';
import SSHConnection from '../components/SSHConnection/SSHConnection';

const SecuritySSH = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Security & SSH</h1>
        <p>Remote access and authentication management</p>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card full-width">
          <SSHConnection />
        </div>
      </div>
    </div>
  );
};

export default SecuritySSH;
