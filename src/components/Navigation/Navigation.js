import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../ThemeToggle';
import './Navigation.scss';

const Navigation = ({ currentPage, setCurrentPage }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme } = useTheme();

  const navigationItems = [
    {
      id: 'system',
      label: 'System Overview',
      icon: '📊',
      description: 'Dashboard, charts, and system services'
    },
    {
      id: 'metrics',
      label: 'Real-time Metrics',
      icon: '📈',
      description: 'Live charts and trending system data'
    },
    {
      id: 'network',
      label: 'Network Analytics',
      icon: '🌐',
      description: 'Network monitoring and analytics'
    },
    {
      id: 'processes',
      label: 'Process Management',
      icon: '⚙️',
      description: 'System processes and performance'
    },
    {
      id: 'database',
      label: 'Database Tools',
      icon: '🗄️',
      description: 'Database management and queries'
    },
    {
      id: 'services',
      label: 'System Services',
      icon: '🔧',
      description: 'Service management and monitoring'
    },
    {
      id: 'ssh',
      label: 'Security & SSH',
      icon: '🔐',
      description: 'SSH connections and security'
    },
    {
      id: 'discovery',
      label: 'Device Discovery',
      icon: '🔍',
      description: 'Network device discovery and mapping'
    },
    {
      id: 'maclookup',
      label: 'MAC Lookup',
      icon: '🔗',
      description: 'MAC address lookup and device identification'
    },
    {
      id: 'about',
      label: 'About',
      icon: 'ℹ️',
      description: 'About Pi Studio and legal information'
    }
  ];

  const handleNavClick = (pageId) => {
    setCurrentPage(pageId);
  };

  const getCurrentPageTitle = () => {
    const currentItem = navigationItems.find(item => item.id === currentPage);
    return currentItem ? currentItem.label : 'System Overview';
  };

  return (
    <>
      <nav className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🖥️</span>
            {!isCollapsed && <span className="logo-text">Pi Studio</span>}
          </div>
          <button 
            className="collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>

        <div className="nav-items">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              title={isCollapsed ? item.label : item.description}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && (
                <div className="nav-content">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-description">{item.description}</span>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="theme-toggle-container">
            <ThemeToggle />
          </div>
          {!isCollapsed && (
            <div className="status-info">
              <div className="status-dot connected"></div>
              <span>System Connected</span>
            </div>
          )}
        </div>
      </nav>

      <header className="top-header">
        <div className="header-left">
          <h1 className="page-title">{getCurrentPageTitle()}</h1>
          <div className="breadcrumb">
            <span>Dashboard</span>
            <span className="separator">›</span>
            <span>{getCurrentPageTitle()}</span>
          </div>
        </div>
        
        <div className="header-right">
          <div className="refresh-indicator">
            <span className="refresh-dot"></span>
            <span>Live</span>
          </div>
          <div className="time-range">
            Last 5 minutes
          </div>
        </div>
      </header>
    </>
  );
};

export default Navigation;
