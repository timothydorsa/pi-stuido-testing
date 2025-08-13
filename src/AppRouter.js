import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginForm from './components/LoginForm/LoginForm';
import Navigation from './components/Navigation/Navigation';
import SystemOverview from './pages/SystemOverview';
import NetworkAnalytics from './pages/NetworkAnalytics';
import ProcessManagement from './pages/ProcessManagement';
import DatabaseManagement from './pages/DatabaseManagement';
import SystemServices from './pages/SystemServices';
import SecurityAndSSH from './pages/SecurityAndSSH';
import DeviceDiscovery from './pages/DeviceDiscovery';
import './App.scss';

const AppRouter = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<SystemOverview />} />
            <Route path="/network" element={<NetworkAnalytics />} />
            <Route path="/processes" element={<ProcessManagement />} />
            <Route path="/database" element={<DatabaseManagement />} />
            <Route path="/services" element={<SystemServices />} />
            <Route path="/security" element={<SecurityAndSSH />} />
            <Route path="/discovery" element={<DeviceDiscovery />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default AppRouter;
