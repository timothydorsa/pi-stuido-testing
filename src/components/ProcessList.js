import React, { useState, useEffect } from 'react';

const ProcessList = () => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProcesses();
    const interval = setInterval(loadProcesses, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadProcesses = async () => {
    try {
      // Fetch from backend API since we need process info
      const response = await fetch('http://localhost:3001/api/processes');
      const data = await response.json();
      setProcesses(data.processes || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading processes:', error);
      setLoading(false);
    }
  };

  const formatMemory = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatCPU = (cpu) => {
    if (cpu === undefined || cpu === null) return 'N/A';
    return `${cpu.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div>
        <h3 className="card-title">Process List</h3>
        <div className="loading">Loading processes...</div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="card-title">Top Processes</h3>
      
      {processes.length === 0 ? (
        <div>No process data available</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="process-table">
            <thead>
              <tr>
                <th>PID</th>
                <th>Name</th>
                <th>CPU %</th>
                <th>Memory</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {processes.slice(0, 10).map((process, index) => (
                <tr key={index}>
                  <td>{process.pid}</td>
                  <td title={process.command}>
                    {process.name.length > 20 
                      ? `${process.name.substring(0, 20)}...` 
                      : process.name
                    }
                  </td>
                  <td>{formatCPU(process.cpu)}</td>
                  <td>{formatMemory(process.mem)}</td>
                  <td>
                    <span style={{ 
                      color: process.state === 'running' ? '#00ff00' : 
                             process.state === 'sleeping' ? '#ffaa00' : '#cccccc' 
                    }}>
                      {process.state || 'unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#cccccc' }}>
        Showing top 10 processes • Updates every 10 seconds
      </div>
    </div>
  );
};

export default ProcessList;
