import React from 'react';

const NetworkMonitor = ({ data }) => {
  if (!data || !data.network) {
    return (
      <div className="network-monitor">
        <h3 className="card-title">Network Monitor</h3>
        <div className="loading-state">
          <p>Loading network information...</p>
        </div>
      </div>
    );
  }

  const formatBytes = (bytes, perSecond = false) => {
    if (!bytes) return '0 B' + (perSecond ? '/s' : '');
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const formatted = (bytes / Math.pow(1024, i)).toFixed(2);
    return `${formatted} ${sizes[i]}${perSecond ? '/s' : ''}`;
  };

  const getStatusClass = (operstate) => {
    return operstate === 'up' ? 'success' : 'error';
  };

  const activeInterfaces = data.network.filter(net => 
    net.operstate === 'up' && net.iface !== 'lo'
  );

  return (
    <div>
      <h3 className="card-title">Network Monitor</h3>
      
      {activeInterfaces.map((network, index) => (
        <div key={network.iface} className="network-interface">
          <div className="metric-row">
            <span className="metric-label">Interface</span>
            <span className={`metric-value ${getStatusClass(network.operstate)}`}>
              {network.iface} ({network.operstate})
            </span>
          </div>
          
          <div className="metric-row">
            <span className="metric-label">Download</span>
            <span className="metric-value">
              {formatBytes(network.rx_bytes)} 
              {network.rx_sec > 0 && (
                <span className="rate"> @ {formatBytes(network.rx_sec, true)}</span>
              )}
            </span>
          </div>

          <div className="metric-row">
            <span className="metric-label">Upload</span>
            <span className="metric-value">
              {formatBytes(network.tx_bytes)}
              {network.tx_sec > 0 && (
                <span className="rate"> @ {formatBytes(network.tx_sec, true)}</span>
              )}
            </span>
          </div>

          {(network.rx_errors > 0 || network.tx_errors > 0) && (
            <div className="metric-row">
              <span className="metric-label">Errors</span>
              <span className="metric-value error">
                RX: {network.rx_errors}, TX: {network.tx_errors}
              </span>
            </div>
          )}

          {(network.rx_dropped > 0 || network.tx_dropped > 0) && (
            <div className="metric-row">
              <span className="metric-label">Dropped</span>
              <span className="metric-value warning">
                RX: {network.rx_dropped}, TX: {network.tx_dropped}
              </span>
            </div>
          )}

          {index < activeInterfaces.length - 1 && <hr className="interface-separator" />}
        </div>
      ))}
    </div>
  );
};

export default NetworkMonitor;
