-- Device Categories and Iconography Enhancement
-- This script creates tables for device categorization, icons, and enhanced discovery

-- Device Categories with Icons and Security Profiles
CREATE TABLE IF NOT EXISTS device_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_name TEXT UNIQUE NOT NULL,
  icon_name TEXT NOT NULL,
  icon_color TEXT DEFAULT '#4A90E2',
  description TEXT,
  security_level TEXT CHECK(security_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  typical_ports TEXT, -- JSON array of common ports
  discovery_hints TEXT, -- JSON array of discovery patterns
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Device Type Mappings with Enhanced Metadata
CREATE TABLE IF NOT EXISTS device_type_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_type TEXT NOT NULL,
  category_id INTEGER,
  icon_override TEXT,
  confidence_boost INTEGER DEFAULT 0,
  fingerprint_patterns TEXT, -- JSON array of identification patterns
  common_hostnames TEXT, -- JSON array of typical hostname patterns
  os_hints TEXT, -- JSON array of OS identification hints
  FOREIGN KEY (category_id) REFERENCES device_categories(id)
);

-- Manufacturer Intelligence Database
CREATE TABLE IF NOT EXISTS manufacturer_intelligence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manufacturer_name TEXT UNIQUE NOT NULL,
  normalized_name TEXT NOT NULL, -- Standardized name
  company_type TEXT, -- router_vendor, iot_company, etc.
  logo_url TEXT,
  primary_color TEXT DEFAULT '#666666',
  common_device_types TEXT, -- JSON array
  security_reputation TEXT CHECK(security_reputation IN ('excellent', 'good', 'fair', 'poor', 'unknown')) DEFAULT 'unknown',
  update_frequency TEXT, -- how often they update firmware
  support_quality TEXT CHECK(support_quality IN ('excellent', 'good', 'fair', 'poor', 'discontinued')) DEFAULT 'unknown',
  market_share REAL DEFAULT 0.0,
  founded_year INTEGER,
  headquarters TEXT,
  website TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OUI Enhancements - Additional metadata for existing OUIs
CREATE TABLE IF NOT EXISTS oui_enhancements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  oui TEXT NOT NULL,
  enhanced_device_type TEXT,
  specific_model_hints TEXT, -- JSON array of model identification patterns
  generation_info TEXT, -- device generation/series info
  capabilities TEXT, -- JSON array of device capabilities
  default_credentials TEXT, -- JSON object with common default creds (encrypted)
  vulnerability_notes TEXT, -- Known security issues
  last_verified DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (oui) REFERENCES oui_lookup(oui) ON DELETE CASCADE
);

-- Discovery Enhancement Rules
CREATE TABLE IF NOT EXISTS discovery_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_name TEXT UNIQUE NOT NULL,
  rule_type TEXT CHECK(rule_type IN ('port_scan', 'hostname', 'banner', 'mac_pattern', 'behavior')) NOT NULL,
  pattern TEXT NOT NULL, -- The pattern to match
  confidence_level INTEGER DEFAULT 50,
  device_type_hint TEXT,
  manufacturer_hint TEXT,
  additional_metadata TEXT, -- JSON object with extra info
  enabled BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Device Categories with Icons
INSERT OR IGNORE INTO device_categories (category_name, icon_name, icon_color, description, security_level, typical_ports) VALUES
('Network Infrastructure', 'router', '#2196F3', 'Routers, switches, access points, and network equipment', 'high', '["22", "23", "80", "443", "8080", "8443"]'),
('IoT Devices', 'iot', '#4CAF50', 'Internet of Things devices, smart home equipment', 'medium', '["80", "443", "1883", "8883", "5683"]'),
('Computer Systems', 'desktop', '#FF9800', 'Desktop computers, laptops, workstations', 'medium', '["22", "80", "135", "139", "445", "3389"]'),
('Mobile Devices', 'phone', '#9C27B0', 'Smartphones, tablets, mobile equipment', 'low', '["80", "443", "5353"]'),
('Media Devices', 'tv', '#F44336', 'Smart TVs, streaming devices, media players', 'low', '["80", "443", "8008", "8009", "8080"]'),
('Gaming Consoles', 'gamepad', '#795548', 'Gaming systems and entertainment consoles', 'low', '["80", "443", "9293", "3074"]'),
('Security Systems', 'shield', '#E91E63', 'Security cameras, alarm systems, monitoring devices', 'critical', '["80", "443", "554", "8000", "8080"]'),
('Storage Systems', 'storage', '#607D8B', 'NAS devices, storage appliances, backup systems', 'high', '["21", "22", "80", "139", "443", "445", "548", "5000"]'),
('Printers', 'printer', '#3F51B5', 'Network printers, scanners, multifunction devices', 'medium', '["80", "443", "515", "631", "9100"]'),
('Industrial IoT', 'factory', '#FF5722', 'Industrial control systems, sensors, automation', 'critical', '["80", "443", "502", "1883", "47808"]'),
('Development Tools', 'code', '#009688', 'Development servers, CI/CD systems, debugging tools', 'medium', '["22", "80", "443", "3000", "8080", "9000"]'),
('Unknown/Generic', 'help', '#9E9E9E', 'Unidentified or generic network devices', 'unknown', '["80", "443"]');

-- Insert Common Device Type Mappings
INSERT OR IGNORE INTO device_type_mappings (device_type, category_id, fingerprint_patterns, common_hostnames) VALUES
('router', 1, '["admin", "router", "gateway", "linksys", "netgear", "asus", "tplink"]', '["router", "gateway", "gw", "rt-", "archer-", "asus-"]'),
('switch', 1, '["switch", "managed", "unmanaged"]', '["switch", "sw-", "core-", "access-"]'),
('access_point', 1, '["ap", "wifi", "wireless", "access"]', '["ap-", "wifi-", "wireless-", "wap-"]'),
('smart_speaker', 2, '["alexa", "google", "assistant", "echo", "home"]', '["echo-", "googl-", "nest-", "homepod"]'),
('smart_tv', 5, '["tv", "roku", "chromecast", "appletv", "firetv"]', '["roku-", "samsung-", "lg-", "sony-", "tcl-"]'),
('laptop', 3, '["laptop", "notebook", "macbook", "thinkpad"]', '["macbook", "laptop-", "nb-", "mobile-"]'),
('desktop', 3, '["desktop", "pc", "workstation", "imac"]', '["desktop-", "pc-", "ws-", "imac"]'),
('phone', 4, '["iphone", "android", "samsung", "pixel"]', '["iphone", "android-", "samsung-", "pixel-"]'),
('security_camera', 7, '["camera", "ipcam", "hikvision", "dahua", "axis"]', '["camera-", "ipcam-", "cam-", "dvr-"]'),
('nas', 8, '["nas", "synology", "qnap", "drobo", "freenas"]', '["nas-", "synology-", "qnap-", "storage-"]'),
('printer', 9, '["printer", "hp", "canon", "epson", "brother"]', '["printer-", "hp-", "canon-", "epson-"]);

-- Insert Manufacturer Intelligence Data
INSERT OR IGNORE INTO manufacturer_intelligence (manufacturer_name, normalized_name, company_type, primary_color, common_device_types, security_reputation) VALUES
('Netgear Inc.', 'Netgear', 'router_vendor', '#1F4788', '["router", "switch", "access_point", "modem"]', 'good'),
('Linksys', 'Linksys', 'router_vendor', '#0066CC', '["router", "access_point", "switch"]', 'good'),
('ASUS', 'ASUS', 'tech_company', '#FF6600', '["router", "laptop", "desktop", "server"]', 'excellent'),
('TP-Link Technologies Co.Ltd.', 'TP-Link', 'router_vendor', '#4285F4', '["router", "switch", "access_point"]', 'fair'),
('Apple Inc.', 'Apple', 'tech_company', '#007AFF', '["phone", "laptop", "desktop", "tablet", "smart_speaker"]', 'excellent'),
('Samsung Electronics Co.,Ltd', 'Samsung', 'tech_company', '#1428A0', '["phone", "smart_tv", "tablet", "appliance"]', 'good'),
('Google Inc.', 'Google', 'tech_company', '#4285F4', '["smart_speaker", "chromecast", "phone", "nest"]', 'good'),
('Amazon Technologies Inc.', 'Amazon', 'tech_company', '#FF9900', '["smart_speaker", "firetv", "echo", "kindle"]', 'good'),
('Synology Inc.', 'Synology', 'storage_vendor', '#FF8C00', '["nas", "storage"]', 'excellent'),
('Hewlett Packard Enterprise', 'HPE', 'enterprise_vendor', '#01A982', '["server", "switch", "printer"]', 'excellent');

-- Insert Discovery Rules for Better Device Identification
INSERT OR IGNORE INTO discovery_rules (rule_name, rule_type, pattern, confidence_level, device_type_hint, manufacturer_hint) VALUES
('Netgear Web Interface', 'banner', 'routerlogin.net', 85, 'router', 'Netgear'),
('Linksys Smart WiFi', 'banner', 'LinksysSmartWiFi', 85, 'router', 'Linksys'),
('ASUS Router', 'banner', 'ASUSWRT', 85, 'router', 'ASUS'),
('Synology DiskStation', 'banner', 'DiskStation', 90, 'nas', 'Synology'),
('Apple AirPort', 'hostname', 'AirPort', 80, 'access_point', 'Apple'),
('Google Home', 'hostname', 'GoogleHome', 85, 'smart_speaker', 'Google'),
('Amazon Echo', 'hostname', 'Echo-', 85, 'smart_speaker', 'Amazon'),
('Roku Device', 'hostname', 'Roku-', 80, 'media_device', 'Roku'),
('HP Printer', 'hostname', 'HP-', 75, 'printer', 'HP'),
('Canon Printer', 'hostname', 'Canon', 75, 'printer', 'Canon');
