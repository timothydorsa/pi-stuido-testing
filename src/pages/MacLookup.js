import React from 'react';
import MacLookupWidget from '../components/MacLookupWidget/MacLookupWidget';

const MacLookup = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>MAC Address Lookup</h1>
        <p>Identify network devices and manufacturers using MAC addresses</p>
      </div>
      
      <div className="page-content">
        <MacLookupWidget />
        
        <div className="mac-info-section" style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '1rem', color: '#2d3748' }}>About MAC Address Lookup</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <div>
              <h4 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>What is a MAC Address?</h4>
              <p style={{ color: '#718096', margin: 0, fontSize: '0.9rem' }}>
                A Media Access Control (MAC) address is a unique identifier assigned to network interfaces. 
                The first 3 bytes (24 bits) identify the manufacturer through the Organizationally Unique Identifier (OUI).
              </p>
            </div>
            <div>
              <h4 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>Device Intelligence</h4>
              <p style={{ color: '#718096', margin: 0, fontSize: '0.9rem' }}>
                Our database contains comprehensive manufacturer intelligence including security assessments, 
                market share data, support quality ratings, and device categorization.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>Supported Formats</h4>
              <p style={{ color: '#718096', margin: 0, fontSize: '0.9rem' }}>
                Enter MAC addresses in any common format: AA:BB:CC:DD:EE:FF, AA-BB-CC-DD-EE-FF, 
                or AABBCCDDEEFF. The system will automatically format and validate the input.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MacLookup;
