import React from 'react';
import './NotFound.scss';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NotFound = () => {
  const { isAuthenticated } = useAuth();
  const redirectPath = isAuthenticated ? '/dashboard' : '/login';

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <Link to={redirectPath} className="back-button">
          Back to {isAuthenticated ? 'Dashboard' : 'Login'}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
