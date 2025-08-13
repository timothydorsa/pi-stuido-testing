/**
 * MAC Address Conversion Utility
 * Handles all MAC address formats and conversions for database queries
 */

class MACAddressConverter {
  constructor() {
    // Common MAC address formats (including XX placeholders)
    this.formats = {
      COLON: /^([0-9A-Fa-fXx]{2}[:-]){5}([0-9A-Fa-fXx]{2})$/,           // 00:1A:2B:3C:4D:5E or CE:9E:43:XX:XX:XX
      DASH: /^([0-9A-Fa-fXx]{2}[-]){5}([0-9A-Fa-fXx]{2})$/,             // 00-1A-2B-3C-4D-5E or CE-9E-43-XX-XX-XX
      DOT: /^([0-9A-Fa-fXx]{4}[.]){2}([0-9A-Fa-fXx]{4})$/,             // 001A.2B3C.4D5E
      PLAIN: /^[0-9A-Fa-fXx]{12}$/,                                      // 001A2B3C4D5E or CE9E43XXXXXX
      SPACE: /^([0-9A-Fa-fXx]{2}[ ]){5}([0-9A-Fa-fXx]{2})$/,           // 00 1A 2B 3C 4D 5E
      OUI_COLON: /^([0-9A-Fa-fXx]{2}[:-]){2}([0-9A-Fa-fXx]{2})$/,      // 00:1A:2B (OUI only)
      OUI_DASH: /^([0-9A-Fa-fXx]{2}[-]){2}([0-9A-Fa-fXx]{2})$/,        // 00-1A-2B (OUI only)
      OUI_PLAIN: /^[0-9A-Fa-fXx]{6}$/                                    // 001A2B (OUI only)
    };
  }

  /**
   * Detect the format of a MAC address
   */
  detectFormat(macAddress) {
    const mac = macAddress.trim().toUpperCase();
    
    for (const [formatName, regex] of Object.entries(this.formats)) {
      if (regex.test(mac)) {
        return formatName;
      }
    }
    
    return 'UNKNOWN';
  }

  /**
   * Normalize MAC address to standard colon format (XX:XX:XX:XX:XX:XX)
   */
  normalize(macAddress) {
    if (!macAddress) return null;
    
    const mac = macAddress.trim().toUpperCase();
    const format = this.detectFormat(mac);
    
    switch (format) {
      case 'COLON':
        return mac;
        
      case 'DASH':
        return mac.replace(/-/g, ':');
        
      case 'DOT':
        // 001A.2B3C.4D5E -> 00:1A:2B:3C:4D:5E
        const noDots = mac.replace(/\./g, '');
        return this.addColons(noDots);
        
      case 'PLAIN':
        // 001A2B3C4D5E -> 00:1A:2B:3C:4D:5E
        return this.addColons(mac);
        
      case 'SPACE':
        return mac.replace(/ /g, ':');
        
      case 'OUI_COLON':
      case 'OUI_DASH':
      case 'OUI_PLAIN':
        return this.normalizeOUI(mac);
        
      default:
        throw new Error(`Unknown MAC address format: ${macAddress}`);
    }
  }

  /**
   * Extract OUI (first 3 octets) from MAC address
   */
  extractOUI(macAddress) {
    if (!macAddress) return null;
    
    const mac = macAddress.trim().toUpperCase();
    const format = this.detectFormat(mac);
    
    // Handle different formats to extract OUI
    switch (format) {
      case 'COLON':
      case 'DASH':
      case 'SPACE':
        const parts = mac.split(/[:-\s]/);
        if (parts.length >= 3) {
          // Take first 3 parts, clean XX placeholders
          const ouiParts = parts.slice(0, 3).map(part => 
            part.replace(/X/gi, '0') // Replace X with 0 for placeholder
          );
          return ouiParts.join(':');
        }
        break;
        
      case 'DOT':
        // 001A.2B3C.4D5E -> extract first 6 hex chars
        const noDots = mac.replace(/\./g, '');
        return this.addColons(noDots.substring(0, 6));
        
      case 'PLAIN':
        // 001A2B3C4D5E or CE9E43XXXXXX -> extract first 6 chars
        const ouiHex = mac.substring(0, 6).replace(/X/gi, '0');
        return this.addColons(ouiHex);
        
      case 'OUI_COLON':
      case 'OUI_DASH':
        return mac.replace(/-/g, ':').replace(/X/gi, '0');
        
      case 'OUI_PLAIN':
        const cleanOui = mac.replace(/X/gi, '0');
        return this.addColons(cleanOui);
        
      default:
        // Try to extract manually
        const cleaned = mac.replace(/[^0-9A-FX]/gi, '').substring(0, 6);
        if (cleaned.length === 6) {
          return this.addColons(cleaned.replace(/X/gi, '0'));
        }
        throw new Error(`Cannot extract OUI from: ${macAddress}`);
    }
    
    throw new Error(`Invalid MAC address format: ${macAddress}`);
  }

  /**
   * Normalize OUI to standard format
   */
  normalizeOUI(ouiAddress) {
    const oui = ouiAddress.trim().toUpperCase();
    const format = this.detectFormat(oui);
    
    switch (format) {
      case 'OUI_COLON':
        return oui;
        
      case 'OUI_DASH':
        return oui.replace(/-/g, ':');
        
      case 'OUI_PLAIN':
        // 001A2B -> 00:1A:2B
        return this.addColons(oui);
        
      default:
        // Try to extract from full MAC
        try {
          return this.extractOUI(oui);
        } catch (error) {
          throw new Error(`Invalid OUI format: ${ouiAddress}`);
        }
    }
  }

  /**
   * Add colons to plain hex string
   */
  addColons(hexString) {
    if (hexString.length === 12) {
      // Full MAC: 001A2B3C4D5E -> 00:1A:2B:3C:4D:5E
      return hexString.match(/.{2}/g).join(':');
    } else if (hexString.length === 6) {
      // OUI: 001A2B -> 00:1A:2B
      return hexString.match(/.{2}/g).join(':');
    } else {
      throw new Error(`Invalid hex string length: ${hexString}`);
    }
  }

  /**
   * Convert to different formats for comparison
   */
  toFormats(macAddress) {
    const normalized = this.normalize(macAddress);
    const oui = this.extractOUI(macAddress);
    const plain = normalized.replace(/:/g, '');
    const ouiPlain = oui.replace(/:/g, '');
    
    return {
      normalized: normalized,           // 00:1A:2B:3C:4D:5E
      oui: oui,                        // 00:1A:2B
      plain: plain,                    // 001A2B3C4D5E
      ouiPlain: ouiPlain,             // 001A2B
      dash: normalized.replace(/:/g, '-'),      // 00-1A-2B-3C-4D-5E
      ouiDash: oui.replace(/:/g, '-'), // 00-1A-2B
      lowercase: normalized.toLowerCase(),       // 00:1a:2b:3c:4d:5e
      ouiLowercase: oui.toLowerCase()  // 00:1a:2b
    };
  }

  /**
   * Generate all possible search patterns for database queries
   */
  generateSearchPatterns(macAddress) {
    try {
      const formats = this.toFormats(macAddress);
      
      return [
        formats.oui,                    // CE:9E:43
        formats.ouiPlain,               // CE9E43
        formats.ouiDash,                // CE-9E-43
        formats.ouiLowercase,           // ce:9e:43
        formats.oui.replace(/:/g, ''),  // CE9E43 (duplicate, but safe)
        formats.normalized,             // Full MAC if provided
        formats.plain,                  // Full MAC plain
        formats.dash                    // Full MAC with dashes
      ].filter((pattern, index, self) => self.indexOf(pattern) === index); // Remove duplicates
    } catch (error) {
      console.warn(`Failed to generate search patterns for ${macAddress}:`, error.message);
      // Fallback: try basic cleanup
      return [
        macAddress.toUpperCase(),
        macAddress.toLowerCase(),
        macAddress.replace(/[-:]/g, ''),
        macAddress.replace(/[-:]/g, ':')
      ].filter(Boolean);
    }
  }

  /**
   * Validate MAC address format
   */
  isValid(macAddress) {
    if (!macAddress || typeof macAddress !== 'string') {
      return false;
    }
    
    try {
      const format = this.detectFormat(macAddress);
      return format !== 'UNKNOWN';
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert hex string to ASCII (for manufacturer name cleaning)
   */
  hexToAscii(hexString) {
    try {
      let result = '';
      for (let i = 0; i < hexString.length; i += 2) {
        const hexChar = hexString.substr(i, 2);
        const charCode = parseInt(hexChar, 16);
        if (charCode >= 32 && charCode <= 126) { // Printable ASCII range
          result += String.fromCharCode(charCode);
        }
      }
      return result.trim();
    } catch (error) {
      return hexString; // Return original if conversion fails
    }
  }

  /**
   * Clean and normalize manufacturer name
   */
  normalizeManufacturer(manufacturer) {
    if (!manufacturer) return '';
    
    return manufacturer
      .trim()
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/[^\w\s\.\-&]/g, '')   // Remove special chars except basic ones
      .replace(/Inc\.?$/i, 'Inc.')    // Normalize "Inc"
      .replace(/Corp\.?$/i, 'Corp.')  // Normalize "Corp"
      .replace(/Ltd\.?$/i, 'Ltd.')    // Normalize "Ltd"
      .trim();
  }

  /**
   * Create SQL LIKE patterns for flexible matching
   */
  createSQLPatterns(macAddress) {
    const patterns = this.generateSearchPatterns(macAddress);
    
    return patterns.map(pattern => ({
      exact: pattern,
      like: `%${pattern}%`,
      prefix: `${pattern}%`,
      suffix: `%${pattern}`
    }));
  }
}

module.exports = MACAddressConverter;
