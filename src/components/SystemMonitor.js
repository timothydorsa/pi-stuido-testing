import React from 'react';

const SystemMonitor = ({ data }) => {
  // Mock data for testing when Electron API is not available
  const mockData = {
    cpuLoad: {
      currentLoad: 45.5,
      cpus: [1, 2, 3, 4] // 4 cores
    },
    memInfo: {
      total: 16 * 1024 * 1024 * 1024, // 16GB
      used: 8 * 1024 * 1024 * 1024,   // 8GB
      free: 8 * 1024 * 1024 * 1024    // 8GB
    }
  };

  const displayData = data || mockData;
  const isLoading = !data;

  if (isLoading) {
    console.log('SystemMonitor: No system data provided, using mock data for display');
  }

  const { cpuLoad, memInfo } = displayData;
  const memoryUsagePercent = (memInfo.used / memInfo.total) * 100;

  const formatBytes = (bytes) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const getValueClass = (percent) => {
    if (percent > 80) return 'error';
    if (percent > 60) return 'warning';
    return '';
  };

  return (
    <div>
      <h3 className="card-title">
        System Monitor
        {isLoading && <span style={{ fontSize: '0.8em', color: '#ffaa00' }}> (Demo Data)</span>}
      </h3>
      
      <div className="metric-row">
        <span className="metric-label">CPU Usage</span>
        <span className={`metric-value ${getValueClass(cpuLoad.currentLoad)}`}>
          {cpuLoad.currentLoad.toFixed(2)}%
        </span>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${Math.min(cpuLoad.currentLoad, 100)}%` }}
        />
      </div>

      <div className="metric-row">
        <span className="metric-label">Memory Usage</span>
        <span className={`metric-value ${getValueClass(memoryUsagePercent)}`}>
          {memoryUsagePercent.toFixed(2)}%
        </span>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${Math.min(memoryUsagePercent, 100)}%` }}
        />
      </div>

      <div className="metric-row">
        <span className="metric-label">Memory Used</span>
        <span className="metric-value">{formatBytes(memInfo.used)}</span>
      </div>

      <div className="metric-row">
        <span className="metric-label">Memory Total</span>
        <span className="metric-value">{formatBytes(memInfo.total)}</span>
      </div>

      <div className="metric-row">
        <span className="metric-label">Memory Free</span>
        <span className="metric-value">{formatBytes(memInfo.free)}</span>
      </div>

      {cpuLoad.cpus && (
        <div className="metric-row">
          <span className="metric-label">CPU Cores</span>
          <span className="metric-value">{cpuLoad.cpus.length}</span>
        </div>
      )}
    </div>
  );
};

export default SystemMonitor;
