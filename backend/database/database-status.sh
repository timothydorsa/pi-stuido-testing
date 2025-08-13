#!/bin/bash

# Comprehensive Database Status and Enhancement Summary
DB_PATH="/Users/timothydorsa/Downloads/pi-stuido-testing-codex-review-and-optimize-processes/backend/database/device-intelligence.sqlite"

echo "🎯 Pi Studio - Enhanced Database Intelligence Report"
echo "=================================================="
echo ""

echo "📊 DATABASE STATISTICS:"
echo "  OUI Records: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM oui_lookup;")"
echo "  Device Categories: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM device_categories;")"  
echo "  Device Type Mappings: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM device_type_mappings;")"
echo "  Manufacturer Intelligence: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM manufacturer_intelligence;")"
echo "  Discovery Rules: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM discovery_rules;")"
echo "  OUI Enhancements: $(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM oui_enhancements;")"
echo ""

echo "🏢 TOP MANUFACTURERS BY MARKET SHARE:"
sqlite3 "$DB_PATH" "SELECT '  ' || normalized_name || ': ' || market_share || '% market share' FROM manufacturer_intelligence WHERE market_share > 0 ORDER BY market_share DESC LIMIT 8;"
echo ""

echo "🌐 NETWORK EQUIPMENT VENDORS:"
sqlite3 "$DB_PATH" "SELECT '  ' || normalized_name || ' (' || security_reputation || ' security)' FROM manufacturer_intelligence WHERE company_type LIKE '%network%' OR company_type LIKE '%router%';"
echo ""

echo "📱 TECHNOLOGY COMPANIES:"
sqlite3 "$DB_PATH" "SELECT '  ' || normalized_name || ' (Founded: ' || founded_year || ')' FROM manufacturer_intelligence WHERE company_type = 'technology_company' ORDER BY founded_year;"
echo ""

echo "🔒 SECURITY REPUTATION SUMMARY:"
sqlite3 "$DB_PATH" "SELECT '  ' || security_reputation || ': ' || COUNT(*) || ' companies' FROM manufacturer_intelligence GROUP BY security_reputation ORDER BY COUNT(*) DESC;"
echo ""

echo "🎯 DEVICE CATEGORIES:"
sqlite3 "$DB_PATH" "SELECT '  ' || category_name || ' (' || security_level || ' security)' FROM device_categories ORDER BY id;"
echo ""

echo "🔍 RECENT ENHANCEMENTS:"
echo "  ✅ Enhanced OUI lookup with manufacturer intelligence"
echo "  ✅ Comprehensive device categorization system"
echo "  ✅ Security reputation tracking"
echo "  ✅ Market share and company information"
echo "  ✅ Device capability inference"
echo "  ✅ Discovery rules engine"
echo "  ✅ Network scanner timeout protection"
echo ""

echo "🧪 TESTING COMMANDS:"
echo "  npm run test:oui-lookup      # Test enhanced OUI lookup"
echo "  npm run test:enhanced-scan   # Test enhanced network scan"
echo "  npm run status              # Check system status"
echo ""

echo "🌐 ACCESS URLs:"
echo "  Main App: http://localhost:3002"
echo "  API Docs: http://localhost:8001/api-docs"
echo "  Health: http://localhost:8001/health"
echo ""

echo "✨ Enhancement Complete! The OUI database now provides comprehensive"
echo "   manufacturer intelligence with security assessments, market data,"
echo "   and enhanced device categorization capabilities."
