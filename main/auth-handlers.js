const { ipcMain } = require('electron');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Constants
const API_BASE_URL = 'http://localhost:3000/api'; // Adjust this to your Express server's URL
const JWT_SECRET = process.env.JWT_SECRET || 'pi-studio-dev-secret'; // In production, use environment variable

// Auth handlers for main process
const setupAuthHandlers = (mainWindow) => {
  // Handle login request from renderer
  ipcMain.handle('auth:login', async (event, { username, password }) => {
    try {
      // Call to backend API for authentication
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password
      });
      
      return {
        success: true,
        token: response.data.token,
        userData: response.data.user
      };
    } catch (error) {
      console.error('Login error:', error.message);
      
      // Return structured error response
      return {
        success: false,
        error: error.response?.data?.message || 'Authentication failed'
      };
    }
  });

  // Handle token validation
  ipcMain.handle('auth:validate', async (event, { token }) => {
    try {
      // Verify token locally first (quick check)
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Then verify with backend (full validation)
      const response = await axios.post(
        `${API_BASE_URL}/auth/validate`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      return {
        success: true,
        userData: response.data.user
      };
    } catch (error) {
      console.error('Token validation error:', error.message);
      return {
        success: false,
        error: 'Invalid or expired token'
      };
    }
  });

  // Handle logout
  ipcMain.handle('auth:logout', async (event) => {
    try {
      // Any cleanup needed in main process
      // Could notify the backend about logout for token invalidation
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });
};

module.exports = setupAuthHandlers;
