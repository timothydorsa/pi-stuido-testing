import React, { useState, createContext, useContext, useEffect } from 'react';

// Create the auth context
const AuthContext = createContext();

// Auth status constants
export const AUTH_STATUS = {
  IDLE: 'idle',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated',
  ERROR: 'error'
};

// Mock PI Hub validation function
const validateCredentials = async (username, password) => {
  // Simulate API call to PI Hub for authentication
  return new Promise((resolve, reject) => {
    // Simulate network delay
    setTimeout(() => {
      if (username === 'admin' && password === 'password') {
        resolve({
          success: true,
          user: {
            id: 1,
            username: 'admin',
            name: 'Admin User',
            role: 'administrator',
            token: 'mock-jwt-token',
            permissions: ['read', 'write', 'admin']
          }
        });
      } else {
        reject({
          success: false,
          error: 'Invalid username or password'
        });
      }
    }, 1000);
  });
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(AUTH_STATUS.IDLE);
  const [error, setError] = useState(null);
  
  // Check for saved auth on init
  useEffect(() => {
    const savedUser = localStorage.getItem('piHubUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setStatus(AUTH_STATUS.AUTHENTICATED);
      } catch (e) {
        localStorage.removeItem('piHubUser');
      }
    }
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      setStatus(AUTH_STATUS.AUTHENTICATING);
      setError(null);
      
      const result = await validateCredentials(username, password);
      
      // Save user info
      setUser(result.user);
      localStorage.setItem('piHubUser', JSON.stringify(result.user));
      setStatus(AUTH_STATUS.AUTHENTICATED);
      
      return result.user;
    } catch (err) {
      setError(err.error || 'Authentication failed');
      setStatus(AUTH_STATUS.ERROR);
      throw err;
    }
  };

  // Placeholder OAuth login
  const loginWithProvider = async (provider) => {
    setStatus(AUTH_STATUS.AUTHENTICATING);
    setError(null);

    return new Promise((resolve) => {
      setTimeout(() => {
        const oauthUser = {
          id: Date.now(),
          username: `${provider}_user`,
          name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
          role: 'developer',
          provider,
          token: 'mock-oauth-token'
        };

        setUser(oauthUser);
        localStorage.setItem('piHubUser', JSON.stringify(oauthUser));
        setStatus(AUTH_STATUS.AUTHENTICATED);
        resolve(oauthUser);
      }, 500);
    });
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setStatus(AUTH_STATUS.IDLE);
    localStorage.removeItem('piHubUser');
  };

  // Check if user has specific permission
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  // Context value
  const value = {
    user,
    status,
    error,
    login,
    logout,
    loginWithProvider,
    hasPermission,
    isAuthenticated: status === AUTH_STATUS.AUTHENTICATED
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
