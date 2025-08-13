-- Device Type Mappings
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

-- Manufacturer Intelligence Data
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

-- Discovery Rules for Better Device Identification
INSERT OR IGNORE INTO discovery_rules (rule_name, rule_type, pattern, confidence_level, device_type_hint, manufacturer_hint) VALUES
('Netgear Web Interface', 'banner', 'routerlogin.net', 85, 'router', 'Netgear'),
('Linksys Smart WiFi', 'banner', 'LinksysSmartWiFi', 85, 'router', 'Linksys'),
('ASUS Router', 'banner', 'ASUSWRT', 85, 'router', 'ASUS'),
('Synology DiskStation', 'banner', 'DiskStation', 90, 'nas', 'Synology'),
('Apple AirPort', 'hostname', 'AirPort', 80, 'access_point', 'Apple'),
('HP LaserJet', 'banner', 'HP LaserJet', 80, 'printer', 'HP'),
('Canon Printer', 'banner', 'Canon', 75, 'printer', 'Canon'),
('Hikvision Camera', 'banner', 'Hikvision', 85, 'security_camera', 'Hikvision'),
('Samsung Smart TV', 'banner', 'Tizen', 80, 'smart_tv', 'Samsung'),
('LG WebOS TV', 'banner', 'webOS', 80, 'smart_tv', 'LG');
