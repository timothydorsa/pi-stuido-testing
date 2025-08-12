import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import './Sidebar.scss';

// Import icons
import { FaHome, FaCode, FaServer, FaNetworkWired, FaSignOutAlt, FaSun, FaMoon, FaUser } from 'react-icons/fa';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="pi-sidebar">
      <div className="sidebar-header">
        <h3>PI Studio</h3>
        <p className="version">v1.0.0</p>
      </div>

      <div className="user-info">
        <div className="user-avatar">
          <FaUser />
        </div>
        <div className="user-details">
          <p className="user-name">{user?.name || 'User'}</p>
          <p className="user-role">{user?.role || 'Guest'}</p>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link to="/dashboard" className="nav-link">
              <FaHome className="nav-icon" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link to="/api-tester" className="nav-link">
              <FaCode className="nav-icon" />
              <span>API Tester</span>
            </Link>
          </li>
          <li>
            <Link to="/system-monitor" className="nav-link">
              <FaServer className="nav-icon" />
              <span>System Monitor</span>
            </Link>
          </li>
          <li>
            <Link to="/ssh-connection" className="nav-link">
              <FaNetworkWired className="nav-icon" />
              <span>SSH Connection</span>
            </Link>
          </li>
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <button 
          className="theme-toggle" 
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? <FaMoon /> : <FaSun />}
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
        
        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt className="logout-icon" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
