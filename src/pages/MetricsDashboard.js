import React, { useState, useEffect, useRef } from 'react';
import RealtimeMetricsChart from '../components/Charts/RealtimeMetricsChart';
import SystemMonitor from '../components/SystemMonitor';
import ServiceHealth from '../components/ServiceHealth';
import { apiRequest } from '../utils/api';

const MetricsDashboard = () => {
  const [wsData, setWsData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    connectWebSocket();
    loadInitialData();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const [metricsData, processData] = await Promise.all([
        apiRequest('metrics'),
        apiRequest('processes')
      ]);
      
      setWsData({
        ...metricsData,
        processes: processData.processes
      });
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const connectWebSocket = () => {
    try {
      console.log('Dashboard connecting to WebSocket for shared data...');
      wsRef.current = new WebSocket('ws://localhost:8001');
      
      wsRef.current.onopen = () => {
        console.log('Dashboard WebSocket connected');
        setIsConnected(true);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'metrics') {
            setWsData(message);
          }
        } catch (error) {
          console.error('Error parsing dashboard WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('Dashboard WebSocket disconnected');
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('Dashboard WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to connect dashboard WebSocket:', error);
      setTimeout(connectWebSocket, 3000);
    }
  };

  return (
    <div className="page-container">
            <div className="page-header">
        <h1>Real-time Metrics Dashboard</h1>
        <p>Live system monitoring with interactive charts and metrics</p>
        <div className="connection-status">
          <div className="status-indicator">
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
            <span className="status-text">
              {isConnected ? 'Live Data Connected' : 'Reconnecting...'}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Real-time Metrics Charts - Main Focus */}
        <div className="dashboard-card full-width">
          <RealtimeMetricsChart sharedWsData={wsData} />
        </div>
        
        {/* System Overview */}
        <div className="dashboard-card">
          <SystemMonitor wsData={wsData} />
        </div>
        
        {/* Service Health */}
        <div className="dashboard-card">
          <ServiceHealth />
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;
