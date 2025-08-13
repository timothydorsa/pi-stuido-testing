/**
 * Database Manager Service
 * Handles OUI database operations, API updates, and provides REST interface
 */

const SQLiteOUIDatabase = require('./oui-sqlite-database');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.database = null;
    this.updateInProgress = false;
    this.autoUpdateEnabled = true;
    this.updateSchedule = null;
  }

  /**
   * Initialize the database manager
   */
  async initialize() {
    try {
      const dbPath = path.join(__dirname, 'device-intelligence.sqlite');
      this.database = new SQLiteOUIDatabase(dbPath);
      
      await this.database.initialize();
      
      // Schedule automatic updates
      if (this.autoUpdateEnabled) {
        this.scheduleUpdates();
      }
      
      console.log('Database Manager initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Database Manager:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic database updates
   */
  scheduleUpdates() {
    // Update every 24 hours
    this.updateSchedule = setInterval(async () => {
      if (!this.updateInProgress) {
        console.log('Starting scheduled database update...');
        await this.updateDatabase();
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    console.log('Automatic database updates scheduled every 24 hours');
  }

  /**
   * Manually trigger database update
   */
  async updateDatabase(force = false) {
    if (this.updateInProgress && !force) {
      return { status: 'already_running', message: 'Update already in progress' };
    }

    this.updateInProgress = true;
    
    try {
      console.log('Starting database update from APIs...');
      
      const startTime = Date.now();
      await this.database.updateFromAPIs();
      const endTime = Date.now();
      
      const stats = await this.database.getStats();
      
      this.updateInProgress = false;
      
      return {
        status: 'success',
        message: 'Database updated successfully',
        duration: endTime - startTime,
        stats: stats
      };
      
    } catch (error) {
      this.updateInProgress = false;
      console.error('Database update failed:', error);
      
      return {
        status: 'error',
        message: 'Database update failed',
        error: error.message
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      return await this.database.getStats();
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return null;
    }
  }

  /**
   * Search for devices by manufacturer
   */
  async searchByManufacturer(manufacturer) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT oui, manufacturer, device_type, device_category, confidence
        FROM oui_lookup 
        WHERE manufacturer LIKE ?
        ORDER BY confidence DESC
        LIMIT 50
      `;
      
      this.database.db.all(sql, [`%${manufacturer}%`], (error, rows) => {
        if (error) {
          reject(error);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Search for devices by type
   */
  async searchByDeviceType(deviceType) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT oui, manufacturer, device_type, device_category, confidence
        FROM oui_lookup 
        WHERE device_type = ?
        ORDER BY manufacturer
        LIMIT 100
      `;
      
      this.database.db.all(sql, [deviceType], (error, rows) => {
        if (error) {
          reject(error);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Get all unique manufacturers
   */
  async getAllManufacturers() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT DISTINCT manufacturer, COUNT(*) as device_count
        FROM oui_lookup 
        GROUP BY manufacturer
        ORDER BY manufacturer
      `;
      
      this.database.db.all(sql, [], (error, rows) => {
        if (error) {
          reject(error);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Get all device types
   */
  async getAllDeviceTypes() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT DISTINCT device_type, COUNT(*) as count
        FROM oui_lookup 
        WHERE device_type IS NOT NULL
        GROUP BY device_type
        ORDER BY count DESC
      `;
      
      this.database.db.all(sql, [], (error, rows) => {
        if (error) {
          reject(error);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Add custom device entry
   */
  async addCustomDevice(ouiData) {
    try {
      const result = await this.database.insertOUIEntry({
        oui: ouiData.oui,
        manufacturer: ouiData.manufacturer,
        device_type: ouiData.device_type,
        device_category: ouiData.device_category,
        confidence: ouiData.confidence || 100,
        source: 'custom'
      });
      
      return {
        status: 'success',
        message: 'Custom device added successfully',
        id: result
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to add custom device',
        error: error.message
      };
    }
  }

  /**
   * Update device entry
   */
  async updateDevice(oui, updates) {
    return new Promise((resolve, reject) => {
      const updateFields = [];
      const values = [];
      
      if (updates.manufacturer) {
        updateFields.push('manufacturer = ?');
        values.push(updates.manufacturer);
      }
      if (updates.device_type) {
        updateFields.push('device_type = ?');
        values.push(updates.device_type);
      }
      if (updates.device_category) {
        updateFields.push('device_category = ?');
        values.push(updates.device_category);
      }
      if (updates.confidence) {
        updateFields.push('confidence = ?');
        values.push(updates.confidence);
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(oui);
      
      const sql = `
        UPDATE oui_lookup 
        SET ${updateFields.join(', ')}
        WHERE oui = ?
      `;
      
      this.database.db.run(sql, values, function(error) {
        if (error) {
          reject(error);
        } else {
          resolve({
            status: 'success',
            message: 'Device updated successfully',
            changes: this.changes
          });
        }
      });
    });
  }

  /**
   * Delete device entry
   */
  async deleteDevice(oui) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM oui_lookup WHERE oui = ?';
      
      this.database.db.run(sql, [oui], function(error) {
        if (error) {
          reject(error);
        } else {
          resolve({
            status: 'success',
            message: 'Device deleted successfully',
            changes: this.changes
          });
        }
      });
    });
  }

  /**
   * Get recent API updates
   */
  async getRecentUpdates() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT api_source, last_update, records_updated, status
        FROM api_updates 
        ORDER BY last_update DESC
        LIMIT 10
      `;
      
      this.database.db.all(sql, [], (error, rows) => {
        if (error) {
          reject(error);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Bulk import from CSV
   */
  async bulkImportCSV(csvData) {
    try {
      const lines = csvData.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      let importedCount = 0;
      let errorCount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim());
        
        try {
          const deviceData = {};
          headers.forEach((header, index) => {
            deviceData[header.toLowerCase()] = values[index];
          });
          
          await this.database.insertOUIEntry({
            oui: deviceData.oui,
            manufacturer: deviceData.manufacturer,
            device_type: deviceData.device_type || deviceData.type,
            device_category: deviceData.device_category || deviceData.category,
            confidence: parseInt(deviceData.confidence) || 80,
            source: 'csv_import'
          });
          
          importedCount++;
        } catch (error) {
          errorCount++;
          console.error(`Error importing line ${i}:`, error.message);
        }
      }
      
      return {
        status: 'success',
        message: `Bulk import completed`,
        imported: importedCount,
        errors: errorCount
      };
      
    } catch (error) {
      return {
        status: 'error',
        message: 'Bulk import failed',
        error: error.message
      };
    }
  }

  /**
   * Export database to CSV
   */
  async exportToCSV() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT oui, manufacturer, device_type, device_category, confidence, source, updated_at
        FROM oui_lookup 
        ORDER BY manufacturer, oui
      `;
      
      this.database.db.all(sql, [], (error, rows) => {
        if (error) {
          reject(error);
        } else {
          const headers = ['OUI', 'Manufacturer', 'Device Type', 'Device Category', 'Confidence', 'Source', 'Updated At'];
          const csvLines = [headers.join(',')];
          
          rows.forEach(row => {
            const line = [
              row.oui,
              `"${row.manufacturer}"`,
              row.device_type || '',
              `"${row.device_category || ''}"`,
              row.confidence,
              row.source,
              row.updated_at
            ].join(',');
            csvLines.push(line);
          });
          
          resolve(csvLines.join('\n'));
        }
      });
    });
  }

  /**
   * Enhanced device lookup with local-first strategy and caching
   */
  async lookupDevice(macAddress) {
    if (!this.database) {
      throw new Error('Database not initialized');
    }
    
    const result = await this.database.lookup(macAddress);
    
    // Enhance result with additional data if we have device type info
    if (result && result.type && result.type !== 'unknown') {
      try {
        result.capabilities = await this.database.getDeviceCapabilities(result);
        result.securityProfile = await this.database.getSecurityProfile(result);
        result.icon = this.getDeviceIcon(result);
      } catch (error) {
        console.error('Error enhancing device result:', error);
      }
    }
    
    return result;
  }

  /**
   * Batch lookup multiple devices (optimized for local queries)
   */
  async batchLookupDevices(macAddresses) {
    if (!this.database) {
      throw new Error('Database not initialized');
    }
    
    try {
      const results = await this.database.batchLookup(macAddresses);
      
      // Enhance each result with additional data
      for (const result of results) {
        if (result && result.type && result.type !== 'unknown') {
          try {
            result.capabilities = await this.database.getDeviceCapabilities(result);
            result.securityProfile = await this.database.getSecurityProfile(result);
            result.icon = this.getDeviceIcon(result);
          } catch (error) {
            console.error('Error enhancing batch result:', error);
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Batch lookup failed:', error);
      throw error;
    }
  }

  /**
   * Get database coverage and performance statistics
   */
  async getDatabaseCoverage() {
    try {
      const coverage = await this.database.getLocalCoverage();
      const stats = await this.database.getStats();
      
      return {
        ...coverage,
        ...stats,
        performanceOptimized: coverage.local_coverage_percentage > 80,
        recommendedActions: this.getOptimizationRecommendations(coverage)
      };
    } catch (error) {
      console.error('Failed to get database coverage:', error);
      return null;
    }
  }

  /**
   * Get optimization recommendations based on database coverage
   */
  getOptimizationRecommendations(coverage) {
    const recommendations = [];
    
    if (coverage.local_coverage_percentage < 70) {
      recommendations.push('Consider updating from IEEE API to improve local coverage');
    }
    
    if (coverage.high_confidence_percentage < 60) {
      recommendations.push('Review and update device classifications for better accuracy');
    }
    
    if (coverage.api_cached_entries > coverage.total_entries * 0.3) {
      recommendations.push('High API dependency detected - consider manual curation');
    }
    
    if (coverage.ieee_entries < coverage.total_entries * 0.5) {
      recommendations.push('Update IEEE database for better manufacturer coverage');
    }
    
    return recommendations;
  }

  /**
   * Get device icon (simplified version for database manager)
   */
  getDeviceIcon(deviceInfo) {
    if (!deviceInfo) return '📱';
    
    const { type, manufacturer } = deviceInfo;
    const mfg = manufacturer?.toLowerCase() || '';
    
    if (mfg.includes('apple')) return '🍎';
    if (mfg.includes('raspberry pi')) return '🥧';
    
    switch (type) {
      case 'router': return '🌐';
      case 'switch': return '🔀';
      case 'accesspoint': return '📡';
      case 'computer': return '💻';
      case 'mobile': return '📱';
      case 'printer': return '🖨️';
      case 'iot': return '🏠';
      case 'virtual': return '☁️';
      default: return '📱';
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const stats = await this.getStats();
      return {
        status: 'healthy',
        database: 'connected',
        updateInProgress: this.updateInProgress,
        autoUpdateEnabled: this.autoUpdateEnabled,
        stats: stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'error',
        error: error.message
      };
    }
  }

  /**
   * Cleanup and close
   */
  async close() {
    if (this.updateSchedule) {
      clearInterval(this.updateSchedule);
    }
    
    if (this.database) {
      await this.database.close();
    }
  }
}

module.exports = DatabaseManager;
