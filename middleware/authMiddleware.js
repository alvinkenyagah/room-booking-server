// const jwt = require('jsonwebtoken');
// const User = require('../models/User');  // Assuming a User model exists

// // Middleware to check if the user is an admin
// const isAdmin = async (req, res, next) => {
//   const token = req.headers.authorization && req.headers.authorization.split(' ')[1];  // Assuming Bearer token

//   if (!token) {
//     return res.status(401).json({ message: 'No token provided, authorization denied' });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.id);

//     if (!user || user.role !== 'admin') {  // Ensure the user is an admin
//       return res.status(403).json({ message: 'Not authorized, admin only' });
//     }

//     req.user = user;  // Pass user information to the request
//     next();
//   } catch (err) {
//     res.status(401).json({ message: 'Token is not valid' });
//   }
// };

// module.exports = { isAdmin };

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
      
      // Log the decoded token for debugging
      console.log('Decoded token:', decoded);

      // Check if the token contains a user ID
      if (!decoded.id && !decoded.userId) {
        console.error('No user ID found in token');
        return res.status(401).json({ message: 'Invalid token structure' });
      }

      // Use userId or id (for backwards compatibility)
      const userId = decoded.id || decoded.userId;
      
      // Get user from the token (exclude password)
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        console.error(`User not found with ID: ${userId}`);
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
      console.error('Authentication error details:', error);
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