import React, { useState } from 'react';
import Navigation from './components/Navigation/Navigation';
import { useTheme } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import LoginForm from './components/LoginForm/LoginForm';

// Import all pages
import SystemOverview from './pages/SystemOverview';
import MetricsDashboard from './pages/MetricsDashboard';
import NetworkAnalytics from './pages/NetworkAnalytics';
import ProcessManagement from './pages/ProcessManagement';
import DatabaseTools from './pages/DatabaseTools';
import SystemServices from './pages/SystemServices';
import SecuritySSH from './pages/SecuritySSH';
import DeviceDiscovery from './pages/DeviceDiscovery';
import MacLookup from './pages/MacLookup';
import About from './pages/About';

import './App.scss';

function App() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('system');

  // Page routing configuration
  const pages = {
    system: SystemOverview,
    metrics: MetricsDashboard,
    network: NetworkAnalytics,
    processes: ProcessManagement,
    database: DatabaseTools,
    services: SystemServices,
    ssh: SecuritySSH,
    discovery: DeviceDiscovery,
    maclookup: MacLookup,
    about: About
  };

  const renderCurrentPage = () => {
    const PageComponent = pages[currentPage] || SystemOverview;
    return <PageComponent />;
  };

  return (
    <div className={`app ${theme}`}>
      {isAuthenticated ? (
        <div className="app-layout">
          <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
          <main className="main-content">
            {renderCurrentPage()}
          </main>
        </div>
      ) : (
        <LoginForm />
      )}
    </div>
  );
}

export default App;
