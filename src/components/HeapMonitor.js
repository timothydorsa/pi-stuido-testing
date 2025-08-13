import React from 'react';

const HeapMonitor = ({ heapInfo }) => {
  if (!heapInfo) {
    return (
      <div className="heap-monitor">
        <h3 className="card-title">Heap Monitor</h3>
        <div className="loading-state">
          <p>Loading heap information...</p>
        </div>
      </div>
    );
  }

  const formatBytes = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const heapUsagePercent = (heapInfo.heapUsed / heapInfo.heapTotal) * 100;

  const getValueClass = (percent) => {
    if (percent > 85) return 'error';
    if (percent > 70) return 'warning';
    return '';
  };

  return (
    <div>
      <h3 className="card-title">Heap Monitor</h3>      <div className="metric-row">
        <span className="metric-label">Heap Usage</span>
        <span className={`metric-value ${getValueClass(heapUsagePercent)}`}>
          {heapUsagePercent.toFixed(2)}%
        </span>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${Math.min(heapUsagePercent, 100)}%` }}
        />
      </div>

      <div className="metric-row">
        <span className="metric-label">Heap Used</span>
        <span className="metric-value">{formatBytes(heapInfo.heapUsed)}</span>
      </div>

      <div className="metric-row">
        <span className="metric-label">Heap Total</span>
        <span className="metric-value">{formatBytes(heapInfo.heapTotal)}</span>
      </div>

      <div className="metric-row">
        <span className="metric-label">External Memory</span>
        <span className="metric-value">{formatBytes(heapInfo.external)}</span>
      </div>

      <div className="metric-row">
        <span className="metric-label">RSS (Resident Set Size)</span>
        <span className="metric-value">{formatBytes(heapInfo.rss)}</span>
      </div>

      <div className="metric-row">
        <span className="metric-label">Heap Free</span>
        <span className="metric-value">
          {formatBytes(heapInfo.heapTotal - heapInfo.heapUsed)}
        </span>
      </div>
    </div>
  );
};

export default HeapMonitor;
