#!/bin/bash

# Update Major Manufacturer OUI Entries
DB_PATH="/Users/timothydorsa/Downloads/pi-stuido-testing-codex-review-and-optimize-processes/backend/database/device-intelligence.sqlite"

echo "🔧 Updating major manufacturer OUI entries..."

# Apple OUIs
echo "📱 Updating Apple OUI entries..."
sqlite3 "$DB_PATH" "UPDATE oui_lookup SET manufacturer = 'Apple Inc.', device_type = 'computer', device_category = 'Mac' WHERE oui IN ('00:1B:63', '00:25:00', '28:CD:C1', '3C:15:C2', '40:CB:C0', '68:96:7B', '70:CD:60', '84:38:35', 'A4:C3:61', 'B8:E8:56', 'DC:37:18', 'E4:CE:8F', 'F0:18:98', 'F4:37:B7');"

sqlite3 "$DB_PATH" "UPDATE oui_lookup SET manufacturer = 'Apple Inc.', device_type = 'mobile', device_category = 'iPhone' WHERE oui IN ('14:7D:DA', '64:B9:E8', '90:72:40');"

sqlite3 "$DB_PATH" "UPDATE oui_lookup SET manufacturer = 'Apple Inc.', device_type = 'tablet', device_category = 'iPad' WHERE oui IN ('B4:F0:AB', 'CC:08:8D');"

# Samsung OUIs
echo "📱 Updating Samsung OUI entries..."
sqlite3 "$DB_PATH" "INSERT OR REPLACE INTO oui_lookup (oui, manufacturer, device_type, device_category, confidence) VALUES 
('00:12:FB', 'Samsung Electronics Co.,Ltd', 'phone', 'Samsung Galaxy', 85),
('00:15:99', 'Samsung Electronics Co.,Ltd', 'smart_tv', 'Samsung TV', 85),
('00:16:32', 'Samsung Electronics Co.,Ltd', 'phone', 'Samsung Galaxy', 85),
('5C:0A:5B', 'Samsung Electronics Co.,Ltd', 'phone', 'Samsung Galaxy', 85),
('88:32:9B', 'Samsung Electronics Co.,Ltd', 'smart_tv', 'Samsung TV', 85);"

# Google/Nest OUIs
echo "🏠 Updating Google/Nest OUI entries..."
sqlite3 "$DB_PATH" "INSERT OR REPLACE INTO oui_lookup (oui, manufacturer, device_type, device_category, confidence) VALUES 
('18:B4:30', 'Google Inc.', 'smart_speaker', 'Google Home', 90),
('F4:F5:D8', 'Google Inc.', 'smart_speaker', 'Google Nest', 90),
('6C:AD:F8', 'Google Inc.', 'chromecast', 'Chromecast', 90),
('DA:A1:19', 'Google Inc.', 'chromecast', 'Chromecast', 90);"

# Amazon/Echo OUIs
echo "🔊 Updating Amazon/Echo OUI entries..."
sqlite3 "$DB_PATH" "INSERT OR REPLACE INTO oui_lookup (oui, manufacturer, device_type, device_category, confidence) VALUES 
('44:65:0D', 'Amazon Technologies Inc.', 'smart_speaker', 'Amazon Echo', 90),
('4C:EF:C0', 'Amazon Technologies Inc.', 'smart_speaker', 'Amazon Echo', 90),
('50:DC:E7', 'Amazon Technologies Inc.', 'firetv', 'Amazon Fire TV', 90),
('AC:63:BE', 'Amazon Technologies Inc.', 'firetv', 'Amazon Fire TV', 90);"

# Netgear OUIs
echo "🌐 Updating Netgear OUI entries..."
sqlite3 "$DB_PATH" "INSERT OR REPLACE INTO oui_lookup (oui, manufacturer, device_type, device_category, confidence) VALUES 
('00:09:5B', 'Netgear Inc.', 'router', 'Netgear Router', 85),
('00:0F:B5', 'Netgear Inc.', 'router', 'Netgear Router', 85),
('00:14:6C', 'Netgear Inc.', 'router', 'Netgear Router', 85),
('00:1B:2F', 'Netgear Inc.', 'router', 'Netgear Router', 85),
('00:1E:2A', 'Netgear Inc.', 'access_point', 'Netgear Access Point', 85),
('00:22:3F', 'Netgear Inc.', 'router', 'Netgear Router', 85),
('00:26:F2', 'Netgear Inc.', 'router', 'Netgear Router', 85),
('20:4E:7F', 'Netgear Inc.', 'router', 'Netgear Router', 85),
('30:46:9A', 'Netgear Inc.', 'router', 'Netgear Router', 85),
('A0:04:60', 'Netgear Inc.', 'router', 'Netgear Router', 85);"

# TP-Link OUIs
echo "🌐 Updating TP-Link OUI entries..."
sqlite3 "$DB_PATH" "INSERT OR REPLACE INTO oui_lookup (oui, manufacturer, device_type, device_category, confidence) VALUES 
('00:25:86', 'TP-Link Technologies Co.Ltd.', 'router', 'TP-Link Router', 85),
('14:CC:20', 'TP-Link Technologies Co.Ltd.', 'router', 'TP-Link Router', 85),
('18:D6:C7', 'TP-Link Technologies Co.Ltd.', 'router', 'TP-Link Router', 85),
('1C:61:B4', 'TP-Link Technologies Co.Ltd.', 'router', 'TP-Link Router', 85),
('50:C7:BF', 'TP-Link Technologies Co.Ltd.', 'router', 'TP-Link Router', 85),
('A4:2B:B0', 'TP-Link Technologies Co.Ltd.', 'router', 'TP-Link Router', 85),
('E8:DE:27', 'TP-Link Technologies Co.Ltd.', 'router', 'TP-Link Router', 85),
('F4:EC:38', 'TP-Link Technologies Co.Ltd.', 'router', 'TP-Link Router', 85);"

# ASUS OUIs
echo "💻 Updating ASUS OUI entries..."
sqlite3 "$DB_PATH" "INSERT OR REPLACE INTO oui_lookup (oui, manufacturer, device_type, device_category, confidence) VALUES 
('00:15:F2', 'ASUS', 'router', 'ASUS Router', 85),
('00:1D:60', 'ASUS', 'router', 'ASUS Router', 85),
('00:22:15', 'ASUS', 'router', 'ASUS Router', 85),
('00:26:18', 'ASUS', 'router', 'ASUS Router', 85),
('20:CF:30', 'ASUS', 'router', 'ASUS Router', 85),
('38:D5:47', 'ASUS', 'router', 'ASUS Router', 85),
('40:16:7E', 'ASUS', 'router', 'ASUS Router', 85),
('50:46:5D', 'ASUS', 'laptop', 'ASUS Laptop', 85),
('AC:9E:17', 'ASUS', 'router', 'ASUS Router', 85);"

# Synology OUIs
echo "💾 Updating Synology OUI entries..."
sqlite3 "$DB_PATH" "INSERT OR REPLACE INTO oui_lookup (oui, manufacturer, device_type, device_category, confidence) VALUES 
('00:11:32', 'Synology Inc.', 'nas', 'Synology NAS', 90),
('00:90:A9', 'Synology Inc.', 'nas', 'Synology NAS', 90);"

echo "✅ Major manufacturer OUI entries updated!"

# Show sample results
echo ""
echo "📊 Sample updated entries:"
sqlite3 "$DB_PATH" "SELECT oui, manufacturer, device_type, device_category FROM oui_lookup WHERE manufacturer IN ('Apple Inc.', 'Samsung Electronics Co.,Ltd', 'Google Inc.', 'Amazon Technologies Inc.', 'Netgear Inc.') LIMIT 10;"

echo ""
echo "📈 Updated OUI counts by manufacturer:"
sqlite3 "$DB_PATH" "SELECT manufacturer, COUNT(*) as count FROM oui_lookup WHERE manufacturer IN ('Apple Inc.', 'Samsung Electronics Co.,Ltd', 'Google Inc.', 'Amazon Technologies Inc.', 'Netgear Inc.', 'TP-Link Technologies Co.Ltd.', 'ASUS', 'Synology Inc.') GROUP BY manufacturer ORDER BY count DESC;"
