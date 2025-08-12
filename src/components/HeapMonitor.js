import React from 'react';

const HeapMonitor = ({ heapInfo }) => {
  // Provide mock data if heapInfo is not available for testing
  const mockHeapInfo = {
    heapUsed: 50 * 1024 * 1024, // 50MB
    heapTotal: 100 * 1024 * 1024, // 100MB
    external: 10 * 1024 * 1024, // 10MB
    rss: 120 * 1024 * 1024 // 120MB
  };

  const displayHeapInfo = heapInfo || mockHeapInfo;
  const isLoading = !heapInfo;

  if (isLoading) {
    console.log('HeapMonitor: No heap data provided, using mock data for display');
  }

  const formatBytes = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const heapUsagePercent = (displayHeapInfo.heapUsed / displayHeapInfo.heapTotal) * 100;

  const getValueClass = (percent) => {
    if (percent > 85) return 'error';
    if (percent > 70) return 'warning';
    return '';
  };

  return (
    <div>
      <h3 className="card-title">
        Heap Monitor 
        {isLoading && <span style={{ fontSize: '0.8em', color: '#ffaa00' }}> (Demo Data)</span>}
      </h3>
      
      <div className="metric-row">
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
        <span className="metric-value">{formatBytes(displayHeapInfo.heapUsed)}</span>
      </div>

      <div className="metric-row">
        <span className="metric-label">Heap Total</span>
        <span className="metric-value">{formatBytes(displayHeapInfo.heapTotal)}</span>
      </div>

      <div className="metric-row">
        <span className="metric-label">External Memory</span>
        <span className="metric-value">{formatBytes(displayHeapInfo.external)}</span>
      </div>

      <div className="metric-row">
        <span className="metric-label">RSS (Resident Set Size)</span>
        <span className="metric-value">{formatBytes(displayHeapInfo.rss)}</span>
      </div>

      <div className="metric-row">
        <span className="metric-label">Heap Free</span>
        <span className="metric-value">
          {formatBytes(displayHeapInfo.heapTotal - displayHeapInfo.heapUsed)}
        </span>
      </div>
    </div>
  );
};

export default HeapMonitor;
