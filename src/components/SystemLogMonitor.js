import React, { useState, useEffect } from 'react';

const SystemLogMonitor = ({ data }) => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Generate system event logs based on data changes
    if (data) {
      const newLogs = [];
      const timestamp = new Date().toLocaleTimeString();

      // Check for high CPU usage
      if (data.cpu && data.cpu.currentLoad > 80) {
        newLogs.push({
          id: Date.now() + Math.random(),
          timestamp,
          level: 'warning',
          category: 'cpu',
          message: `High CPU usage detected: ${data.cpu.currentLoad.toFixed(1)}%`
        });
      }

      // Check for memory usage
      if (data.memory && data.memory.available) {
        const memUsage = ((data.memory.total - data.memory.available) / data.memory.total) * 100;
        if (memUsage > 90) {
          newLogs.push({
            id: Date.now() + Math.random() + 1,
            timestamp,
            level: 'error',
            category: 'memory',
            message: `Critical memory usage: ${memUsage.toFixed(1)}%`
          });
        } else if (memUsage > 80) {
          newLogs.push({
            id: Date.now() + Math.random() + 2,
            timestamp,
            level: 'warning',
            category: 'memory',
            message: `High memory usage: ${memUsage.toFixed(1)}%`
          });
        }
      }

      // Check for disk I/O activity
      if (data.disk && (data.disk.rIO_sec > 500 || data.disk.wIO_sec > 500)) {
        newLogs.push({
          id: Date.now() + Math.random() + 3,
          timestamp,
          level: 'info',
          category: 'disk',
          message: `High disk I/O: ${data.disk.rIO_sec || 0} reads/s, ${data.disk.wIO_sec || 0} writes/s`
        });
      }

      // Check for network activity
      if (data.network) {
        data.network.forEach(net => {
          if (net.rx_sec > 1000000 || net.tx_sec > 1000000) { // > 1MB/s
            newLogs.push({
              id: Date.now() + Math.random() + 4,
              timestamp,
              level: 'info',
              category: 'network',
              message: `High network activity on ${net.iface}: ${formatBytes(net.rx_sec)}/s down, ${formatBytes(net.tx_sec)}/s up`
            });
          }
        });
      }

      // Check for process anomalies
      if (data.processes && data.processes.top) {
        data.processes.top.forEach(proc => {
          if (proc.cpu > 50) {
            newLogs.push({
              id: Date.now() + Math.random() + 5,
              timestamp,
              level: 'warning',
              category: 'process',
              message: `High CPU process: ${proc.name} (PID: ${proc.pid}) using ${proc.cpu.toFixed(1)}% CPU`
            });
          }
        });
      }

      if (newLogs.length > 0) {
        setLogs(prevLogs => {
          const combined = [...newLogs, ...prevLogs];
          return combined.slice(0, 50); // Keep only last 50 entries
        });
      }
    }
  }, [data]);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getLevelClass = (level) => {
    switch (level) {
      case 'error': return 'log-error';
      case 'warning': return 'log-warning';
      case 'info': return 'log-info';
      default: return 'log-default';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'cpu': return '🔥';
      case 'memory': return '🧠';
      case 'disk': return '💾';
      case 'network': return '🌐';
      case 'process': return '⚙️';
      default: return 'ℹ️';
    }
  };

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div>
      <h3 className="card-title">System Log Monitor</h3>
      
      <div className="log-controls">
        <div className="filter-controls">
          <label htmlFor="log-filter">Filter by level:</label>
          <select 
            id="log-filter" 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="log-filter-select"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>
        </div>
        
        <button onClick={clearLogs} className="clear-logs-btn">
          Clear Logs
        </button>
      </div>

      <div className="log-stats">
        <div className="stat-item">
          <span className="stat-label">Total Events:</span>
          <span className="stat-value">{logs.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Errors:</span>
          <span className="stat-value error">{logs.filter(l => l.level === 'error').length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Warnings:</span>
          <span className="stat-value warning">{logs.filter(l => l.level === 'warning').length}</span>
        </div>
      </div>

      <div className="log-container">
        {filteredLogs.length > 0 ? (
          <div className="log-list">
            {filteredLogs.map(log => (
              <div key={log.id} className={`log-entry ${getLevelClass(log.level)}`}>
                <div className="log-header">
                  <span className="log-icon">{getCategoryIcon(log.category)}</span>
                  <span className="log-timestamp">{log.timestamp}</span>
                  <span className={`log-level ${log.level}`}>{log.level.toUpperCase()}</span>
                </div>
                <div className="log-message">{log.message}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-logs">
            <p>No system events logged yet</p>
            <small>Events will appear here when system thresholds are exceeded</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemLogMonitor;
