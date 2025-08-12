import React, { useState, useEffect } from 'react';
import SystemMonitor from './components/SystemMonitor';
import ServiceHealth from './components/ServiceHealth';
import HeapMonitor from './components/HeapMonitor';
import ProcessList from './components/ProcessList';
import ApiClient from './components/ApiClient';
import SSHConnection from './components/SSHConnection/SSHConnection';
import ThemeToggle from './components/ThemeToggle';
import './App.css';

const App = () => {
  const [systemData, setSystemData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [previewWindowOpen, setPreviewWindowOpen] = useState(false);

  useEffect(() => {
    // Check if electron API is available
    if (window.electronAPI) {
      setIsConnected(true);
      
      // Load initial system information
      loadSystemInfo();
      
      // Set up real-time system updates
      window.electronAPI.onSystemUpdate((data) => {
        setSystemData(data);
        
        // Send data to preview window if open
        if (previewWindowOpen) {
          window.electronAPI.sendToPreview({
            type: 'metrics',
            cpu: data.metrics.cpuLoad.currentLoad,
            memory: data.metrics.memInfo.used,
            services: data.serviceHealth.length,
            timestamp: data.timestamp
          });
        }
      });
    } else {
      // For development/testing purposes, set connected to true
      // Components will use their mock data
      console.log('Electron API not available, using mock data for components');
      setIsConnected(true);
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('system-update');
      }
    };
  }, [previewWindowOpen]);

  const loadSystemInfo = async () => {
    try {
      if (window.electronAPI) {
        const info = await window.electronAPI.getSystemInfo();
        console.log('System Info:', info);
      }
    } catch (error) {
      console.error('Error loading system info:', error);
    }
  };

  const openPreviewWindow = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.openPreviewWindow();
        setPreviewWindowOpen(true);
      }
    } catch (error) {
      console.error('Error opening preview window:', error);
    }
  };

  const refreshData = async () => {
    try {
      if (window.electronAPI) {
        const [metrics, heapInfo, serviceHealth] = await Promise.all([
          window.electronAPI.getSystemMetrics(),
          window.electronAPI.getHeapInfo(),
          window.electronAPI.getServiceHealth()
        ]);
        
        setSystemData({
          metrics,
          heapInfo,
          serviceHealth,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="app">
        <div className="error-message">
          <h2>Loading Dashboard...</h2>
          <p>Initializing system monitoring components.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>System Monitor Dashboard</h1>
        <div className="header-controls">
          <button onClick={refreshData} className="btn btn-primary">
            Refresh Data
          </button>
          <button onClick={openPreviewWindow} className="btn btn-secondary">
            Open Preview Window
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <SystemMonitor data={systemData?.metrics} />
          </div>
          
          <div className="dashboard-card">
            <ServiceHealth services={systemData?.serviceHealth || []} />
          </div>
          
          <div className="dashboard-card">
            <HeapMonitor heapInfo={systemData?.heapInfo} />
          </div>
          
          <div className="dashboard-card">
            <ProcessList />
          </div>
          
          <div className="dashboard-card full-width">
            <ApiClient />
          </div>
          
          <div className="dashboard-card full-width">
            <SSHConnection />
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <div className="status-indicator">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span>
            {isConnected ? 'Connected to Electron' : 'Disconnected'}
            {systemData && ` • Last update: ${new Date(systemData.timestamp).toLocaleTimeString()}`}
          </span>
        </div>
        <ThemeToggle />
      </footer>
    </div>
  );
};

export default App;
