import React, { useState, useEffect } from 'react';
import './BackendControl.scss';
import { apiRequest } from '../../utils/api';

const BackendControl = () => {
  const [backendStatus, setBackendStatus] = useState({
    server: 'unknown',
    workers: 'unknown',
    ssh: 'unknown'
  });
  const [activeScans, setActiveScans] = useState({});
  const [systemHealth, setSystemHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    // Initialize WebSocket connection for real-time updates
    initializeWebSocket();
    
    // Initial status check
    checkBackendStatus();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const initializeWebSocket = () => {
    try {
      const websocket = new WebSocket('ws://localhost:8001');
      
      websocket.onopen = () => {
        console.log('Connected to backend WebSocket');
        addLog('Connected to real-time backend updates', 'success');
        setWs(websocket);
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      websocket.onclose = () => {
        console.log('WebSocket connection closed');
        addLog('Disconnected from real-time updates', 'error');
        setWs(null);
        
        // Attempt to reconnect after 5 seconds
        setTimeout(initializeWebSocket, 5000);
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        addLog('WebSocket connection error', 'error');
      };
      
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      addLog('Failed to connect to real-time updates', 'error');
    }
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'backendStatus':
        updateBackendStatus(data);
        break;
      case 'networkScanProgress':
      case 'networkScanResult':
      case 'deviceDiscovered':
        updateScanProgress(data);
        break;
      case 'networkScanComplete':
        handleScanComplete(data);
        break;
      case 'networkScanError':
        handleScanError(data);
        break;
      case 'workerStatusChange':
        handleWorkerStatusChange(data);
        break;
      default:
        // Handle other message types
        break;
    }
  };

  const updateBackendStatus = (data) => {
    const newStatus = {
      server: data.backend?.status === 'running' ? 'running' : 'stopped',
      workers: data.workers?.totalWorkers > 0 ? 'running' : 'stopped',
      ssh: 'running' // Assume SSH is running if backend is up
    };
    
    setBackendStatus(newStatus);
    setActiveScans(data.activeScans || {});
    
    if (data.backend) {
      setSystemHealth({
        uptime: data.backend.uptime,
        memory: data.backend.memory
      });
    }
  };

  const updateScanProgress = (data) => {
    if (data.scanId) {
      setActiveScans(prev => ({
        ...prev,
        [data.scanId]: {
          ...prev[data.scanId],
          ...data,
          lastUpdate: new Date().toISOString()
        }
      }));
      
      if (data.type === 'deviceDiscovered') {
        addLog(`Device discovered: ${data.device?.ip || 'Unknown IP'}`, 'success');
      }
    }
  };

  const handleScanComplete = (data) => {
    addLog(`Network scan ${data.scanId} completed`, 'success');
    updateScanProgress(data);
  };

  const handleScanError = (data) => {
    addLog(`Scan error: ${data.error}`, 'error');
  };

  const handleWorkerStatusChange = (data) => {
    addLog(`Worker status changed: ${data.message}`, 'info');
    // Refresh backend status
    setTimeout(checkBackendStatus, 1000);
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), { message, type, timestamp }]);
  };

  const checkBackendStatus = async () => {
    try {
      // Check main backend server and get comprehensive status
      const statusData = await apiRequest('backend-status');
      updateBackendStatus(statusData);
    } catch (error) {
      setBackendStatus({
        server: 'stopped',
        workers: 'stopped',
        ssh: 'stopped'
      });
    }
  };

  const executeBackendCommand = async (action, service = 'backend') => {
    setIsLoading(true);
    addLog(`${action.charAt(0).toUpperCase() + action.slice(1)}ing ${service}...`, 'info');
    
    try {
      const result = await apiRequest('backend-control', {
        method: 'POST',
        body: JSON.stringify({ action, service })
      });
      
      addLog(`${service} ${action} successful: ${result.message}`, 'success');
      
      // Wait a moment then refresh status
      setTimeout(() => {
        checkBackendStatus();
      }, 2000);
    } catch (error) {
      // If backend is not responding, try electron API if available
      if (window.electronAPI && window.electronAPI.controlBackend) {
        try {
          const result = await window.electronAPI.controlBackend(action, service);
          addLog(`${service} ${action} via Electron: ${result.message}`, 'success');
          setTimeout(checkBackendStatus, 2000);
        } catch (electronError) {
          addLog(`${service} ${action} failed: ${error.message}`, 'error');
        }
      } else {
        addLog(`${service} ${action} failed: ${error.message}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const restartBackend = () => executeBackendCommand('restart', 'backend');
  const stopBackend = () => executeBackendCommand('stop', 'backend');
  const startBackend = () => executeBackendCommand('start', 'backend');
  
  const restartWorkers = () => executeBackendCommand('restart', 'workers');
  const stopWorkers = () => executeBackendCommand('stop', 'workers');
  const startWorkers = () => executeBackendCommand('start', 'workers');
  
  const restartSSH = () => executeBackendCommand('restart', 'ssh');
  const stopSSH = () => executeBackendCommand('stop', 'ssh');
  const startSSH = () => executeBackendCommand('start', 'ssh');

  const clearLogs = () => setLogs([]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return '🟢';
      case 'stopped': return '🔴';
      default: return '🟡';
    }
  };

  return (
    <div className="backend-control">
      <div className="control-header">
        <h3>Backend Service Control</h3>
        <button 
          className="refresh-btn" 
          onClick={checkBackendStatus}
          disabled={isLoading}
        >
          🔄 Refresh Status
        </button>
      </div>

      <div className="services-grid">
        {/* Backend Server Control */}
        <div className="service-panel">
          <div className="service-header">
            <h4>
              {getStatusIcon(backendStatus.server)} Backend Server
              <span className={`status-badge ${backendStatus.server}`}>
                {backendStatus.server}
              </span>
            </h4>
          </div>
          <div className="service-controls">
            <button 
              className="btn start" 
              onClick={startBackend}
              disabled={isLoading || backendStatus.server === 'running'}
            >
              ▶️ Start
            </button>
            <button 
              className="btn stop" 
              onClick={stopBackend}
              disabled={isLoading || backendStatus.server === 'stopped'}
            >
              ⏹️ Stop
            </button>
            <button 
              className="btn restart" 
              onClick={restartBackend}
              disabled={isLoading}
            >
              🔄 Restart
            </button>
          </div>
          <div className="service-info">
            <small>Main API server on port 8001</small>
          </div>
        </div>

        {/* Service Workers Control */}
        <div className="service-panel">
          <div className="service-header">
            <h4>
              {getStatusIcon(backendStatus.workers)} Service Workers
              <span className={`status-badge ${backendStatus.workers}`}>
                {backendStatus.workers}
              </span>
            </h4>
          </div>
          <div className="service-controls">
            <button 
              className="btn start" 
              onClick={startWorkers}
              disabled={isLoading || backendStatus.workers === 'running'}
            >
              ▶️ Start
            </button>
            <button 
              className="btn stop" 
              onClick={stopWorkers}
              disabled={isLoading || backendStatus.workers === 'stopped'}
            >
              ⏹️ Stop
            </button>
            <button 
              className="btn restart" 
              onClick={restartWorkers}
              disabled={isLoading}
            >
              🔄 Restart
            </button>
          </div>
          <div className="service-info">
            <small>Network scanner & background processes</small>
          </div>
        </div>

        {/* SSH Server Control */}
        <div className="service-panel">
          <div className="service-header">
            <h4>
              {getStatusIcon(backendStatus.ssh)} SSH Server
              <span className={`status-badge ${backendStatus.ssh}`}>
                {backendStatus.ssh}
              </span>
            </h4>
          </div>
          <div className="service-controls">
            <button 
              className="btn start" 
              onClick={startSSH}
              disabled={isLoading || backendStatus.ssh === 'running'}
            >
              ▶️ Start
            </button>
            <button 
              className="btn stop" 
              onClick={stopSSH}
              disabled={isLoading || backendStatus.ssh === 'stopped'}
            >
              ⏹️ Stop
            </button>
            <button 
              className="btn restart" 
              onClick={restartSSH}
              disabled={isLoading}
            >
              🔄 Restart
            </button>
          </div>
          <div className="service-info">
            <small>SSH service on port 2222</small>
          </div>
        </div>
      </div>

      {/* Active Scans Display */}
      {Object.keys(activeScans).length > 0 && (
        <div className="active-scans-panel">
          <div className="scans-header">
            <h4>Active Network Scans</h4>
            <span className="scan-count">{Object.keys(activeScans).length} active</span>
          </div>
          <div className="scans-grid">
            {Object.entries(activeScans).map(([scanId, scanData]) => (
              <div key={scanId} className="scan-item">
                <div className="scan-header">
                  <span className="scan-id">{scanId}</span>
                  <span className={`scan-status ${scanData.status}`}>
                    {scanData.status}
                  </span>
                </div>
                <div className="scan-details">
                  <div className="scan-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${scanData.progress || 0}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{scanData.progress || 0}%</span>
                  </div>
                  {scanData.devicesFound && (
                    <div className="devices-count">
                      📱 {scanData.devicesFound} devices found
                    </div>
                  )}
                  {scanData.subnet && (
                    <div className="scan-target">
                      🌐 {scanData.subnet}
                    </div>
                  )}
                  <div className="scan-time">
                    🕒 {scanData.lastUpdate ? new Date(scanData.lastUpdate).toLocaleTimeString() : 'No updates'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Health */}
      {systemHealth && (
        <div className="system-health-panel">
          <div className="health-header">
            <h4>System Health</h4>
          </div>
          <div className="health-metrics">
            <div className="health-metric">
              <span className="metric-label">Uptime:</span>
              <span className="metric-value">{Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m</span>
            </div>
            {systemHealth.memory && (
              <div className="health-metric">
                <span className="metric-label">Memory:</span>
                <span className="metric-value">{Math.round(systemHealth.memory.rss / 1024 / 1024)}MB</span>
              </div>
            )}
            <div className="health-metric">
              <span className="metric-label">WebSocket:</span>
              <span className={`metric-value ${ws ? 'connected' : 'disconnected'}`}>
                {ws ? '🟢 Connected' : '🔴 Disconnected'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Logs */}
      <div className="logs-panel">
        <div className="logs-header">
          <h4>Service Logs</h4>
          <button className="clear-logs-btn" onClick={clearLogs}>
            🗑️ Clear
          </button>
        </div>
        <div className="logs-content">
          {logs.length === 0 ? (
            <div className="no-logs">No recent activity</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`log-entry ${log.type}`}>
                <span className="log-timestamp">{log.timestamp}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h4>Quick Actions</h4>
        <div className="action-buttons">
          <button 
            className="btn action-btn restart-all"
            onClick={() => {
              restartBackend();
              setTimeout(() => restartWorkers(), 1000);
              setTimeout(() => restartSSH(), 2000);
            }}
            disabled={isLoading}
          >
            🔄 Restart All Services
          </button>
          <button 
            className="btn action-btn stop-all"
            onClick={() => {
              stopWorkers();
              setTimeout(() => stopSSH(), 1000);
              setTimeout(() => stopBackend(), 2000);
            }}
            disabled={isLoading}
          >
            ⏹️ Stop All Services
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">🔄</div>
          <span>Processing command...</span>
        </div>
      )}
    </div>
  );
};

export default BackendControl;
