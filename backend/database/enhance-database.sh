#!/bin/bash

# Database enhancement script
DB_PATH="/Users/timothydorsa/Downloads/pi-stuido-testing-codex-review-and-optimize-processes/backend/database/device-intelligence.sqlite"

echo "Enhancing OUI database with device categorization and manufacturer intelligence..."

# Device Type Mappings
echo "Adding device type mappings..."
sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO device_type_mappings (device_type, category_id, fingerprint_patterns, common_hostnames) VALUES ('router', 1, '[\"admin\", \"router\", \"gateway\", \"linksys\", \"netgear\", \"asus\", \"tplink\"]', '[\"router\", \"gateway\", \"gw\", \"rt-\", \"archer-\", \"asus-\"]');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO device_type_mappings (device_type, category_id, fingerprint_patterns, common_hostnames) VALUES ('switch', 1, '[\"switch\", \"managed\", \"unmanaged\"]', '[\"switch\", \"sw-\", \"core-\", \"access-\"]');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO device_type_mappings (device_type, category_id, fingerprint_patterns, common_hostnames) VALUES ('access_point', 1, '[\"ap\", \"wifi\", \"wireless\", \"access\"]', '[\"ap-\", \"wifi-\", \"wireless-\", \"wap-\"]');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO device_type_mappings (device_type, category_id, fingerprint_patterns, common_hostnames) VALUES ('smart_speaker', 2, '[\"alexa\", \"google\", \"assistant\", \"echo\", \"home\"]', '[\"echo-\", \"googl-\", \"nest-\", \"homepod\"]');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO device_type_mappings (device_type, category_id, fingerprint_patterns, common_hostnames) VALUES ('smart_tv', 5, '[\"tv\", \"roku\", \"chromecast\", \"appletv\", \"firetv\"]', '[\"roku-\", \"samsung-\", \"lg-\", \"sony-\", \"tcl-\"]');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO device_type_mappings (device_type, category_id, fingerprint_patterns, common_hostnames) VALUES ('laptop', 3, '[\"laptop\", \"notebook\", \"macbook\", \"thinkpad\"]', '[\"macbook\", \"laptop-\", \"nb-\", \"mobile-\"]');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO device_type_mappings (device_type, category_id, fingerprint_patterns, common_hostnames) VALUES ('desktop', 3, '[\"desktop\", \"pc\", \"workstation\", \"imac\"]', '[\"desktop-\", \"pc-\", \"ws-\", \"imac\"]');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO device_type_mappings (device_type, category_id, fingerprint_patterns, common_hostnames) VALUES ('phone', 4, '[\"iphone\", \"android\", \"samsung\", \"pixel\"]', '[\"iphone\", \"android-\", \"samsung-\", \"pixel-\"]');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO device_type_mappings (device_type, category_id, fingerprint_patterns, common_hostnames) VALUES ('security_camera', 7, '[\"camera\", \"ipcam\", \"hikvision\", \"dahua\", \"axis\"]', '[\"camera-\", \"ipcam-\", \"cam-\", \"dvr-\"]');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO device_type_mappings (device_type, category_id, fingerprint_patterns, common_hostnames) VALUES ('nas', 8, '[\"nas\", \"synology\", \"qnap\", \"drobo\", \"freenas\"]', '[\"nas-\", \"synology-\", \"qnap-\", \"storage-\"]');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO device_type_mappings (device_type, category_id, fingerprint_patterns, common_hostnames) VALUES ('printer', 9, '[\"printer\", \"hp\", \"canon\", \"epson\", \"brother\"]', '[\"printer-\", \"hp-\", \"canon-\", \"epson-\"]');"

# Manufacturer Intelligence
echo "Adding manufacturer intelligence data..."
sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO manufacturer_intelligence (manufacturer_name, normalized_name, company_type, primary_color, common_device_types, security_reputation, support_quality) VALUES ('Netgear Inc.', 'Netgear', 'router_vendor', '#1F4788', '[\"router\", \"switch\", \"access_point\", \"modem\"]', 'good', 'good');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO manufacturer_intelligence (manufacturer_name, normalized_name, company_type, primary_color, common_device_types, security_reputation, support_quality) VALUES ('Linksys', 'Linksys', 'router_vendor', '#0066CC', '[\"router\", \"access_point\", \"switch\"]', 'good', 'fair');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO manufacturer_intelligence (manufacturer_name, normalized_name, company_type, primary_color, common_device_types, security_reputation, support_quality) VALUES ('ASUS', 'ASUS', 'tech_company', '#FF6600', '[\"router\", \"laptop\", \"desktop\", \"server\"]', 'excellent', 'excellent');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO manufacturer_intelligence (manufacturer_name, normalized_name, company_type, primary_color, common_device_types, security_reputation, support_quality) VALUES ('TP-Link Technologies Co.Ltd.', 'TP-Link', 'router_vendor', '#4285F4', '[\"router\", \"switch\", \"access_point\"]', 'fair', 'fair');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO manufacturer_intelligence (manufacturer_name, normalized_name, company_type, primary_color, common_device_types, security_reputation, support_quality) VALUES ('Apple Inc.', 'Apple', 'tech_company', '#007AFF', '[\"phone\", \"laptop\", \"desktop\", \"tablet\", \"smart_speaker\"]', 'excellent', 'excellent');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO manufacturer_intelligence (manufacturer_name, normalized_name, company_type, primary_color, common_device_types, security_reputation, support_quality) VALUES ('Samsung Electronics Co.,Ltd', 'Samsung', 'tech_company', '#1428A0', '[\"phone\", \"smart_tv\", \"tablet\", \"appliance\"]', 'good', 'good');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO manufacturer_intelligence (manufacturer_name, normalized_name, company_type, primary_color, common_device_types, security_reputation, support_quality) VALUES ('Google Inc.', 'Google', 'tech_company', '#4285F4', '[\"smart_speaker\", \"chromecast\", \"phone\", \"nest\"]', 'good', 'good');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO manufacturer_intelligence (manufacturer_name, normalized_name, company_type, primary_color, common_device_types, security_reputation, support_quality) VALUES ('Amazon Technologies Inc.', 'Amazon', 'tech_company', '#FF9900', '[\"smart_speaker\", \"firetv\", \"echo\", \"kindle\"]', 'good', 'good');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO manufacturer_intelligence (manufacturer_name, normalized_name, company_type, primary_color, common_device_types, security_reputation, support_quality) VALUES ('Synology Inc.', 'Synology', 'storage_vendor', '#FF8C00', '[\"nas\", \"storage\"]', 'excellent', 'excellent');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO manufacturer_intelligence (manufacturer_name, normalized_name, company_type, primary_color, common_device_types, security_reputation, support_quality) VALUES ('Hewlett Packard Enterprise', 'HPE', 'enterprise_vendor', '#01A982', '[\"server\", \"switch\", \"printer\"]', 'excellent', 'excellent');"

# Discovery Rules
echo "Adding discovery rules..."
sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO discovery_rules (rule_name, rule_type, pattern, confidence_level, device_type_hint, manufacturer_hint) VALUES ('Netgear Web Interface', 'banner', 'routerlogin.net', 85, 'router', 'Netgear');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO discovery_rules (rule_name, rule_type, pattern, confidence_level, device_type_hint, manufacturer_hint) VALUES ('Linksys Smart WiFi', 'banner', 'LinksysSmartWiFi', 85, 'router', 'Linksys');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO discovery_rules (rule_name, rule_type, pattern, confidence_level, device_type_hint, manufacturer_hint) VALUES ('ASUS Router', 'banner', 'ASUSWRT', 85, 'router', 'ASUS');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO discovery_rules (rule_name, rule_type, pattern, confidence_level, device_type_hint, manufacturer_hint) VALUES ('Synology DiskStation', 'banner', 'DiskStation', 90, 'nas', 'Synology');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO discovery_rules (rule_name, rule_type, pattern, confidence_level, device_type_hint, manufacturer_hint) VALUES ('Apple AirPort', 'hostname', 'AirPort', 80, 'access_point', 'Apple');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO discovery_rules (rule_name, rule_type, pattern, confidence_level, device_type_hint, manufacturer_hint) VALUES ('HP LaserJet', 'banner', 'HP LaserJet', 80, 'printer', 'HP');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO discovery_rules (rule_name, rule_type, pattern, confidence_level, device_type_hint, manufacturer_hint) VALUES ('Canon Printer', 'banner', 'Canon', 75, 'printer', 'Canon');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO discovery_rules (rule_name, rule_type, pattern, confidence_level, device_type_hint, manufacturer_hint) VALUES ('Hikvision Camera', 'banner', 'Hikvision', 85, 'security_camera', 'Hikvision');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO discovery_rules (rule_name, rule_type, pattern, confidence_level, device_type_hint, manufacturer_hint) VALUES ('Samsung Smart TV', 'banner', 'Tizen', 80, 'smart_tv', 'Samsung');"

sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO discovery_rules (rule_name, rule_type, pattern, confidence_level, device_type_hint, manufacturer_hint) VALUES ('LG WebOS TV', 'banner', 'webOS', 80, 'smart_tv', 'LG');"

echo "Database enhancement completed successfully!"

# Show summary of added records
echo ""
echo "Summary of enhancements:"
echo "Device Type Mappings: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM device_type_mappings;")"
echo "Manufacturer Intelligence: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM manufacturer_intelligence;")"
echo "Discovery Rules: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM discovery_rules;")"
echo "Total OUI Records: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM oui_lookup;")"
