const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'pi-studio-dev-secret';
const TOKEN_EXPIRY = '8h'; // 8 hours

// Mock user database (replace with actual database in production)
// In a real app, you would store hashed passwords only
const users = [
  {
    id: 1,
    username: 'admin',
    // Default password: 'admin123' (hashed)
    password: '$2b$10$FgVTuZAD9YWymlX6ylpI4ubpCjH26GaEEUjGHZgCaHCmbJXK.g0FK',
    role: 'admin',
    name: 'Administrator'
  },
  {
    id: 2,
    username: 'user',
    // Default password: 'user123' (hashed)
    password: '$2b$10$ZI5vJ4BPqbQjPP3quBnS7e9..c6nG4SSb5aq9zO97sccYOX5xqmj2',
    role: 'user',
    name: 'Regular User'
  }
];

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }
    
    // Find user
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }
    
    // Compare password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role 
      }, 
      JWT_SECRET, 
      { expiresIn: TOKEN_EXPIRY }
    );
    
    // Return user data (excluding password)
    const { password: _, ...userData } = user;
    
    res.json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentication failed'
    });
  }
});

// Token validation endpoint
router.post('/validate', authenticateToken, (req, res) => {
  // If middleware passes, token is valid
  // Return the user data from the request (set by middleware)
  res.json({
    success: true,
    user: req.user
  });
});

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  // Get auth header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token is required' 
    });
  }
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    
    // Find user (without password)
    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      return res.status(403).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Add user to request (excluding password)
    const { password: _, ...userData } = user;
    req.user = userData;
    
    next();
  });
}

// Helper route to generate password hashes for development
if (process.env.NODE_ENV !== 'production') {
  router.post('/generate-hash', async (req, res) => {
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: 'Password is required' });
      }
      
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      
      res.json({ hash });
    } catch (error) {
      res.status(500).json({ message: 'Error generating hash' });
    }
  });
}

module.exports = router;
