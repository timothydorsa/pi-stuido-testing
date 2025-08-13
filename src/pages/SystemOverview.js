import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import ProcessList from '../components/ProcessList';
import ServiceHealth from '../components/ServiceHealth';
import SystemMonitor from '../components/SystemMonitor';
import ProcessGauges from '../components/ProcessGauges';
import '../styles/SystemOverview.scss';
import CPUCoreMonitor from '../components/CPUCoreMonitor';
import NetworkMonitor from '../components/NetworkMonitor';
import DiskIOMonitor from '../components/DiskIOMonitor';
import ProcessMonitor from '../components/ProcessMonitor';
import HeapMonitor from '../components/HeapMonitor';
import SystemLogMonitor from '../components/SystemLogMonitor';

const SystemOverview = () => {
  const [systemData, setSystemData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadSystemInfo();
    
    // Set up polling for real-time updates
    const interval = setInterval(loadSystemInfo, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const loadSystemInfo = async (retryCount = 0) => {
    try {
      const data = await apiRequest('metrics');
      setSystemData(data);
      setIsConnected(true);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch system data:', error);
      setIsConnected(false);
      
      // Retry logic with exponential backoff
      if (retryCount < 3) {
        setTimeout(() => loadSystemInfo(retryCount + 1), 2000 * (retryCount + 1));
      }
      
      // Retry logic for network errors
      if (retryCount < 3) {
        console.log(`Retrying API call in ${2 * (retryCount + 1)} seconds... (attempt ${retryCount + 1}/3)`);
        setTimeout(() => loadSystemInfo(retryCount + 1), 2000 * (retryCount + 1));
      }
    }
  };

  const refreshData = () => {
    loadSystemInfo();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h1>System Overview</h1>
          <p>Real-time system monitoring and performance analytics</p>
        </div>
        <div className="header-actions">
          <div className="status-indicator">
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
            <span className="status-text">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {lastUpdate && (
            <span className="last-update">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button onClick={refreshData} className="btn btn-primary">
            🔄 Refresh
          </button>
        </div>
      </div>

      {!systemData ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading system metrics...</p>
        </div>
      ) : (
        <div className="grafana-dashboard">
          {/* Top row - Key metrics */}
          <div className="dashboard-row">
            <div className="dashboard-panel panel-half">
              <SystemMonitor data={{ metrics: systemData }} />
            </div>
            <div className="dashboard-panel panel-half">
              <CPUCoreMonitor data={{ metrics: systemData }} />
            </div>
          </div>

          {/* Second row - Network and Storage */}
          <div className="dashboard-row">
            <div className="dashboard-panel panel-third">
              <NetworkMonitor data={{ metrics: systemData }} />
            </div>
            <div className="dashboard-panel panel-third">
              <DiskIOMonitor data={{ metrics: systemData }} />
            </div>
            <div className="dashboard-panel panel-third">
              <HeapMonitor heapInfo={systemData.nodeHeap} />
            </div>
          </div>

          {/* Third row - Process Gauges */}
          <div className="dashboard-row">
            <div className="dashboard-panel full-width">
              <ProcessGauges wsData={null} maxProcesses={8} />
            </div>
          </div>

          {/* Fourth row - Processes and Logs */}
          <div className="dashboard-row">
            <div className="dashboard-panel panel-half">
              <ProcessMonitor data={{ metrics: systemData }} />
            </div>
            <div className="dashboard-panel panel-half">
              <SystemLogMonitor data={{ metrics: systemData }} />
            </div>
          </div>

          {/* System summary cards */}
          <div className="dashboard-row">
            <div className="summary-cards">
              <div className="summary-card">
                <div className="card-icon">🔥</div>
                <div className="card-content">
                  <div className="card-value">{systemData.cpu?.currentLoad?.toFixed(1)}%</div>
                  <div className="card-label">CPU Usage</div>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="card-icon">🧠</div>
                <div className="card-content">
                  <div className="card-value">
                    {((systemData.memory?.total - systemData.memory?.available) / systemData.memory?.total * 100).toFixed(1)}%
                  </div>
                  <div className="card-label">Memory Usage</div>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="card-icon">🌐</div>
                <div className="card-content">
                  <div className="card-value">{systemData.network?.length || 0}</div>
                  <div className="card-label">Network Interfaces</div>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="card-icon">⚙️</div>
                <div className="card-content">
                  <div className="card-value">{systemData.processes?.total || 0}</div>
                  <div className="card-label">Total Processes</div>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="card-icon">💾</div>
                <div className="card-content">
                  <div className="card-value">{(systemData.disk?.rIO_sec + systemData.disk?.wIO_sec).toFixed(0)}</div>
                  <div className="card-label">Disk I/O/sec</div>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="card-icon">📊</div>
                <div className="card-content">
                  <div className="card-value">{((systemData.nodeHeap?.heapUsed / systemData.nodeHeap?.heapTotal) * 100).toFixed(1)}%</div>
                  <div className="card-label">Node Heap</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemOverview;
