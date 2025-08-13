import React from 'react';

const SystemMonitor = ({ data }) => {
  if (!data || !data.metrics) {
    return (
      <div className="system-monitor">
        <h3 className="card-title">System Monitor</h3>
        <div className="loading-state">
          <p>Loading system metrics...</p>
        </div>
      </div>
    );
  }

  const { cpu, memory } = data.metrics;
  
  // Calculate more accurate memory usage based on available memory
  const actualUsagePercent = memory.available 
    ? ((memory.total - memory.available) / memory.total) * 100
    : (memory.used / memory.total) * 100;
  
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
      <h3 className="card-title">System Monitor</h3>
      
      <div className="metric-row">
        <span className="metric-label">CPU Usage</span>
        <span className={`metric-value ${getValueClass(cpu.currentLoad)}`}>
          {cpu.currentLoad.toFixed(2)}%
        </span>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${Math.min(cpu.currentLoad, 100)}%` }}
        />
      </div>

      <div className="metric-row">
        <span className="metric-label">Memory Usage</span>
        <span className={`metric-value ${getValueClass(actualUsagePercent)}`}>
          {actualUsagePercent.toFixed(1)}%
        </span>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${Math.min(actualUsagePercent, 100)}%` }}
        />
      </div>

      <div className="metric-row">
        <span className="metric-label">Available Memory</span>
        <span className="metric-value" style={{ color: '#4CAF50' }}>
          {memory.available ? formatBytes(memory.available) : 'N/A'}
        </span>
      </div>

      <div className="metric-row">
        <span className="metric-label">Active Memory</span>
        <span className="metric-value">
          {memory.active ? formatBytes(memory.active) : formatBytes(memory.used)}
        </span>
      </div>

      <div className="metric-row">
        <span className="metric-label">Total Memory</span>
        <span className="metric-value">{formatBytes(memory.total)}</span>
      </div>

      {cpu.cpus && (
        <div className="metric-row">
          <span className="metric-label">CPU Cores</span>
          <span className="metric-value">{cpu.cpus.length}</span>
        </div>
      )}
    </div>
  );
};

export default SystemMonitor;
