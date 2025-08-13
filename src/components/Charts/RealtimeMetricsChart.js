import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../utils/api';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import './RealtimeMetricsChart.scss';

const RealtimeMetricsChart = () => {
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const wsRef = useRef(null);
  const maxDataPoints = 100; // Keep last 100 data points

  // Color schemes for different metrics
  const colors = {
    cpu: '#8884d8',
    memory: '#82ca9d',
    memoryUsed: '#ffc658',
    memoryFree: '#ff7300',
    networkRx: '#00bcd4',
    networkTx: '#e91e63',
    diskRead: '#9c27b0',
    diskWrite: '#ff9800',
    processes: '#4caf50',
    services: '#2196f3'
  };

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
      const data = await apiRequest('metrics');
      const processedData = processMetricsData(data);
      setCurrentMetrics(data);
      setMetricsHistory([processedData]);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to load initial metrics:', error);
      setIsConnected(false);
    }
  };

  const connectWebSocket = () => {
    try {
      console.log('Attempting to connect to WebSocket...');
      wsRef.current = new WebSocket('ws://localhost:8001');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected for metrics');
        setWsStatus('connected');
        setIsConnected(true);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'metrics') {
            handleMetricsUpdate(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setWsStatus('disconnected');
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsStatus('error');
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setWsStatus('error');
      setTimeout(connectWebSocket, 3000);
    }
  };

  const handleMetricsUpdate = (wsMessage) => {
    // Use WebSocket data directly for real-time updates
    try {
      console.log('Processing metrics update from WebSocket');
      // Extract metrics data from WebSocket message
      const data = {
        cpu: wsMessage.cpu,
        memory: wsMessage.memory,
        network: wsMessage.network,
        disk: wsMessage.disk,
        processes: wsMessage.processes,
        nodeHeap: wsMessage.nodeHeap,
        timestamp: wsMessage.timestamp
      };
      
      const processedData = processMetricsData(data);
      console.log('Processed metrics data:', processedData);
      
      setCurrentMetrics(data);
      setMetricsHistory(prev => {
        const updated = [...prev, processedData];
        // Keep only the last N data points
        if (updated.length > maxDataPoints) {
          return updated.slice(-maxDataPoints);
        }
        return updated;
      });
    } catch (error) {
      console.error('Failed to process WebSocket metrics:', error);
      // Fallback to API request if WebSocket data is incomplete
      fallbackToApiRequest();
    }
  };

  const fallbackToApiRequest = async () => {
    try {
      const data = await apiRequest('metrics');
      const processedData = processMetricsData(data);
      
      setCurrentMetrics(data);
      setMetricsHistory(prev => {
        const updated = [...prev, processedData];
        if (updated.length > maxDataPoints) {
          return updated.slice(-maxDataPoints);
        }
        return updated;
      });
    } catch (error) {
      console.error('Fallback API request failed:', error);
    }
  };

  const processMetricsData = (data) => {
    const timestamp = new Date().toLocaleTimeString();
    
    return {
      timestamp,
      time: Date.now(),
      // CPU metrics
      cpuLoad: data.cpu?.currentLoad || 0,
      cpuUser: data.cpu?.currentLoadUser || 0,
      cpuSystem: data.cpu?.currentLoadSystem || 0,
      cpuIdle: data.cpu?.currentLoadIdle || 0,
      
      // Memory metrics (convert to GB)
      memoryTotal: data.memory?.total ? (data.memory.total / (1024**3)) : 0,
      memoryUsed: data.memory?.used ? (data.memory.used / (1024**3)) : 0,
      memoryFree: data.memory?.free ? (data.memory.free / (1024**3)) : 0,
      memoryAvailable: data.memory?.available ? (data.memory.available / (1024**3)) : 0,
      memoryUsagePercent: data.memory?.total ? ((data.memory.used / data.memory.total) * 100) : 0,
      
      // Network metrics (convert to MB/s)
      networkRx: data.network?.[0]?.rx_sec ? (data.network[0].rx_sec / (1024**2)) : 0,
      networkTx: data.network?.[0]?.tx_sec ? (data.network[0].tx_sec / (1024**2)) : 0,
      
      // Disk I/O metrics
      diskRead: data.disk?.rIO_sec || 0,
      diskWrite: data.disk?.wIO_sec || 0,
      
      // Process metrics
      totalProcesses: data.processes?.total || 0,
      runningProcesses: data.processes?.running || 0,
      sleepingProcesses: data.processes?.sleeping || 0,
      
      // Node.js heap metrics (convert to MB)
      nodeHeapUsed: data.nodeHeap?.heapUsed ? (data.nodeHeap.heapUsed / (1024**2)) : 0,
      nodeHeapTotal: data.nodeHeap?.heapTotal ? (data.nodeHeap.heapTotal / (1024**2)) : 0,
      nodeRSS: data.nodeHeap?.rss ? (data.nodeHeap.rss / (1024**2)) : 0
    };
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercent = (value) => `${value.toFixed(1)}%`;

  const ConnectionStatus = () => (
    <div className="connection-status">
      <div className={`status-indicator ${wsStatus}`}>
        <span className="status-dot"></span>
        <span className="status-text">
          {wsStatus === 'connected' ? 'Live Data' : 
           wsStatus === 'disconnected' ? 'Disconnected' : 'Connection Error'}
        </span>
      </div>
      <div className="data-points">
        {metricsHistory.length} data points
      </div>
    </div>
  );

  // CPU usage pie chart data
  const cpuData = currentMetrics ? [
    { name: 'User', value: currentMetrics.cpu?.currentLoadUser || 0, color: '#8884d8' },
    { name: 'System', value: currentMetrics.cpu?.currentLoadSystem || 0, color: '#82ca9d' },
    { name: 'Idle', value: currentMetrics.cpu?.currentLoadIdle || 0, color: '#ffc658' }
  ] : [];

  // Memory usage pie chart data  
  const memoryData = currentMetrics ? [
    { name: 'Used', value: (currentMetrics.memory?.used || 0) / (1024**3), color: '#ff7300' },
    { name: 'Available', value: (currentMetrics.memory?.available || 0) / (1024**3), color: '#00bcd4' },
    { name: 'Cached', value: (currentMetrics.memory?.buffcache || 0) / (1024**3), color: '#e91e63' }
  ] : [];

  // Process distribution data
  const processData = currentMetrics ? [
    { name: 'Running', value: currentMetrics.processes?.running || 0, color: '#4caf50' },
    { name: 'Sleeping', value: currentMetrics.processes?.sleeping || 0, color: '#2196f3' },
    { name: 'Blocked', value: currentMetrics.processes?.blocked || 0, color: '#ff9800' }
  ] : [];

  return (
    <div className="realtime-metrics-chart">
      <div className="chart-header">
        <h2>Real-time System Metrics Dashboard</h2>
        <ConnectionStatus />
      </div>

      {!isConnected && (
        <div className="connection-warning">
          <p>⚠️ Not connected to live data. Attempting to reconnect...</p>
        </div>
      )}

      <div className="charts-grid">
        {/* CPU Usage Over Time */}
        <div className="chart-container">
          <h3>CPU Usage Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metricsHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="cpuLoad" 
                stackId="1"
                stroke={colors.cpu} 
                fill={colors.cpu}
                fillOpacity={0.6}
                name="Total CPU %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* CPU Breakdown Pie Chart */}
        <div className="chart-container">
          <h3>Current CPU Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={cpuData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
              >
                {cpuData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Memory Usage Over Time */}
        <div className="chart-container">
          <h3>Memory Usage Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metricsHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(2)} GB`} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="memoryUsed" 
                stroke={colors.memoryUsed}
                strokeWidth={2}
                name="Used Memory (GB)"
              />
              <Line 
                type="monotone" 
                dataKey="memoryAvailable" 
                stroke={colors.memory}
                strokeWidth={2}
                name="Available Memory (GB)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Memory Distribution Pie Chart */}
        <div className="chart-container">
          <h3>Current Memory Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={memoryData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value.toFixed(1)} GB`}
              >
                {memoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value.toFixed(2)} GB`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Network Traffic Over Time */}
        <div className="chart-container">
          <h3>Network Traffic Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metricsHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(2)} MB/s`} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="networkRx" 
                stroke={colors.networkRx}
                strokeWidth={2}
                name="Download (MB/s)"
              />
              <Line 
                type="monotone" 
                dataKey="networkTx" 
                stroke={colors.networkTx}
                strokeWidth={2}
                name="Upload (MB/s)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Disk I/O Over Time */}
        <div className="chart-container">
          <h3>Disk I/O Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metricsHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(2)} ops/s`} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="diskRead" 
                stackId="1"
                stroke={colors.diskRead} 
                fill={colors.diskRead}
                fillOpacity={0.6}
                name="Read (ops/s)"
              />
              <Area 
                type="monotone" 
                dataKey="diskWrite" 
                stackId="2"
                stroke={colors.diskWrite} 
                fill={colors.diskWrite}
                fillOpacity={0.6}
                name="Write (ops/s)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Process Count Over Time */}
        <div className="chart-container">
          <h3>Process Count Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metricsHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="totalProcesses" 
                stroke={colors.processes}
                strokeWidth={2}
                name="Total Processes"
              />
              <Line 
                type="monotone" 
                dataKey="runningProcesses" 
                stroke={colors.services}
                strokeWidth={2}
                name="Running Processes"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Process Distribution */}
        <div className="chart-container">
          <h3>Current Process Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={processData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {processData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Node.js Heap Memory */}
        <div className="chart-container">
          <h3>Node.js Heap Memory Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metricsHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(2)} MB`} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="nodeHeapUsed" 
                stackId="1"
                stroke="#8884d8" 
                fill="#8884d8"
                fillOpacity={0.6}
                name="Heap Used (MB)"
              />
              <Area 
                type="monotone" 
                dataKey="nodeRSS" 
                stackId="2"
                stroke="#82ca9d" 
                fill="#82ca9d"
                fillOpacity={0.6}
                name="RSS Memory (MB)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Current Metrics Summary */}
        <div className="chart-container metrics-summary">
          <h3>Current System Status</h3>
          {currentMetrics && (
            <div className="metrics-grid">
              <div className="metric-item">
                <div className="metric-label">CPU Load</div>
                <div className="metric-value">{currentMetrics.cpu?.currentLoad.toFixed(1)}%</div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Memory Used</div>
                <div className="metric-value">{formatBytes(currentMetrics.memory?.used || 0)}</div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Memory Available</div>
                <div className="metric-value">{formatBytes(currentMetrics.memory?.available || 0)}</div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Total Processes</div>
                <div className="metric-value">{currentMetrics.processes?.total || 0}</div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Network RX</div>
                <div className="metric-value">{formatBytes(currentMetrics.network?.[0]?.rx_sec || 0)}/s</div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Network TX</div>
                <div className="metric-value">{formatBytes(currentMetrics.network?.[0]?.tx_sec || 0)}/s</div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Disk Read</div>
                <div className="metric-value">{(currentMetrics.disk?.rIO_sec || 0).toFixed(1)} ops/s</div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Disk Write</div>
                <div className="metric-value">{(currentMetrics.disk?.wIO_sec || 0).toFixed(1)} ops/s</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealtimeMetricsChart;
