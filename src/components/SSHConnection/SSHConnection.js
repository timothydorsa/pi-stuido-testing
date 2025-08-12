import React, { useState, useEffect } from 'react';
import sshClient from '../../utils/ssh-client';
import './SSHConnection.scss';

// SSH connection status
const STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error'
};

const SSHConnection = () => {
  const [status, setStatus] = useState(STATUS.DISCONNECTED);
  const [error, setError] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(2222);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    // Initialize the SSH client when component mounts
    const initializeClient = async () => {
      try {
        await sshClient.init();
        console.log('SSH client initialized');
      } catch (err) {
        setError(`Failed to initialize SSH client: ${err.message}`);
        setStatus(STATUS.ERROR);
      }
    };

    initializeClient();

    // Cleanup on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      sshClient.disconnect();
    };
  }, []);

  // Connect to SSH server
  const handleConnect = async () => {
    try {
      setStatus(STATUS.CONNECTING);
      setError(null);
      
      // Register public key with server
      await sshClient.registerPublicKey();
      
      // Connect to SSH server
      await sshClient.connect(host, parseInt(port));
      
      setStatus(STATUS.CONNECTED);
      
      // Start periodic data refresh
      const interval = setInterval(fetchData, 5000);
      setRefreshInterval(interval);
      
      // Fetch data immediately after connection
      fetchData();
    } catch (err) {
      setError(`Connection failed: ${err.message}`);
      setStatus(STATUS.ERROR);
    }
  };

  // Disconnect from SSH server
  const handleDisconnect = () => {
    sshClient.disconnect();
    setStatus(STATUS.DISCONNECTED);
    
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  // Fetch data from SSH server
  const fetchData = async () => {
    try {
      // Get system info
      const info = await sshClient.getSystemInfo();
      setSystemInfo(info);
      
      // Get metrics
      const metricsData = await sshClient.getMetrics();
      setMetrics(metricsData);
    } catch (err) {
      console.error('Error fetching data via SSH:', err);
      // Don't disconnect on fetch errors
    }
  };

  return (
    <div className="ssh-connection">
      <h2>SSH Connection</h2>
      
      <div className="connection-form">
        <div className="form-group">
          <label htmlFor="ssh-host">Host:</label>
          <input
            id="ssh-host"
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            disabled={status === STATUS.CONNECTED || status === STATUS.CONNECTING}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="ssh-port">Port:</label>
          <input
            id="ssh-port"
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            disabled={status === STATUS.CONNECTED || status === STATUS.CONNECTING}
          />
        </div>
        
        <div className="connection-actions">
          {status === STATUS.DISCONNECTED && (
            <button onClick={handleConnect} className="connect-button">
              Connect
            </button>
          )}
          
          {(status === STATUS.CONNECTED || status === STATUS.CONNECTING) && (
            <button onClick={handleDisconnect} className="disconnect-button">
              Disconnect
            </button>
          )}
        </div>
      </div>
      
      <div className={`connection-status status-${status}`}>
        Status: {status}
        {error && <div className="connection-error">{error}</div>}
      </div>
      
      {status === STATUS.CONNECTED && (
        <div className="ssh-data">
          <div className="system-info">
            <h3>System Information</h3>
            {systemInfo ? (
              <pre>{JSON.stringify(systemInfo, null, 2)}</pre>
            ) : (
              <p>Loading system information...</p>
            )}
          </div>
          
          <div className="metrics">
            <h3>Current Metrics</h3>
            {metrics ? (
              <div>
                <div className="metric">
                  <span>CPU Usage:</span>
                  <span className="metric-value">{metrics.cpu.toFixed(2)}%</span>
                </div>
                <div className="metric">
                  <span>Memory:</span>
                  <span className="metric-value">
                    {(metrics.memory.used / (1024 * 1024 * 1024)).toFixed(2)} GB / 
                    {(metrics.memory.total / (1024 * 1024 * 1024)).toFixed(2)} GB
                  </span>
                </div>
              </div>
            ) : (
              <p>Loading metrics...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SSHConnection;
