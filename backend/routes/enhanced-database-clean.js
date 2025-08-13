/**
 * Enhanced Database API Routes
 * REST endpoints with pagination, filtering, sorting, and editing capabilities
 */

const express = require('express');
const router = express.Router();
const MACAddressConverter = require('../utils/mac-address-converter');

let databaseManager = null;
const macConverter = new MACAddressConverter();

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
 */
router.get('/stats', async (req, res) => {
  try {
    const dbManager = await initializeDatabaseManager();
    const stats = await dbManager.getStats();
    res.json({
      ...stats,
      status: 'active',
      type: 'SQLite',
      location: dbManager.database ? dbManager.database.dbPath : 'In-memory',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database stats error:', error);
    res.status(500).json({ 
      error: error.message,
      status: 'error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/database/oui-lookup:
 *   post:
 *     summary: Flexible OUI/MAC address lookup
 *     description: Look up manufacturer information for MAC addresses in any format
 *     tags: [Database]
 */
router.post('/oui-lookup', async (req, res) => {
  try {
    const { mac } = req.body;

    if (!mac) {
      return res.status(400).json({ 
        error: 'MAC address is required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate MAC address format
    if (!macConverter.isValid(mac)) {
      return res.status(400).json({ 
        error: 'Invalid MAC address format',
        provided: mac,
        timestamp: new Date().toISOString()
      });
    }

    const dbManager = await initializeDatabaseManager();
    
    if (!dbManager.database || !dbManager.database.db) {
      return res.status(503).json({ 
        error: 'Database not available',
        timestamp: new Date().toISOString()
      });
    }

    const db = dbManager.database.db;

    try {
      // Generate all possible search patterns
      const searchPatterns = macConverter.generateSearchPatterns(mac);
      const oui = macConverter.extractOUI(mac);
      
      console.log(`OUI Lookup for ${mac}: OUI=${oui}, Patterns:`, searchPatterns);

      // Create dynamic SQL query to check all patterns
      const placeholders = searchPatterns.map(() => '?').join(',');
      const query = `
        SELECT * FROM oui_lookup 
        WHERE oui IN (${placeholders})
        ORDER BY confidence DESC 
        LIMIT 5
      `;

      const results = await new Promise((resolve, reject) => {
        db.all(query, searchPatterns, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      if (results.length > 0) {
        const bestMatch = results[0];
        
        res.json({
          success: true,
          mac: mac,
          oui: oui,
          manufacturer: macConverter.normalizeManufacturer(bestMatch.manufacturer),
          deviceType: bestMatch.device_type,
          deviceCategory: bestMatch.device_category,
          confidence: bestMatch.confidence,
          source: bestMatch.source,
          searchPatterns: searchPatterns,
          allMatches: results,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          mac: mac,
          oui: oui,
          error: 'OUI not found in database',
          searchPatterns: searchPatterns,
          timestamp: new Date().toISOString()
        });
      }
    } catch (conversionError) {
      res.status(400).json({
        error: 'MAC address conversion failed',
        details: conversionError.message,
        provided: mac,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('OUI lookup error:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/database/search:
 *   get:
 *     summary: Global database search
 *     description: Search across all tables for a term
 *     tags: [Database]
 */
router.get('/search', async (req, res) => {
  try {
    const { q: searchTerm, limit = 100 } = req.query;

    if (!searchTerm) {
      return res.status(400).json({ 
        error: 'Search term is required',
        timestamp: new Date().toISOString()
      });
    }

    const dbManager = await initializeDatabaseManager();
    
    if (!dbManager.database || !dbManager.database.db) {
      return res.status(503).json({ 
        error: 'Database not available',
        timestamp: new Date().toISOString()
      });
    }

    const db = dbManager.database.db;

    // Simple search in oui_lookup table
    const query = `
      SELECT * FROM oui_lookup 
      WHERE manufacturer LIKE ? OR oui LIKE ? OR device_type LIKE ?
      LIMIT ?
    `;

    const searchPattern = `%${searchTerm}%`;
    const results = await new Promise((resolve, reject) => {
      db.all(query, [searchPattern, searchPattern, searchPattern, parseInt(limit)], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      results: results,
      totalResults: results.length,
      searchTerm,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database search error:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint for database service
router.get('/health', async (req, res) => {
  try {
    const dbManager = await initializeDatabaseManager();
    
    const health = {
      status: 'healthy',
      database: 'connected',
      type: 'SQLite',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    if (dbManager.database && dbManager.database.db) {
      // Test database connection
      await new Promise((resolve, reject) => {
        dbManager.database.db.get('SELECT 1', (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    } else {
      health.status = 'degraded';
      health.database = 'disconnected';
    }

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
