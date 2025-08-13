import React, { useState } from 'react';
import './MacLookupWidget.scss';

// Device category icon mapping for Font Awesome Pro
const CATEGORY_ICONS = {
  router: 'fas fa-router',
  switch: 'fas fa-network-wired',
  access_point: 'fas fa-wifi',
  computer: 'fas fa-desktop',
  laptop: 'fas fa-laptop',
  phone: 'fas fa-mobile-alt',
  tablet: 'fas fa-tablet-alt',
  smart_tv: 'fas fa-tv',
  smart_speaker: 'fas fa-volume-up',
  security_camera: 'fas fa-video',
  nas: 'fas fa-hdd',
  printer: 'fas fa-print',
  server: 'fas fa-server',
  gaming: 'fas fa-gamepad',
  iot: 'fas fa-lightbulb',
  chromecast: 'fas fa-cast',
  firetv: 'fas fa-tv',
  unknown: 'fas fa-question'
};

// Risk level colors
const RISK_COLORS = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#FF5722',
  critical: '#D32F2F'
};

export default function MacLookupWidget({ apiBaseUrl = 'http://localhost:8001' }) {
  const [mac, setMac] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Format MAC address as user types
  const formatMacAddress = (input) => {
    const cleaned = input.replace(/[^a-fA-F0-9]/g, '');
    const formatted = cleaned.match(/.{1,2}/g)?.join(':') || cleaned;
    return formatted.substring(0, 17); // Limit to MAC address length
  };

  const handleMacChange = (e) => {
    const formatted = formatMacAddress(e.target.value);
    setMac(formatted);
  };

  async function lookupManufacturer() {
    if (!mac || mac.length < 8) {
      setError('Please enter a valid MAC address');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);

      // Call our enhanced OUI lookup API
      const response = await fetch(`${apiBaseUrl}/api/oui/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mac }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      setError(`Lookup failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const getDeviceIcon = (deviceType) => {
    return CATEGORY_ICONS[deviceType] || CATEGORY_ICONS.unknown;
  };

  const getLogoUrl = (manufacturerInfo) => {
    if (manufacturerInfo?.website) {
      // Extract domain from website URL
      const domain = manufacturerInfo.website.replace(/^https?:\/\//, '').replace(/^www\./, '');
      return `https://logo.clearbit.com/${domain}`;
    }
    return null;
  };

  return (
    <div className="mac-lookup-widget">
      <div className="widget-header">
        <h3>
          <i className="fas fa-search"></i>
          MAC Address Intelligence Lookup
        </h3>
        <p>Discover device manufacturer and intelligence information</p>
      </div>

      <div className="input-section">
        <div className="input-group">
          <input
            type="text"
            placeholder="Enter MAC address (e.g., CE:9E:43:8F:94:B4)"
            value={mac}
            onChange={handleMacChange}
            className="mac-input"
            disabled={loading}
          />
          <button 
            onClick={lookupManufacturer}
            disabled={loading || !mac}
            className="lookup-btn"
          >
            {loading ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-search"></i>
            )}
            {loading ? 'Looking up...' : 'Lookup'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {result && (
        <div className="result-card">
          <div className="result-header">
            <div className="device-info">
              <div className="device-icon">
                <i className={getDeviceIcon(result.deviceType)}></i>
              </div>
              <div className="device-details">
                <h4>{result.manufacturer}</h4>
                <p className="device-type">{result.deviceCategory || result.deviceType}</p>
                <span className={`confidence-badge confidence-${result.confidence > 80 ? 'high' : result.confidence > 50 ? 'medium' : 'low'}`}>
                  {result.confidence}% confidence
                </span>
              </div>
            </div>
            
            {result.manufacturerInfo && getLogoUrl(result.manufacturerInfo) && (
              <div className="manufacturer-logo">
                <img
                  src={getLogoUrl(result.manufacturerInfo)}
                  alt={`${result.manufacturer} logo`}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          <div className="result-details">
            <div className="detail-row">
              <span className="label">OUI Prefix:</span>
              <span className="value">{result.oui}</span>
            </div>
            
            <div className="detail-row">
              <span className="label">Risk Level:</span>
              <span 
                className="value risk-level"
                style={{ color: RISK_COLORS[result.riskLevel] }}
              >
                <i className="fas fa-shield-alt"></i>
                {result.riskLevel}
              </span>
            </div>

            {result.capabilities && result.capabilities.length > 0 && (
              <div className="detail-row">
                <span className="label">Capabilities:</span>
                <div className="capabilities">
                  {result.capabilities.map((cap, index) => (
                    <span key={index} className="capability-tag">{cap}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {result.manufacturerInfo && (
            <div className="manufacturer-intelligence">
              <h5>
                <i className="fas fa-building"></i>
                Manufacturer Intelligence
              </h5>
              
              <div className="intelligence-grid">
                <div className="intel-item">
                  <span className="intel-label">Security Reputation</span>
                  <span className={`intel-value reputation-${result.manufacturerInfo.securityReputation}`}>
                    {result.manufacturerInfo.securityReputation}
                  </span>
                </div>
                
                <div className="intel-item">
                  <span className="intel-label">Support Quality</span>
                  <span className={`intel-value support-${result.manufacturerInfo.supportQuality}`}>
                    {result.manufacturerInfo.supportQuality}
                  </span>
                </div>
                
                <div className="intel-item">
                  <span className="intel-label">Market Share</span>
                  <span className="intel-value">{result.manufacturerInfo.marketShare}%</span>
                </div>
                
                <div className="intel-item">
                  <span className="intel-label">Founded</span>
                  <span className="intel-value">{result.manufacturerInfo.foundedYear}</span>
                </div>
                
                <div className="intel-item">
                  <span className="intel-label">Headquarters</span>
                  <span className="intel-value">{result.manufacturerInfo.headquarters}</span>
                </div>
                
                <div className="intel-item">
                  <span className="intel-label">Update Frequency</span>
                  <span className="intel-value">{result.manufacturerInfo.updateFrequency}</span>
                </div>
              </div>

              {result.manufacturerInfo.website && (
                <div className="website-link">
                  <a 
                    href={result.manufacturerInfo.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="website-btn"
                  >
                    <i className="fas fa-external-link-alt"></i>
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
