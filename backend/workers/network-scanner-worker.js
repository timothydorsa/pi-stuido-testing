/**
 * Network Scanner Service Worker
 * Handles network discovery and device scanning in a separate process
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const ping = require('ping');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const DatabaseManager = require('../database/database-manager');

class NetworkScannerWorker {
  constructor() {
    this.databaseManager = null;
    this.isScanning = false;
    this.scanId = null;
    this.initializeDatabase();
  }

  async initializeDatabase() {
    try {
      this.databaseManager = new DatabaseManager();
      await this.databaseManager.initialize();
      console.log('Network scanner worker: Database initialized');
    } catch (error) {
      console.error('Network scanner worker: Failed to initialize database:', error);
      // Fall back to original OUI database
      const OUIDatabase = require('./oui-database');
      this.ouiDB = new OUIDatabase();
    }
  }

  async scanNetwork(config) {
    const { scanId, subnet, cidr, portScan, ports, enableHostname, enableManufacturer } = config;
    this.scanId = scanId;
    this.isScanning = true;

    try {
      this.sendProgress(scanId, 'Starting network scan...', 0);

      const devices = [];
      const subnetBase = subnet.split('.').slice(0, 3).join('.');
      const hostCount = Math.pow(2, 32 - cidr) - 2;
      const maxHosts = Math.min(hostCount, 254);

      // Phase 1: ARP Table Discovery
      this.sendProgress(scanId, 'Checking ARP table...', 5);
      const arpDevices = await this.getArpTableDevices();
      
      // Phase 2: Ping Sweep
      this.sendProgress(scanId, 'Performing ping sweep...', 15);
      const aliveHosts = await this.performPingSweep(subnetBase, maxHosts, scanId);

      // Phase 3: Combine and deduplicate results
      const allHosts = new Set();
      [...arpDevices, ...aliveHosts].forEach(host => allHosts.add(host.ip));

      let processedCount = 0;
      const totalHosts = allHosts.size;

      // Phase 4: Detailed device information gathering (with timeout per device)
      for (const ip of allHosts) {
        if (!this.isScanning) break; // Check for cancellation

        try {
          // Get comprehensive device information with 15-second timeout per device
          const device = await Promise.race([
            this.getComprehensiveDeviceInfo(ip, {
              portScan: portScan && ports,
              ports: ports || [],
              enableHostname,
              enableManufacturer,
              aliveHosts // Pass ping results for response time
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Device scan timeout for ${ip}`)), 15000)
            )
          ]);

          if (device) {
            devices.push(device);
          }
        } catch (error) {
          console.log(`Skipping device ${ip} due to timeout: ${error.message}`);
          // Continue with next device rather than failing entire scan
        }

        processedCount++;

        // Send progress update
        const progress = 50 + (processedCount / totalHosts) * 45;
        this.sendProgress(scanId, `Processing device ${ip}...`, progress);
      }

      // Sort devices by IP
      devices.sort((a, b) => {
        const aNum = a.ip.split('.').map(n => parseInt(n));
        const bNum = b.ip.split('.').map(n => parseInt(n));
        for (let i = 0; i < 4; i++) {
          if (aNum[i] !== bNum[i]) return aNum[i] - bNum[i];
        }
        return 0;
      });

      this.sendProgress(scanId, 'Scan completed', 100);
      this.sendResult(scanId, 'completed', { devices, totalFound: devices.length });
      
    } catch (error) {
      this.sendResult(scanId, 'error', { error: error.message });
    } finally {
      this.isScanning = false;
    }
  }

  async performPingSweep(subnetBase, maxHosts, scanId) {
    const aliveHosts = [];
    const batchSize = 10;
    const totalBatches = Math.ceil(maxHosts / batchSize);

    for (let batch = 0; batch < totalBatches; batch++) {
      if (!this.isScanning) break;

      const startIP = batch * batchSize + 1;
      const endIP = Math.min((batch + 1) * batchSize, maxHosts);
      
      const batchIPs = [];
      for (let i = startIP; i <= endIP; i++) {
        batchIPs.push(`${subnetBase}.${i}`);
      }

      const batchPromises = batchIPs.map(ip => this.pingHost(ip));
      const results = await Promise.allSettled(batchPromises);

      for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'fulfilled' && results[i].value.alive) {
          aliveHosts.push({
            ip: batchIPs[i],
            responseTime: results[i].value.time
          });
        }
      }

      // Update progress
      const progress = 15 + (batch / totalBatches) * 30;
      this.sendProgress(scanId, `Ping sweep: batch ${batch + 1}/${totalBatches}`, progress);

      // Small delay to avoid overwhelming the network
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return aliveHosts;
  }

  async pingHost(host) {
    try {
      const result = await ping.promise.probe(host, {
        timeout: 1,
        extra: ['-c', '1', '-W', '1000']
      });
      return {
        alive: result.alive,
        time: result.time || 0
      };
    } catch (error) {
      return { alive: false, time: 0 };
    }
  }

  async getArpTableDevices() {
    try {
      const { stdout } = await execAsync('arp -a');
      const devices = [];
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        const match = line.match(/\(([0-9.]+)\)\s+at\s+([0-9a-fA-F:]+)/);
        if (match) {
          const ip = match[1];
          const mac = match[2].toLowerCase();
          if (ip && mac && mac !== '(incomplete)') {
            devices.push({ ip, mac });
          }
        }
      }
      
      return devices;
    } catch (error) {
      return [];
    }
  }

  async getMacAddress(ip) {
    try {
      const methods = [
        () => execAsync(`arp -n ${ip} 2>/dev/null`),
        () => execAsync(`arp ${ip} 2>/dev/null`),
        () => execAsync('arp -a').then(result => {
          const lines = result.stdout.split('\n');
          const matchLine = lines.find(line => line.includes(`(${ip})`));
          return { stdout: matchLine || '' };
        })
      ];

      for (const method of methods) {
        try {
          const { stdout } = await method();
          const macMatch = stdout.match(/([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/);
          if (macMatch) {
            return macMatch[0].toLowerCase();
          }
        } catch (e) {
          continue;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async getHostname(ip) {
    try {
      const { stdout } = await execAsync(`nslookup ${ip}`, { timeout: 2000 });
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('name =')) {
          return line.split('name =')[1].trim().replace(/\.$/, '');
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async scanPorts(host, ports) {
    const openPorts = [];
    const portPromises = ports.map(port => this.checkPort(host, port));
    const results = await Promise.allSettled(portPromises);
    
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled' && results[i].value) {
        openPorts.push(ports[i]);
      }
    }
    
    return openPorts;
  }

  async checkPort(host, port) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 1000);
      
      socket.connect(port, host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  refineDeviceType(device) {
    const hostname = device.hostname?.toLowerCase() || '';
    const openPorts = device.commonPorts || [];
    
    // Check hostname patterns
    if (hostname.includes('router') || hostname.includes('gateway')) return 'router';
    if (hostname.includes('printer') || hostname.includes('print')) return 'printer';
    if (hostname.includes('tv') || hostname.includes('roku') || hostname.includes('chromecast')) return 'tv';
    if (hostname.includes('nas') || hostname.includes('storage')) return 'storage';
    if (hostname.includes('phone') || hostname.includes('iphone') || hostname.includes('android')) return 'mobile';
    if (hostname.includes('ipad') || hostname.includes('tablet')) return 'tablet';

    // Check by open ports
    if (openPorts.includes(9100)) return 'printer';
    if (openPorts.includes(80) || openPorts.includes(443)) {
      if (device.ip.endsWith('.1') || device.ip.endsWith('.254')) return 'router';
      return 'server';
    }
    if (openPorts.includes(22)) return 'server';
    if (openPorts.includes(3389)) return 'computer';
    if (openPorts.includes(5900)) return 'computer';
    if (openPorts.includes(445) || openPorts.includes(139)) return 'computer';

    return device.deviceType || 'unknown';
  }

  getDeviceIconFromType(deviceType, hostname) {
    switch (deviceType) {
      case 'router': return '🌐';
      case 'switch': case 'accesspoint': return '📡';
      case 'computer': return '💻';
      case 'mobile': return '📱';
      case 'tablet': return '📱';
      case 'printer': return '🖨️';
      case 'tv': return '📺';
      case 'console': return '🎮';
      case 'server': return '🖥️';
      case 'storage': return '💾';
      case 'iot': return '🏠';
      default: return '📱';
    }
  }

  cancelScan() {
    this.isScanning = false;
  }

  sendProgress(scanId, message, progress) {
    this.sendMessage({
      type: 'progress',
      scanId,
      message,
      progress: Math.round(progress)
    });
  }

  sendResult(scanId, status, data) {
    this.sendMessage({
      type: 'result',
      scanId,
      status,
      data
    });
  }

  sendMessage(message) {
    if (parentPort) {
      parentPort.postMessage(message);
    }
  }

  /**
   * Get comprehensive device information with enhanced detection capabilities
   */
  async getComprehensiveDeviceInfo(ip, options = {}) {
    try {
      const { aliveHosts = [], portScan, ports, enableHostname, enableManufacturer } = options;
      
      const deviceInfo = {
        ip,
        responseTime: null,
        mac: null,
        hostname: null,
        manufacturer: null,
        deviceType: 'unknown',
        deviceIcon: '📱',
        openPorts: [],
        commonPorts: [],
        services: [],
        operatingSystem: null,
        deviceModel: null,
        discoveryMethod: 'unknown',
        ipInfo: { ip },
        lastSeen: new Date().toISOString(),
        confidence: 'low',
        networkInfo: {},
        securityInfo: {}
      };

      // 1. Get response time from ping results
      const pingResult = aliveHosts.find(h => h.ip === ip);
      if (pingResult) {
        deviceInfo.responseTime = pingResult.responseTime || 0;
        deviceInfo.discoveryMethod = 'ping';
        deviceInfo.confidence = 'medium';
      }

      // 2. Enhanced MAC address lookup with multiple methods
      deviceInfo.mac = await this.getEnhancedMacAddress(ip);
      if (deviceInfo.mac) {
        deviceInfo.confidence = 'high';
        if (deviceInfo.discoveryMethod === 'unknown') {
          deviceInfo.discoveryMethod = 'arp';
        }
      }

      // 3. Enhanced hostname resolution
      if (enableHostname) {
        deviceInfo.hostname = await this.getEnhancedHostname(ip);
      }

      // 4. Enhanced manufacturer lookup and device categorization
      if (deviceInfo.mac && enableManufacturer) {
        let manufacturerInfo = null;
        
        try {
          // Try SQLite database first
          if (this.databaseManager) {
            manufacturerInfo = await this.databaseManager.lookupDevice(deviceInfo.mac);
          } else if (this.ouiDB) {
            // Fallback to original database
            manufacturerInfo = this.ouiDB.lookup(deviceInfo.mac);
          }
          
          if (manufacturerInfo && manufacturerInfo.manufacturer) {
            deviceInfo.manufacturer = manufacturerInfo.manufacturer;
            deviceInfo.deviceType = manufacturerInfo.type || 'unknown';
            deviceInfo.category = manufacturerInfo.category;
            deviceInfo.confidence = manufacturerInfo.confidence || 'medium';
            
            // Enhanced information from SQLite database
            if (manufacturerInfo.capabilities) {
              deviceInfo.capabilities = manufacturerInfo.capabilities;
            }
            if (manufacturerInfo.securityProfile) {
              deviceInfo.securityProfile = manufacturerInfo.securityProfile;
            }
            if (manufacturerInfo.icon) {
              deviceInfo.deviceIcon = manufacturerInfo.icon;
            }
          }
        } catch (error) {
          console.error('Database lookup error:', error);
          // Continue without manufacturer info
        }
      }

      // 5. Enhanced port scanning with service detection
      const allPorts = this.getComprehensivePortList(portScan, ports);
      const portResults = await this.performEnhancedPortScan(ip, allPorts);
      
      deviceInfo.commonPorts = portResults.commonPorts;
      deviceInfo.openPorts = portResults.allOpenPorts;
      deviceInfo.services = portResults.services;
      deviceInfo.operatingSystem = portResults.osGuess;
      deviceInfo.securityInfo = portResults.securityInfo;

      // 6. Device fingerprinting and classification
      deviceInfo.deviceType = this.classifyDeviceType(deviceInfo);
      deviceInfo.deviceIcon = this.getEnhancedDeviceIcon(deviceInfo);
      deviceInfo.deviceModel = this.guessDeviceModel(deviceInfo);

      // 7. Enhanced network information gathering
      const enhancedNetworkInfo = await this.getEnhancedNetworkInfo(ip);
      if (enhancedNetworkInfo) {
        deviceInfo.networkInfo = {
          ...this.gatherNetworkInfo(deviceInfo),
          ...enhancedNetworkInfo
        };
      } else {
        deviceInfo.networkInfo = this.gatherNetworkInfo(deviceInfo);
      }

      // 8. Additional device classification based on network behavior
      deviceInfo.systemType = this.classifySystemType(deviceInfo);
      deviceInfo.trustLevel = this.calculateTrustLevel(deviceInfo);
      
      // 9. Final classification enhancement for edge cases
      if (deviceInfo.deviceType === 'unknown' && deviceInfo.manufacturer && deviceInfo.manufacturer !== 'Unknown') {
        deviceInfo.deviceType = this.enhancedFallbackClassification(deviceInfo);
        // Re-classify system type with updated device type
        deviceInfo.systemType = this.classifySystemType(deviceInfo);
      }

      return deviceInfo;
    } catch (error) {
      console.error(`Error getting comprehensive device info for ${ip}:`, error);
      return null;
    }
  }

  /**
   * Enhanced MAC address lookup with multiple methods and retry logic
   */
  async getEnhancedMacAddress(ip) {
    const methods = [
      () => this.getMacFromArpTable(ip),
      () => this.getMacFromPingAndArp(ip),
      () => this.getMacFromNetworkScan(ip)
    ];

    for (const method of methods) {
      try {
        // Add 3-second timeout to prevent hanging
        const mac = await Promise.race([
          method(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('MAC lookup timeout')), 3000))
        ]);
        if (mac && mac !== '00:00:00:00:00:00') {
          return mac.toLowerCase();
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  }

  async getMacFromArpTable(ip) {
    try {
      const { stdout } = await execAsync(`arp -n ${ip}`);
      const macPattern = /([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/;
      const match = stdout.match(macPattern);
      return match ? match[0] : null;
    } catch (error) {
      return null;
    }
  }

  async getMacFromPingAndArp(ip) {
    try {
      // Force ARP entry creation
      await execAsync(`ping -c 1 -W 1 ${ip} >/dev/null 2>&1`);
      await new Promise(resolve => setTimeout(resolve, 100));
      return await this.getMacFromArpTable(ip);
    } catch (error) {
      return null;
    }
  }

  async getMacFromNetworkScan(ip) {
    try {
      // Try using ip neighbor (Linux) or arp (macOS/Linux)
      const commands = [`ip neighbor show ${ip}`, `arp -a ${ip}`];
      
      for (const cmd of commands) {
        try {
          const { stdout } = await execAsync(cmd);
          const macPattern = /([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/;
          const match = stdout.match(macPattern);
          if (match) return match[0];
        } catch (error) {
          continue;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Enhanced hostname resolution with multiple methods
   */
  async getEnhancedHostname(ip) {
    const methods = [
      () => this.getHostnameFromDNS(ip),
      () => this.getHostnameFromNBT(ip),
      () => this.getHostnameFromMDNS(ip),
      () => this.getHostnameFromSNMP(ip)
    ];

    for (const method of methods) {
      try {
        // Add 5-second timeout to prevent hanging on DNS/hostname lookups
        const hostname = await Promise.race([
          method(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Hostname lookup timeout')), 5000))
        ]);
        if (hostname && hostname !== ip && !hostname.includes('NXDOMAIN')) {
          return hostname;
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  }

  async getHostnameFromDNS(ip) {
    try {
      const { stdout } = await execAsync(`nslookup ${ip} 2>/dev/null | grep 'name =' | head -1`);
      if (stdout.trim()) {
        const hostname = stdout.split('name =')[1].trim().replace(/\.$/, '');
        return hostname;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getHostnameFromNBT(ip) {
    try {
      const { stdout } = await execAsync(`nmblookup -A ${ip} 2>/dev/null | grep '<00>' | grep -v GROUP | head -1`);
      if (stdout.trim()) {
        const hostname = stdout.trim().split(/\s+/)[0];
        return hostname;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getHostnameFromMDNS(ip) {
    try {
      const { stdout } = await execAsync(`avahi-resolve-address ${ip} 2>/dev/null`);
      if (stdout.trim()) {
        const parts = stdout.trim().split(/\s+/);
        return parts.length > 1 ? parts[1] : null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getHostnameFromSNMP(ip) {
    try {
      // Try SNMP if available (for network devices)
      const { stdout } = await execAsync(`snmpget -v2c -c public ${ip} 1.3.6.1.2.1.1.5.0 2>/dev/null`);
      if (stdout.includes('STRING:')) {
        const hostname = stdout.split('STRING:')[1].trim().replace(/"/g, '');
        return hostname;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get comprehensive port list for scanning
   */
  getComprehensivePortList(portScan, userPorts) {
    // Enhanced common ports for better device identification
    const commonPorts = [
      21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 995,
      1433, 3389, 5900, 8080, 8443, 9100, 161, 162, 554, 1900, 5353
    ];

    if (portScan && userPorts && userPorts.length > 0) {
      // Combine common ports with user-specified ports
      const allPorts = [...new Set([...commonPorts, ...userPorts])];
      return { commonPorts, allPorts };
    }

    return { commonPorts, allPorts: commonPorts };
  }

  /**
   * Enhanced port scanning with service detection and OS fingerprinting
   */
  async performEnhancedPortScan(ip, portConfig) {
    const { commonPorts, allPorts } = portConfig;
    const results = {
      commonPorts: [],
      allOpenPorts: [],
      services: [],
      osGuess: null,
      securityInfo: {
        hasFirewall: false,
        commonVulnerablePorts: [],
        encryptedServices: [],
        unencryptedServices: []
      }
    };

    try {
      // Scan common ports first
      const commonPortResults = await this.scanPortsBatch(ip, commonPorts);
      results.commonPorts = commonPortResults;

      // Scan all ports if user requested additional ports
      if (allPorts.length > commonPorts.length) {
        const allPortResults = await this.scanPortsBatch(ip, allPorts);
        results.allOpenPorts = allPortResults;
      } else {
        results.allOpenPorts = commonPortResults;
      }

      // Get detailed service information for open ports
      for (const port of results.allOpenPorts) {
        const serviceInfo = await this.getDetailedServiceInfo(ip, port);
        if (serviceInfo) {
          results.services.push(serviceInfo);
          
          // Categorize security aspects
          if (this.isEncryptedService(port)) {
            results.securityInfo.encryptedServices.push(port);
          } else {
            results.securityInfo.unencryptedServices.push(port);
          }
          
          if (this.isKnownVulnerableService(port)) {
            results.securityInfo.commonVulnerablePorts.push(port);
          }
        }
      }

      // OS fingerprinting
      results.osGuess = this.performOSFingerprinting(results.allOpenPorts, results.services);
      
      // Firewall detection
      results.securityInfo.hasFirewall = this.detectFirewall(results.allOpenPorts, allPorts);

      return results;
    } catch (error) {
      console.error(`Enhanced port scan error for ${ip}:`, error);
      return results;
    }
  }

  async scanPortsBatch(ip, ports) {
    const openPorts = [];
    const batchSize = 20; // Scan in batches to avoid overwhelming the target
    
    for (let i = 0; i < ports.length; i += batchSize) {
      const batch = ports.slice(i, i + batchSize);
      const batchPromises = batch.map(port => this.scanSinglePortWithTimeout(ip, port, 2000));
      
      try {
        const results = await Promise.allSettled(batchPromises);
        for (let j = 0; j < results.length; j++) {
          if (results[j].status === 'fulfilled' && results[j].value) {
            openPorts.push(batch[j]);
          }
        }
      } catch (error) {
        // Continue with next batch
      }
      
      // Small delay between batches to be respectful
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return openPorts;
  }

  async scanSinglePortWithTimeout(ip, port, timeout = 2000) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, timeout);
      
      socket.connect(port, ip, () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
    });
  }

  async getDetailedServiceInfo(ip, port) {
    const serviceMap = {
      21: { name: 'FTP', description: 'File Transfer Protocol', category: 'file-transfer' },
      22: { name: 'SSH', description: 'Secure Shell', category: 'remote-access' },
      23: { name: 'Telnet', description: 'Telnet Protocol', category: 'remote-access' },
      25: { name: 'SMTP', description: 'Simple Mail Transfer Protocol', category: 'email' },
      53: { name: 'DNS', description: 'Domain Name System', category: 'network' },
      80: { name: 'HTTP', description: 'Hypertext Transfer Protocol', category: 'web' },
      110: { name: 'POP3', description: 'Post Office Protocol v3', category: 'email' },
      135: { name: 'RPC', description: 'Microsoft RPC Endpoint Mapper', category: 'system' },
      139: { name: 'NetBIOS', description: 'NetBIOS Session Service', category: 'file-sharing' },
      143: { name: 'IMAP', description: 'Internet Message Access Protocol', category: 'email' },
      443: { name: 'HTTPS', description: 'HTTP over SSL/TLS', category: 'web' },
      445: { name: 'SMB', description: 'Server Message Block', category: 'file-sharing' },
      993: { name: 'IMAPS', description: 'IMAP over SSL', category: 'email' },
      995: { name: 'POP3S', description: 'POP3 over SSL', category: 'email' },
      1433: { name: 'MSSQL', description: 'Microsoft SQL Server', category: 'database' },
      3389: { name: 'RDP', description: 'Remote Desktop Protocol', category: 'remote-access' },
      5900: { name: 'VNC', description: 'Virtual Network Computing', category: 'remote-access' },
      8080: { name: 'HTTP-Alt', description: 'HTTP Alternative', category: 'web' },
      8443: { name: 'HTTPS-Alt', description: 'HTTPS Alternative', category: 'web' },
      9100: { name: 'JetDirect', description: 'HP JetDirect Printing', category: 'printing' },
      161: { name: 'SNMP', description: 'Simple Network Management Protocol', category: 'management' },
      554: { name: 'RTSP', description: 'Real Time Streaming Protocol', category: 'media' },
      1900: { name: 'UPnP', description: 'Universal Plug and Play', category: 'discovery' },
      5353: { name: 'mDNS', description: 'Multicast DNS', category: 'discovery' }
    };

    const serviceInfo = serviceMap[port] || {
      name: `Port ${port}`,
      description: 'Unknown Service',
      category: 'unknown'
    };

    // Try to get banner/version information
    const bannerInfo = await this.getBannerInfo(ip, port);
    if (bannerInfo) {
      serviceInfo.banner = bannerInfo.banner;
      serviceInfo.version = bannerInfo.version;
      serviceInfo.product = bannerInfo.product;
    }

    return {
      port,
      ...serviceInfo,
      detected: new Date().toISOString()
    };
  }

  async getBannerInfo(ip, port) {
    try {
      return new Promise((resolve) => {
        const net = require('net');
        const socket = new net.Socket();
        let banner = '';
        
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve(null);
        }, 3000);
        
        socket.connect(port, ip, () => {
          // Send a generic probe
          socket.write('HEAD / HTTP/1.0\\r\\n\\r\\n');
        });
        
        socket.on('data', (data) => {
          banner += data.toString();
          if (banner.length > 1024) { // Limit banner size
            clearTimeout(timeout);
            socket.destroy();
            resolve(this.parseBanner(banner));
          }
        });
        
        socket.on('error', () => {
          clearTimeout(timeout);
          resolve(null);
        });
        
        // Give time to receive banner
        setTimeout(() => {
          clearTimeout(timeout);
          socket.destroy();
          resolve(banner ? this.parseBanner(banner) : null);
        }, 2000);
      });
    } catch (error) {
      return null;
    }
  }

  parseBanner(banner) {
    const result = { banner: banner.substring(0, 200) };
    
    // Extract server information
    const serverMatch = banner.match(/Server:\\s*([^\\r\\n]+)/i);
    if (serverMatch) {
      result.product = serverMatch[1];
    }
    
    // Extract version information
    const versionMatch = banner.match(/(\\d+\\.\\d+(?:\\.\\d+)?)/);
    if (versionMatch) {
      result.version = versionMatch[1];
    }
    
    return result;
  }

  isEncryptedService(port) {
    const encryptedPorts = [22, 443, 993, 995, 8443];
    return encryptedPorts.includes(port);
  }

  isKnownVulnerableService(port) {
    const vulnerablePorts = [21, 23, 135, 139, 445, 1433];
    return vulnerablePorts.includes(port);
  }

  performOSFingerprinting(openPorts, services) {
    // Simple OS fingerprinting based on open ports and services
    if (openPorts.includes(3389)) return 'Windows';
    if (openPorts.includes(22) && openPorts.includes(80)) return 'Linux';
    if (openPorts.includes(22) && services.some(s => s.banner?.includes('OpenSSH'))) return 'Linux/Unix';
    if (openPorts.includes(445) && openPorts.includes(135)) return 'Windows';
    if (openPorts.includes(5900)) return 'macOS/Linux';
    if (openPorts.includes(9100)) return 'Printer/Embedded';
    if (openPorts.includes(161)) return 'Network Device';
    
    return 'Unknown';
  }

  detectFirewall(openPorts, scannedPorts) {
    // Simple firewall detection based on response patterns
    const commonPorts = [80, 443, 22, 21, 25];
    const openCommonPorts = openPorts.filter(p => commonPorts.includes(p));
    
    // If very few common ports are open, likely has firewall
    return openCommonPorts.length < 2 && scannedPorts.length > 10;
  }

  classifyDeviceType(deviceInfo) {
    const { openPorts, hostname, manufacturer, services, mac, ip } = deviceInfo;
    
    // Router/Gateway detection
    if (openPorts.includes(80) && openPorts.includes(443) && (
        hostname?.includes('router') || 
        manufacturer?.toLowerCase().includes('netgear') ||
        manufacturer?.toLowerCase().includes('linksys') ||
        manufacturer?.toLowerCase().includes('cisco') ||
        manufacturer?.toLowerCase().includes('ubiquiti') ||
        ip?.endsWith('.1') || ip?.endsWith('.254')
    )) {
      return 'router';
    }
    
    // Printer detection
    if (openPorts.includes(9100) || openPorts.includes(631) || 
        manufacturer?.toLowerCase().includes('hp') ||
        manufacturer?.toLowerCase().includes('canon') ||
        manufacturer?.toLowerCase().includes('epson') ||
        manufacturer?.toLowerCase().includes('brother') ||
        hostname?.includes('printer')) {
      return 'printer';
    }
    
    // Smart TV / Media device detection
    if (openPorts.includes(8008) || openPorts.includes(8009) ||
        manufacturer?.toLowerCase().includes('samsung') ||
        manufacturer?.toLowerCase().includes('lg') ||
        manufacturer?.toLowerCase().includes('sony') ||
        manufacturer?.toLowerCase().includes('roku') ||
        hostname?.includes('tv') || hostname?.includes('roku') || hostname?.includes('chromecast')) {
      return 'tv';
    }
    
    // Server detection
    if (openPorts.includes(22) && openPorts.includes(80) && openPorts.length > 5) {
      return 'server';
    }
    
    // IoT device detection
    if (openPorts.includes(1900) || openPorts.includes(5353) ||
        manufacturer?.toLowerCase().includes('google') ||
        manufacturer?.toLowerCase().includes('amazon') ||
        manufacturer?.toLowerCase().includes('philips') ||
        hostname?.includes('nest') || hostname?.includes('alexa')) {
      return 'iot';
    }
    
    // Mobile device detection (Apple)
    if (manufacturer?.toLowerCase().includes('apple')) {
      if (hostname?.includes('iphone') || mac?.startsWith('0c:4d:e') || mac?.startsWith('a8:96:7')) {
        return 'mobile';
      }
      if (hostname?.includes('ipad')) {
        return 'tablet';
      }
      if (hostname?.includes('watch')) {
        return 'wearable';
      }
      // Default for Apple devices without specific identification
      return 'computer';
    }
    
    // Mobile device detection (Android/Samsung)
    if (manufacturer?.toLowerCase().includes('samsung') || 
        manufacturer?.toLowerCase().includes('huawei') ||
        manufacturer?.toLowerCase().includes('xiaomi') ||
        manufacturer?.toLowerCase().includes('oneplus')) {
      if (hostname?.toLowerCase().includes('galaxy') || 
          hostname?.toLowerCase().includes('phone') ||
          openPorts.length < 3) {
        return 'mobile';
      }
      // Samsung also makes TVs, printers, etc.
      return 'unknown';
    }
    
    // Network equipment detection
    if (openPorts.includes(161) || openPorts.includes(162) ||
        manufacturer?.toLowerCase().includes('cisco') ||
        manufacturer?.toLowerCase().includes('netgear') ||
        manufacturer?.toLowerCase().includes('tp-link') ||
        manufacturer?.toLowerCase().includes('d-link')) {
      return 'network';
    }
    
    // Computer detection based on ports
    if (openPorts.includes(22) || openPorts.includes(3389) || openPorts.includes(5900) ||
        openPorts.includes(445) || openPorts.includes(139)) {
      return 'computer';
    }
    
    // Gaming console detection
    if (manufacturer?.toLowerCase().includes('sony') ||
        manufacturer?.toLowerCase().includes('microsoft') ||
        manufacturer?.toLowerCase().includes('nintendo')) {
      return 'console';
    }
    
    // Enhanced manufacturer-based classification
    if (manufacturer?.toLowerCase().includes('dell') || 
        manufacturer?.toLowerCase().includes('hp') ||
        manufacturer?.toLowerCase().includes('lenovo') ||
        manufacturer?.toLowerCase().includes('asus') ||
        manufacturer?.toLowerCase().includes('acer')) {
      return 'computer';
    }
    
    if (manufacturer?.toLowerCase().includes('raspberry pi')) {
      return 'computer';
    }
    
    // Japanese manufacturers - often IoT or specialized devices
    if (manufacturer?.includes('Kyoto') || 
        manufacturer?.includes('Tokyo') ||
        manufacturer?.includes('Osaka') ||
        manufacturer?.toLowerCase().includes('nintendo') ||
        manufacturer?.toLowerCase().includes('panasonic') ||
        manufacturer?.toLowerCase().includes('mitsubishi')) {
      // Check if it has IoT-like characteristics
      if (openPorts.length < 3 && !openPorts.includes(22) && !openPorts.includes(80)) {
        return 'iot';
      }
      return 'unknown';
    }
    
    // If no open ports detected, likely a simple device or has strong firewall
    if (openPorts.length === 0) {
      return 'unknown';
    }
    
    // If only standard web ports are open
    if (openPorts.length <= 2 && (openPorts.includes(80) || openPorts.includes(443))) {
      return 'iot';
    }
    
    return 'unknown';
  }

  getEnhancedDeviceIcon(deviceInfo) {
    const { deviceType, manufacturer, hostname, openPorts, systemType } = deviceInfo;
    
    // First try device type classification
    switch (deviceType) {
      case 'router':
        return '🌐';
      case 'printer':
        return '🖨️';
      case 'server':
        return '🖥️';
      case 'network':
        return '🔧';
      case 'tv':
        return '📺';
      case 'console':
        return '🎮';
      case 'tablet':
        return '📱';
      case 'wearable':
        return '⌚';
      case 'computer':
        if (manufacturer?.toLowerCase().includes('apple')) {
          if (hostname?.includes('macbook')) return '💻';
          if (hostname?.includes('imac')) return '🖥️';
          return '🍎';
        }
        if (manufacturer?.toLowerCase().includes('raspberry pi')) return '🥧';
        return '💻';
      case 'mobile':
        if (manufacturer?.toLowerCase().includes('apple')) return '📱';
        if (manufacturer?.toLowerCase().includes('samsung')) return '📱';
        return '📱';
      case 'iot':
        if (manufacturer?.toLowerCase().includes('google')) return '🏠';
        if (manufacturer?.toLowerCase().includes('amazon')) return '🔊';
        if (manufacturer?.toLowerCase().includes('philips')) return '💡';
        return '🌐';
    }
    
    // If device type is unknown, try to infer from manufacturer and ports
    if (manufacturer) {
      const mfg = manufacturer.toLowerCase();
      
      // Network equipment
      if (mfg.includes('cisco') || mfg.includes('netgear') || mfg.includes('linksys')) return '🌐';
      
      // Printers
      if (mfg.includes('hp') || mfg.includes('canon') || mfg.includes('epson')) return '🖨️';
      
      // Apple devices
      if (mfg.includes('apple')) {
        if (hostname?.includes('iphone')) return '📱';
        if (hostname?.includes('ipad')) return '📱';
        if (hostname?.includes('watch')) return '⌚';
        if (hostname?.includes('tv')) return '📺';
        return '🍎';
      }
      
      // Smart TVs
      if (mfg.includes('samsung') || mfg.includes('lg') || mfg.includes('sony')) {
        if (openPorts.includes(8008) || openPorts.includes(8080)) return '📺';
      }
      
      // Gaming consoles
      if (mfg.includes('sony') || mfg.includes('microsoft') || mfg.includes('nintendo')) return '🎮';
      
      // IoT devices
      if (mfg.includes('google') || mfg.includes('amazon') || mfg.includes('philips')) return '🏠';
      
      // Japanese electronics (could be various devices)
      if (manufacturer.includes('Kyoto') || manufacturer.includes('Tokyo') || manufacturer.includes('Osaka')) {
        if (openPorts.includes(80) || openPorts.includes(443)) return '�';
        return '📟';
      }
    }
    
    // Fallback based on open ports
    if (openPorts.includes(9100) || openPorts.includes(631)) return '🖨️';
    if (openPorts.includes(80) && openPorts.includes(443) && openPorts.length < 5) return '🌐';
    if (openPorts.includes(22) && openPorts.length > 3) return '💻';
    if (openPorts.includes(3389)) return '🖥️';
    if (openPorts.includes(1900) || openPorts.includes(5353)) return '🏠';
    if (openPorts.includes(8008) || openPorts.includes(8080)) return '📺';
    
    // Final fallback
    if (openPorts.length > 5) return '�️'; // Likely a server/computer
    if (openPorts.length > 0) return '🌐'; // Some kind of networked device
    return '📱'; // Simple device, possibly mobile or IoT
  }

  guessDeviceModel(deviceInfo) {
    const { manufacturer, hostname, services, mac } = deviceInfo;
    
    // Basic model detection based on available information
    if (manufacturer?.toLowerCase().includes('apple')) {
      if (hostname?.includes('macbook')) return 'MacBook';
      if (hostname?.includes('imac')) return 'iMac';
      if (hostname?.includes('iphone')) return 'iPhone';
      if (hostname?.includes('ipad')) return 'iPad';
    }
    
    if (manufacturer?.toLowerCase().includes('raspberry pi')) {
      return 'Raspberry Pi';
    }
    
    return null;
  }

  gatherNetworkInfo(deviceInfo) {
    const { ip, responseTime, openPorts, mac } = deviceInfo;
    
    return {
      ipVersion: ip.includes(':') ? 'IPv6' : 'IPv4',
      responseTime,
      portCount: openPorts.length,
      lastScanned: new Date().toISOString(),
      macAddress: mac,
      subnet: this.calculateSubnet(ip),
      networkSegment: this.getNetworkSegment(ip)
    };
  }

  calculateSubnet(ip) {
    // Extract subnet from IP (assuming /24)
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }

  getNetworkSegment(ip) {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
  }

  /**
   * Enhanced network discovery with comprehensive network information
   */
  async getEnhancedNetworkInfo(ip) {
    try {
      const networkInfo = {
        ip,
        subnet: null,
        gateway: null,
        dns: [],
        dhcp: null,
        networkType: 'unknown',
        routingInfo: {},
        networkSpeed: null,
        bandwidth: null
      };

      // Get routing table information
      const routingInfo = await this.getRoutingInfo(ip);
      if (routingInfo) {
        networkInfo.gateway = routingInfo.gateway;
        networkInfo.subnet = routingInfo.subnet;
        networkInfo.routingInfo = routingInfo;
      }

      // Get DNS servers
      const dnsServers = await this.getDNSServers();
      networkInfo.dns = dnsServers;

      // Get DHCP information if available
      const dhcpInfo = await this.getDHCPInfo(ip);
      if (dhcpInfo) {
        networkInfo.dhcp = dhcpInfo;
      }

      // Determine network type
      networkInfo.networkType = this.classifyNetworkType(ip, networkInfo);

      return networkInfo;
    } catch (error) {
      console.error('Error gathering enhanced network info:', error);
      return null;
    }
  }

  async getRoutingInfo(targetIP) {
    try {
      // Get default gateway and routing information
      const { stdout } = await execAsync('netstat -rn | grep default || route -n | grep "^0.0.0.0"');
      const lines = stdout.split('\n').filter(line => line.trim());
      
      if (lines.length > 0) {
        const fields = lines[0].trim().split(/\s+/);
        const gateway = fields.find(field => /^\d+\.\d+\.\d+\.\d+$/.test(field));
        
        if (gateway) {
          // Get subnet mask
          const subnetInfo = await this.getSubnetInfo(targetIP);
          return {
            gateway,
            subnet: subnetInfo.subnet,
            netmask: subnetInfo.netmask,
            interface: fields[fields.length - 1]
          };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getSubnetInfo(ip) {
    try {
      // Try to get interface information
      const { stdout } = await execAsync('ifconfig -a || ip addr show');
      const lines = stdout.split('\n');
      
      // Look for the interface containing our IP
      let currentInterface = null;
      for (const line of lines) {
        if (line.includes('inet ') && line.includes(ip.split('.').slice(0, 3).join('.'))) {
          const match = line.match(/inet\s+(\d+\.\d+\.\d+\.\d+)\/(\d+)/);
          if (match) {
            const cidr = parseInt(match[2]);
            const netmask = this.cidrToNetmask(cidr);
            const subnet = this.calculateSubnetFromCIDR(match[1], cidr);
            return { subnet, netmask, cidr };
          }
        }
      }
      
      // Default to /24 if not found
      return {
        subnet: ip.split('.').slice(0, 3).join('.') + '.0/24',
        netmask: '255.255.255.0',
        cidr: 24
      };
    } catch (error) {
      return {
        subnet: ip.split('.').slice(0, 3).join('.') + '.0/24',
        netmask: '255.255.255.0',
        cidr: 24
      };
    }
  }

  async getDNSServers() {
    try {
      const dnsServers = [];
      
      // Try multiple methods to get DNS servers
      const methods = [
        () => execAsync('cat /etc/resolv.conf | grep nameserver'),
        () => execAsync('scutil --dns | grep nameserver'),
        () => execAsync('nslookup google.com | grep Server')
      ];

      for (const method of methods) {
        try {
          const { stdout } = await method();
          const lines = stdout.split('\n');
          for (const line of lines) {
            const match = line.match(/(\d+\.\d+\.\d+\.\d+)/);
            if (match && !dnsServers.includes(match[1])) {
              dnsServers.push(match[1]);
            }
          }
          if (dnsServers.length > 0) break;
        } catch (error) {
          continue;
        }
      }

      return dnsServers;
    } catch (error) {
      return [];
    }
  }

  async getDHCPInfo(ip) {
    try {
      // Try to get DHCP lease information
      const dhcpPaths = [
        '/var/lib/dhcp/dhclient.leases',
        '/var/lib/dhcp3/dhclient.leases',
        '/var/lib/NetworkManager/*.lease'
      ];

      for (const path of dhcpPaths) {
        try {
          const { stdout } = await execAsync(`cat ${path} 2>/dev/null | grep -A 10 -B 10 "${ip}"`);
          if (stdout.includes(ip)) {
            // Parse DHCP lease info
            const dhcpServer = this.extractDHCPServer(stdout);
            const leaseTime = this.extractLeaseTime(stdout);
            return { server: dhcpServer, leaseTime };
          }
        } catch (error) {
          continue;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  classifyNetworkType(ip, networkInfo) {
    const ipParts = ip.split('.').map(n => parseInt(n));
    
    // Private IP ranges
    if ((ipParts[0] === 10) ||
        (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) ||
        (ipParts[0] === 192 && ipParts[1] === 168)) {
      return 'private';
    }
    
    // Loopback
    if (ipParts[0] === 127) {
      return 'loopback';
    }
    
    // Link-local
    if (ipParts[0] === 169 && ipParts[1] === 254) {
      return 'link-local';
    }
    
    return 'public';
  }

  cidrToNetmask(cidr) {
    const mask = (0xffffffff << (32 - cidr)) >>> 0;
    return [
      (mask >>> 24) & 0xff,
      (mask >>> 16) & 0xff,
      (mask >>> 8) & 0xff,
      mask & 0xff
    ].join('.');
  }

  calculateSubnetFromCIDR(ip, cidr) {
    const ipParts = ip.split('.').map(n => parseInt(n));
    const mask = (0xffffffff << (32 - cidr)) >>> 0;
    
    const networkParts = ipParts.map((part, index) => {
      const maskPart = (mask >>> (24 - index * 8)) & 0xff;
      return part & maskPart;
    });
    
    return networkParts.join('.') + '/' + cidr;
  }

  extractDHCPServer(leaseData) {
    const match = leaseData.match(/dhcp-server-identifier\s+(\d+\.\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  }

  extractLeaseTime(leaseData) {
    const match = leaseData.match(/lease\s+{[\s\S]*?starts\s+\d+\s+([^;]+)/);
    return match ? match[1] : null;
  }

  /**
   * Classify system type based on detected characteristics
   */
  classifySystemType(deviceInfo) {
    const { openPorts, services, manufacturer, hostname, deviceType } = deviceInfo;
    
    // Check for specific port patterns
    const hasWebServer = openPorts.some(port => [80, 443, 8080, 8443].includes(port));
    const hasSSH = openPorts.includes(22);
    const hasRDP = openPorts.includes(3389);
    const hasSMB = openPorts.some(port => [139, 445].includes(port));
    const hasPrinter = openPorts.includes(9100);
    const hasRouter = openPorts.some(port => [53, 161, 162].includes(port));
    const hasDatabase = openPorts.some(port => [1433, 3306, 5432].includes(port));
    const hasUPnP = openPorts.includes(1900);
    const hasmDNS = openPorts.includes(5353);
    
    // Enhanced manufacturer-based classification
    if (manufacturer && manufacturer !== 'Unknown') {
      const mfg = manufacturer.toLowerCase();
      
      // Network equipment manufacturers
      if (mfg.includes('cisco') || mfg.includes('netgear') || mfg.includes('linksys') || 
          mfg.includes('tp-link') || mfg.includes('d-link') || mfg.includes('ubiquiti')) {
        return 'Network Equipment';
      }
      
      // Printer manufacturers
      if (mfg.includes('hp') || mfg.includes('canon') || mfg.includes('epson') || 
          mfg.includes('brother') || mfg.includes('lexmark')) {
        return 'Printer/Scanner';
      }
      
      // Apple devices
      if (mfg.includes('apple')) {
        if (hostname?.includes('iphone') || hostname?.includes('mobile')) return 'iPhone/iOS Device';
        if (hostname?.includes('ipad') || hostname?.includes('tablet')) return 'iPad/Tablet';
        if (hostname?.includes('watch')) return 'Apple Watch';
        if (hostname?.includes('tv') || hostname?.includes('appletv')) return 'Apple TV';
        if (hostname?.includes('macbook') || hostname?.includes('mac')) return 'Mac Computer';
        return 'Apple Device';
      }
      
      // Samsung devices
      if (mfg.includes('samsung')) {
        if (hostname?.toLowerCase().includes('galaxy') || hostname?.toLowerCase().includes('phone')) return 'Samsung Phone';
        if (hostname?.toLowerCase().includes('tablet')) return 'Samsung Tablet';
        if (hostname?.toLowerCase().includes('tv')) return 'Samsung Smart TV';
        return 'Samsung Device';
      }
      
      // Computer manufacturers
      if (mfg.includes('dell') || mfg.includes('lenovo') || mfg.includes('asus') || 
          mfg.includes('acer') || mfg.includes('msi')) {
        return 'Computer/Workstation';
      }
      
      // Gaming consoles
      if (mfg.includes('sony') && (hostname?.includes('playstation') || hostname?.includes('ps'))) {
        return 'PlayStation Console';
      }
      if (mfg.includes('microsoft') && (hostname?.includes('xbox') || hasRDP)) {
        return 'Xbox Console';
      }
      if (mfg.includes('nintendo')) {
        return 'Nintendo Console';
      }
      
      // Smart TV manufacturers
      if (mfg.includes('lg') || mfg.includes('sony') || mfg.includes('roku')) {
        if (hasWebServer || hasUPnP) return 'Smart TV/Media Device';
      }
      
      // IoT/Smart home manufacturers
      if (mfg.includes('google') || mfg.includes('nest')) return 'Google/Nest Device';
      if (mfg.includes('amazon') || mfg.includes('echo')) return 'Amazon Alexa Device';
      if (mfg.includes('philips') && (hasUPnP || hasmDNS)) return 'Philips Hue/Smart Device';
      
      // Raspberry Pi
      if (mfg.includes('raspberry pi')) return 'Raspberry Pi';
      
      // Japanese manufacturers (often specialized equipment)
      if (manufacturer.includes('Kyoto') || manufacturer.includes('Tokyo') || 
          manufacturer.includes('Osaka') || mfg.includes('panasonic') || 
          mfg.includes('mitsubishi') || mfg.includes('sony')) {
        if (hasWebServer && hasUPnP) return 'Smart Device/Appliance';
        if (openPorts.length < 3) return 'Embedded Device';
        return 'Japanese Electronics';
      }
    }
    
    // Port-based classification (fallback when manufacturer isn't helpful)
    if (hasPrinter) return 'Printer/Scanner';
    if (hasRouter && hasWebServer) return 'Router/Gateway';
    if (hasDatabase) return 'Database Server';
    if (hasRDP && hasSMB) return 'Windows Server/Workstation';
    if (hasSSH && hasWebServer) return 'Linux/Unix Server';
    if (hasSSH && !hasWebServer) return 'Linux/Unix Workstation';
    if (hasSMB && !hasRDP) return 'Network Storage/NAS';
    if (hasUPnP && hasmDNS) return 'UPnP/Media Device';
    if (hasWebServer && openPorts.length < 5) return 'Web Interface Device';
    
    // Fallback based on device type
    switch (deviceType) {
      case 'router': return 'Router/Gateway';
      case 'printer': return 'Printer/Scanner';
      case 'mobile': return 'Mobile Device';
      case 'tablet': return 'Tablet Device';
      case 'computer': return 'Computer/Workstation';
      case 'server': return 'Server';
      case 'iot': return 'IoT Device';
      case 'tv': return 'Smart TV/Media Device';
      case 'console': return 'Gaming Console';
      case 'network': return 'Network Equipment';
      case 'wearable': return 'Wearable Device';
      default: return 'Unknown Device';
    }
  }

  /**
   * Calculate trust level based on various factors
   */
  calculateTrustLevel(deviceInfo) {
    const { openPorts, services, manufacturer, hostname, responseTime, securityInfo } = deviceInfo;
    let score = 50; // Start with neutral score
    
    // Positive factors
    if (manufacturer && manufacturer !== 'Unknown') score += 15;
    if (hostname && hostname !== 'Unknown') score += 10;
    if (responseTime && responseTime < 10) score += 5;
    if (openPorts.length < 5) score += 10; // Fewer open ports = higher trust
    
    // Security-related factors
    if (openPorts.includes(22)) score += 5; // SSH available
    if (openPorts.includes(443)) score += 5; // HTTPS available
    
    // Negative factors
    if (openPorts.length > 20) score -= 20; // Too many open ports
    if (openPorts.includes(23)) score -= 15; // Telnet (insecure)
    if (openPorts.includes(21)) score -= 10; // FTP (potentially insecure)
    if (!hostname || hostname === 'Unknown') score -= 5;
    
    // Manufacturer-based adjustments
    if (manufacturer) {
      const trusted = ['Apple', 'Microsoft', 'Google', 'Amazon', 'Cisco', 'HP', 'Dell'];
      const untrusted = ['Unknown', 'Generic'];
      
      if (trusted.some(brand => manufacturer.includes(brand))) score += 10;
      if (untrusted.some(brand => manufacturer.includes(brand))) score -= 5;
    }
    
    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));
    
    // Convert to trust level
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    if (score >= 40) return 'Low';
    return 'Very Low';
  }

  /**
   * Enhanced fallback classification for devices with manufacturer info but unclear type
   */
  enhancedFallbackClassification(deviceInfo) {
    const { manufacturer, openPorts, hostname, mac } = deviceInfo;
    
    if (!manufacturer || manufacturer === 'Unknown') return 'unknown';
    
    const mfg = manufacturer.toLowerCase();
    
    // Network infrastructure companies
    if (mfg.includes('cisco') || mfg.includes('netgear') || mfg.includes('linksys') || 
        mfg.includes('tp-link') || mfg.includes('d-link') || mfg.includes('ubiquiti') ||
        mfg.includes('aruba') || mfg.includes('juniper')) {
      return 'network';
    }
    
    // Computer/server manufacturers
    if (mfg.includes('dell') || mfg.includes('hp') || mfg.includes('lenovo') || 
        mfg.includes('asus') || mfg.includes('acer') || mfg.includes('msi') ||
        mfg.includes('intel') || mfg.includes('supermicro')) {
      return 'computer';
    }
    
    // Mobile device manufacturers
    if (mfg.includes('samsung') || mfg.includes('huawei') || mfg.includes('xiaomi') ||
        mfg.includes('oneplus') || mfg.includes('oppo') || mfg.includes('vivo')) {
      // Could be phone, tablet, or TV - check hostname/ports for clues
      if (hostname?.toLowerCase().includes('tv') || openPorts.includes(8080)) return 'tv';
      if (openPorts.length < 3) return 'mobile';
      return 'unknown';
    }
    
    // Apple devices
    if (mfg.includes('apple')) {
      if (hostname?.includes('iphone')) return 'mobile';
      if (hostname?.includes('ipad')) return 'tablet';
      if (hostname?.includes('watch')) return 'wearable';
      if (hostname?.includes('tv')) return 'tv';
      if (openPorts.includes(22) || openPorts.includes(5900)) return 'computer';
      return 'computer'; // Default for Apple devices
    }
    
    // Printer manufacturers
    if (mfg.includes('canon') || mfg.includes('epson') || mfg.includes('brother') ||
        mfg.includes('lexmark') || mfg.includes('xerox')) {
      return 'printer';
    }
    
    // Gaming console manufacturers
    if (mfg.includes('sony') || mfg.includes('microsoft') || mfg.includes('nintendo')) {
      if (hostname?.includes('playstation') || hostname?.includes('xbox') || 
          hostname?.includes('nintendo') || hostname?.includes('switch')) {
        return 'console';
      }
      // Sony also makes TVs, cameras, etc.
      if (openPorts.includes(8080) || openPorts.includes(8008)) return 'tv';
      return 'unknown';
    }
    
    // Smart TV manufacturers
    if (mfg.includes('lg') || mfg.includes('roku') || mfg.includes('tcl') ||
        mfg.includes('vizio') || mfg.includes('sharp')) {
      return 'tv';
    }
    
    // IoT/Smart home manufacturers
    if (mfg.includes('google') || mfg.includes('amazon') || mfg.includes('philips') ||
        mfg.includes('nest') || mfg.includes('ring') || mfg.includes('ecobee')) {
      return 'iot';
    }
    
    // Japanese manufacturers (often specialized electronics)
    if (manufacturer.includes('Japan') || manufacturer.includes('Tokyo') || 
        manufacturer.includes('Osaka') || manufacturer.includes('Kyoto') ||
        mfg.includes('panasonic') || mfg.includes('mitsubishi') || 
        mfg.includes('toshiba') || mfg.includes('sharp')) {
      // Could be various types of devices
      if (openPorts.includes(80) || openPorts.includes(443)) {
        if (openPorts.length < 5) return 'iot';
        return 'computer';
      }
      return 'iot'; // Default for Japanese electronics with no clear ports
    }
    
    // If manufacturer is present but doesn't match known patterns
    // Make educated guess based on port behavior
    if (openPorts.length === 0) return 'mobile'; // Likely mobile or simple IoT
    if (openPorts.length < 3 && (openPorts.includes(80) || openPorts.includes(443))) return 'iot';
    if (openPorts.length > 10) return 'computer'; // Likely server or workstation
    
    return 'unknown';
  }
}

// Worker thread execution
if (!isMainThread) {
  const worker = new NetworkScannerWorker();
  
  parentPort.on('message', async (message) => {
    const { type, data } = message;
    
    switch (type) {
      case 'scan':
        await worker.scanNetwork(data);
        break;
      case 'cancel':
        worker.cancelScan();
        break;
      case 'terminate':
        process.exit(0);
        break;
    }
  });

  // Handle worker termination
  process.on('SIGTERM', () => {
    worker.cancelScan();
    process.exit(0);
  });
}

module.exports = NetworkScannerWorker;
