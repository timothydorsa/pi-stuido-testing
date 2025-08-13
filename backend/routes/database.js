/**
 * Database API Routes
 * REST endpoints for managing the OUI database
 */

const express = require('express');
const router = express.Router();

let databaseManager = null;

// Initialize database manager
const initializeDatabaseManager = async () => {
  if (!databaseManager) {
    const DatabaseManager = require('../database/database-manager');
    databaseManager = new DatabaseManager();
    await databaseManager.initialize();
  }
  return databaseManager;
};

/**
 * @swagger
 * /api/database/stats:
 *   get:
 *     summary: Get database statistics
 *     description: Returns comprehensive statistics about the OUI database
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: Database statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_entries:
 *                   type: integer
 *                 unique_manufacturers:
 *                   type: integer
 *                 device_types:
 *                   type: integer
 *                 last_updated:
 *                   type: string
 */
router.get('/stats', async (req, res) => {
  try {
    const dbManager = await initializeDatabaseManager();
    const stats = await dbManager.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Database stats error:', error);
    res.status(500).json({ error: 'Failed to get database statistics' });
  }
});

/**
 * @swagger
 * /api/database/lookup/{macAddress}:
 *   get:
 *     summary: Lookup device by MAC address (local-first)
 *     description: Returns comprehensive device information prioritizing local database
 *     tags: [Database]
 *     parameters:
 *       - in: path
 *         name: macAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: MAC address to lookup
 *       - in: query
 *         name: localOnly
 *         schema:
 *           type: boolean
 *         description: Skip API lookup and use only local database
 *     responses:
 *       200:
 *         description: Device information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 manufacturer:
 *                   type: string
 *                 type:
 *                   type: string
 *                 category:
 *                   type: string
 *                 confidence:
 *                   type: string
 *                 source:
 *                   type: string
 *                 capabilities:
 *                   type: array
 *                 securityProfile:
 *                   type: object
 */
router.get('/lookup/:macAddress', async (req, res) => {
  try {
    const { macAddress } = req.params;
    const { localOnly } = req.query;
    const dbManager = await initializeDatabaseManager();
    
    let result;
    if (localOnly === 'true') {
      // Force local-only lookup by temporarily disabling API
      const originalApiEndpoints = dbManager.database.apiEndpoints;
      dbManager.database.apiEndpoints = {}; // Disable API endpoints
      
      result = await dbManager.lookupDevice(macAddress);
      
      // Restore API endpoints
      dbManager.database.apiEndpoints = originalApiEndpoints;
      result.localOnlyMode = true;
    } else {
      result = await dbManager.lookupDevice(macAddress);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Database lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup device' });
  }
});

/**
 * @swagger
 * /api/database/batch-lookup:
 *   post:
 *     summary: Batch lookup multiple MAC addresses
 *     description: Efficiently lookup multiple devices with local-first strategy
 *     tags: [Database]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               macAddresses:
 *                 type: array
 *                 items:
 *                   type: string
 *               localOnly:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Batch lookup results
 */
router.post('/batch-lookup', async (req, res) => {
  try {
    const { macAddresses, localOnly } = req.body;
    
    if (!Array.isArray(macAddresses)) {
      return res.status(400).json({ error: 'macAddresses must be an array' });
    }
    
    const dbManager = await initializeDatabaseManager();
    
    let results;
    if (localOnly) {
      // Force local-only batch lookup
      const originalApiEndpoints = dbManager.database.apiEndpoints;
      dbManager.database.apiEndpoints = {}; // Disable API endpoints
      
      results = await dbManager.batchLookupDevices(macAddresses);
      
      // Restore API endpoints
      dbManager.database.apiEndpoints = originalApiEndpoints;
      results.forEach(result => result.localOnlyMode = true);
    } else {
      results = await dbManager.batchLookupDevices(macAddresses);
    }
    
    res.json({
      total: macAddresses.length,
      localResolved: results.filter(r => r.source?.includes('local')).length,
      apiResolved: results.filter(r => r.source?.includes('api')).length,
      results
    });
  } catch (error) {
    console.error('Batch lookup error:', error);
    res.status(500).json({ error: 'Failed to perform batch lookup' });
  }
});

/**
 * @swagger
 * /api/database/coverage:
 *   get:
 *     summary: Get database coverage statistics
 *     description: Returns performance and coverage statistics for optimization
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: Coverage statistics
 */
router.get('/coverage', async (req, res) => {
  try {
    const dbManager = await initializeDatabaseManager();
    const coverage = await dbManager.getDatabaseCoverage();
    res.json(coverage);
  } catch (error) {
    console.error('Coverage stats error:', error);
    res.status(500).json({ error: 'Failed to get coverage statistics' });
  }
});

/**
 * @swagger
 * /api/database/update:
 *   post:
 *     summary: Trigger database update from APIs
 *     description: Manually trigger an update of the database from external APIs
 *     tags: [Database]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               force:
 *                 type: boolean
 *                 description: Force update even if one is in progress
 *     responses:
 *       200:
 *         description: Update initiated successfully
 *       409:
 *         description: Update already in progress
 */
router.post('/update', async (req, res) => {
  try {
    const { force = false } = req.body;
    const dbManager = await initializeDatabaseManager();
    const result = await dbManager.updateDatabase(force);
    
    if (result.status === 'already_running') {
      res.status(409).json(result);
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error('Database update error:', error);
    res.status(500).json({ error: 'Failed to update database' });
  }
});

/**
 * @swagger
 * /api/database/manufacturers:
 *   get:
 *     summary: Get all manufacturers
 *     description: Returns list of all manufacturers in the database
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: List of manufacturers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   manufacturer:
 *                     type: string
 *                   device_count:
 *                     type: integer
 */
router.get('/manufacturers', async (req, res) => {
  try {
    const dbManager = await initializeDatabaseManager();
    const manufacturers = await dbManager.getAllManufacturers();
    res.json(manufacturers);
  } catch (error) {
    console.error('Get manufacturers error:', error);
    res.status(500).json({ error: 'Failed to get manufacturers' });
  }
});

/**
 * @swagger
 * /api/database/device-types:
 *   get:
 *     summary: Get all device types
 *     description: Returns list of all device types in the database
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: List of device types
 */
router.get('/device-types', async (req, res) => {
  try {
    const dbManager = await initializeDatabaseManager();
    const deviceTypes = await dbManager.getAllDeviceTypes();
    res.json(deviceTypes);
  } catch (error) {
    console.error('Get device types error:', error);
    res.status(500).json({ error: 'Failed to get device types' });
  }
});

/**
 * @swagger
 * /api/database/search/manufacturer:
 *   get:
 *     summary: Search devices by manufacturer
 *     description: Search for devices by manufacturer name
 *     tags: [Database]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Manufacturer name to search for
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search/manufacturer', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const dbManager = await initializeDatabaseManager();
    const results = await dbManager.searchByManufacturer(q);
    res.json(results);
  } catch (error) {
    console.error('Search manufacturer error:', error);
    res.status(500).json({ error: 'Failed to search manufacturers' });
  }
});

/**
 * @swagger
 * /api/database/search/device-type:
 *   get:
 *     summary: Search devices by type
 *     description: Search for devices by device type
 *     tags: [Database]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Device type to search for
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search/device-type', async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res.status(400).json({ error: 'Device type is required' });
    }
    
    const dbManager = await initializeDatabaseManager();
    const results = await dbManager.searchByDeviceType(type);
    res.json(results);
  } catch (error) {
    console.error('Search device type error:', error);
    res.status(500).json({ error: 'Failed to search device types' });
  }
});

/**
 * @swagger
 * /api/database/devices:
 *   post:
 *     summary: Add custom device
 *     description: Add a custom device entry to the database
 *     tags: [Database]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oui
 *               - manufacturer
 *             properties:
 *               oui:
 *                 type: string
 *                 description: OUI in format XX:XX:XX
 *               manufacturer:
 *                 type: string
 *               device_type:
 *                 type: string
 *               device_category:
 *                 type: string
 *               confidence:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       201:
 *         description: Device added successfully
 */
router.post('/devices', async (req, res) => {
  try {
    const ouiData = req.body;
    
    // Validate required fields
    if (!ouiData.oui || !ouiData.manufacturer) {
      return res.status(400).json({ error: 'OUI and manufacturer are required' });
    }
    
    const dbManager = await initializeDatabaseManager();
    const result = await dbManager.addCustomDevice(ouiData);
    
    if (result.status === 'success') {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Add device error:', error);
    res.status(500).json({ error: 'Failed to add device' });
  }
});

/**
 * @swagger
 * /api/database/devices/{oui}:
 *   put:
 *     summary: Update device
 *     description: Update an existing device entry
 *     tags: [Database]
 *     parameters:
 *       - in: path
 *         name: oui
 *         required: true
 *         schema:
 *           type: string
 *         description: OUI to update
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               manufacturer:
 *                 type: string
 *               device_type:
 *                 type: string
 *               device_category:
 *                 type: string
 *               confidence:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Device updated successfully
 */
router.put('/devices/:oui', async (req, res) => {
  try {
    const { oui } = req.params;
    const updates = req.body;
    
    const dbManager = await initializeDatabaseManager();
    const result = await dbManager.updateDevice(oui, updates);
    res.json(result);
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

/**
 * @swagger
 * /api/database/devices/{oui}:
 *   delete:
 *     summary: Delete device
 *     description: Delete a device entry from the database
 *     tags: [Database]
 *     parameters:
 *       - in: path
 *         name: oui
 *         required: true
 *         schema:
 *           type: string
 *         description: OUI to delete
 *     responses:
 *       200:
 *         description: Device deleted successfully
 */
router.delete('/devices/:oui', async (req, res) => {
  try {
    const { oui } = req.params;
    
    const dbManager = await initializeDatabaseManager();
    const result = await dbManager.deleteDevice(oui);
    res.json(result);
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

/**
 * @swagger
 * /api/database/export:
 *   get:
 *     summary: Export database to CSV
 *     description: Export the entire database to CSV format
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export', async (req, res) => {
  try {
    const dbManager = await initializeDatabaseManager();
    const csvData = await dbManager.exportToCSV();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="oui-database.csv"');
    res.send(csvData);
  } catch (error) {
    console.error('Export database error:', error);
    res.status(500).json({ error: 'Failed to export database' });
  }
});

/**
 * @swagger
 * /api/database/import:
 *   post:
 *     summary: Import database from CSV
 *     description: Bulk import devices from CSV data
 *     tags: [Database]
 *     requestBody:
 *       required: true
 *       content:
 *         text/csv:
 *           schema:
 *             type: string
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               csvData:
 *                 type: string
 *     responses:
 *       200:
 *         description: Import completed
 */
router.post('/import', async (req, res) => {
  try {
    let csvData;
    
    if (req.headers['content-type']?.includes('text/csv')) {
      csvData = req.body;
    } else {
      csvData = req.body.csvData;
    }
    
    if (!csvData) {
      return res.status(400).json({ error: 'CSV data is required' });
    }
    
    const dbManager = await initializeDatabaseManager();
    const result = await dbManager.bulkImportCSV(csvData);
    res.json(result);
  } catch (error) {
    console.error('Import database error:', error);
    res.status(500).json({ error: 'Failed to import database' });
  }
});

/**
 * @swagger
 * /api/database/health:
 *   get:
 *     summary: Database health check
 *     description: Check the health status of the database
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: Health status
 */
router.get('/health', async (req, res) => {
  try {
    const dbManager = await initializeDatabaseManager();
    const health = await dbManager.healthCheck();
    
    if (health.status === 'healthy') {
      res.json(health);
    } else {
      res.status(503).json(health);
    }
  } catch (error) {
    console.error('Database health check error:', error);
    res.status(503).json({ 
      status: 'unhealthy', 
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/database/updates:
 *   get:
 *     summary: Get recent updates
 *     description: Get information about recent database updates
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: Recent updates
 */
router.get('/updates', async (req, res) => {
  try {
    const dbManager = await initializeDatabaseManager();
    const updates = await dbManager.getRecentUpdates();
    res.json(updates);
  } catch (error) {
    console.error('Get updates error:', error);
    res.status(500).json({ error: 'Failed to get recent updates' });
  }
});

module.exports = router;
