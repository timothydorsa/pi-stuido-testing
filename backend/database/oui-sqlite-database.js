/**
 * Enhanced SQLite OUI Database with API Integration
 * Provides comprehensive device intelligence with live updates from multiple APIs
 */

const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;

class SQLiteOUIDatabase {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(__dirname, 'oui-database.sqlite');
    this.db = null;
    this.apiEndpoints = {
      ieee: 'https://standards-oui.ieee.org/oui/oui.txt',
      macvendors: 'https://api.macvendors.com/',
      fingerbank: 'https://api.fingerbank.org/api/v2/combinations/device_name',
      maclookup: 'https://api.maclookup.app/v2/macs/'
    };
    this.lastUpdate = null;
    this.updateInterval = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Initialize the database and create tables
   */
  async initialize() {
    try {
      this.db = new sqlite3.Database(this.dbPath);
      
      await this.createTables();
      await this.seedInitialData();
      
      // Check if we need to update from APIs
      const needsUpdate = await this.needsApiUpdate();
      if (needsUpdate) {
        console.log('OUI Database needs updating from APIs...');
        await this.updateFromAPIs();
      }
      
      console.log('SQLite OUI Database initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize SQLite OUI Database:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  async createTables() {
    return new Promise((resolve, reject) => {
      const sql = `
        -- Main OUI lookup table
        CREATE TABLE IF NOT EXISTS oui_lookup (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          oui TEXT UNIQUE NOT NULL,
          manufacturer TEXT NOT NULL,
          device_type TEXT,
          device_category TEXT,
          confidence INTEGER DEFAULT 50,
          source TEXT DEFAULT 'manual',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Device capabilities table
        CREATE TABLE IF NOT EXISTS device_capabilities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          oui TEXT NOT NULL,
          capability TEXT NOT NULL,
          description TEXT,
          FOREIGN KEY (oui) REFERENCES oui_lookup(oui),
          UNIQUE(oui, capability)
        );

        -- Security profiles table
        CREATE TABLE IF NOT EXISTS security_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          device_type TEXT NOT NULL,
          risk_level TEXT NOT NULL,
          concern TEXT,
          recommendation TEXT,
          common_port INTEGER,
          security_feature TEXT
        );

        -- API update tracking
        CREATE TABLE IF NOT EXISTS api_updates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          api_source TEXT NOT NULL,
          last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
          records_updated INTEGER DEFAULT 0,
          status TEXT DEFAULT 'success'
        );

        -- Device pattern matching
        CREATE TABLE IF NOT EXISTS device_patterns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pattern TEXT UNIQUE NOT NULL,
          manufacturer TEXT NOT NULL,
          device_type TEXT,
          device_category TEXT,
          confidence INTEGER DEFAULT 70,
          pattern_type TEXT DEFAULT 'prefix'
        );

        -- Network behavior profiles
        CREATE TABLE IF NOT EXISTS network_behavior (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          device_type TEXT NOT NULL,
          communication_pattern TEXT,
          typical_traffic TEXT,
          suspicious_activity TEXT
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_oui_lookup_oui ON oui_lookup(oui);
        CREATE INDEX IF NOT EXISTS idx_oui_lookup_manufacturer ON oui_lookup(manufacturer);
        CREATE INDEX IF NOT EXISTS idx_device_patterns_pattern ON device_patterns(pattern);
        CREATE INDEX IF NOT EXISTS idx_security_profiles_type ON security_profiles(device_type);
      `;

      this.db.exec(sql, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Seed the database with initial comprehensive data
   */
  async seedInitialData() {
    const count = await this.getRecordCount();
    if (count > 0) {
      console.log(`Database already contains ${count} OUI records`);
      return;
    }

    console.log('Seeding initial OUI data...');
    
    // Insert comprehensive initial data
    const initialData = this.getInitialOUIData();
    
    for (const entry of initialData) {
      await this.insertOUIEntry(entry);
    }

    // Seed security profiles
    await this.seedSecurityProfiles();
    
    // Seed device patterns
    await this.seedDevicePatterns();
    
    // Seed network behavior data
    await this.seedNetworkBehavior();

    console.log(`Seeded database with ${initialData.length} initial OUI entries`);
  }

  /**
   * Insert or update OUI entry
   */
  async insertOUIEntry(entry) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO oui_lookup 
        (oui, manufacturer, device_type, device_category, confidence, source, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(sql, [
        entry.oui,
        entry.manufacturer,
        entry.device_type,
        entry.device_category,
        entry.confidence || 80,
        entry.source || 'initial'
      ], function(error) {
        if (error) {
          reject(error);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Enhanced lookup with local-first strategy
   * Prioritizes local database queries and only uses API calls as last resort
   */
  async lookup(macAddress) {
    if (!macAddress) {
      return { manufacturer: null, type: 'unknown', confidence: 'none' };
    }

    try {
      // Normalize MAC address
      const normalizedMac = macAddress.toLowerCase().replace(/[:-]/g, '');
      const oui = this.formatOui(normalizedMac.substring(0, 6));

      // Step 1: Try exact OUI match in local database (highest priority)
      let result = await this.exactOUILookup(oui);
      if (result) {
        console.log(`Local OUI match found for ${macAddress}: ${result.manufacturer}`);
        return { 
          ...result, 
          confidence: 'high', 
          macAddress,
          source: result.source || 'local_db'
        };
      }

      // Step 2: Try pattern matching in local database
      result = await this.patternLookup(normalizedMac);
      if (result) {
        console.log(`Local pattern match found for ${macAddress}: ${result.manufacturer}`);
        return { 
          ...result, 
          confidence: 'medium', 
          macAddress,
          source: 'local_pattern'
        };
      }

      // Step 3: Check if we have any partial OUI matches (first 4-5 digits)
      result = await this.partialOUILookup(normalizedMac.substring(0, 8));
      if (result) {
        console.log(`Partial OUI match found for ${macAddress}: ${result.manufacturer}`);
        return { 
          ...result, 
          confidence: 'medium', 
          macAddress,
          source: 'local_partial'
        };
      }

      // Step 4: Only use API lookup if no local match found
      console.log(`No local match for ${macAddress}, trying API lookup...`);
      result = await this.apiLookup(macAddress);
      if (result) {
        // Cache the API result for future local queries
        await this.cacheApiResult(oui, result);
        console.log(`API match found and cached for ${macAddress}: ${result.manufacturer}`);
        return { 
          ...result, 
          confidence: 'api', 
          macAddress,
          source: result.source || 'api'
        };
      }

      // Step 5: Analyze MAC pattern for virtual/special addresses
      const analysis = this.analyzeMacPattern(macAddress);
      console.log(`No manufacturer found for ${macAddress}, analyzing pattern...`);
      return {
        manufacturer: null,
        type: analysis.type || 'unknown',
        confidence: 'none',
        macAddress,
        source: 'pattern_analysis',
        ...analysis
      };

    } catch (error) {
      console.error('Lookup error:', error);
      return { 
        manufacturer: null, 
        type: 'unknown', 
        confidence: 'error', 
        macAddress,
        error: error.message 
      };
    }
  }

  /**
   * Exact OUI database lookup
   */
  async exactOUILookup(oui) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT manufacturer, device_type as type, device_category as category, 
               confidence, source, updated_at
        FROM oui_lookup 
        WHERE oui = ? 
        ORDER BY confidence DESC 
        LIMIT 1
      `;
      
      this.db.get(sql, [oui], (error, row) => {
        if (error) {
          reject(error);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Pattern-based lookup for broader coverage
   */
  async patternLookup(normalizedMac) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT manufacturer, device_type as type, device_category as category, 
               confidence, pattern_type
        FROM device_patterns 
        WHERE ? LIKE pattern || '%'
        ORDER BY confidence DESC, LENGTH(pattern) DESC
        LIMIT 1
      `;
      
      this.db.get(sql, [normalizedMac], (error, row) => {
        if (error) {
          reject(error);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Partial OUI lookup for broader manufacturer matching
   * Searches for manufacturers with similar OUI prefixes
   */
  async partialOUILookup(partialOui) {
    return new Promise((resolve, reject) => {
      // Try matching first 4-5 characters of OUI for broader coverage
      const sql = `
        SELECT manufacturer, device_type as type, device_category as category, 
               confidence, source, oui
        FROM oui_lookup 
        WHERE SUBSTR(REPLACE(oui, ':', ''), 1, 4) = SUBSTR(REPLACE(?, ':', ''), 1, 4)
        ORDER BY confidence DESC, LENGTH(oui) DESC
        LIMIT 1
      `;
      
      this.db.get(sql, [partialOui], (error, row) => {
        if (error) {
          reject(error);
        } else {
          if (row) {
            // Reduce confidence for partial matches
            row.confidence = Math.max(30, (row.confidence || 50) - 20);
            row.matchType = 'partial_oui';
          }
          resolve(row);
        }
      });
    });
  }

  /**
   * API-based lookup with rate limiting and caching
   * Only used as last resort when no local data exists
   */
  async apiLookup(macAddress) {
    // Check if we recently failed to find this OUI to avoid repeated API calls
    const oui = this.formatOui(macAddress.replace(/[:-]/g, '').substring(0, 6));
    const recentFailure = await this.checkRecentAPIFailure(oui);
    
    if (recentFailure) {
      console.log(`Skipping API lookup for ${macAddress} - recent failure cached`);
      return null;
    }

    try {
      // Try MacVendors API first (free, no rate limiting for reasonable use)
      console.log(`Querying MacVendors API for ${macAddress}...`);
      const response = await axios.get(`${this.apiEndpoints.macvendors}${macAddress}`, {
        timeout: 3000, // Reduced timeout for faster fallback
        headers: {
          'User-Agent': 'Pi-Studio-Network-Scanner/1.0'
        }
      });

      if (response.data && typeof response.data === 'string' && response.data.trim() !== 'N/A') {
        const manufacturer = response.data.trim();
        console.log(`MacVendors API success for ${macAddress}: ${manufacturer}`);
        return {
          manufacturer,
          type: this.inferDeviceType(manufacturer),
          category: 'API Detected',
          source: 'macvendors_api'
        };
      }
    } catch (error) {
      console.log(`MacVendors API failed for ${macAddress}: ${error.message}`);
    }

    try {
      // Try MacLookup API as fallback with longer timeout
      console.log(`Querying MacLookup API for ${macAddress}...`);
      const response = await axios.get(`${this.apiEndpoints.maclookup}${macAddress}`, {
        timeout: 5000
      });

      if (response.data && response.data.company && response.data.company !== 'N/A') {
        const manufacturer = response.data.company;
        console.log(`MacLookup API success for ${macAddress}: ${manufacturer}`);
        return {
          manufacturer,
          type: this.inferDeviceType(manufacturer),
          category: response.data.type || 'API Detected',
          source: 'maclookup_api'
        };
      }
    } catch (error) {
      console.log(`MacLookup API failed for ${macAddress}: ${error.message}`);
    }

    // Cache the failure to avoid repeated API calls for unknown OUIs
    await this.cacheAPIFailure(oui);
    console.log(`All API lookups failed for ${macAddress}, cached failure`);
    return null;
  }

  /**
   * Check if we recently failed to find this OUI via API
   */
  async checkRecentAPIFailure(oui) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT last_update 
        FROM api_updates 
        WHERE api_source = 'failure_cache' AND records_updated = 0 
        AND last_update > datetime('now', '-1 hour')
        AND status LIKE '%' || ? || '%'
        LIMIT 1
      `;
      
      this.db.get(sql, [oui], (error, row) => {
        if (error) {
          reject(error);
        } else {
          resolve(!!row);
        }
      });
    });
  }

  /**
   * Cache API lookup failure to avoid repeated calls
   */
  async cacheAPIFailure(oui) {
    try {
      await this.recordApiUpdate('failure_cache', new Date(), 0, `failed_oui_${oui}`);
    } catch (error) {
      console.error('Failed to cache API failure:', error);
    }
  }

  /**
   * Cache API result for future local queries
   * Stores successful API results with higher confidence for local use
   */
  async cacheApiResult(oui, result) {
    try {
      console.log(`Caching API result for ${oui}: ${result.manufacturer}`);
      await this.insertOUIEntry({
        oui,
        manufacturer: result.manufacturer,
        device_type: result.type,
        device_category: result.category,
        confidence: 75, // Higher confidence for API results
        source: result.source || 'api_cached'
      });
      
      // Also record successful API lookup
      await this.recordApiUpdate('lookup_cache', new Date(), 1, `success_${oui}`);
    } catch (error) {
      console.error('Failed to cache API result:', error);
    }
  }

  /**
   * Get local database coverage statistics
   */
  async getLocalCoverage() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total_entries,
          COUNT(CASE WHEN source LIKE '%api%' THEN 1 END) as api_cached_entries,
          COUNT(CASE WHEN source = 'ieee_api' THEN 1 END) as ieee_entries,
          COUNT(CASE WHEN source = 'initial' THEN 1 END) as initial_entries,
          COUNT(CASE WHEN confidence >= 80 THEN 1 END) as high_confidence_entries
        FROM oui_lookup
      `;
      
      this.db.get(sql, [], (error, row) => {
        if (error) {
          reject(error);
        } else {
          const coverage = {
            ...row,
            local_coverage_percentage: ((row.total_entries - row.api_cached_entries) / row.total_entries * 100).toFixed(1),
            high_confidence_percentage: (row.high_confidence_entries / row.total_entries * 100).toFixed(1)
          };
          resolve(coverage);
        }
      });
    });
  }

  /**
   * Batch lookup for multiple MAC addresses (optimized for local queries)
   */
  async batchLookup(macAddresses) {
    const results = [];
    const localResults = [];
    const apiNeeded = [];

    // First pass: try to resolve all from local database
    for (const mac of macAddresses) {
      const normalizedMac = mac.toLowerCase().replace(/[:-]/g, '');
      const oui = this.formatOui(normalizedMac.substring(0, 6));
      
      try {
        // Try exact local lookup
        let result = await this.exactOUILookup(oui);
        if (!result) {
          result = await this.patternLookup(normalizedMac);
        }
        if (!result) {
          result = await this.partialOUILookup(normalizedMac.substring(0, 8));
        }
        
        if (result) {
          localResults.push({
            macAddress: mac,
            ...result,
            confidence: 'high',
            source: 'local_batch'
          });
        } else {
          apiNeeded.push(mac);
        }
      } catch (error) {
        console.error(`Batch lookup error for ${mac}:`, error);
        apiNeeded.push(mac);
      }
    }

    console.log(`Batch lookup: ${localResults.length} resolved locally, ${apiNeeded.length} need API lookup`);

    // Second pass: API lookup for unresolved MACs (with rate limiting)
    for (const mac of apiNeeded) {
      try {
        const apiResult = await this.apiLookup(mac);
        if (apiResult) {
          results.push({
            macAddress: mac,
            ...apiResult,
            confidence: 'api'
          });
        } else {
          results.push({
            macAddress: mac,
            manufacturer: null,
            type: 'unknown',
            confidence: 'none'
          });
        }
        
        // Add delay between API calls to respect rate limits
        if (apiNeeded.indexOf(mac) < apiNeeded.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`API lookup error for ${mac}:`, error);
        results.push({
          macAddress: mac,
          manufacturer: null,
          type: 'unknown',
          confidence: 'error',
          error: error.message
        });
      }
    }

    return [...localResults, ...results];
  }

  /**
   * Infer device type from manufacturer name
   */
  inferDeviceType(manufacturer) {
    const mfg = manufacturer.toLowerCase();
    
    if (mfg.includes('cisco') || mfg.includes('netgear') || mfg.includes('linksys')) {
      return 'router';
    }
    if (mfg.includes('apple')) {
      if (mfg.includes('iphone')) return 'mobile';
      if (mfg.includes('ipad')) return 'tablet';
      return 'computer';
    }
    if (mfg.includes('samsung') || mfg.includes('lg') && mfg.includes('mobile')) {
      return 'mobile';
    }
    if (mfg.includes('hp') || mfg.includes('canon') || mfg.includes('epson')) {
      return 'printer';
    }
    if (mfg.includes('raspberry pi')) {
      return 'computer';
    }
    if (mfg.includes('google') || mfg.includes('amazon')) {
      return 'iot';
    }
    
    return 'unknown';
  }

  /**
   * Get device capabilities from database
   */
  async getDeviceCapabilities(deviceInfo) {
    if (!deviceInfo || !deviceInfo.type) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT DISTINCT capability, description
        FROM device_capabilities dc
        JOIN oui_lookup ol ON dc.oui = ol.oui
        WHERE ol.device_type = ?
        ORDER BY capability
      `;
      
      this.db.all(sql, [deviceInfo.type], (error, rows) => {
        if (error) {
          reject(error);
        } else {
          resolve(rows.map(row => row.capability));
        }
      });
    });
  }

  /**
   * Get security profile for device type
   */
  async getSecurityProfile(deviceInfo) {
    if (!deviceInfo || !deviceInfo.type) {
      return { riskLevel: 'unknown', concerns: [], recommendations: [] };
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT risk_level, concern, recommendation, common_port, security_feature
        FROM security_profiles
        WHERE device_type = ?
      `;
      
      this.db.all(sql, [deviceInfo.type], (error, rows) => {
        if (error) {
          reject(error);
        } else {
          const profile = {
            riskLevel: rows[0]?.risk_level || 'low',
            concerns: rows.filter(r => r.concern).map(r => r.concern),
            recommendations: rows.filter(r => r.recommendation).map(r => r.recommendation),
            commonPorts: rows.filter(r => r.common_port).map(r => r.common_port),
            securityFeatures: rows.filter(r => r.security_feature).map(r => r.security_feature)
          };
          resolve(profile);
        }
      });
    });
  }

  /**
   * Update database from APIs
   */
  async updateFromAPIs() {
    console.log('Starting API update process...');
    
    try {
      // Update from IEEE OUI database
      await this.updateFromIEEE();
      
      // Record the update
      await this.recordApiUpdate('ieee', new Date());
      
      this.lastUpdate = new Date();
      console.log('API update completed successfully');
      
    } catch (error) {
      console.error('API update failed:', error);
      await this.recordApiUpdate('ieee', new Date(), 0, 'failed');
    }
  }

  /**
   * Update from IEEE OUI database
   */
  async updateFromIEEE() {
    try {
      console.log('Downloading IEEE OUI database...');
      const response = await axios.get(this.apiEndpoints.ieee, {
        timeout: 30000,
        maxRedirects: 5
      });

      if (response.data) {
        console.log('Processing IEEE OUI data...');
        await this.processIEEEData(response.data);
      }
    } catch (error) {
      console.error('Failed to update from IEEE:', error.message);
    }
  }

  /**
   * Process IEEE OUI data format
   */
  async processIEEEData(data) {
    const lines = data.split('\n');
    let updatedCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.match(/^[0-9A-F]{6}/)) {
        const oui = line.substring(0, 6);
        const formattedOui = this.formatOui(oui);
        
        // Look for the company name in the next lines
        let manufacturer = '';
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine && !nextLine.match(/^[0-9A-F]/)) {
            manufacturer = nextLine.split('\t')[0].trim();
            break;
          }
        }
        
        if (manufacturer) {
          try {
            await this.insertOUIEntry({
              oui: formattedOui,
              manufacturer,
              device_type: this.inferDeviceType(manufacturer),
              device_category: 'IEEE Registry',
              confidence: 90,
              source: 'ieee_api'
            });
            updatedCount++;
            
            if (updatedCount % 100 === 0) {
              console.log(`Processed ${updatedCount} IEEE entries...`);
            }
          } catch (error) {
            // Continue processing even if individual entries fail
          }
        }
      }
    }
    
    console.log(`Updated ${updatedCount} entries from IEEE database`);
  }

  /**
   * Check if database needs API update
   */
  async needsApiUpdate() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT last_update 
        FROM api_updates 
        WHERE api_source = 'ieee' 
        ORDER BY last_update DESC 
        LIMIT 1
      `;
      
      this.db.get(sql, [], (error, row) => {
        if (error) {
          reject(error);
        } else {
          if (!row) {
            resolve(true); // Never updated
          } else {
            const lastUpdate = new Date(row.last_update);
            const now = new Date();
            const timeDiff = now - lastUpdate;
            resolve(timeDiff > this.updateInterval);
          }
        }
      });
    });
  }

  /**
   * Record API update attempt
   */
  async recordApiUpdate(apiSource, timestamp, recordsUpdated = 0, status = 'success') {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO api_updates (api_source, last_update, records_updated, status)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(sql, [apiSource, timestamp, recordsUpdated, status], function(error) {
        if (error) {
          reject(error);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  /**
   * Get database statistics
   */
  async getStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total_entries,
          COUNT(DISTINCT manufacturer) as unique_manufacturers,
          COUNT(DISTINCT device_type) as device_types,
          MAX(updated_at) as last_updated
        FROM oui_lookup
      `;
      
      this.db.get(sql, [], (error, row) => {
        if (error) {
          reject(error);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Utility methods
   */
  formatOui(oui) {
    return `${oui.substring(0, 2)}:${oui.substring(2, 4)}:${oui.substring(4, 6)}`.toUpperCase();
  }

  analyzeMacPattern(macAddress) {
    // Same logic as before but can be enhanced with database patterns
    const analysis = {};
    const normalizedMac = macAddress.replace(/[:-]/g, '');
    const firstOctet = parseInt(normalizedMac.substring(0, 2), 16);
    
    if (firstOctet & 0x02) {
      analysis.locallyAdministered = true;
      analysis.type = 'virtual';
      analysis.note = 'Locally administered MAC address (likely virtual)';
    }
    
    if (firstOctet & 0x01) {
      analysis.multicast = true;
      analysis.note = 'Multicast MAC address';
    }
    
    return analysis;
  }

  async getRecordCount() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT COUNT(*) as count FROM oui_lookup', [], (error, row) => {
        if (error) {
          reject(error);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      this.db.close();
    }
  }

  // Include all the initial data methods
  getInitialOUIData() {
    return [
      // Apple Inc.
      { oui: '00:1B:63', manufacturer: 'Apple Inc.', device_type: 'computer', device_category: 'Mac' },
      { oui: '00:25:00', manufacturer: 'Apple Inc.', device_type: 'computer', device_category: 'Mac' },
      { oui: '28:CD:C1', manufacturer: 'Apple Inc.', device_type: 'computer', device_category: 'Mac' },
      { oui: '14:7D:DA', manufacturer: 'Apple Inc.', device_type: 'mobile', device_category: 'iPhone' },
      { oui: '64:B9:E8', manufacturer: 'Apple Inc.', device_type: 'mobile', device_category: 'iPhone' },
      { oui: 'B4:F0:AB', manufacturer: 'Apple Inc.', device_type: 'tablet', device_category: 'iPad' },
      
      // Cisco Systems
      { oui: '00:0A:B8', manufacturer: 'Cisco Systems Inc.', device_type: 'router', device_category: 'Enterprise Router' },
      { oui: '00:15:C6', manufacturer: 'Cisco Systems Inc.', device_type: 'switch', device_category: 'Catalyst Switch' },
      
      // Samsung Electronics
      { oui: '28:18:78', manufacturer: 'Samsung Electronics', device_type: 'mobile', device_category: 'Galaxy' },
      { oui: '5C:0A:5B', manufacturer: 'Samsung Electronics', device_type: 'mobile', device_category: 'Galaxy' },
      
      // Google Inc.
      { oui: 'F4:F5:D8', manufacturer: 'Google Inc.', device_type: 'iot', device_category: 'Chromecast' },
      { oui: 'DA:A1:19', manufacturer: 'Google Inc.', device_type: 'iot', device_category: 'Google Home' },
      
      // Amazon Technologies
      { oui: 'EC:FA:BC', manufacturer: 'Amazon Technologies Inc.', device_type: 'iot', device_category: 'Echo Device' },
      { oui: '44:65:0D', manufacturer: 'Amazon Technologies Inc.', device_type: 'iot', device_category: 'Fire TV' },
      
      // Raspberry Pi Foundation
      { oui: 'B8:27:EB', manufacturer: 'Raspberry Pi Foundation', device_type: 'computer', device_category: 'Raspberry Pi' },
      { oui: 'DC:A6:32', manufacturer: 'Raspberry Pi Foundation', device_type: 'computer', device_category: 'Raspberry Pi' },
      
      // Microsoft Corporation
      { oui: '00:15:5D', manufacturer: 'Microsoft Corporation', device_type: 'virtual', device_category: 'Hyper-V' },
      { oui: '00:03:FF', manufacturer: 'Microsoft Corporation', device_type: 'computer', device_category: 'Surface' }
    ];
  }

  async seedSecurityProfiles() {
    const profiles = [
      { device_type: 'router', risk_level: 'critical', concern: 'Network gateway exposure', recommendation: 'Change default credentials' },
      { device_type: 'router', risk_level: 'critical', concern: 'Firmware vulnerabilities', recommendation: 'Regular firmware updates' },
      { device_type: 'iot', risk_level: 'high', concern: 'Weak authentication', recommendation: 'Network segmentation' },
      { device_type: 'printer', risk_level: 'medium', concern: 'Document access', recommendation: 'Secure print queues' }
    ];

    for (const profile of profiles) {
      await this.insertSecurityProfile(profile);
    }
  }

  async seedDevicePatterns() {
    const patterns = [
      { pattern: '00155D', manufacturer: 'Microsoft Corporation', device_type: 'virtual', device_category: 'Hyper-V' },
      { pattern: '005056', manufacturer: 'VMware Inc.', device_type: 'virtual', device_category: 'VM' },
      { pattern: '020000', manufacturer: 'Docker', device_type: 'virtual', device_category: 'Container' }
    ];

    for (const pattern of patterns) {
      await this.insertDevicePattern(pattern);
    }
  }

  async seedNetworkBehavior() {
    const behaviors = [
      { device_type: 'router', communication_pattern: 'Gateway traffic', typical_traffic: 'DHCP, DNS, HTTP' },
      { device_type: 'iot', communication_pattern: 'Cloud communication', typical_traffic: 'HTTPS, MQTT' }
    ];

    for (const behavior of behaviors) {
      await this.insertNetworkBehavior(behavior);
    }
  }

  async insertSecurityProfile(profile) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO security_profiles 
        (device_type, risk_level, concern, recommendation)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(sql, [profile.device_type, profile.risk_level, profile.concern, profile.recommendation], function(error) {
        if (error) {
          reject(error);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async insertDevicePattern(pattern) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO device_patterns 
        (pattern, manufacturer, device_type, device_category, confidence)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [pattern.pattern, pattern.manufacturer, pattern.device_type, pattern.device_category, 70], function(error) {
        if (error) {
          reject(error);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async insertNetworkBehavior(behavior) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO network_behavior 
        (device_type, communication_pattern, typical_traffic)
        VALUES (?, ?, ?)
      `;
      
      this.db.run(sql, [behavior.device_type, behavior.communication_pattern, behavior.typical_traffic], function(error) {
        if (error) {
          reject(error);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }
}

module.exports = SQLiteOUIDatabase;
