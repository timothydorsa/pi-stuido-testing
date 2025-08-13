import React, { useState, useEffect } from 'react';
import './ServicesManager.scss';

const ServicesManager = () => {
  const [services, setServices] = useState({});
  const [systemStats, setSystemStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState(null);
  const [logs, setLogs] = useState({});
  const [showLogs, setShowLogs] = useState({});
  const [globalHealth, setGlobalHealth] = useState(null);
  const [maintenanceData, setMaintenanceData] = useState(null);

  useEffect(() => {
    fetchServicesStatus();
    fetchGlobalHealth();
    
    // Set up real-time updates
    const ws = new WebSocket(`ws://localhost:8001`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleRealTimeUpdate(data);
    };

    const interval = setInterval(() => {
      fetchServicesStatus();
    }, 5000);

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  const handleRealTimeUpdate = (data) => {
    switch (data.type) {
      case 'serviceStarted':
      case 'serviceStopped':
      case 'serviceRestarted':
      case 'serviceError':
      case 'serviceExited':
      case 'serviceAutoRestarted':
        fetchServicesStatus();
        break;
      case 'globalHealthCheck':
        setGlobalHealth(data);
        break;
      case 'serviceMetricsUpdated':
        setServices(prev => ({
          ...prev,
          [data.serviceId]: {
            ...prev[data.serviceId],
            metrics: data.metrics
          }
        }));
        break;
      default:
        break;
    }
  };

  const fetchServicesStatus = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/services');
      const data = await response.json();
      setServices(data.services);
      setSystemStats(data.systemStats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching services status:', error);
      setLoading(false);
    }
  };

  const fetchGlobalHealth = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/services/health');
      const data = await response.json();
      setGlobalHealth(data);
    } catch (error) {
      console.error('Error fetching global health:', error);
    }
  };

  const performServiceAction = async (serviceId, action) => {
    setOperation({ serviceId, action });
    try {
      const response = await fetch(`http://localhost:8001/api/services/${serviceId}/${action}`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        await fetchServicesStatus();
      }
    } catch (error) {
      console.error(`Error performing ${action} on ${serviceId}:`, error);
    } finally {
      setOperation(null);
    }
  };

  const performAllServicesAction = async (action) => {
    setOperation({ serviceId: 'all', action });
    try {
      const response = await fetch(`http://localhost:8001/api/services/all/${action}`, {
        method: 'POST'
      });
      const result = await response.json();
      await fetchServicesStatus();
    } catch (error) {
      console.error(`Error performing ${action} on all services:`, error);
    } finally {
      setOperation(null);
    }
  };

  const fetchServiceLogs = async (serviceId) => {
    try {
      const response = await fetch(`http://localhost:8001/api/services/${serviceId}/logs?lines=50`);
      const data = await response.json();
      setLogs(prev => ({ ...prev, [serviceId]: data.logs }));
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const toggleLogs = (serviceId) => {
    if (!showLogs[serviceId]) {
      fetchServiceLogs(serviceId);
    }
    setShowLogs(prev => ({ ...prev, [serviceId]: !prev[serviceId] }));
  };

  const runSystemMaintenance = async () => {
    setOperation({ serviceId: 'system', action: 'maintenance' });
    try {
      const response = await fetch('http://localhost:8001/api/services/maintenance/system-check', {
        method: 'POST'
      });
      const data = await response.json();
      setMaintenanceData(data);
    } catch (error) {
      console.error('Error running system maintenance:', error);
    } finally {
      setOperation(null);
    }
  };

  const getServiceStatusColor = (status) => {
    switch (status) {
      case 'running': return '#00ff00';
      case 'stopped': return '#808080';
      case 'crashed': return '#ff0000';
      case 'error': return '#ff4444';
      default: return '#ffa500';
    }
  };

  const getHealthStatusColor = (healthStatus) => {
    switch (healthStatus) {
      case 'healthy': return '#00ff00';
      case 'unhealthy': return '#ff0000';
      case 'unknown': return '#808080';
      default: return '#ffa500';
    }
  };

  const formatUptime = (uptime) => {
    if (!uptime) return 'N/A';
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatMemory = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return <div className="services-manager loading">Loading services...</div>;
  }

  return (
    <div className="services-manager">
      <div className="services-header">
        <h2>🔧 Services Manager</h2>
        <div className="header-actions">
          <button 
            className="btn-primary"
            onClick={() => performAllServicesAction('start')}
            disabled={operation !== null}
          >
            🚀 Start All
          </button>
          <button 
            className="btn-warning"
            onClick={() => performAllServicesAction('restart')}
            disabled={operation !== null}
          >
            🔄 Restart All
          </button>
          <button 
            className="btn-danger"
            onClick={() => performAllServicesAction('stop')}
            disabled={operation !== null}
          >
            🛑 Stop All
          </button>
          <button 
            className="btn-secondary"
            onClick={runSystemMaintenance}
            disabled={operation !== null}
          >
            🔍 System Check
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="system-overview">
        <div className="overview-card">
          <h3>System Status</h3>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Total Services:</span>
              <span className="value">{systemStats.totalServices || 0}</span>
            </div>
            <div className="status-item">
              <span className="label">Running:</span>
              <span className="value running">{systemStats.runningServices || 0}</span>
            </div>
            <div className="status-item">
              <span className="label">Crashed:</span>
              <span className="value crashed">{systemStats.crashedServices || 0}</span>
            </div>
            <div className="status-item">
              <span className="label">System Uptime:</span>
              <span className="value">{formatUptime(systemStats.uptime * 1000)}</span>
            </div>
          </div>
        </div>

        {globalHealth && (
          <div className="overview-card">
            <h3>Health Overview</h3>
            <div className="health-status">
              <div className={`health-indicator ${globalHealth.overallHealth.status}`}>
                {globalHealth.overallHealth.status.toUpperCase()}
              </div>
              <div className="health-details">
                <span>{globalHealth.overallHealth.criticalServicesRunning}/{globalHealth.overallHealth.totalCriticalServices} critical services running</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Services List */}
      <div className="services-list">
        {Object.entries(services).map(([serviceId, service]) => (
          <div key={serviceId} className={`service-card ${service.status}`}>
            <div className="service-header">
              <div className="service-info">
                <h3 className="service-name">
                  {service.name}
                  {service.critical && <span className="critical-badge">CRITICAL</span>}
                </h3>
                <div className="service-meta">
                  <span className="service-type">{service.type}</span>
                  {service.port && <span className="service-port">:{service.port}</span>}
                  {service.pid && <span className="service-pid">PID: {service.pid}</span>}
                </div>
              </div>
              <div className="service-status">
                <div 
                  className="status-indicator"
                  style={{ backgroundColor: getServiceStatusColor(service.status) }}
                  title={`Status: ${service.status}`}
                ></div>
                {service.healthStatus && (
                  <div 
                    className="health-indicator"
                    style={{ backgroundColor: getHealthStatusColor(service.healthStatus) }}
                    title={`Health: ${service.healthStatus}`}
                  ></div>
                )}
              </div>
            </div>

            <div className="service-metrics">
              <div className="metric">
                <span className="metric-label">Uptime:</span>
                <span className="metric-value">{formatUptime(service.uptime)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">CPU:</span>
                <span className="metric-value">{service.metrics?.cpu?.toFixed(1) || 0}%</span>
              </div>
              <div className="metric">
                <span className="metric-label">Memory:</span>
                <span className="metric-value">{formatMemory(service.metrics?.memory)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Restarts:</span>
                <span className="metric-value">{service.restartCount}</span>
              </div>
            </div>

            {service.lastError && (
              <div className="service-error">
                <strong>Last Error:</strong> {service.lastError}
              </div>
            )}

            <div className="service-actions">
              <button
                className="btn-success"
                onClick={() => performServiceAction(serviceId, 'start')}
                disabled={operation !== null || service.status === 'running'}
              >
                {operation?.serviceId === serviceId && operation?.action === 'start' ? '⏳' : '▶️'} Start
              </button>
              <button
                className="btn-warning"
                onClick={() => performServiceAction(serviceId, 'restart')}
                disabled={operation !== null}
              >
                {operation?.serviceId === serviceId && operation?.action === 'restart' ? '⏳' : '🔄'} Restart
              </button>
              <button
                className="btn-danger"
                onClick={() => performServiceAction(serviceId, 'stop')}
                disabled={operation !== null || service.status === 'stopped'}
              >
                {operation?.serviceId === serviceId && operation?.action === 'stop' ? '⏳' : '⏹️'} Stop
              </button>
              <button
                className="btn-secondary"
                onClick={() => toggleLogs(serviceId)}
              >
                📋 Logs
              </button>
            </div>

            {showLogs[serviceId] && (
              <div className="service-logs">
                <h4>Recent Logs</h4>
                <div className="logs-container">
                  {logs[serviceId]?.map((log, index) => (
                    <div key={index} className={`log-entry ${log.level}`}>
                      <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="log-level">[{log.level.toUpperCase()}]</span>
                      <span className="log-message">{log.message}</span>
                    </div>
                  )) || <div className="no-logs">No logs available</div>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Maintenance Results */}
      {maintenanceData && (
        <div className="maintenance-results">
          <h3>🔍 System Maintenance Check Results</h3>
          
          {maintenanceData.recommendations.length > 0 && (
            <div className="recommendations">
              <h4>Recommendations</h4>
              {maintenanceData.recommendations.map((rec, index) => (
                <div key={index} className={`recommendation ${rec.type}`}>
                  <span className="rec-type">[{rec.type.toUpperCase()}]</span>
                  <span className="rec-category">{rec.category}</span>
                  <span className="rec-message">{rec.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className="check-results">
            <div className="check-section">
              <h4>Disk Space</h4>
              {Array.isArray(maintenanceData.checks.diskSpace) ? (
                maintenanceData.checks.diskSpace.map((disk, index) => (
                  <div key={index} className={`check-item ${disk.status}`}>
                    <span>{disk.filesystem}: {disk.usePercent}% used</span>
                  </div>
                ))
              ) : (
                <div className="check-item error">Error checking disk space</div>
              )}
            </div>

            <div className="check-section">
              <h4>Memory Usage</h4>
              <div className={`check-item ${maintenanceData.checks.memoryUsage.status}`}>
                <span>Memory: {maintenanceData.checks.memoryUsage.usage?.toFixed(1)}% used</span>
              </div>
            </div>

            <div className="check-section">
              <h4>Network Connectivity</h4>
              {Object.entries(maintenanceData.checks.networkConnectivity).map(([host, result]) => (
                <div key={host} className={`check-item ${result.status}`}>
                  <span>{host}: {result.alive ? 'OK' : 'FAILED'} ({result.time}ms)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Operation Status */}
      {operation && (
        <div className="operation-overlay">
          <div className="operation-modal">
            <div className="spinner"></div>
            <p>
              Performing {operation.action} on {operation.serviceId === 'all' ? 'all services' : operation.serviceId}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesManager;
