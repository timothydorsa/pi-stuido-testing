import React from 'react';

const ProcessMonitor = ({ data }) => {
  if (!data || !data.processes) {
    return (
      <div className="process-monitor">
        <h3 className="card-title">Process Monitor</h3>
        <div className="loading-state">
          <p>Loading process information...</p>
        </div>
      </div>
    );
  }

  const { processes } = data;

  const getProcessClass = (cpu) => {
    if (cpu > 20) return 'high';
    if (cpu > 10) return 'medium';
    return 'low';
  };

  const truncateCommand = (command, maxLength = 30) => {
    if (!command) return 'N/A';
    return command.length > maxLength 
      ? command.substring(0, maxLength) + '...'
      : command;
  };

  return (
    <div>
      <h3 className="card-title">Process Monitor</h3>
      
      <div className="process-summary">
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Total Processes</span>
            <span className="summary-value">{processes.total || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Running</span>
            <span className="summary-value success">{processes.running || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Sleeping</span>
            <span className="summary-value">{processes.sleeping || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Blocked</span>
            <span className="summary-value warning">{processes.blocked || 0}</span>
          </div>
        </div>
      </div>

      <div className="top-processes">
        <h4 className="section-title">Top CPU Consuming Processes</h4>
        
        <div className="process-list">
          <div className="process-header">
            <span className="process-col process-name">Process</span>
            <span className="process-col process-pid">PID</span>
            <span className="process-col process-cpu">CPU%</span>
            <span className="process-col process-memory">MEM%</span>
          </div>
          
          {processes.top && processes.top.length > 0 ? (
            processes.top.map((process, index) => (
              <div key={process.pid || index} className="process-row">
                <span className="process-col process-name" title={process.command}>
                  {process.name || 'Unknown'}
                </span>
                <span className="process-col process-pid">
                  {process.pid || 'N/A'}
                </span>
                <span className={`process-col process-cpu ${getProcessClass(process.cpu)}`}>
                  {(process.cpu || 0).toFixed(1)}%
                </span>
                <span className="process-col process-memory">
                  {(process.memory || 0).toFixed(1)}%
                </span>
              </div>
            ))
          ) : (
            <div className="no-processes">
              <p>No high CPU processes detected</p>
            </div>
          )}
        </div>
      </div>

      {data.nodeHeap && (
        <div className="node-heap-info">
          <h4 className="section-title">Node.js Heap (Current Process)</h4>
          
          <div className="heap-stats">
            <div className="heap-stat">
              <span className="heap-label">Heap Used:</span>
              <span className="heap-value">
                {(data.nodeHeap.heapUsed / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <div className="heap-stat">
              <span className="heap-label">Heap Total:</span>
              <span className="heap-value">
                {(data.nodeHeap.heapTotal / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <div className="heap-stat">
              <span className="heap-label">RSS:</span>
              <span className="heap-value">
                {(data.nodeHeap.rss / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <div className="heap-stat">
              <span className="heap-label">External:</span>
              <span className="heap-value">
                {(data.nodeHeap.external / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          </div>
          
          <div className="heap-progress">
            <div 
              className="progress-fill"
              style={{ 
                width: `${Math.min((data.nodeHeap.heapUsed / data.nodeHeap.heapTotal) * 100, 100)}%` 
              }}
            />
          </div>
          
          <div className="heap-percentage">
            Heap Usage: {((data.nodeHeap.heapUsed / data.nodeHeap.heapTotal) * 100).toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessMonitor;
