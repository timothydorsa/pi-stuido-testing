import React from 'react';

const DiskIOMonitor = ({ data }) => {
  if (!data || !data.disk) {
    return (
      <div className="disk-io-monitor">
        <h3 className="card-title">Disk I/O Monitor</h3>
        <div className="loading-state">
          <p>Loading disk I/O information...</p>
        </div>
      </div>
    );
  }

  const { disk } = data;

  const formatIOCount = (count) => {
    if (!count) return '0';
    if (count > 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count > 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatIORate = (rate) => {
    if (!rate) return '0/s';
    if (rate > 1000) return `${(rate / 1000).toFixed(1)}K/s`;
    return `${rate}/s`;
  };

  const getIOClass = (rate) => {
    if (rate > 100) return 'high';
    if (rate > 50) return 'medium';
    return 'low';
  };

  const readRate = disk.rIO_sec || 0;
  const writeRate = disk.wIO_sec || 0;
  const totalRate = readRate + writeRate;

  return (
    <div>
      <h3 className="card-title">Disk I/O Monitor</h3>
      
      <div className="io-summary">
        <div className="io-overview">
          <div className="metric-row">
            <span className="metric-label">Total I/O Rate</span>
            <span className={`metric-value ${getIOClass(totalRate)}`}>
              {formatIORate(totalRate)}
            </span>
          </div>
          
          <div className="io-breakdown">
            <div className="io-item read">
              <span className="io-direction">Read:</span>
              <span className={`io-rate ${getIOClass(readRate)}`}>
                {formatIORate(readRate)}
              </span>
            </div>
            <div className="io-item write">
              <span className="io-direction">Write:</span>
              <span className={`io-rate ${getIOClass(writeRate)}`}>
                {formatIORate(writeRate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="io-totals">
        <h4 className="section-title">Total Operations Since Boot</h4>
        
        <div className="totals-grid">
          <div className="total-item">
            <span className="total-label">Read Operations</span>
            <span className="total-value">{formatIOCount(disk.rIO)}</span>
          </div>
          <div className="total-item">
            <span className="total-label">Write Operations</span>
            <span className="total-value">{formatIOCount(disk.wIO)}</span>
          </div>
          <div className="total-item">
            <span className="total-label">Total Operations</span>
            <span className="total-value">{formatIOCount(disk.tIO)}</span>
          </div>
        </div>
      </div>

      {(readRate > 0 || writeRate > 0) && (
        <div className="io-activity">
          <h4 className="section-title">Current Activity</h4>
          
          <div className="activity-bars">
            <div className="activity-item">
              <span className="activity-label">Read Activity</span>
              <div className="activity-bar">
                <div 
                  className="activity-fill read"
                  style={{ 
                    width: `${Math.min((readRate / Math.max(totalRate, 1)) * 100, 100)}%` 
                  }}
                />
              </div>
              <span className="activity-value">{formatIORate(readRate)}</span>
            </div>
            
            <div className="activity-item">
              <span className="activity-label">Write Activity</span>
              <div className="activity-bar">
                <div 
                  className="activity-fill write"
                  style={{ 
                    width: `${Math.min((writeRate / Math.max(totalRate, 1)) * 100, 100)}%` 
                  }}
                />
              </div>
              <span className="activity-value">{formatIORate(writeRate)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="io-stats">
        <div className="stat-item">
          <span className="stat-label">Read/Write Ratio</span>
          <span className="stat-value">
            {writeRate > 0 ? (readRate / writeRate).toFixed(2) : '∞'} : 1
          </span>
        </div>
      </div>
    </div>
  );
};

export default DiskIOMonitor;
