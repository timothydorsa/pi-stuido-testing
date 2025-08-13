/**
 * Comprehensive OUI (Organizationally Unique Identifier) Database
 * Based on IEEE Registration Authority database for MAC address manufacturer lookup
 */

class OUIDatabase {
  constructor() {
    this.ouiMap = {
      // Apple Inc.
      '00:1b:63': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      '00:25:00': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      '28:cd:c1': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      '3c:15:c2': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      '40:cb:c0': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      '68:96:7b': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      '70:cd:60': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      '84:38:35': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      'a4:c3:61': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      'b8:e8:56': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      'dc:37:18': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      'e4:ce:8f': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      'f0:18:98': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      'f4:37:b7': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      '92:68:57': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      '14:7d:da': { manufacturer: 'Apple Inc.', type: 'mobile', category: 'iPhone' },
      '64:b9:e8': { manufacturer: 'Apple Inc.', type: 'mobile', category: 'iPhone' },
      '90:72:40': { manufacturer: 'Apple Inc.', type: 'mobile', category: 'iPhone' },
      'b4:f0:ab': { manufacturer: 'Apple Inc.', type: 'tablet', category: 'iPad' },
      'cc:08:8d': { manufacturer: 'Apple Inc.', type: 'tablet', category: 'iPad' },
      
      // Microsoft Corporation
      '00:15:5d': { manufacturer: 'Microsoft Corporation', type: 'computer', category: 'Surface/Xbox' },
      '00:03:ff': { manufacturer: 'Microsoft Corporation', type: 'computer', category: 'Surface' },
      '00:0d:3a': { manufacturer: 'Microsoft Corporation', type: 'computer', category: 'Surface' },
      '7c:1e:52': { manufacturer: 'Microsoft Corporation', type: 'console', category: 'Xbox' },
      '98:5f:d3': { manufacturer: 'Microsoft Corporation', type: 'console', category: 'Xbox' },
      
      // Samsung Electronics
      '28:18:78': { manufacturer: 'Samsung Electronics', type: 'mobile', category: 'Galaxy Phone' },
      '34:23:87': { manufacturer: 'Samsung Electronics', type: 'mobile', category: 'Galaxy Phone' },
      '5c:0a:5b': { manufacturer: 'Samsung Electronics', type: 'mobile', category: 'Galaxy Phone' },
      '78:59:5e': { manufacturer: 'Samsung Electronics', type: 'mobile', category: 'Galaxy Phone' },
      'ac:5a:fc': { manufacturer: 'Samsung Electronics', type: 'mobile', category: 'Galaxy Phone' },
      'ec:1f:72': { manufacturer: 'Samsung Electronics', type: 'mobile', category: 'Galaxy Phone' },
      '00:16:6c': { manufacturer: 'Samsung Electronics', type: 'tv', category: 'Smart TV' },
      '44:00:10': { manufacturer: 'Samsung Electronics', type: 'tv', category: 'Smart TV' },
      '8c:de:f9': { manufacturer: 'Samsung Electronics', type: 'tablet', category: 'Galaxy Tab' },
      
      // Cisco Systems
      '00:1f:3f': { manufacturer: 'Cisco Systems', type: 'router', category: 'Enterprise Router' },
      '00:24:c4': { manufacturer: 'Cisco Systems', type: 'router', category: 'Enterprise Router' },
      'cc:46:d6': { manufacturer: 'Cisco Systems', type: 'router', category: 'Enterprise Router' },
      '00:0c:ce': { manufacturer: 'Cisco Systems', type: 'switch', category: 'Network Switch' },
      '00:26:98': { manufacturer: 'Cisco Systems', type: 'accesspoint', category: 'Wireless AP' },
      
      // Netgear Inc.
      'cc:19:a8': { manufacturer: 'Netgear Inc.', type: 'router', category: 'Consumer Router' },
      '00:1e:58': { manufacturer: 'Netgear Inc.', type: 'router', category: 'Consumer Router' },
      '20:4e:7f': { manufacturer: 'Netgear Inc.', type: 'router', category: 'Consumer Router' },
      'a0:04:60': { manufacturer: 'Netgear Inc.', type: 'accesspoint', category: 'Wireless AP' },
      
      // Hewlett Packard Enterprise / HP Inc.
      '00:1b:78': { manufacturer: 'HP Inc.', type: 'printer', category: 'LaserJet Printer' },
      '00:21:5a': { manufacturer: 'HP Inc.', type: 'printer', category: 'OfficeJet Printer' },
      '6c:3b:e5': { manufacturer: 'HP Inc.', type: 'printer', category: 'DeskJet Printer' },
      '3c:d9:2b': { manufacturer: 'Hewlett Packard Enterprise', type: 'server', category: 'ProLiant Server' },
      '4c:39:09': { manufacturer: 'Hewlett Packard Enterprise', type: 'switch', category: 'ProCurve Switch' },
      
      // Canon Inc.
      '00:1e:8f': { manufacturer: 'Canon Inc.', type: 'printer', category: 'PIXMA Printer' },
      '00:26:ab': { manufacturer: 'Canon Inc.', type: 'printer', category: 'imageRUNNER' },
      '34:64:a9': { manufacturer: 'Canon Inc.', type: 'printer', category: 'MAXIFY Printer' },
      
      // Google Inc.
      'f4:f5:d8': { manufacturer: 'Google Inc.', type: 'iot', category: 'Chromecast' },
      'da:a1:19': { manufacturer: 'Google Inc.', type: 'iot', category: 'Google Home' },
      '54:60:09': { manufacturer: 'Google Inc.', type: 'iot', category: 'Nest Device' },
      
      // Amazon Technologies
      'ec:fa:bc': { manufacturer: 'Amazon Technologies Inc.', type: 'iot', category: 'Echo Device' },
      '44:65:0d': { manufacturer: 'Amazon Technologies Inc.', type: 'iot', category: 'Fire TV' },
      '74:c2:46': { manufacturer: 'Amazon Technologies Inc.', type: 'iot', category: 'Kindle' },
      
      // Raspberry Pi Foundation
      'b8:27:eb': { manufacturer: 'Raspberry Pi Foundation', type: 'computer', category: 'Raspberry Pi' },
      'dc:a6:32': { manufacturer: 'Raspberry Pi Foundation', type: 'computer', category: 'Raspberry Pi' },
      'e4:5f:01': { manufacturer: 'Raspberry Pi Foundation', type: 'computer', category: 'Raspberry Pi' },
      
      // Intel Corporation
      '00:15:17': { manufacturer: 'Intel Corporation', type: 'computer', category: 'Intel NUC' },
      '1c:69:7a': { manufacturer: 'Intel Corporation', type: 'computer', category: 'Intel Device' },
      '34:13:e8': { manufacturer: 'Intel Corporation', type: 'computer', category: 'Intel Wireless' },
      
      // Dell Inc.
      '90:b1:1c': { manufacturer: 'Dell Inc.', type: 'computer', category: 'Dell Computer' },
      '18:03:73': { manufacturer: 'Dell Inc.', type: 'computer', category: 'Dell Laptop' },
      'b0:83:fe': { manufacturer: 'Dell Inc.', type: 'computer', category: 'Dell Desktop' },
      
      // LG Electronics
      '00:1d:ba': { manufacturer: 'LG Electronics', type: 'tv', category: 'LG Smart TV' },
      '00:e0:91': { manufacturer: 'LG Electronics', type: 'tv', category: 'LG WebOS TV' },
      '10:1c:0c': { manufacturer: 'LG Electronics', type: 'mobile', category: 'LG Phone' },
      
      // Sony Corporation
      '08:00:28': { manufacturer: 'Sony Corporation', type: 'tv', category: 'Sony Bravia TV' },
      '00:0a:95': { manufacturer: 'Sony Corporation', type: 'tv', category: 'Sony TV' },
      '4c:0b:be': { manufacturer: 'Sony Corporation', type: 'console', category: 'PlayStation' },
      
      // ASUS
      '1c:87:2c': { manufacturer: 'ASUSTeK Computer Inc.', type: 'router', category: 'ASUS Router' },
      '04:d9:f5': { manufacturer: 'ASUSTeK Computer Inc.', type: 'computer', category: 'ASUS Computer' },
      '2c:56:dc': { manufacturer: 'ASUSTeK Computer Inc.', type: 'computer', category: 'ASUS Laptop' },
      
      // TP-Link Technologies
      'f4:ec:38': { manufacturer: 'TP-Link Technologies Co.Ltd.', type: 'router', category: 'TP-Link Router' },
      '50:c7:bf': { manufacturer: 'TP-Link Technologies Co.Ltd.', type: 'accesspoint', category: 'TP-Link AP' },
      'a0:f3:c1': { manufacturer: 'TP-Link Technologies Co.Ltd.', type: 'router', category: 'TP-Link Router' },
      
      // D-Link Corporation
      '34:08:04': { manufacturer: 'D-Link Corporation', type: 'router', category: 'D-Link Router' },
      '90:94:e4': { manufacturer: 'D-Link Corporation', type: 'accesspoint', category: 'D-Link AP' },
      'cc:b2:55': { manufacturer: 'D-Link Corporation', type: 'switch', category: 'D-Link Switch' },
      
      // Ubiquiti Networks
      '04:18:d6': { manufacturer: 'Ubiquiti Networks Inc.', type: 'accesspoint', category: 'UniFi AP' },
      'f0:9f:c2': { manufacturer: 'Ubiquiti Networks Inc.', type: 'router', category: 'EdgeRouter' },
      '68:d7:9a': { manufacturer: 'Ubiquiti Networks Inc.', type: 'accesspoint', category: 'UniFi Device' },
      
      // Synology Inc.
      '00:11:32': { manufacturer: 'Synology Incorporated', type: 'storage', category: 'DiskStation NAS' },
      
      // QNAP Systems
      '24:5e:be': { manufacturer: 'QNAP Systems Inc.', type: 'storage', category: 'QNAP NAS' },
      
      // VMware Inc.
      '00:50:56': { manufacturer: 'VMware Inc.', type: 'computer', category: 'VMware Virtual Machine' },
      '00:0c:29': { manufacturer: 'VMware Inc.', type: 'computer', category: 'VMware ESX' },
      
      // Nvidia Corporation
      '00:04:4b': { manufacturer: 'Nvidia Corporation', type: 'computer', category: 'Nvidia Shield' },
      
      // Roku Inc.
      'dc:3a:5e': { manufacturer: 'Roku Inc.', type: 'tv', category: 'Roku Device' },
      'cc:6d:a0': { manufacturer: 'Roku Inc.', type: 'tv', category: 'Roku Streaming Stick' },
      
      // Nest Labs Inc.
      '18:b4:30': { manufacturer: 'Nest Labs Inc.', type: 'iot', category: 'Nest Thermostat' },
      '64:16:66': { manufacturer: 'Nest Labs Inc.', type: 'iot', category: 'Nest Camera' },
      
      // Philips Lighting
      '00:17:88': { manufacturer: 'Philips Lighting BV', type: 'iot', category: 'Hue Bridge' },
      'ec:b5:fa': { manufacturer: 'Philips Lighting BV', type: 'iot', category: 'Hue Device' },
      
      // Ring LLC
      '74:da:da': { manufacturer: 'Ring LLC', type: 'iot', category: 'Ring Doorbell' },
      
      // Sonos Inc.
      '00:0e:58': { manufacturer: 'Sonos Inc.', type: 'iot', category: 'Sonos Speaker' },
      '5c:aa:fd': { manufacturer: 'Sonos Inc.', type: 'iot', category: 'Sonos Device' },
      
      // Tesla Inc.
      '04:d3:b0': { manufacturer: 'Tesla Inc.', type: 'iot', category: 'Tesla Vehicle' }
    };
  }

  lookup(macAddress) {
    if (!macAddress) return null;
    
    // Normalize MAC address format
    const normalizedMac = macAddress.toLowerCase().replace(/[:-]/g, ':');
    
    // Extract OUI (first 3 octets)
    const oui = normalizedMac.substring(0, 8);
    
    // Check exact match first
    const exactMatch = this.ouiMap[oui];
    if (exactMatch) {
      return {
        ...exactMatch,
        oui: oui,
        confidence: 'high',
        macAddress: macAddress
      };
    }

    // Try partial matches for known patterns
    const ouiPrefix = oui.substring(0, 5);
    for (const [key, value] of Object.entries(this.ouiMap)) {
      if (key.startsWith(ouiPrefix)) {
        return {
          ...value,
          oui: oui,
          confidence: 'medium',
          macAddress: macAddress
        };
      }
    }

    // Try manufacturer pattern matching
    const patternMatch = this.findManufacturerPattern(macAddress);
    if (patternMatch) {
      return {
        ...patternMatch,
        confidence: 'low',
        macAddress: macAddress
      };
    }

    // Analyze MAC for additional info
    const analysis = this.analyzeMacPattern(macAddress);
    return {
      manufacturer: null,
      type: 'unknown',
      confidence: 'none',
      macAddress: macAddress,
      ...analysis
    };
  }

  findManufacturerPattern(macAddress) {
    const normalizedMac = macAddress.toLowerCase().replace(/[:-]/g, '');
    
    // Common manufacturer patterns (known OUIs not in main database)
    const patterns = {
      // Apple patterns
      '001b63': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      '002500': { manufacturer: 'Apple Inc.', type: 'computer', category: 'Mac' },
      '28cdc1': { manufacturer: 'Apple Inc.', type: 'mobile', category: 'iPhone' },
      '3c15c2': { manufacturer: 'Apple Inc.', type: 'mobile', category: 'iPhone' },
      '40cbc0': { manufacturer: 'Apple Inc.', type: 'mobile', category: 'iPhone' },
      
      // Samsung patterns
      '281878': { manufacturer: 'Samsung Electronics', type: 'mobile', category: 'Galaxy' },
      '342387': { manufacturer: 'Samsung Electronics', type: 'mobile', category: 'Galaxy' },
      '5c0a5b': { manufacturer: 'Samsung Electronics', type: 'mobile', category: 'Galaxy' },
      
      // Microsoft patterns
      '00155d': { manufacturer: 'Microsoft Corporation', type: 'virtual', category: 'Hyper-V' },
      '0003ff': { manufacturer: 'Microsoft Corporation', type: 'computer', category: 'Surface' },
      
      // VMware patterns
      '005056': { manufacturer: 'VMware Inc.', type: 'virtual', category: 'VM' },
      '000c29': { manufacturer: 'VMware Inc.', type: 'virtual', category: 'VM' },
      
      // Docker/Container patterns
      '020000': { manufacturer: 'Docker', type: 'virtual', category: 'Container' }
    };

    for (const [pattern, info] of Object.entries(patterns)) {
      if (normalizedMac.startsWith(pattern)) {
        return info;
      }
    }

    return null;
  }

  analyzeMacPattern(macAddress) {
    const analysis = {};
    const normalizedMac = macAddress.replace(/[:-]/g, '');
    const firstOctet = parseInt(normalizedMac.substring(0, 2), 16);
    
    // Check if locally administered
    if (firstOctet & 0x02) {
      analysis.locallyAdministered = true;
      analysis.type = 'virtual';
      analysis.note = 'Locally administered MAC address (likely virtual)';
    }
    
    // Check for multicast
    if (firstOctet & 0x01) {
      analysis.multicast = true;
      analysis.note = 'Multicast MAC address';
    }
    
    // Check for common virtual patterns
    if (normalizedMac.startsWith('02') || 
        normalizedMac.startsWith('0a') || 
        normalizedMac.match(/^[0-9a-f]{2}[02468ace][0-9a-f]/)) {
      analysis.type = 'virtual';
      analysis.category = 'Virtual Device';
      analysis.virtualType = 'Generic Virtual Machine';
    }
    
    return analysis;
  }

  getDeviceIcon(deviceInfo) {
    if (!deviceInfo) return '📱';
    
    // Manufacturer-specific icons first
    const manufacturer = deviceInfo.manufacturer?.toLowerCase() || '';
    const category = deviceInfo.category?.toLowerCase() || '';
    
    if (manufacturer.includes('apple')) {
      if (category.includes('iphone')) return '📱';
      if (category.includes('ipad')) return '📱';
      if (category.includes('mac')) return '💻';
      if (category.includes('watch')) return '⌚';
      if (category.includes('airpods')) return '🎧';
      return '🍎';
    }
    
    if (manufacturer.includes('google')) {
      if (category.includes('chromecast')) return '📺';
      if (category.includes('nest') || category.includes('home')) return '🏠';
      if (category.includes('pixel')) return '📱';
      return '🌐';
    }
    
    if (manufacturer.includes('amazon')) {
      if (category.includes('echo')) return '🗣️';
      if (category.includes('fire') && category.includes('tv')) return '📺';
      if (category.includes('kindle')) return '📖';
      return '📦';
    }
    
    if (manufacturer.includes('microsoft')) {
      if (category.includes('surface')) return '💻';
      if (category.includes('xbox')) return '🎮';
      if (category.includes('hololens')) return '🥽';
      return '🪟';
    }
    
    if (manufacturer.includes('samsung')) {
      if (category.includes('galaxy') && category.includes('phone')) return '📱';
      if (category.includes('galaxy') && category.includes('tab')) return '📱';
      if (category.includes('tv')) return '📺';
      return '📱';
    }
    
    if (manufacturer.includes('raspberry pi')) {
      return '🥧';
    }
    
    if (manufacturer.includes('tesla')) {
      return '🚗';
    }
    
    // Type-based icons
    switch (deviceInfo.type) {
      case 'router':
        return '🌐';
      case 'switch':
        return '🔀';
      case 'accesspoint':
        return '📡';
      case 'computer':
        if (category.includes('laptop')) return '💻';
        if (category.includes('desktop')) return '🖥️';
        if (category.includes('server')) return '🖥️';
        return '💻';
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📱';
      case 'printer':
        return '🖨️';
      case 'tv':
        return '📺';
      case 'console':
        if (category.includes('playstation')) return '🎮';
        if (category.includes('xbox')) return '🎮';
        if (category.includes('nintendo')) return '🎮';
        return '🎮';
      case 'server':
        return '�️';
      case 'storage':
        if (category.includes('nas')) return '💾';
        return '💽';
      case 'camera':
        if (category.includes('security')) return '📹';
        return '📷';
      case 'virtual':
        if (category.includes('container')) return '📦';
        return '☁️';
      case 'iot':
        if (category.includes('echo') || category.includes('speaker')) return '🔊';
        if (category.includes('nest') || category.includes('thermostat')) return '🌡️';
        if (category.includes('light') || category.includes('bulb')) return '�';
        if (category.includes('lock')) return '🔒';
        if (category.includes('camera')) return '📹';
        if (category.includes('sensor')) return '📡';
        return '🏠';
      default:
        return '📱';
    }
  }

  /**
   * Get device capabilities and features based on manufacturer and type
   */
  getDeviceCapabilities(deviceInfo) {
    const capabilities = [];
    const { type, manufacturer, category } = deviceInfo;
    const mfg = manufacturer?.toLowerCase() || '';
    const cat = category?.toLowerCase() || '';
    
    switch (type) {
      case 'router':
        capabilities.push('Network Routing', 'WiFi Access Point', 'DHCP Server', 'NAT', 'Firewall');
        if (mfg.includes('cisco')) capabilities.push('Enterprise Features', 'VPN Support');
        if (mfg.includes('netgear')) capabilities.push('Genie App', 'ReadyShare');
        if (mfg.includes('linksys')) capabilities.push('Smart WiFi Tools');
        break;
        
      case 'switch':
        capabilities.push('Layer 2 Switching', 'VLAN Support');
        if (mfg.includes('cisco')) capabilities.push('Spanning Tree', 'PoE');
        break;
        
      case 'accesspoint':
        capabilities.push('WiFi Access Point', 'Multiple SSIDs');
        if (mfg.includes('ubiquiti')) capabilities.push('UniFi Controller', 'Enterprise Management');
        break;
        
      case 'printer':
        capabilities.push('Document Printing');
        if (mfg.includes('hp')) capabilities.push('HP Smart App', 'Instant Ink');
        if (mfg.includes('canon')) capabilities.push('Canon PRINT App', 'AirPrint');
        if (mfg.includes('epson')) capabilities.push('Epson Connect', 'Email Print');
        if (cat.includes('laser')) capabilities.push('High Speed Printing');
        if (cat.includes('inkjet')) capabilities.push('Photo Printing');
        break;
        
      case 'computer':
        capabilities.push('General Computing');
        if (mfg.includes('apple')) {
          capabilities.push('macOS', 'AirDrop', 'Handoff', 'Continuity');
          if (cat.includes('macbook')) capabilities.push('Touch Bar', 'Retina Display');
        }
        if (mfg.includes('raspberry pi')) {
          capabilities.push('GPIO Pins', 'IoT Development', 'Linux', 'Education');
        }
        if (mfg.includes('intel') && cat.includes('nuc')) {
          capabilities.push('Compact Form Factor', 'Low Power');
        }
        break;
        
      case 'mobile':
        capabilities.push('Mobile Computing', 'WiFi', 'Bluetooth', 'Mobile Apps');
        if (mfg.includes('apple')) {
          capabilities.push('iOS', 'AirDrop', 'Apple Pay', 'Face ID', 'Siri');
          if (cat.includes('iphone')) capabilities.push('Camera', 'Messages');
        }
        if (mfg.includes('samsung')) {
          capabilities.push('Android', 'Samsung Pay', 'DeX Mode');
        }
        if (mfg.includes('google')) {
          capabilities.push('Pure Android', 'Google Assistant', 'Pixel Features');
        }
        break;
        
      case 'tablet':
        capabilities.push('Touch Interface', 'Mobile Apps', 'WiFi');
        if (mfg.includes('apple')) {
          capabilities.push('iPadOS', 'Apple Pencil Support', 'Multitasking');
        }
        break;
        
      case 'tv':
        capabilities.push('Video Display', 'Smart TV Features');
        if (mfg.includes('samsung')) capabilities.push('Tizen OS', 'SmartThings');
        if (mfg.includes('lg')) capabilities.push('webOS', 'Magic Remote');
        if (mfg.includes('sony')) capabilities.push('Android TV', 'Google Assistant');
        break;
        
      case 'console':
        capabilities.push('Gaming', 'Media Streaming');
        if (cat.includes('playstation')) capabilities.push('PlayStation Games', 'Blu-ray');
        if (cat.includes('xbox')) capabilities.push('Xbox Games', 'Game Pass');
        break;
        
      case 'server':
        capabilities.push('Server Computing', 'Network Services');
        if (mfg.includes('dell')) capabilities.push('iDRAC Management');
        if (mfg.includes('hp')) capabilities.push('iLO Management');
        break;
        
      case 'iot':
        capabilities.push('Smart Home Integration', 'App Control');
        if (cat.includes('echo')) {
          capabilities.push('Voice Control', 'Alexa Skills', 'Music Streaming');
        }
        if (cat.includes('nest')) {
          capabilities.push('Google Assistant', 'Learning Algorithms', 'Remote Control');
        }
        if (cat.includes('hue')) {
          capabilities.push('Color Changing', 'Scheduling', 'Bridge Required');
        }
        if (cat.includes('sonos')) {
          capabilities.push('Multi-room Audio', 'Music Services');
        }
        break;
        
      case 'virtual':
        capabilities.push('Virtualization');
        if (cat.includes('hyper-v')) capabilities.push('Microsoft Hyper-V');
        if (cat.includes('vmware')) capabilities.push('VMware vSphere');
        if (cat.includes('container')) capabilities.push('Docker', 'Containerization');
        break;
    }
    
    return capabilities;
  }

  /**
   * Get security considerations for the device type
   */
  getSecurityProfile(deviceInfo) {
    const { type, manufacturer, category } = deviceInfo;
    const mfg = manufacturer?.toLowerCase() || '';
    const cat = category?.toLowerCase() || '';
    
    const profile = {
      riskLevel: 'low',
      concerns: [],
      recommendations: [],
      commonPorts: [],
      securityFeatures: []
    };
    
    switch (type) {
      case 'router':
        profile.riskLevel = 'critical';
        profile.concerns.push(
          'Network gateway - single point of failure',
          'Default credentials often unchanged',
          'Firmware vulnerabilities',
          'Remote management exposure'
        );
        profile.recommendations.push(
          'Change default admin credentials immediately',
          'Enable WPA3 or WPA2 encryption',
          'Disable WPS if not needed',
          'Regular firmware updates',
          'Disable remote management unless required',
          'Enable firewall and intrusion detection'
        );
        profile.commonPorts = [22, 23, 80, 443, 8080, 8443];
        profile.securityFeatures = ['Firewall', 'VPN Support', 'Access Control'];
        break;
        
      case 'iot':
        profile.riskLevel = 'high';
        profile.concerns.push(
          'Often lacks security updates',
          'Weak default authentication',
          'Data collection and privacy',
          'Potential botnet recruitment'
        );
        profile.recommendations.push(
          'Change default passwords',
          'Network segmentation (IoT VLAN)',
          'Monitor network traffic',
          'Regular firmware updates if available',
          'Review privacy settings and data sharing'
        );
        profile.commonPorts = [80, 443, 1883, 8883, 5683];
        break;
        
      case 'printer':
        profile.riskLevel = 'medium';
        profile.concerns.push(
          'Document access and storage',
          'Network protocol vulnerabilities',
          'Default SNMP communities',
          'Print job interception'
        );
        profile.recommendations.push(
          'Enable secure printing (PIN codes)',
          'Disable unnecessary network services',
          'Update firmware regularly',
          'Implement access controls',
          'Monitor print logs'
        );
        profile.commonPorts = [80, 443, 515, 631, 9100];
        break;
        
      case 'computer':
        profile.riskLevel = 'medium';
        if (cat.includes('raspberry pi')) {
          profile.riskLevel = 'high';
          profile.concerns.push(
            'Often used for experimentation',
            'SSH enabled by default',
            'Default credentials'
          );
          profile.recommendations.push(
            'Change default pi user password',
            'Enable SSH key authentication',
            'Keep system updated',
            'Firewall configuration'
          );
        }
        profile.commonPorts = [22, 80, 443, 3389, 5900];
        break;
        
      case 'server':
        profile.riskLevel = 'high';
        profile.concerns.push(
          'High-value target',
          'Multiple services exposed',
          'Remote management interfaces',
          'Data storage and processing'
        );
        profile.recommendations.push(
          'Strong authentication (2FA)',
          'Regular security patches',
          'Network segmentation',
          'Monitoring and logging',
          'Backup and disaster recovery'
        );
        profile.commonPorts = [22, 80, 443, 3389, 5900];
        break;
        
      case 'virtual':
        profile.riskLevel = 'medium';
        profile.concerns.push(
          'Hypervisor vulnerabilities',
          'Container escape risks',
          'Resource isolation'
        );
        profile.recommendations.push(
          'Keep hypervisor updated',
          'Proper network isolation',
          'Resource limits and monitoring'
        );
        break;
        
      default:
        profile.concerns.push('Standard device security considerations');
        profile.recommendations.push(
          'Keep software updated',
          'Use strong passwords',
          'Enable encryption where available'
        );
        profile.commonPorts = [80, 443];
    }
    
    // Add manufacturer-specific security notes
    if (mfg.includes('cisco')) {
      profile.securityFeatures.push('Enterprise Security', 'Cisco Trust Anchor');
    }
    if (mfg.includes('apple')) {
      profile.securityFeatures.push('Secure Enclave', 'System Integrity Protection');
    }
    
    return profile;
  }

  /**
   * Get typical network behavior and communication patterns
   */
  getNetworkBehavior(deviceInfo) {
    const { type, manufacturer, category } = deviceInfo;
    const behavior = {
      communicationPatterns: [],
      typicalTraffic: [],
      suspiciousActivity: []
    };
    
    switch (type) {
      case 'router':
        behavior.communicationPatterns = [
          'Acts as gateway for all network traffic',
          'DHCP broadcasts and responses',
          'DNS queries and responses',
          'Management interface access'
        ];
        behavior.typicalTraffic = ['HTTP/HTTPS management', 'DHCP', 'DNS', 'SNMP'];
        behavior.suspiciousActivity = [
          'Unusual management access times',
          'Configuration changes from unknown sources',
          'High bandwidth usage without explanation'
        ];
        break;
        
      case 'iot':
        behavior.communicationPatterns = [
          'Regular cloud service communication',
          'Local network discovery',
          'Mobile app connections'
        ];
        behavior.typicalTraffic = ['HTTPS to cloud services', 'mDNS', 'CoAP/MQTT'];
        behavior.suspiciousActivity = [
          'Communication with unexpected servers',
          'Data exfiltration patterns',
          'Participation in DDoS attacks'
        ];
        break;
        
      case 'computer':
        behavior.communicationPatterns = [
          'Web browsing and downloads',
          'Software updates',
          'Cloud service synchronization'
        ];
        behavior.typicalTraffic = ['HTTP/HTTPS', 'Email protocols', 'File sharing'];
        behavior.suspiciousActivity = [
          'Malware command and control',
          'Cryptocurrency mining',
          'Data exfiltration'
        ];
        break;
    }
    
    return behavior;
  }

  getAllManufacturers() {
    const manufacturers = new Set();
    Object.values(this.ouiMap).forEach(entry => {
      manufacturers.add(entry.manufacturer);
    });
    return Array.from(manufacturers).sort();
  }

  getDeviceTypesByManufacturer(manufacturer) {
    const types = new Set();
    Object.values(this.ouiMap)
      .filter(entry => entry.manufacturer === manufacturer)
      .forEach(entry => types.add(entry.type));
    return Array.from(types);
  }
}

module.exports = OUIDatabase;
