import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api';
import './ProcessGauges.scss';

const ProcessGauges = ({ wsData, maxProcesses = 8 }) => {
  const [processData, setProcessData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('gauges'); // 'gauges' or 'list'
  const [actionLoading, setActionLoading] = useState({}); // Track loading state for each process action

  useEffect(() => {
    if (wsData && wsData.processes) {
      console.log('ProcessGauges received wsData.processes:', wsData.processes);
      
      // Handle both array format (new) and object format (legacy)
      let processArray = [];
      if (Array.isArray(wsData.processes)) {
        processArray = wsData.processes;
      } else if (wsData.processes.top && Array.isArray(wsData.processes.top)) {
        processArray = wsData.processes.top;
      } else if (wsData.processes.list && Array.isArray(wsData.processes.list)) {
        processArray = wsData.processes.list;
      } else {
        console.warn('ProcessGauges: wsData.processes is not in expected format:', typeof wsData.processes, wsData.processes);
        loadProcessData();
        return;
      }
      
      console.log('ProcessGauges: Using processArray with', processArray.length, 'items');
      setProcessData(processArray.slice(0, maxProcesses));
      setIsLoading(false);
    } else {
      loadProcessData();
    }
  }, [wsData, maxProcesses]);

  const loadProcessData = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest('processes');
      setProcessData(data.processes.slice(0, maxProcesses));
    } catch (error) {
      console.error('Failed to load process data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const executeProcessAction = async (pid, action) => {
    const actionKey = `${pid}-${action}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));

    try {
      const endpoint = `processes/${pid}/${action}`;
      const response = await apiRequest(endpoint, { method: 'POST' });
      
      if (response.success) {
        // Refresh process data after successful action
        setTimeout(() => {
          loadProcessData();
        }, 1000); // Wait a second for the action to take effect
        
        return { success: true, message: response.message };
      } else {
        throw new Error(response.message || `Failed to ${action} process`);
      }
    } catch (error) {
      console.error(`Failed to ${action} process ${pid}:`, error);
      return { success: false, message: error.message };
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleKillProcess = async (pid) => {
    if (window.confirm(`Are you sure you want to kill process ${pid}? This action cannot be undone.`)) {
      const result = await executeProcessAction(pid, 'kill');
      if (!result.success) {
        alert(`Failed to kill process: ${result.message}`);
      }
    }
  };

  const handleStopProcess = async (pid) => {
    const result = await executeProcessAction(pid, 'stop');
    if (!result.success) {
      alert(`Failed to stop process: ${result.message}`);
    }
  };

  const handleResumeProcess = async (pid) => {
    const result = await executeProcessAction(pid, 'resume');
    if (!result.success) {
      alert(`Failed to resume process: ${result.message}`);
    }
  };

  const formatProcessName = (name, maxLength = 16) => {
    if (!name) return 'Unknown';
    if (name.length > maxLength) {
      return name.substring(0, maxLength) + '...';
    }
    return name;
  };

  const formatMemory = (memPercent, rss) => {
    if (rss) {
      const memMB = (rss * 1024) / (1024 * 1024); // Convert from KB to MB
      return memMB > 1024 
        ? `${(memMB / 1024).toFixed(1)}GB` 
        : `${memMB.toFixed(0)}MB`;
    }
    return `${memPercent.toFixed(1)}%`;
  };

  const getCPUColor = (cpu) => {
    if (cpu > 50) return '#ff4444';
    if (cpu > 25) return '#ffaa00';
    if (cpu > 10) return '#00bcd4';
    return '#4caf50';
  };

  const getMemoryColor = (mem) => {
    if (mem > 5) return '#ff4444';
    if (mem > 2) return '#ffaa00';
    if (mem > 1) return '#00bcd4';
    return '#4caf50';
  };

  const getStateIcon = (state) => {
    switch (state) {
      case 'running': return '🟢';
      case 'sleeping': return '🟡';
      case 'stopped': return '🔴';
      case 'zombie': return '💀';
      default: return '⚪';
    }
  };

  const RadialGauge = ({ value, maxValue, color, size = 80, strokeWidth = 8 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(value / maxValue, 1);
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress * circumference);

    return (
      <div className="radial-gauge" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="gauge-svg">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="gauge-progress"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="gauge-text">
          <span className="gauge-value">{value.toFixed(1)}</span>
          <span className="gauge-unit">%</span>
        </div>
      </div>
    );
  };

  const ProcessGaugeCard = ({ process }) => (
    <div className="process-gauge-card">
      <div className="process-header">
        <div className="process-name-section">
          <span className="process-name" title={process.name}>
            {formatProcessName(process.name)}
          </span>
          <div className="process-meta">
            <span className="process-pid">PID: {process.pid}</span>
            <span className="process-state">
              {getStateIcon(process.state)} {process.state}
            </span>
          </div>
        </div>
        <div className="process-user">
          {process.user}
        </div>
      </div>

      <div className="gauges-container">
        <div className="gauge-section">
          <div className="gauge-label">CPU Usage</div>
          <RadialGauge 
            value={process.cpu || 0} 
            maxValue={100} 
            color={getCPUColor(process.cpu || 0)}
            size={70}
            strokeWidth={6}
          />
        </div>

        <div className="gauge-section">
          <div className="gauge-label">Memory</div>
          <RadialGauge 
            value={process.mem || 0} 
            maxValue={10} 
            color={getMemoryColor(process.mem || 0)}
            size={70}
            strokeWidth={6}
          />
          <div className="memory-details">
            {formatMemory(process.mem || 0, process.memRss)}
          </div>
        </div>
      </div>

      <div className="process-details">
        <div className="detail-item">
          <span className="detail-label">Priority:</span>
          <span className="detail-value">{process.priority}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Started:</span>
          <span className="detail-value" title={process.started}>
            {process.started ? new Date(process.started).toLocaleTimeString() : 'N/A'}
          </span>
        </div>
      </div>

      <div className="process-controls">
        <button 
          className="control-btn stop-btn"
          onClick={() => handleStopProcess(process.pid)}
          disabled={actionLoading[`${process.pid}-stop`] || process.state === 'stopped'}
          title="Stop Process (SIGSTOP)"
        >
          {actionLoading[`${process.pid}-stop`] ? '⏳' : '⏸️'} Stop
        </button>
        
        <button 
          className="control-btn resume-btn"
          onClick={() => handleResumeProcess(process.pid)}
          disabled={actionLoading[`${process.pid}-resume`] || process.state !== 'stopped'}
          title="Resume Process (SIGCONT)"
        >
          {actionLoading[`${process.pid}-resume`] ? '⏳' : '▶️'} Resume
        </button>
        
        <button 
          className="control-btn kill-btn"
          onClick={() => handleKillProcess(process.pid)}
          disabled={actionLoading[`${process.pid}-kill`]}
          title="Kill Process (SIGKILL)"
        >
          {actionLoading[`${process.pid}-kill`] ? '⏳' : '❌'} Kill
        </button>
      </div>
    </div>
  );

  const CompactProcessList = ({ processes }) => (
    <div className="compact-process-list">
      <div className="list-header">
        <span className="col-name">Process</span>
        <span className="col-cpu">CPU</span>
        <span className="col-memory">Memory</span>
        <span className="col-state">State</span>
        <span className="col-controls">Actions</span>
      </div>
      {processes.map((process, index) => (
        <div key={process.pid || index} className="list-row">
          <div className="col-name">
            <div className="process-info">
              <span className="name" title={process.name}>
                {formatProcessName(process.name, 20)}
              </span>
              <span className="pid">PID: {process.pid}</span>
            </div>
          </div>
          <div className="col-cpu">
            <div className="cpu-bar">
              <div 
                className="cpu-fill" 
                style={{ 
                  width: `${Math.min(process.cpu || 0, 100)}%`,
                  backgroundColor: getCPUColor(process.cpu || 0)
                }}
              />
              <span className="cpu-text">{(process.cpu || 0).toFixed(1)}%</span>
            </div>
          </div>
          <div className="col-memory">
            <div className="memory-info">
              <span className="memory-text">
                {formatMemory(process.mem || 0, process.memRss)}
              </span>
              <div className="memory-bar">
                <div 
                  className="memory-fill" 
                  style={{ 
                    width: `${Math.min((process.mem || 0) * 10, 100)}%`,
                    backgroundColor: getMemoryColor(process.mem || 0)
                  }}
                />
              </div>
            </div>
          </div>
          <div className="col-state">
            <span className="state-badge" data-state={process.state}>
              {getStateIcon(process.state)} {process.state}
            </span>
          </div>
          <div className="col-controls">
            <div className="control-buttons-compact">
              <button 
                className="control-btn-small stop-btn"
                onClick={() => handleStopProcess(process.pid)}
                disabled={actionLoading[`${process.pid}-stop`] || process.state === 'stopped'}
                title="Stop"
              >
                {actionLoading[`${process.pid}-stop`] ? '⏳' : '⏸️'}
              </button>
              
              <button 
                className="control-btn-small resume-btn"
                onClick={() => handleResumeProcess(process.pid)}
                disabled={actionLoading[`${process.pid}-resume`] || process.state !== 'stopped'}
                title="Resume"
              >
                {actionLoading[`${process.pid}-resume`] ? '⏳' : '▶️'}
              </button>
              
              <button 
                className="control-btn-small kill-btn"
                onClick={() => handleKillProcess(process.pid)}
                disabled={actionLoading[`${process.pid}-kill`]}
                title="Kill"
              >
                {actionLoading[`${process.pid}-kill`] ? '⏳' : '❌'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="process-gauges loading">
        <div className="loading-spinner"></div>
        <p>Loading process data...</p>
      </div>
    );
  }

  return (
    <div className="process-gauges">
      <div className="process-gauges-header">
        <h3>Process Monitor with Gauges</h3>
        <div className="view-controls">
          <button 
            className={`view-btn ${viewMode === 'gauges' ? 'active' : ''}`}
            onClick={() => setViewMode('gauges')}
          >
            📊 Gauges
          </button>
          <button 
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            📋 List
          </button>
          <button className="refresh-btn" onClick={loadProcessData}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="process-summary-stats">
        <div className="stat-item">
          <span className="stat-label">Showing Top</span>
          <span className="stat-value">{processData.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Avg CPU</span>
          <span className="stat-value">
            {(processData.reduce((acc, p) => acc + (p.cpu || 0), 0) / processData.length).toFixed(1)}%
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Memory</span>
          <span className="stat-value">
            {processData.reduce((acc, p) => acc + (p.mem || 0), 0).toFixed(1)}%
          </span>
        </div>
      </div>

      {viewMode === 'gauges' ? (
        <div className="process-gauges-grid">
          {processData.map((process, index) => (
            <ProcessGaugeCard key={process.pid || index} process={process} />
          ))}
        </div>
      ) : (
        <CompactProcessList processes={processData} />
      )}

      <div className="process-gauges-footer">
        <small>
          Real-time process monitoring • Updates every {wsData ? '3' : '10'} seconds
          {wsData && <span className="live-indicator">🔴 LIVE</span>}
        </small>
      </div>
    </div>
  );
};

export default ProcessGauges;
