/**
 * Services Management API Routes - Working Version
 * Provides REST API endpoints for managing all system services
 */

const express = require('express');
const router = express.Router();

let servicesManager = null;

// Initialize services manager
const initializeServicesManager = () => {
  if (!servicesManager) {
    const ServicesManager = require('../services/services-manager');
    servicesManager = new ServicesManager();
    
    // Set up event handlers for real-time updates
    servicesManager.on('serviceStarted', (data) => {
      if (global.wssBroadcast) {
        global.wssBroadcast({
          type: 'serviceStarted',
          ...data
        });
      }
    });

    servicesManager.on('serviceStopped', (data) => {
      if (global.wssBroadcast) {
        global.wssBroadcast({
          type: 'serviceStopped',
          ...data
        });
      }
    });

    servicesManager.on('serviceRestarted', (data) => {
      if (global.wssBroadcast) {
        global.wssBroadcast({
          type: 'serviceRestarted',
          ...data
        });
      }
    });

    servicesManager.on('serviceError', (data) => {
      if (global.wssBroadcast) {
        global.wssBroadcast({
          type: 'serviceError',
          ...data
        });
      }
    });
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

module.exports = router;
