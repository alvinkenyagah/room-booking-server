const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify token and add user to request
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
  

      // Check if the token contains a user ID
      if (!decoded.id && !decoded.userId) {
        return res.status(401).json({ message: 'Invalid token structure' });
      }

      // Use userId or id (for backwards compatibility)
      const userId = decoded.id || decoded.userId;
      
      // Get user from the token (exclude password)
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Add user info to request
      req.user = {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin || false
      };

      next();
    } catch (error) {
      return res.status(401).json({ 
        message: 'Authentication failed', 
        error: error.message 
      });
    }
  } else if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin middleware
const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

module.exports = { protect, isAdmin };