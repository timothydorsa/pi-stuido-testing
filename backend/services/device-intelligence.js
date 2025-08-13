/**
 * Device Intelligence Service
 * Enhances network discovery with manufacturer, device type, and iconography information
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const MACAddressConverter = require('../utils/mac-address-converter');

class DeviceIntelligence {
  constructor() {
    this.dbPath = path.join(__dirname, '../database/device-intelligence.sqlite');
    this.db = null;
    this.macConverter = new MACAddressConverter();
    this.initialize();
  }

  /**
   * Initialize database connection
   */
  initialize() {
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Error opening device intelligence database:', err);
      } else {
        console.log('Device Intelligence service initialized');
      }
    });
  }

  /**
   * Enrich discovered device with manufacturer and type information
   */
  async enrichDevice(deviceInfo) {
    return new Promise((resolve, reject) => {
      const { mac, ip, hostname } = deviceInfo;
      
      if (!mac) {
        resolve(deviceInfo);
        return;
      }

      try {
        // Use MAC converter to generate all possible search patterns
        const searchPatterns = this.macConverter.generateSearchPatterns(mac);
        const oui = this.macConverter.extractOUI(mac);
        
        console.log(`Searching for MAC ${mac} with OUI ${oui}, patterns:`, searchPatterns);

        // Enhanced SQL query that joins with manufacturer intelligence
        const placeholders = searchPatterns.map(() => '?').join(',');
        const query = `
          SELECT 
            o.*,
            m.normalized_name as manufacturer_normalized,
            m.company_type,
            m.primary_color,
            m.security_reputation,
            m.support_quality,
            m.founded_year,
            m.headquarters,
            m.website,
            m.market_share,
            m.update_frequency,
            e.enhanced_device_type,
            e.capabilities,
            e.generation_info
          FROM oui_lookup o
          LEFT JOIN manufacturer_intelligence m ON (
            LOWER(o.manufacturer) LIKE '%' || LOWER(m.normalized_name) || '%' OR
            LOWER(o.manufacturer) LIKE '%' || LOWER(m.manufacturer_name) || '%'
          )
          LEFT JOIN oui_enhancements e ON o.oui = e.oui
          WHERE o.oui IN (${placeholders})
          ORDER BY o.confidence DESC 
          LIMIT 1
        `;

        // Query database with all possible patterns
        this.db.get(query, searchPatterns, (err, row) => {
          if (err) {
            console.error('Database query error:', err);
            resolve(deviceInfo);
            return;
          }

          if (row) {
            console.log(`Found enhanced match for ${mac}:`, row);
            
            // Enhanced device information with manufacturer intelligence
            const enrichedDevice = {
              ...deviceInfo,
              manufacturer: this.macConverter.normalizeManufacturer(row.manufacturer),
              deviceType: row.enhanced_device_type || row.device_type || 'unknown',
              deviceCategory: row.device_category || 'Unidentified',
              confidence: row.confidence || 50,
              oui: oui,
              icon: this.getDeviceIcon(row.device_type, row.manufacturer),
              riskLevel: this.assessRiskLevel(row.device_type, row.manufacturer),
              capabilities: this.parseJSONField(row.capabilities) || this.inferCapabilities(row.device_type, deviceInfo),
              
              // Enhanced manufacturer intelligence
              manufacturerInfo: row.manufacturer_normalized ? {
                normalizedName: row.manufacturer_normalized,
                companyType: row.company_type,
                primaryColor: row.primary_color,
                securityReputation: row.security_reputation,
                supportQuality: row.support_quality,
                foundedYear: row.founded_year,
                headquarters: row.headquarters,
                website: row.website,
                marketShare: row.market_share,
                updateFrequency: row.update_frequency
              } : null,
              
              // Device generation and capability info
              generationInfo: row.generation_info,
              enhancedCapabilities: this.parseJSONField(row.capabilities)
            };

            resolve(enrichedDevice);
          } else {
            console.log(`No match found for MAC ${mac} with patterns:`, searchPatterns);
            
            // OUI not found, provide minimal enrichment
            resolve({
              ...deviceInfo,
              manufacturer: 'Unknown',
              deviceType: 'unknown',
              deviceCategory: 'Unidentified',
              confidence: 10,
              oui: oui,
              icon: this.getDeviceIcon('unknown'),
              riskLevel: 'medium',
              capabilities: this.inferCapabilities('unknown', deviceInfo)
            });
          }
        });
        
      } catch (error) {
        console.error('Error processing MAC address:', error);
        resolve({
          ...deviceInfo,
          manufacturer: 'Unknown',
          deviceType: 'unknown',
          deviceCategory: 'Unidentified',
          confidence: 10,
          oui: mac,
          icon: this.getDeviceIcon('unknown'),
          riskLevel: 'medium',
          capabilities: this.inferCapabilities('unknown', deviceInfo)
        });
      }
    });
  }

  /**
   * Get device icon based on type and manufacturer
   */
  getDeviceIcon(deviceType, manufacturer = '') {
    const iconMap = {
      'router': '🌐',
      'switch': '🔀',
      'access_point': '📡',
      'printer': '🖨️',
      'camera': '📹',
      'phone': '📱',
      'laptop': '💻',
      'desktop': '🖥️',
      'tablet': '📱',
      'iot': '🏠',
      'smart_tv': '📺',
      'gaming': '🎮',
      'storage': '💾',
      'server': '🗄️',
      'firewall': '🛡️',
      'unknown': '❓'
    };

    // Special manufacturer icons
    if (manufacturer && manufacturer.toLowerCase().includes('apple')) {
      return '🍎';
    }
    if (manufacturer && manufacturer.toLowerCase().includes('google')) {
      return '🌈';
    }
    if (manufacturer && manufacturer.toLowerCase().includes('amazon')) {
      return '📦';
    }

    return iconMap[deviceType] || iconMap['unknown'];
  }

  /**
   * Assess security risk level based on device type and manufacturer
   */
  assessRiskLevel(deviceType, manufacturer) {
    // High-risk devices
    const highRiskTypes = ['camera', 'iot', 'printer'];
    
    // Medium-risk devices
    const mediumRiskTypes = ['router', 'access_point', 'switch'];
    
    // Low-risk devices
    const lowRiskTypes = ['laptop', 'desktop', 'phone', 'tablet'];

    if (highRiskTypes.includes(deviceType)) {
      return 'high';
    } else if (mediumRiskTypes.includes(deviceType)) {
      return 'medium';
    } else if (lowRiskTypes.includes(deviceType)) {
      return 'low';
    }

    return 'medium'; // Default
  }

  /**
   * Infer device capabilities based on type and network information
   */
  inferCapabilities(deviceType, deviceInfo) {
    const capabilities = [];

    // Basic capabilities based on device type
    switch (deviceType) {
      case 'router':
        capabilities.push('routing', 'dhcp', 'nat', 'firewall');
        break;
      case 'switch':
        capabilities.push('switching', 'vlan');
        break;
      case 'access_point':
        capabilities.push('wireless', 'bridging');
        break;
      case 'printer':
        capabilities.push('printing', 'scanning');
        break;
      case 'camera':
        capabilities.push('video_streaming', 'motion_detection');
        break;
      case 'iot':
        capabilities.push('sensing', 'automation');
        break;
    }

    // Infer from open ports if available
    if (deviceInfo.openPorts) {
      if (deviceInfo.openPorts.includes(22)) capabilities.push('ssh');
      if (deviceInfo.openPorts.includes(80) || deviceInfo.openPorts.includes(443)) {
        capabilities.push('web_interface');
      }
      if (deviceInfo.openPorts.includes(23)) capabilities.push('telnet');
      if (deviceInfo.openPorts.includes(21)) capabilities.push('ftp');
      if (deviceInfo.openPorts.includes(25)) capabilities.push('smtp');
    }

    return capabilities;
  }

  /**
   * Get device recommendations based on type and risk level
   */
  getDeviceRecommendations(enrichedDevice) {
    const recommendations = [];

    // Security recommendations based on risk level
    if (enrichedDevice.riskLevel === 'high') {
      recommendations.push({
        type: 'security',
        priority: 'high',
        message: 'High-risk device detected. Ensure firmware is updated and change default credentials.'
      });
    }

    // Port-based recommendations
    if (enrichedDevice.capabilities && enrichedDevice.capabilities.includes('telnet')) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        message: 'Telnet detected. Disable and use SSH instead for secure access.'
      });
    }

    // Device-specific recommendations
    if (enrichedDevice.deviceType === 'camera') {
      recommendations.push({
        type: 'privacy',
        priority: 'medium',
        message: 'Camera device detected. Review privacy settings and access controls.'
      });
    }

    return recommendations;
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }

  /**
   * Parse JSON field safely
   */
  parseJSONField(field) {
    if (!field) return null;
    try {
      return JSON.parse(field);
    } catch (error) {
      console.error('Error parsing JSON field:', error);
      return null;
    }
  }
}

module.exports = DeviceIntelligence;
