import React from 'react';

const CPUCoreMonitor = ({ data }) => {
  if (!data || !data.cpu || !data.cpu.cores) {
    return (
      <div className="cpu-core-monitor">
        <h3 className="card-title">CPU Core Monitor</h3>
        <div className="loading-state">
          <p>Loading CPU core information...</p>
        </div>
      </div>
    );
  }

  const { cpu } = data;
  const cores = cpu.cores || [];

  const getLoadClass = (load) => {
    if (load > 80) return 'error';
    if (load > 60) return 'warning';
    return 'success';
  };

  // Separate performance and efficiency cores for M4 chip
  const performanceCores = cores.slice(0, 4); // First 4 are performance cores
  const efficiencyCores = cores.slice(4);     // Rest are efficiency cores

  const renderCoreGroup = (coreList, title, startIndex = 0) => (
    <div className="core-group">
      <h4 className="core-group-title">{title}</h4>
      <div className="cores-grid">
        {coreList.map((core, index) => (
          <div key={startIndex + index} className="core-card">
            <div className="core-header">
              <span className="core-number">Core {startIndex + index}</span>
              <span className={`core-load ${getLoadClass(core.load)}`}>
                {core.load.toFixed(1)}%
              </span>
            </div>
            
            <div className="core-progress">
              <div 
                className={`progress-fill ${getLoadClass(core.load)}`}
                style={{ width: `${Math.min(core.load, 100)}%` }}
              />
            </div>
            
            <div className="core-details">
              <div className="core-stat">
                <span className="stat-label">User:</span>
                <span className="stat-value">{core.user.toFixed(1)}%</span>
              </div>
              <div className="core-stat">
                <span className="stat-label">System:</span>
                <span className="stat-value">{core.system.toFixed(1)}%</span>
              </div>
              <div className="core-stat">
                <span className="stat-label">Idle:</span>
                <span className="stat-value">{core.idle.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <h3 className="card-title">CPU Core Monitor</h3>
      
      <div className="overall-cpu">
        <div className="metric-row">
          <span className="metric-label">Overall CPU Load</span>
          <span className={`metric-value ${getLoadClass(cpu.currentLoad)}`}>
            {cpu.currentLoad.toFixed(1)}%
          </span>
        </div>
        
        <div className="progress-bar">
          <div 
            className={`progress-fill ${getLoadClass(cpu.currentLoad)}`}
            style={{ width: `${Math.min(cpu.currentLoad, 100)}%` }}
          />
        </div>

        <div className="cpu-breakdown">
          <div className="breakdown-item">
            <span className="breakdown-label">User:</span>
            <span className="breakdown-value">{cpu.currentLoadUser.toFixed(1)}%</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">System:</span>
            <span className="breakdown-value">{cpu.currentLoadSystem.toFixed(1)}%</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">Idle:</span>
            <span className="breakdown-value">{cpu.currentLoadIdle.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {performanceCores.length > 0 && renderCoreGroup(performanceCores, "Performance Cores", 0)}
      {efficiencyCores.length > 0 && renderCoreGroup(efficiencyCores, "Efficiency Cores", 4)}
      
      <div className="cpu-info">
        <div className="metric-row">
          <span className="metric-label">Load Average</span>
          <span className="metric-value">{cpu.avgLoad}</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">Total Cores</span>
          <span className="metric-value">{cores.length}</span>
        </div>
      </div>
    </div>
  );
};

export default CPUCoreMonitor;
