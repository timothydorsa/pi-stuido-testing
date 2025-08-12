import React from 'react';

const ServiceHealth = ({ services }) => {
  // Mock services for testing
  const mockServices = [
    {
      name: 'Express Backend',
      pid: 12345,
      status: 'running',
      cpu: 15.2,
      memory: 64 * 1024 * 1024, // 64MB
      uptime: 300000 // 5 minutes
    },
    {
      name: 'Electron Main Process',
      pid: 12346,
      status: 'running',
      cpu: 8.5,
      memory: 128 * 1024 * 1024, // 128MB
      uptime: 300000 // 5 minutes
    }
  ];

  const displayServices = services && services.length > 0 ? services : mockServices;
  const isLoading = !services || services.length === 0;

  if (isLoading) {
    console.log('ServiceHealth: No service data provided, using mock data for display');
  }
  const formatUptime = (uptime) => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatMemory = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getServiceClass = (status, cpu) => {
    if (status === 'error') return 'error';
    if (cpu > 50) return 'warning';
    return '';
  };

  return (
    <div>
      <h3 className="card-title">
        Service Health ({displayServices.length})
        {isLoading && <span style={{ fontSize: '0.8em', color: '#ffaa00' }}> (Demo Data)</span>}
      </h3>
      
      {displayServices.map((service, index) => (
          <div 
            key={index} 
            className={`service-item ${getServiceClass(service.status, service.cpu)}`}
          >
            <div className="service-name">{service.name}</div>
            <div className="service-details">
              <div className="service-detail">
                <strong>PID:</strong> {service.pid}
              </div>
              <div className="service-detail">
                <strong>Status:</strong> {service.status}
              </div>
              {service.cpu !== undefined && (
                <div className="service-detail">
                  <strong>CPU:</strong> {service.cpu.toFixed(2)}%
                </div>
              )}
              {service.memory !== undefined && (
                <div className="service-detail">
                  <strong>Memory:</strong> {formatMemory(service.memory)}
                </div>
              )}
              {service.uptime !== undefined && (
                <div className="service-detail">
                  <strong>Uptime:</strong> {formatUptime(service.uptime)}
                </div>
              )}
              {service.error && (
                <div className="service-detail" style={{ color: '#ff4444' }}>
                  <strong>Error:</strong> {service.error}
                </div>
              )}
            </div>
          </div>
        ))
      }
    </div>
  );
};

export default ServiceHealth;
