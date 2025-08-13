import React, { useState, useEffect } from 'react';
import './NetworkScanner.scss';
import { apiRequest } from '../../utils/api';

const NetworkScanner = () => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [devices, setDevices] = useState([]);

  // Debug logging for devices state changes
  useEffect(() => {
    console.log('Devices state updated:', devices.length, devices);
  }, [devices]);

  // Debug logging for scanProgress state changes
  useEffect(() => {
    console.log('ScanProgress state updated:', scanProgress);
  }, [scanProgress]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ progress: 0, message: '', scanId: null });
  const [scanConfig, setScanConfig] = useState({
    subnet: 'auto',
    customSubnet: '',
    cidr: 24,
    portScan: false,
    commonPorts: [22, 23, 53, 80, 443, 993, 995, 8080, 8443, 3389, 5900]
  });
  const [expandedDevice, setExpandedDevice] = useState(null);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    loadNetworkInfo();
    initializeWebSocket();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const initializeWebSocket = () => {
    try {
      const websocket = new WebSocket('ws://localhost:8001');
      
      websocket.onopen = () => {
        console.log('NetworkScanner connected to WebSocket');
        setWs(websocket);
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      websocket.onclose = () => {
        console.log('NetworkScanner WebSocket connection closed');
        setWs(null);
        // Attempt to reconnect after 5 seconds
        setTimeout(initializeWebSocket, 5000);
      };
      
      websocket.onerror = (error) => {
        console.error('NetworkScanner WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  };

  const handleWebSocketMessage = (data) => {
    console.log('NetworkScanner received WebSocket message:', data);
    
    switch (data.type) {
      case 'networkScanProgress':
        console.log('Progress - Current scanProgress.scanId:', scanProgress.scanId);
        console.log('Progress - Message scanId:', data.scanId);
        console.log('Progress - ScanId match:', data.scanId === scanProgress.scanId);
        
        // Update progress if scanId matches OR if we don't have a scanId yet
        if (data.scanId === scanProgress.scanId || scanProgress.scanId === null) {
          setScanProgress(prev => ({
            ...prev,
            scanId: data.scanId, // Update scanId if it was null
            progress: data.progress || 0,
            message: data.message || 'Scanning...'
          }));
        }
        break;
        
      case 'deviceDiscovered':
        console.log('Device discovered:', data.device);
        console.log('DeviceDiscovered - Current scanProgress.scanId:', scanProgress.scanId);
        console.log('DeviceDiscovered - Message scanId:', data.scanId);
        
        // Update device if scanId matches OR if we don't have a scanId yet
        if ((data.scanId === scanProgress.scanId || scanProgress.scanId === null) && data.device) {
          // Update scanId if it was null
          if (scanProgress.scanId === null) {
            setScanProgress(prev => ({ ...prev, scanId: data.scanId }));
          }
          
          // Add device immediately when discovered
          setDevices(prev => {
            const existing = prev.find(d => d.ip === data.device.ip);
            if (existing) {
              // Update existing device
              return prev.map(d => d.ip === data.device.ip ? { ...d, ...data.device } : d);
            } else {
              // Add new device
              return [...prev, data.device];
            }
          });
        }
        break;
        
      case 'networkScanResult':
        console.log('Network scan result:', data);
        console.log('ScanResult - Current scanProgress.scanId:', scanProgress.scanId);
        console.log('ScanResult - Message scanId:', data.scanId);
        console.log('ScanResult - ScanId match:', data.scanId === scanProgress.scanId);
        
        // Update devices if scanId matches OR if we don't have a scanId yet
        if ((data.scanId === scanProgress.scanId || scanProgress.scanId === null) && data.data && data.data.devices) {
          console.log('Processing devices from scan result:', data.data.devices);
          
          // Update scanId if it was null
          if (scanProgress.scanId === null) {
            setScanProgress(prev => ({ ...prev, scanId: data.scanId }));
          }
          
          // Update devices with batch results
          setDevices(prev => {
            console.log('Previous devices:', prev);
            const newDevices = [...prev];
            data.data.devices.forEach(newDevice => {
              const existingIndex = newDevices.findIndex(d => d.ip === newDevice.ip);
              if (existingIndex >= 0) {
                newDevices[existingIndex] = { ...newDevices[existingIndex], ...newDevice };
              } else {
                newDevices.push(newDevice);
              }
            });
            console.log('Updated devices:', newDevices);
            return newDevices;
          });
        } else {
          console.log('Scan result not processed - scanId mismatch or missing data');
        }
        break;
        
      case 'networkScanComplete':
        console.log('Network scan complete:', data);
        console.log('Complete - Current scanProgress.scanId:', scanProgress.scanId);
        console.log('Complete - Message scanId:', data.scanId);
        
        // Mark as complete if scanId matches OR if we don't have a scanId yet
        if (data.scanId === scanProgress.scanId || scanProgress.scanId === null) {
          setScanning(false);
          setScanProgress(prev => ({
            ...prev,
            scanId: data.scanId, // Update scanId if it was null
            progress: 100,
            message: 'Scan completed'
          }));
        }
        break;
        
      case 'networkScanError':
        if (data.scanId === scanProgress.scanId) {
          setScanning(false);
          setScanProgress(prev => ({
            ...prev,
            message: `Scan error: ${data.error}`
          }));
        }
        break;
        
      default:
        break;
    }
  };

  const loadNetworkInfo = async () => {
    try {
      const data = await apiRequest('network-info');
      setNetworkInfo(data);
      
      // Auto-detect subnet
      if (data.interfaces && data.interfaces.length > 0) {
        const primaryInterface = data.interfaces.find(iface => 
          iface.ip4 && !iface.ip4.startsWith('127.') && !iface.ip4.startsWith('169.254.')
        );
        if (primaryInterface) {
          const ipParts = primaryInterface.ip4.split('.');
          const subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0`;
          setScanConfig(prev => ({ ...prev, customSubnet: subnet }));
        }
      }
    } catch (error) {
      console.error('Error loading network info:', error);
    }
  };

  const getSubnetFromCIDR = (ip, cidr) => {
    const ipNum = ip.split('.').reduce((num, octet) => (num << 8) + parseInt(octet), 0);
    const mask = (0xFFFFFFFF << (32 - cidr)) >>> 0;
    const networkNum = (ipNum & mask) >>> 0;
    
    return [
      (networkNum >>> 24) & 0xFF,
      (networkNum >>> 16) & 0xFF,
      (networkNum >>> 8) & 0xFF,
      networkNum & 0xFF
    ].join('.');
  };

  const startNetworkScan = async () => {
    setScanning(true);
    setDevices([]);
    setScanProgress({ progress: 0, message: 'Initializing scan...', scanId: null });
    
    try {
      let targetSubnet = scanConfig.customSubnet;
      
      if (scanConfig.subnet === 'auto' && networkInfo?.interfaces) {
        const primaryInterface = networkInfo.interfaces.find(iface => 
          iface.ip4 && !iface.ip4.startsWith('127.') && !iface.ip4.startsWith('169.254.')
        );
        if (primaryInterface) {
          targetSubnet = getSubnetFromCIDR(primaryInterface.ip4, scanConfig.cidr);
        }
      }

      const scanData = {
        subnet: `${targetSubnet}/${scanConfig.cidr}`,
        timeout: 3000,
        portScan: scanConfig.portScan,
        ports: scanConfig.commonPorts,
        enableHostname: true,
        enableManufacturer: true,
        enhancedScan: true,
        maxConcurrent: 20
      };

      console.log('Starting network scan with config:', scanData);

      const data = await apiRequest('network-scan', {
        method: 'POST',
        body: JSON.stringify(scanData)
      });

      const scanId = data.scanId;
      console.log('Setting scanProgress with scanId:', scanId);
      setScanProgress({ progress: 5, message: 'Scan started...', scanId });
      
      // WebSocket will handle real-time updates, no need to poll
      console.log(`Network scan started with ID: ${scanId}`);
    } catch (error) {
      console.error('Error during network scan:', error);
      setScanProgress({ progress: 0, message: `Error: ${error.message}`, scanId: null });
      setScanning(false);
    }
  };

  const getDeviceIcon = (device) => {
    const deviceType = device.deviceType?.toLowerCase() || 'unknown';
    const manufacturer = device.manufacturer?.toLowerCase() || '';
    const hostname = device.hostname?.toLowerCase() || '';
    const openPorts = device.commonPorts || device.openPorts || [];
    
    // Determine icon based on device type and characteristics
    switch (deviceType) {
      case 'router':
        return '🌐';
      case 'printer':
        return '🖨️';
      case 'tv':
        return '📺';
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📱';
      case 'computer':
        if (manufacturer.includes('apple')) {
          return '🖥️'; // Mac
        } else if (manufacturer.includes('raspberry pi')) {
          return '🥧'; // Raspberry Pi
        } else {
          return '💻'; // PC
        }
      case 'server':
        return '🖥️';
      case 'storage':
        return '💽';
      case 'iot':
        return '�';
      default:
        // Fallback logic based on other characteristics
        if (manufacturer.includes('apple')) {
          if (hostname.includes('iphone')) return '📱';
          if (hostname.includes('ipad')) return '📱';
          return '🍎';
        }
        if (manufacturer.includes('samsung') || manufacturer.includes('android')) {
          return '📱';
        }
        if (manufacturer.includes('cisco') || manufacturer.includes('netgear')) {
          return '🌐';
        }
        if (manufacturer.includes('hp') || manufacturer.includes('canon')) {
          return '🖨️';
        }
        if (manufacturer.includes('raspberry pi')) {
          return '🥧';
        }
        if (openPorts.includes(80) || openPorts.includes(443)) {
          return '🖥️';
        }
        if (openPorts.includes(22)) {
          return '�';
        }
        return '📱'; // Default generic device
    }
  };

  const renderDevice = (device, index) => {
    const isExpanded = expandedDevice === index;
    
    return (
      <div key={index} className="device-card">
        <div 
          className="device-header"
          onClick={() => setExpandedDevice(isExpanded ? null : index)}
        >
          <div className="device-icon">{getDeviceIcon(device)}</div>
          <div className="device-info">
            <div className="device-name">
              {device.hostname || `Device ${device.ip}`}
            </div>
            <div className="device-details">
              <span className="ip">{device.ip}</span>
              {device.manufacturer && (
                <span className="manufacturer">• {device.manufacturer}</span>
              )}
              {device.responseTime && (
                <span className="ping">• {device.responseTime}ms</span>
              )}
            </div>
          </div>
          <div className="expand-icon">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>

        {isExpanded && (
          <div className="device-expanded">
            <div className="device-properties">
              <div className="property">
                <label>IP Address:</label>
                <span>{device.ip}</span>
              </div>
              {device.mac && (
                <div className="property">
                  <label>MAC Address:</label>
                  <span>{device.mac}</span>
                </div>
              )}
              {device.hostname && (
                <div className="property">
                  <label>Hostname:</label>
                  <span>{device.hostname}</span>
                </div>
              )}
              {device.manufacturer && (
                <div className="property">
                  <label>Manufacturer:</label>
                  <span>{device.manufacturer}</span>
                </div>
              )}
              {device.deviceType && (
                <div className="property">
                  <label>Device Type:</label>
                  <span className="device-type">{device.deviceType}</span>
                </div>
              )}
              {device.systemType && (
                <div className="property">
                  <label>System Type:</label>
                  <span className="system-type">{device.systemType}</span>
                </div>
              )}
              {device.category && (
                <div className="property">
                  <label>Category:</label>
                  <span>{device.category}</span>
                </div>
              )}
              {device.trustLevel && (
                <div className="property">
                  <label>Trust Level:</label>
                  <span className={`trust-level ${device.trustLevel.toLowerCase().replace(' ', '-')}`}>
                    {device.trustLevel}
                  </span>
                </div>
              )}
              {device.responseTime && (
                <div className="property">
                  <label>Ping Response:</label>
                  <span>{device.responseTime}ms</span>
                </div>
              )}
              {device.lastSeen && (
                <div className="property">
                  <label>Last Seen:</label>
                  <span>{new Date(device.lastSeen).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Network Configuration */}
            {(device.networkInfo || device.subnet || device.gateway || device.dns) && (
              <div className="network-config">
                <h5>Network Configuration</h5>
                <div className="config-grid">
                  {(device.networkInfo?.subnet || device.subnet) && (
                    <div className="config-item">
                      <label>Subnet:</label>
                      <span>{device.networkInfo?.subnet || device.subnet}</span>
                    </div>
                  )}
                  {(device.networkInfo?.gateway || device.gateway) && (
                    <div className="config-item">
                      <label>Gateway:</label>
                      <span>{device.networkInfo?.gateway || device.gateway}</span>
                    </div>
                  )}
                  {(device.networkInfo?.dns || device.dns) && (
                    <div className="config-item">
                      <label>DNS:</label>
                      <span>
                        {Array.isArray(device.networkInfo?.dns || device.dns) 
                          ? (device.networkInfo?.dns || device.dns).join(', ') 
                          : (device.networkInfo?.dns || device.dns)}
                      </span>
                    </div>
                  )}
                  {device.networkInfo?.networkType && (
                    <div className="config-item">
                      <label>Network Type:</label>
                      <span className={`network-type ${device.networkInfo.networkType}`}>
                        {device.networkInfo.networkType.charAt(0).toUpperCase() + device.networkInfo.networkType.slice(1)}
                      </span>
                    </div>
                  )}
                  {device.networkInfo?.dhcp && (
                    <div className="config-item">
                      <label>DHCP Server:</label>
                      <span>{device.networkInfo.dhcp.server}</span>
                    </div>
                  )}
                  {device.networkInfo?.ipVersion && (
                    <div className="config-item">
                      <label>IP Version:</label>
                      <span>{device.networkInfo.ipVersion}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Open Ports & Services */}
            {device.openPorts && device.openPorts.length > 0 && (
              <div className="open-ports">
                <h5>Open Ports & Services</h5>
                <div className="ports-grid">
                  {device.openPorts.map((port, portIndex) => (
                    <div key={portIndex} className="port-card">
                      <span className="port-number">{port}</span>
                      <span className="port-service">
                        {getServiceName(port)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional detected services */}
            {device.services && device.services.length > 0 && (
              <div className="detected-services">
                <h5>Detected Services</h5>
                <div className="services-list">
                  {device.services.map((service, serviceIndex) => (
                    <div key={serviceIndex} className="service-item">
                      <span className="service-name">{service.name}</span>
                      {service.version && (
                        <span className="service-version">v{service.version}</span>
                      )}
                      {service.port && (
                        <span className="service-port">:{service.port}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const getServiceName = (port) => {
    const services = {
      22: 'SSH',
      23: 'Telnet',
      53: 'DNS',
      80: 'HTTP',
      443: 'HTTPS',
      993: 'IMAPS',
      995: 'POP3S',
      8080: 'HTTP Alt',
      8443: 'HTTPS Alt',
      3389: 'RDP',
      5900: 'VNC'
    };
    return services[port] || 'Unknown';
  };

  return (
    <div className="network-scanner">
      <h3 className="card-title">Network Scanner</h3>
      
      {/* Network Info */}
      {networkInfo && (
        <div className="network-info">
          <h4>Local Network Interfaces</h4>
          <div className="interfaces">
            {networkInfo.interfaces?.map((iface, index) => (
              <div key={index} className="interface-card">
                <strong>{iface.name}</strong>
                {iface.ip4 && <span>IPv4: {iface.ip4}</span>}
                {iface.ip6 && <span>IPv6: {iface.ip6}</span>}
                {iface.mac && <span>MAC: {iface.mac}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scan Configuration */}
      <div className="scan-config">
        <h4>Scan Configuration</h4>
        
        <div className="config-row">
          <label>Subnet Detection:</label>
          <select 
            value={scanConfig.subnet}
            onChange={(e) => setScanConfig(prev => ({ ...prev, subnet: e.target.value }))}
          >
            <option value="auto">Auto-detect</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        {scanConfig.subnet === 'manual' && (
          <div className="config-row">
            <label>Custom Subnet:</label>
            <input
              type="text"
              value={scanConfig.customSubnet}
              onChange={(e) => setScanConfig(prev => ({ ...prev, customSubnet: e.target.value }))}
              placeholder="192.168.1.0"
            />
          </div>
        )}

        <div className="config-row">
          <label>CIDR:</label>
          <select 
            value={scanConfig.cidr}
            onChange={(e) => setScanConfig(prev => ({ ...prev, cidr: parseInt(e.target.value) }))}
          >
            <option value={24}>/24 (256 hosts)</option>
            <option value={23}>/23 (512 hosts)</option>
            <option value={22}>/22 (1024 hosts)</option>
            <option value={25}>/25 (128 hosts)</option>
            <option value={26}>/26 (64 hosts)</option>
          </select>
        </div>

        <div className="config-row">
          <label>
            <input
              type="checkbox"
              checked={scanConfig.portScan}
              onChange={(e) => setScanConfig(prev => ({ ...prev, portScan: e.target.checked }))}
            />
            Scan for open ports
          </label>
        </div>

        <button 
          className="scan-button"
          onClick={startNetworkScan}
          disabled={scanning}
        >
          {scanning ? 'Scanning...' : 'Start Network Scan'}
        </button>
      </div>

      {/* Scan Results */}
      {scanning && (
        <div className="scanning">
          <div className="scan-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${scanProgress.progress}%` }}
              ></div>
            </div>
            <div className="progress-text">
              {scanProgress.progress}% - {scanProgress.message}
            </div>
            {scanProgress.scanId && (
              <div className="scan-id">Scan ID: {scanProgress.scanId}</div>
            )}
          </div>
        </div>
      )}

      {devices.length > 0 && (
        <div className="scan-results">
          <h4>Discovered Devices ({devices.length})</h4>
          <div className="devices-list">
            {devices.map((device, index) => renderDevice(device, index))}
          </div>
        </div>
      )}

      {!scanning && devices.length === 0 && (
        <div className="no-results">
          <p>No devices discovered. Click "Start Network Scan" to begin.</p>
        </div>
      )}
    </div>
  );
};

export default NetworkScanner;
