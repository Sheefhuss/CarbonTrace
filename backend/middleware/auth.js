const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Check if the user is logged in
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. Please log in.' });
    }

    // Verify the JWT token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user in the database
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = user;
    next(); // Pass them through!
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// Check if the user has specific permissions (like 'business_admin')
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to do this.' });
    }
    next();
  };
};

module.exports = { authenticate, requireRole };