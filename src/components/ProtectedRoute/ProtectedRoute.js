import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AUTH_STATUS } from '../contexts/AuthContext';

/**
 * Protected Route component that ensures a user is authenticated
 * before allowing access to protected content
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, status } = useAuth();
  const location = useLocation();

  // If authentication is still in progress, show loading
  if (status === AUTH_STATUS.AUTHENTICATING) {
    return (
      <div className="auth-loading">
        <div className="spinner"></div>
        <p>Authenticating...</p>
      </div>
    );
  }

  // If not authenticated, redirect to login page, preserving the intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the protected content
  return children;
};

export default ProtectedRoute;
