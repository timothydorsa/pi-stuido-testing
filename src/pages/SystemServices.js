import React from 'react';
import ServiceHealth from '../components/ServiceHealth';
import ServicesManager from '../components/ServicesManager/ServicesManager';
import BackendControl from '../components/BackendControl/BackendControl';

const SystemServices = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>System Services</h1>
        <p>Service management and health monitoring</p>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <ServiceHealth />
        </div>
        
        <div className="dashboard-card full-width">
          <ServicesManager />
        </div>
        
        <div className="dashboard-card full-width">
          <BackendControl />
        </div>
      </div>
    </div>
  );
};

export default SystemServices;
