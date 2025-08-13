import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

const ProcessList = () => {
  const [processes, setProcesses] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState('pi-studio');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [processData, sysData] = await Promise.all([
        apiRequest('processes'),
        apiRequest('system')
      ]);
      
      setProcesses(processData.processes || []);
      setSystemInfo(sysData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const categorizeProceses = () => {
    const piStudioProcesses = [];
    const otherProcesses = [];
    
    processes.forEach(process => {
      const name = process.name.toLowerCase();
      const command = (process.command || '').toLowerCase();
      
      // Check if process is related to Pi Studio
      if (
        name.includes('electron') ||
        name.includes('node') ||
        name.includes('webpack') ||
        name.includes('npm') ||
        command.includes('pi-studio') ||
        command.includes('webpack') ||
        command.includes('electron') ||
        process.pid === process.ppid // Main processes
      ) {
        piStudioProcesses.push(process);
      } else {
        otherProcesses.push(process);
      }
    });
    
    return {
      piStudio: piStudioProcesses.slice(0, 10),
      other: otherProcesses.slice(0, 20)
    };
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

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderProcessTable = (processList, title) => (
    <div className="process-section">
      <div 
        className="section-header"
        onClick={() => toggleSection(title.toLowerCase().replace(' ', '-'))}
        style={{ 
          cursor: 'pointer', 
          padding: '10px',
          backgroundColor: '#2a2a2a',
          borderRadius: '4px',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h4 style={{ margin: 0 }}>{title} ({processList.length})</h4>
        <span>{expandedSection === title.toLowerCase().replace(' ', '-') ? '▼' : '▶'}</span>
      </div>
      
      {expandedSection === title.toLowerCase().replace(' ', '-') && (
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
              {processList.map((process, index) => (
                <tr key={index}>
                  <td>{process.pid}</td>
                  <td title={process.command}>
                    {process.name.length > 25 
                      ? `${process.name.substring(0, 25)}...` 
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
    </div>
  );

  const renderSystemInfo = () => (
    <div className="process-section">
      <div 
        className="section-header"
        onClick={() => toggleSection('system-info')}
        style={{ 
          cursor: 'pointer', 
          padding: '10px',
          backgroundColor: '#2a2a2a',
          borderRadius: '4px',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h4 style={{ margin: 0 }}>System Information</h4>
        <span>{expandedSection === 'system-info' ? '▼' : '▶'}</span>
      </div>
      
      {expandedSection === 'system-info' && systemInfo && (
        <div className="system-info-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '10px',
          padding: '10px'
        }}>
          <div className="info-card">
            <h5>CPU</h5>
            <p><strong>Brand:</strong> {systemInfo.cpu?.brand}</p>
            <p><strong>Cores:</strong> {systemInfo.cpu?.cores}</p>
            <p><strong>Speed:</strong> {systemInfo.cpu?.speed} GHz</p>
          </div>
          
          <div className="info-card">
            <h5>Memory</h5>
            <p><strong>Total:</strong> {formatBytes(systemInfo.memory?.total)}</p>
            <p><strong>Used:</strong> {formatBytes(systemInfo.memory?.used)}</p>
            <p><strong>Free:</strong> {formatBytes(systemInfo.memory?.free)}</p>
          </div>
          
          <div className="info-card">
            <h5>Operating System</h5>
            <p><strong>Platform:</strong> {systemInfo.os?.platform}</p>
            <p><strong>Distro:</strong> {systemInfo.os?.distro}</p>
            <p><strong>Release:</strong> {systemInfo.os?.release}</p>
            <p><strong>Hostname:</strong> {systemInfo.os?.hostname}</p>
          </div>
          
          <div className="info-card">
            <h5>Load Average</h5>
            <p><strong>Current:</strong> {systemInfo.load?.currentLoad?.toFixed(2)}%</p>
            <p><strong>User:</strong> {systemInfo.load?.currentLoadUser?.toFixed(2)}%</p>
            <p><strong>System:</strong> {systemInfo.load?.currentLoadSystem?.toFixed(2)}%</p>
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div>
        <h3 className="card-title">System Overview</h3>
        <div className="loading">Loading system data...</div>
      </div>
    );
  }

  const categorized = categorizeProceses();

  return (
    <div>
      <h3 className="card-title">System Overview</h3>
      
      {renderProcessTable(categorized.piStudio, 'Pi Studio Processes')}
      {renderProcessTable(categorized.other, 'Other System Processes')}
      {renderSystemInfo()}
      
      <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#cccccc' }}>
        Updates every 10 seconds • Click sections to expand/collapse
      </div>
    </div>
  );
};

export default ProcessList;
