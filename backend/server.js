const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const si = require('systeminformation');
const { swaggerDocs } = require('./swagger');
const ping = require('ping');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const ServiceWorkerManager = require('./workers/service-worker-manager');
const OUIDatabase = require('./workers/oui-database');
const EnhancedServicesManager = require('./services/enhanced-services-manager');
const ChunkedNetworkScanner = require('./services/chunked-network-scanner');
const DeviceIntelligence = require('./services/device-intelligence');
const databaseRoutes = require('./routes/database');
const servicesRoutes = require('./routes/services');

class BackendServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.port = parseInt(process.env.PORT) || 8001;
    
    // Initialize OUI database and device intelligence first
    this.ouiDB = new OUIDatabase();
    this.deviceIntelligence = new DeviceIntelligence();
    
    // Initialize service worker manager with device intelligence
    this.workerManager = new ServiceWorkerManager(this.deviceIntelligence);
    
    // Initialize Enhanced Services Manager and Chunked Network Scanner
    this.servicesManager = new EnhancedServicesManager();
    this.chunkedNetworkScanner = new ChunkedNetworkScanner(this.servicesManager);
    
    // Make services manager globally available for routes
    global.servicesManager = this.servicesManager;
    global.chunkedNetworkScanner = this.chunkedNetworkScanner;
    global.deviceIntelligence = this.deviceIntelligence;
    
    // Setup global WebSocket broadcast for services manager
    global.wssBroadcast = this.broadcastToClients.bind(this);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupSwagger();
    this.setupWorkerEventHandlers();
    this.setupServicesManagerEventHandlers();
    this.start();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
  }
  
  setupSwagger() {
    swaggerDocs(this.app);
  }

  setupWorkerEventHandlers() {
    // Handle scan progress updates
    this.workerManager.on('scanProgress', (data) => {
      console.log('Broadcasting scan progress:', data);
      this.broadcastToClients({
        type: 'networkScanProgress',
        ...data
      });
    });

    // Handle scan results - broadcast immediately when devices are discovered
    this.workerManager.on('scanResult', (data) => {
      console.log('Broadcasting scan result:', JSON.stringify(data, null, 2));
      this.broadcastToClients({
        type: 'networkScanResult',
        ...data
      });
    });

    // Handle individual device discoveries
    this.workerManager.on('deviceDiscovered', (data) => {
      console.log('Broadcasting device discovery:', data);
      this.broadcastToClients({
        type: 'deviceDiscovered',
        ...data
      });
    });

    // Handle scan errors
    this.workerManager.on('scanError', (data) => {
      console.log('Broadcasting scan error:', data);
      this.broadcastToClients({
        type: 'networkScanError',
        ...data
      });
    });

    // Handle scan completion
    this.workerManager.on('scanComplete', (data) => {
      console.log('Broadcasting scan completion:', data);
      this.broadcastToClients({
        type: 'networkScanComplete',
        ...data
      });
    });

    // Broadcast worker status changes
    this.workerManager.on('workerStatusChange', (data) => {
      this.broadcastToClients({
        type: 'workerStatusChange',
        ...data
      });
    });
  }

  setupServicesManagerEventHandlers() {
    // Handle service state changes
    this.servicesManager.on('serviceStarted', (data) => {
      console.log('Service started:', data);
      this.broadcastToClients({
        type: 'serviceStarted',
        ...data
      });
    });

    this.servicesManager.on('serviceStopped', (data) => {
      console.log('Service stopped:', data);
      this.broadcastToClients({
        type: 'serviceStopped',
        ...data
      });
    });

    this.servicesManager.on('serviceCrashed', (data) => {
      console.log('Service crashed:', data);
      this.broadcastToClients({
        type: 'serviceCrashed',
        ...data
      });
    });

    this.servicesManager.on('healthCheckUpdate', (data) => {
      this.broadcastToClients({
        type: 'healthCheckUpdate',
        ...data
      });
    });

    // Handle chunked network scanner events
    this.chunkedNetworkScanner.on('scanStarted', (data) => {
      this.broadcastToClients({
        type: 'chunkedScanStarted',
        ...data
      });
    });

    this.chunkedNetworkScanner.on('scanProgress', (data) => {
      this.broadcastToClients({
        type: 'chunkedScanProgress',
        ...data
      });
    });

    this.chunkedNetworkScanner.on('scanComplete', (data) => {
      this.broadcastToClients({
        type: 'chunkedScanComplete',
        ...data
      });
    });
  }

  broadcastToClients(message) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  setupRoutes() {
    // Enhanced database management routes with pagination and filtering
    const enhancedDatabaseRoutes = require('./routes/enhanced-database');
    this.app.use('/api/database', enhancedDatabaseRoutes);
    
    // Services management routes with enhanced process tracking
    this.app.use('/api/services', servicesRoutes);

    /**
     * @swagger
     * /health:
     *   get:
     *     summary: Check the health of the server
     *     description: Returns health status of the backend server
     *     tags:
     *       - Health
     *     responses:
     *       200:
     *         description: A successful response with health information
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                 timestamp:
     *                   type: string
     *                   format: date-time
     *                 uptime:
     *                   type: number
     *                 memory:
     *                   type: object
     */
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });

    /**
     * @swagger
     * /api/system:
     *   get:
     *     summary: Get system information
     *     description: Returns detailed information about the system including CPU, memory, OS, and current load
     *     tags:
     *       - System Information
     *     responses:
     *       200:
     *         description: Successful response with system information
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 cpu:
     *                   type: object
     *                 memory:
     *                   type: object
     *                 os:
     *                   type: object
     *                 load:
     *                   type: object
     *                 timestamp:
     *                   type: string
     *                   format: date-time
     *       500:
     *         description: Server error
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     */
    this.app.get('/api/system', async (req, res) => {
      try {
        const [cpu, mem, osInfo, load] = await Promise.all([
          si.cpu(),
          si.mem(),
          si.osInfo(),
          si.currentLoad()
        ]);
        
        res.json({
          cpu,
          memory: mem,
          os: osInfo,
          load,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @swagger
     * /api/metrics:
     *   get:
     *     summary: Get real-time system metrics
     *     description: Returns real-time metrics about CPU load, memory, network, and disk I/O
     *     tags:
     *       - System Metrics
     *     responses:
     *       200:
     *         description: Successful response with real-time metrics
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 cpu:
     *                   type: object
     *                 memory:
     *                   type: object
     *                 network:
     *                   type: array
     *                   items:
     *                     type: object
     *                 disk:
     *                   type: object
     *                 timestamp:
     *                   type: string
     *                   format: date-time
     *       500:
     *         description: Server error
     */
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const [cpuLoad, memInfo, networkStats, diskIO, processes] = await Promise.all([
          si.currentLoad(),
          si.mem(),
          si.networkStats(),
          si.disksIO(),
          si.processes()
        ]);
        
        // Get top processes by CPU usage with detailed information for ProcessGauges
        const topProcesses = processes.list
          .sort((a, b) => (b.pcpu || 0) - (a.pcpu || 0))
          .slice(0, 20)
          .map(p => ({
            pid: p.pid,
            parentPid: p.ppid || 0,
            name: p.name || 'Unknown',
            cpu: p.pcpu || 0,
            cpuu: p.pcpuu || 0,
            cpus: p.pcpus || 0,
            mem: p.pmem || 0,
            priority: p.priority || 0,
            memVsz: p.mem_vsz || 0,
            memRss: p.mem_rss || 0,
            nice: p.nice || 0,
            started: p.started || '',
            state: p.state || 'unknown',
            tty: p.tty || '',
            user: p.user || 'unknown',
            command: p.command || '',
            params: p.params || '',
            path: p.path || ''
          }));

        // Calculate network rates (bytes per second since last check)
        const networkInterfaces = networkStats.map(net => ({
          iface: net.iface,
          operstate: net.operstate,
          rx_bytes: net.rx_bytes,
          tx_bytes: net.tx_bytes,
          rx_dropped: net.rx_dropped,
          tx_dropped: net.tx_dropped,
          rx_errors: net.rx_errors,
          tx_errors: net.tx_errors,
          rx_sec: net.rx_sec || 0,
          tx_sec: net.tx_sec || 0
        }));

        // Enhanced disk I/O with per-second rates
        const diskStats = {
          rIO: diskIO.rIO || 0,
          wIO: diskIO.wIO || 0,
          tIO: diskIO.tIO || 0,
          rIO_sec: diskIO.rIO_sec || 0,
          wIO_sec: diskIO.wIO_sec || 0,
          tIO_sec: diskIO.tIO_sec || 0
        };

        // Per-core CPU breakdown
        const coreStats = cpuLoad.cpus.map((core, index) => ({
          core: index,
          load: Math.round(core.load * 100) / 100,
          user: Math.round(core.loadUser * 100) / 100,
          system: Math.round(core.loadSystem * 100) / 100,
          idle: Math.round(core.loadIdle * 100) / 100
        }));
        
        res.json({
          cpu: {
            ...cpuLoad,
            cores: coreStats
          },
          memory: memInfo,
          network: networkInterfaces,
          disk: diskStats,
          processes: {
            total: processes.all,
            running: processes.running,
            sleeping: processes.sleeping,
            blocked: processes.blocked,
            top: topProcesses
          },
          nodeHeap: process.memoryUsage(),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @swagger
     * /api/processes:
     *   get:
     *     summary: Get running processes
     *     description: Returns a list of top 20 running processes on the system
     *     tags:
     *       - System Processes
     *     responses:
     *       200:
     *         description: Successful response with process list
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 processes:
     *                   type: array
     *                   items:
     *                     type: object
     *                 timestamp:
     *                   type: string
     *                   format: date-time
     *       500:
     *         description: Server error
     */
    this.app.get('/api/processes', async (req, res) => {
      try {
        const processes = await si.processes();
        res.json({
          processes: processes.list.slice(0, 20), // Top 20 processes
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @swagger
     * /api/processes/{pid}/stop:
     *   post:
     *     summary: Stop a process
     *     description: Send SIGSTOP signal to pause a process
     *     tags:
     *       - Processes
     *     parameters:
     *       - in: path
     *         name: pid
     *         required: true
     *         schema:
     *           type: integer
     *         description: Process ID
     *     responses:
     *       200:
     *         description: Process stopped successfully
     *       400:
     *         description: Invalid PID
     *       500:
     *         description: Failed to stop process
     */
    this.app.post('/api/processes/:pid/stop', async (req, res) => {
      try {
        const pid = parseInt(req.params.pid);
        if (isNaN(pid) || pid <= 0) {
          return res.status(400).json({ success: false, message: 'Invalid PID' });
        }

        await execAsync(`kill -STOP ${pid}`);
        res.json({ 
          success: true, 
          message: `Process ${pid} stopped successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          message: `Failed to stop process: ${error.message}` 
        });
      }
    });

    /**
     * @swagger
     * /api/processes/{pid}/resume:
     *   post:
     *     summary: Resume a process
     *     description: Send SIGCONT signal to resume a stopped process
     *     tags:
     *       - Processes
     *     parameters:
     *       - in: path
     *         name: pid
     *         required: true
     *         schema:
     *           type: integer
     *         description: Process ID
     *     responses:
     *       200:
     *         description: Process resumed successfully
     *       400:
     *         description: Invalid PID
     *       500:
     *         description: Failed to resume process
     */
    this.app.post('/api/processes/:pid/resume', async (req, res) => {
      try {
        const pid = parseInt(req.params.pid);
        if (isNaN(pid) || pid <= 0) {
          return res.status(400).json({ success: false, message: 'Invalid PID' });
        }

        await execAsync(`kill -CONT ${pid}`);
        res.json({ 
          success: true, 
          message: `Process ${pid} resumed successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          message: `Failed to resume process: ${error.message}` 
        });
      }
    });

    /**
     * @swagger
     * /api/processes/{pid}/kill:
     *   post:
     *     summary: Kill a process
     *     description: Send SIGKILL signal to forcefully terminate a process
     *     tags:
     *       - Processes
     *     parameters:
     *       - in: path
     *         name: pid
     *         required: true
     *         schema:
     *           type: integer
     *         description: Process ID
     *     responses:
     *       200:
     *         description: Process killed successfully
     *       400:
     *         description: Invalid PID
     *       500:
     *         description: Failed to kill process
     */
    this.app.post('/api/processes/:pid/kill', async (req, res) => {
      try {
        const pid = parseInt(req.params.pid);
        if (isNaN(pid) || pid <= 0) {
          return res.status(400).json({ success: false, message: 'Invalid PID' });
        }

        await execAsync(`kill -KILL ${pid}`);
        res.json({ 
          success: true, 
          message: `Process ${pid} killed successfully`,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          message: `Failed to kill process: ${error.message}` 
        });
      }
    });

    /**
     * @swagger
     * /api/network-info:
     *   get:
     *     summary: Get network interface information
     *     description: Returns information about network interfaces on the system
     *     tags:
     *       - Network
     *     responses:
     *       200:
     *         description: Successful response with network interface data
     */
    this.app.get('/api/network-info', async (req, res) => {
      try {
        const [networkInterfaces, defaultGateway] = await Promise.all([
          si.networkInterfaces(),
          si.networkGatewayDefault()
        ]);

        res.json({
          interfaces: networkInterfaces.filter(iface => iface.ip4 || iface.ip6),
          gateway: defaultGateway,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @swagger
     * /api/network-scan:
     *   post:
     *     summary: Start network scan for devices
     *     description: Initiates a comprehensive network scan using service workers for device discovery
     *     tags:
     *       - Network
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               subnet:
     *                 type: string
     *                 example: "192.168.1.0"
     *               cidr:
     *                 type: number
     *                 example: 24
     *               portScan:
     *                 type: boolean
     *                 example: true
     *               ports:
     *                 type: array
     *                 items:
     *                   type: number
     *                 example: [22, 80, 443, 8080]
     *               enableHostname:
     *                 type: boolean
     *                 example: true
     *               enableManufacturer:
     *                 type: boolean
     *                 example: true
     *     responses:
     *       200:
     *         description: Scan initiated successfully
     *       400:
     *         description: Invalid request parameters
     */
    this.app.post('/api/network-scan', async (req, res) => {
      try {
        const { 
          subnet, 
          cidr = 24, 
          portScan = false, 
          ports = [22, 80, 443],
          enableHostname = true,
          enableManufacturer = true,
          enhancedScan = false,
          maxConcurrent = 10
        } = req.body;
        
        if (!subnet) {
          return res.status(400).json({ error: 'Subnet is required' });
        }

        // Start the scan using service worker
        const scanId = await this.workerManager.startNetworkScan({
          subnet,
          cidr,
          portScan,
          ports,
          enableHostname,
          enableManufacturer,
          enhancedScan,
          maxConcurrent
        });
        
        res.json({
          scanId,
          status: 'initiated',
          message: 'Network scan started',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @swagger
     * /api/network-scan/enhanced:
     *   post:
     *     summary: Start enhanced network scan with device intelligence
     *     description: Initiates network discovery with manufacturer lookup and device categorization
     *     tags:
     *       - Network
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - subnet
     *             properties:
     *               subnet:
     *                 type: string
     *                 description: Network subnet to scan
     *                 example: "192.168.1.0"
     *               cidr:
     *                 type: integer
     *                 description: CIDR notation for subnet
     *                 example: 24
     *               portScan:
     *                 type: boolean
     *                 description: Enable port scanning
     *                 example: true
     *               ports:
     *                 type: array
     *                 items:
     *                   type: integer
     *                 description: Ports to scan
     *                 example: [22, 80, 443]
     *     responses:
     *       200:
     *         description: Enhanced scan initiated successfully
     */
    this.app.post('/api/network-scan/enhanced', async (req, res) => {
      try {
        const { 
          subnet, 
          cidr = 24, 
          portScan = true, 
          ports = [22, 80, 443]
        } = req.body;
        
        if (!subnet) {
          return res.status(400).json({ error: 'Subnet is required' });
        }

        // Start network scan
        const scanId = await this.workerManager.startNetworkScan({
          subnet,
          cidr,
          portScan,
          ports,
          enableHostname: true,
          enableManufacturer: true,
          enhancedIntelligence: true // Flag for enhanced processing
        });
        
        res.json({
          scanId,
          status: 'initiated',
          message: 'Enhanced network scan with device intelligence started',
          features: ['manufacturer_lookup', 'device_categorization', 'risk_assessment', 'capability_inference'],
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @swagger
     * /api/network-scan/{scanId}/status:
     *   get:
     *     summary: Get network scan status
     *     description: Returns the current status and progress of a network scan
     *     tags:
     *       - Network
     *     parameters:
     *       - in: path
     *         name: scanId
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Scan status retrieved successfully
     *       404:
     *         description: Scan not found
     */
    this.app.get('/api/network-scan/:scanId/status', (req, res) => {
      const { scanId } = req.params;
      const scanStatus = this.workerManager.getActiveScanStatus();
      
      if (scanStatus[scanId]) {
        res.json({
          scanId,
          ...scanStatus[scanId],
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({ error: 'Scan not found' });
      }
    });

    /**
     * @swagger
     * /api/network-scan/{scanId}/results:
     *   get:
     *     summary: Get network scan results
     *     description: Returns the results of a completed network scan
     *     tags:
     *       - Network
     *     parameters:
     *       - in: path
     *         name: scanId
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Scan results retrieved successfully
     *       404:
     *         description: Scan not found or not completed
     */
    this.app.get('/api/network-scan/:scanId/results', (req, res) => {
      const { scanId } = req.params;
      const scanStatus = this.workerManager.getActiveScanStatus();
      
      if (scanStatus[scanId]) {
        res.json({
          scanId,
          status: scanStatus[scanId].status,
          results: scanStatus[scanId].results || [],
          devices: scanStatus[scanId].devices || [],
          progress: scanStatus[scanId].progress || 0,
          completed: scanStatus[scanId].status === 'completed',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({ error: 'Scan not found' });
      }
    });

    /**
     * @swagger
     * /api/network-scan/{scanId}/cancel:
     *   post:
     *     summary: Cancel a network scan
     *     description: Cancels an active network scan
     *     tags:
     *       - Network
     *     parameters:
     *       - in: path
     *         name: scanId
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Scan cancelled successfully
     *       404:
     *         description: Scan not found
     */
    this.app.post('/api/network-scan/:scanId/cancel', (req, res) => {
      const { scanId } = req.params;
      
      try {
        this.workerManager.cancelScan(scanId);
        res.json({
          scanId,
          status: 'cancelled',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @swagger
     * /api/workers/status:
     *   get:
     *     summary: Get worker status
     *     description: Returns information about active service workers
     *     tags:
     *       - System
     *     responses:
     *       200:
     *         description: Worker status retrieved successfully
     */
    this.app.get('/api/workers/status', async (req, res) => {
      try {
        const stats = this.workerManager.getWorkerStats();
        const healthCheck = await this.workerManager.healthCheck();
        
        res.json({
          stats,
          health: healthCheck,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @swagger
     * /api/backend-status:
     *   get:
     *     summary: Get comprehensive backend status
     *     description: Returns status of all backend processes, active scans, and system health
     *     tags:
     *       - System
     *     responses:
     *       200:
     *         description: Backend status retrieved successfully
     */
    this.app.get('/api/backend-status', async (req, res) => {
      try {
        const workerStats = this.workerManager.getWorkerStats();
        const workerHealth = await this.workerManager.healthCheck();
        const activeScans = this.workerManager.getActiveScanStatus();
        
        // Get system metrics for health monitoring
        const [cpuLoad, memInfo] = await Promise.all([
          si.currentLoad(),
          si.mem()
        ]);
        
        res.json({
          backend: {
            status: 'running',
            port: this.port,
            uptime: process.uptime(),
            memory: process.memoryUsage()
          },
          workers: {
            stats: workerStats,
            health: workerHealth
          },
          activeScans: activeScans,
          systemHealth: {
            cpu: cpuLoad.currentLoad,
            memory: {
              used: memInfo.used,
              total: memInfo.total,
              percentage: (memInfo.used / memInfo.total) * 100
            }
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @swagger
     * /api/scans/active:
     *   get:
     *     summary: Get all active scans
     *     description: Returns information about all currently active network scans
     *     tags:
     *       - Network
     *     responses:
     *       200:
     *         description: Active scans retrieved successfully
     */
    this.app.get('/api/scans/active', (req, res) => {
      try {
        const activeScans = this.workerManager.getActiveScanStatus();
        res.json({
          scans: activeScans,
          count: Object.keys(activeScans).length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @swagger
     * /api/oui/lookup:
     *   post:
     *     summary: Lookup MAC address manufacturer
     *     description: Returns manufacturer information for a given MAC address
     *     tags:
     *       - Network
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               mac:
     *                 type: string
     *                 example: "00:1b:63:aa:bb:cc"
     *     responses:
     *       200:
     *         description: MAC lookup completed
     */
    this.app.post('/api/oui/lookup', async (req, res) => {
      try {
        const { mac } = req.body;
        
        if (!mac) {
          return res.status(400).json({ error: 'MAC address is required' });
        }

        // Use enhanced Device Intelligence service for comprehensive information
        const deviceInfo = { mac, ip: '0.0.0.0', hostname: null };
        const enrichedResult = await this.deviceIntelligence.enrichDevice(deviceInfo);
        
        res.json({
          mac,
          result: enrichedResult,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('OUI lookup error:', error);
        // Fallback to basic OUI lookup
        try {
          const result = this.ouiDB.lookup(mac);
          res.json({
            mac,
            result,
            timestamp: new Date().toISOString()
          });
        } catch (fallbackError) {
          res.status(500).json({ error: fallbackError.message });
        }
      }
    });

    /**
     * @swagger
     * /api/backend-control:
     *   post:
     *     summary: Control backend services
     *     description: Start, stop, or restart backend services including workers and SSH
     *     tags:
     *       - System Control
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               action:
     *                 type: string
     *                 enum: [start, stop, restart]
     *                 example: "restart"
     *               service:
     *                 type: string
     *                 enum: [backend, workers, ssh]
     *                 example: "workers"
     *     responses:
     *       200:
     *         description: Service control operation successful
     *       400:
     *         description: Invalid parameters
     *       500:
     *         description: Operation failed
     */
    this.app.post('/api/backend-control', async (req, res) => {
      try {
        const { action, service } = req.body;
        
        if (!action || !service) {
          return res.status(400).json({ 
            error: 'Action and service are required',
            validActions: ['start', 'stop', 'restart'],
            validServices: ['backend', 'workers', 'ssh']
          });
        }

        let result = {};
        
        switch (service) {
          case 'workers':
            result = await this.controlWorkers(action);
            break;
            
          case 'ssh':
            result = await this.controlSSH(action);
            break;
            
          case 'backend':
            result = await this.controlBackend(action);
            break;
            
          default:
            return res.status(400).json({ error: 'Invalid service specified' });
        }
        
        res.json({
          action,
          service,
          success: true,
          message: result.message,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ 
          error: error.message,
          action: req.body.action,
          service: req.body.service,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Preview endpoint for real-time preview window
    this.app.get('/preview', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Real-time Preview</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: #1e1e1e;
              color: #ffffff;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
            }
            .metric-card {
              background: #2d2d2d;
              border-radius: 8px;
              padding: 15px;
              margin: 10px 0;
              border-left: 4px solid #0078d4;
            }
            .metric-title {
              font-weight: bold;
              margin-bottom: 10px;
              color: #0078d4;
            }
            .metric-value {
              font-size: 1.2em;
              color: #00ff00;
            }
            .status-indicator {
              display: inline-block;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background: #00ff00;
              margin-right: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1><span class="status-indicator"></span>Real-time System Preview</h1>
            <div id="preview-content">
              <div class="metric-card">
                <div class="metric-title">Waiting for data...</div>
              </div>
            </div>
          </div>
          
          <script>
            const ws = new WebSocket('ws://localhost:${this.port}');
            
            ws.onmessage = function(event) {
              const data = JSON.parse(event.data);
              updatePreview(data);
            };
            
            function updatePreview(data) {
              const content = document.getElementById('preview-content');
              if (data.type === 'metrics') {
                content.innerHTML = \`
                  <div class="metric-card">
                    <div class="metric-title">CPU Usage</div>
                    <div class="metric-value">\${data.cpu.toFixed(2)}%</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-title">Memory Usage</div>
                    <div class="metric-value">\${(data.memory / 1024 / 1024 / 1024).toFixed(2)} GB</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-title">Active Services</div>
                    <div class="metric-value">\${data.services || 0}</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-title">Last Updated</div>
                    <div class="metric-value">\${new Date(data.timestamp).toLocaleTimeString()}</div>
                  </div>
                \`;
              }
            }
          </script>
        </body>
        </html>
      `);
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      
      // Send initial backend status
      this.sendBackendStatus(ws);
      
      // Send comprehensive metrics data every 3 seconds
      const interval = setInterval(async () => {
        try {
          // Get comprehensive system metrics
          const [cpuLoad, memInfo, networkInfo, diskInfo, processInfo] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.networkStats(),
            si.disksIO(),
            si.processes()
          ]);

          // Get Node.js heap info
          const heapInfo = process.memoryUsage();

          // Enhanced process data formatting for gauges
          const topProcesses = processInfo.list
            .sort((a, b) => (b.pcpu || 0) - (a.pcpu || 0))
            .slice(0, 20)
            .map(p => ({
              pid: p.pid,
              parentPid: p.ppid || 0,
              name: p.name || 'Unknown',
              cpu: p.pcpu || 0,
              cpuu: p.pcpuu || 0,
              cpus: p.pcpus || 0,
              mem: p.pmem || 0,
              priority: p.priority || 0,
              memVsz: p.mem_vsz || 0,
              memRss: p.mem_rss || 0,
              nice: p.nice || 0,
              started: p.started || '',
              state: p.state || 'unknown',
              tty: p.tty || '',
              user: p.user || 'unknown',
              command: p.command || '',
              params: p.params || '',
              path: p.path || ''
            })) || [];

          const data = {
            type: 'metrics',
            cpu: cpuLoad,
            memory: memInfo,
            network: networkInfo,
            disk: diskInfo,
            processes: {
              total: processInfo.all,
              running: processInfo.running,
              sleeping: processInfo.sleeping,
              blocked: processInfo.blocked,
              top: topProcesses // Keep for compatibility with existing components
            },
            nodeHeap: heapInfo,
            timestamp: new Date().toISOString()
          };
          
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
          }
        } catch (error) {
          console.error('Error sending WebSocket metrics data:', error);
        }
      }, 3000);

      // Send backend status every 5 seconds
      const statusInterval = setInterval(async () => {
        if (ws.readyState === WebSocket.OPEN) {
          this.sendBackendStatus(ws);
        }
      }, 5000);
      
      ws.on('close', () => {
        clearInterval(interval);
        clearInterval(statusInterval);
        console.log('WebSocket client disconnected');
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clearInterval(interval);
        clearInterval(statusInterval);
      });
    });
  }

  async sendBackendStatus(ws) {
    try {
      const workerStats = this.workerManager.getWorkerStats();
      const activeScans = this.workerManager.getActiveScanStatus();
      
      const statusData = {
        type: 'backendStatus',
        backend: {
          status: 'running',
          port: this.port,
          uptime: process.uptime()
        },
        workers: workerStats,
        activeScans: activeScans,
        timestamp: new Date().toISOString()
      };
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(statusData));
      }
    } catch (error) {
      console.error('Error sending backend status:', error);
    }
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`Backend server running on port ${this.port}`);
      console.log(`Health check: http://localhost:${this.port}/health`);
      console.log(`Preview: http://localhost:${this.port}/preview`);
    });

    // Graceful shutdown handling
    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      this.shutdown();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.shutdown();
    });
  }

  async controlWorkers(action) {
    try {
      switch (action) {
        case 'start':
          if (!this.workerManager || this.workerManager.getWorkerStats().totalWorkers === 0) {
            this.workerManager = new ServiceWorkerManager();
            this.setupWorkerEventHandlers();
            return { message: 'Service workers started successfully' };
          } else {
            return { message: 'Service workers are already running' };
          }
          
        case 'stop':
          if (this.workerManager) {
            await this.workerManager.terminateAllWorkers();
            return { message: 'All service workers stopped successfully' };
          } else {
            return { message: 'Service workers are already stopped' };
          }
          
        case 'restart':
          if (this.workerManager) {
            await this.workerManager.terminateAllWorkers();
          }
          this.workerManager = new ServiceWorkerManager();
          this.setupWorkerEventHandlers();
          return { message: 'Service workers restarted successfully' };
          
        default:
          throw new Error('Invalid action for workers');
      }
    } catch (error) {
      throw new Error(`Worker control failed: ${error.message}`);
    }
  }

  async controlSSH(action) {
    try {
      switch (action) {
        case 'start':
          // SSH server is started by the main process, we can't control it from here
          // This would require IPC communication with the main process
          return { message: 'SSH server start requested (requires main process restart)' };
          
        case 'stop':
          return { message: 'SSH server stop requested (requires main process intervention)' };
          
        case 'restart':
          return { message: 'SSH server restart requested (requires main process restart)' };
          
        default:
          throw new Error('Invalid action for SSH');
      }
    } catch (error) {
      throw new Error(`SSH control failed: ${error.message}`);
    }
  }

  async controlBackend(action) {
    try {
      switch (action) {
        case 'start':
          // Backend is already running if this endpoint is being called
          return { message: 'Backend server is already running' };
          
        case 'stop':
          // Schedule shutdown after response is sent
          setTimeout(() => {
            console.log('Backend stop requested via API');
            this.shutdown();
          }, 1000);
          return { message: 'Backend server shutdown initiated' };
          
        case 'restart':
          // Schedule restart after response is sent
          setTimeout(() => {
            console.log('Backend restart requested via API');
            this.restart();
          }, 1000);
          return { message: 'Backend server restart initiated' };
          
        default:
          throw new Error('Invalid action for backend');
      }
    } catch (error) {
      throw new Error(`Backend control failed: ${error.message}`);
    }
  }

  restart() {
    console.log('Restarting backend server...');
    // Terminate workers first
    if (this.workerManager) {
      this.workerManager.terminateAllWorkers();
    }
    
    // Close server
    this.server.close(() => {
      console.log('Server closed for restart');
      
      // Reinitialize everything
      this.workerManager = new ServiceWorkerManager();
      this.ouiDB = new OUIDatabase();
      this.setupWorkerEventHandlers();
      
      // Restart server
      this.start();
    });
  }

  shutdown() {
    console.log('Terminating all service workers...');
    this.workerManager.terminateAllWorkers();
    
    console.log('Closing server...');
    this.server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('Force exit');
      process.exit(1);
    }, 10000);
  }
}

new BackendServer();
