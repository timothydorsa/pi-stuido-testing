/**
 * Services Management API Routes - Working Version
 * Provides REST API endpoints for managing all system services
 */

const express = require('express');
const router = express.Router();

let servicesManager = null;
let chunkedNetworkScanner = null;

// Get services manager from global scope (initialized in server.js)
const initializeServicesManager = () => {
  if (global.servicesManager) {
    servicesManager = global.servicesManager;
    chunkedNetworkScanner = global.chunkedNetworkScanner;
    return servicesManager;
  }
  
  // Fallback: create local instance if global not available
  if (!servicesManager) {
    console.warn('Global services manager not found, creating local instance...');
    const EnhancedServicesManager = require('../services/enhanced-services-manager');
    servicesManager = new EnhancedServicesManager();
    
    // Initialize chunked network scanner
    const ChunkedNetworkScanner = require('../services/chunked-network-scanner');
    chunkedNetworkScanner = new ChunkedNetworkScanner(servicesManager);
  }
  return servicesManager;
};

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Get all services status
 *     description: Returns the current status of all managed services
 *     tags:
 *       - Services Management
 *     responses:
 *       200:
 *         description: Services status retrieved successfully
 */
router.get('/', (req, res) => {
  try {
    const manager = initializeServicesManager();
    const services = manager.getServicesStatus();
    const systemStats = manager.getSystemStats();
    
    res.json({
      services,
      systemStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/services/health:
 *   get:
 *     summary: Get comprehensive health check
 *     description: Returns health status of all services and system metrics
 *     tags:
 *       - Services Management
 *     responses:
 *       200:
 *         description: Health check completed successfully
 */
router.get('/health', async (req, res) => {
  try {
    const manager = initializeServicesManager();
    const services = manager.getServicesStatus();
    const systemStats = manager.getSystemStats();
    
    // Calculate overall health
    const runningServices = Object.values(services).filter(s => s.status === 'running').length;
    const totalCriticalServices = Object.values(services).filter(s => s.critical).length;
    const runningCriticalServices = Object.values(services).filter(s => s.critical && s.status === 'running').length;
    
    const overallHealth = {
      status: runningCriticalServices === totalCriticalServices ? 'healthy' : 'degraded',
      criticalServicesRunning: runningCriticalServices,
      totalCriticalServices: totalCriticalServices,
      totalServicesRunning: runningServices,
      totalServices: Object.keys(services).length
    };
    
    res.json({
      overallHealth,
      services,
      systemStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/services/{serviceId}:
 *   get:
 *     summary: Get status of a specific service
 *     description: Returns detailed status information about a specific service
 *     tags:
 *       - Services Management
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [backend, frontend, electron, database, ssh]
 *     responses:
 *       200:
 *         description: Service status retrieved successfully
 *       404:
 *         description: Service not found
 */
router.get('/:serviceId', (req, res) => {
  try {
    const { serviceId } = req.params;
    const manager = initializeServicesManager();
    const services = manager.getServicesStatus();
    
    if (!services[serviceId]) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json({
      serviceId,
      ...services[serviceId],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/services/{serviceId}/start:
 *   post:
 *     summary: Start a specific service
 *     description: Starts the specified service and its dependencies
 *     tags:
 *       - Services Management
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [backend, frontend, electron, database, ssh]
 *     responses:
 *       200:
 *         description: Service started successfully
 *       400:
 *         description: Invalid service ID or service already running
 *       500:
 *         description: Failed to start service
 */
router.post('/:serviceId/start', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const manager = initializeServicesManager();
    
    const result = await manager.startService(serviceId);
    
    res.json({
      serviceId,
      action: 'start',
      success: true,
      message: `Service ${result.service || serviceId} started successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      serviceId: req.params.serviceId,
      action: 'start',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/services/{serviceId}/stop:
 *   post:
 *     summary: Stop a specific service
 *     description: Stops the specified service
 *     tags:
 *       - Services Management
 */
router.post('/:serviceId/stop', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const manager = initializeServicesManager();
    
    const result = await manager.stopService(serviceId);
    
    res.json({
      serviceId,
      action: 'stop',
      success: true,
      message: `Service ${serviceId} stopped successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      serviceId: req.params.serviceId,
      action: 'stop',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/services/{serviceId}/restart:
 *   post:
 *     summary: Restart a specific service
 *     description: Restarts the specified service
 *     tags:
 *       - Services Management
 */
router.post('/:serviceId/restart', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const manager = initializeServicesManager();
    
    const result = await manager.restartService(serviceId);
    
    res.json({
      serviceId,
      action: 'restart',
      success: true,
      message: `Service ${serviceId} restarted successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      serviceId: req.params.serviceId,
      action: 'restart',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/services/network-scan:
 *   post:
 *     summary: Start chunked network scan
 *     description: Initiates a network scan using multiple service chunks for faster discovery
 *     tags:
 *       - Services Management
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
 */
router.post('/network-scan', async (req, res) => {
  try {
    const manager = initializeServicesManager();
    const { subnet, cidr = 24, portScan = false, ports = [22, 80, 443, 8080] } = req.body;

    if (!subnet) {
      return res.status(400).json({ 
        error: 'Subnet is required',
        timestamp: new Date().toISOString()
      });
    }

    const scanId = await chunkedNetworkScanner.startChunkedScan({
      subnet,
      cidr,
      portScan,
      ports
    });

    res.json({
      scanId,
      status: 'initiated',
      message: 'Chunked network scan started with multiple service workers',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/services/network-scan/{scanId}/status:
 *   get:
 *     summary: Get chunked scan status
 *     description: Returns status and progress of a chunked network scan
 *     tags:
 *       - Services Management
 */
router.get('/network-scan/:scanId/status', (req, res) => {
  try {
    const { scanId } = req.params;
    const scanStatus = chunkedNetworkScanner.getScanStatus(scanId);

    if (!scanStatus) {
      return res.status(404).json({ 
        error: 'Scan not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      scanId,
      ...scanStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/services/network-scan/{scanId}/stop:
 *   post:
 *     summary: Stop chunked network scan
 *     description: Stops an active chunked network scan and cleans up service workers
 *     tags:
 *       - Services Management
 */
router.post('/network-scan/:scanId/stop', async (req, res) => {
  try {
    const { scanId } = req.params;
    await chunkedNetworkScanner.stopScan(scanId);

    res.json({
      scanId,
      status: 'stopped',
      message: 'Chunked network scan stopped and service workers cleaned up',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
