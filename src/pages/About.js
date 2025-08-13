import React, { useState, useEffect } from 'react';

const About = () => {
  const [licenseData, setLicenseData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load license information
    const loadLicenseInfo = async () => {
      try {
        // In a real app, this would fetch from an API or static file
        const mockLicenseData = {
          totalPackages: 1087,
          licenseBreakdown: {
            'MIT': 870,
            'ISC': 116,
            'Apache-2.0': 31,
            'BSD-2-Clause': 25,
            'BSD-3-Clause': 24,
            'Other': 21
          },
          keyDependencies: [
            {
              name: 'React',
              version: '19.1.1',
              license: 'MIT',
              description: 'A JavaScript library for building user interfaces',
              homepage: 'https://reactjs.org/',
              author: 'Meta Platforms, Inc.'
            },
            {
              name: 'Electron',
              version: '37.2.6',
              license: 'MIT',
              description: 'Build cross platform desktop apps with JavaScript, HTML, and CSS',
              homepage: 'https://www.electronjs.org/',
              author: 'GitHub Inc.'
            },
            {
              name: 'Express',
              version: '5.1.0',
              license: 'MIT',
              description: 'Fast, unopinionated, minimalist web framework',
              homepage: 'https://expressjs.com/',
              author: 'TJ Holowaychuk'
            },
            {
              name: 'Systeminformation',
              version: '5.27.7',
              license: 'MIT',
              description: 'System Information Library for Node.js',
              homepage: 'https://github.com/sebhildebrandt/systeminformation',
              author: 'Sebastian Hildebrandt'
            }
          ]
        };
        
        setLicenseData(mockLicenseData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load license information:', error);
        setLoading(false);
      }
    };

    loadLicenseInfo();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <p>Loading license information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>About Pi Studio</h1>
        <p>System monitoring and network analysis toolkit</p>
      </div>

      <div className="about-grid">
        <section className="about-card">
          <h2>📦 Application Info</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Version:</span>
              <span className="info-value">1.0.0</span>
            </div>
            <div className="info-item">
              <span className="info-label">Build:</span>
              <span className="info-value">Development</span>
            </div>
            <div className="info-item">
              <span className="info-label">Platform:</span>
              <span className="info-value">Electron + React</span>
            </div>
            <div className="info-item">
              <span className="info-label">Architecture:</span>
              <span className="info-value">{navigator.platform}</span>
            </div>
          </div>
        </section>

        <section className="about-card">
          <h2>🏗️ Technology Stack</h2>
          <div className="tech-grid">
            <div className="tech-item">
              <span className="tech-name">Frontend</span>
              <span className="tech-desc">React 19.1.1, SCSS, Webpack</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">Backend</span>
              <span className="tech-desc">Node.js, Express 5.1.0</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">Desktop</span>
              <span className="tech-desc">Electron 37.2.6</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">Database</span>
              <span className="tech-desc">SQLite3 5.1.7</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">Monitoring</span>
              <span className="tech-desc">systeminformation 5.27.7</span>
            </div>
            <div className="tech-item">
              <span className="tech-name">Networking</span>
              <span className="tech-desc">node-nmap, ping, arp-table</span>
            </div>
          </div>
        </section>

        <section className="about-card">
          <h2>⚖️ Open Source Licenses</h2>
          {licenseData && (
            <>
              <div className="license-summary">
                <div className="license-stat">
                  <span className="stat-number">{licenseData.totalPackages}</span>
                  <span className="stat-label">Total Dependencies</span>
                </div>
                <div className="license-breakdown">
                  {Object.entries(licenseData.licenseBreakdown).map(([license, count]) => (
                    <div key={license} className="license-item">
                      <span className="license-name">{license}</span>
                      <span className="license-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="key-dependencies">
                <h3>Key Dependencies</h3>
                {licenseData.keyDependencies.map((dep) => (
                  <div key={dep.name} className="dependency-item">
                    <div className="dep-header">
                      <span className="dep-name">{dep.name}</span>
                      <span className="dep-version">v{dep.version}</span>
                      <span className={`dep-license ${dep.license.toLowerCase().replace('.', '-')}`}>
                        {dep.license}
                      </span>
                    </div>
                    <div className="dep-description">{dep.description}</div>
                    <div className="dep-info">
                      <span className="dep-author">by {dep.author}</span>
                      {dep.homepage && (
                        <a 
                          href={dep.homepage} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="dep-link"
                        >
                          Visit Homepage
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="about-card">
          <h2>📄 Legal Compliance</h2>
          <div className="legal-info">
            <p>
              This application uses open-source software libraries. All dependencies 
              are used in compliance with their respective licenses.
            </p>
            <div className="legal-actions">
              <button className="btn btn-primary" onClick={() => window.electronAPI?.openExternal?.('/ATTRIBUTIONS.md')}>
                View Full Attributions
              </button>
              <button className="btn btn-secondary" onClick={() => window.electronAPI?.openExternal?.('/THIRD-PARTY-LICENSES.md')}>
                Third-Party Licenses
              </button>
            </div>
            <div className="legal-note">
              <small>
                For questions about licensing or attribution, please contact the project maintainers.
                All software is provided "as is" without warranty of any kind.
              </small>
            </div>
          </div>
        </section>

        <section className="about-card">
          <h2>🔧 System Information</h2>
          <div className="system-info">
            <div className="system-item">
              <span className="system-label">User Agent:</span>
              <span className="system-value">{navigator.userAgent.substring(0, 80)}...</span>
            </div>
            <div className="system-item">
              <span className="system-label">Language:</span>
              <span className="system-value">{navigator.language}</span>
            </div>
            <div className="system-item">
              <span className="system-label">Timezone:</span>
              <span className="system-value">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            </div>
            <div className="system-item">
              <span className="system-label">Screen Resolution:</span>
              <span className="system-value">{screen.width} × {screen.height}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
