const jwt = require('jsonwebtoken');
const { Teacher, Student } = require('../models/models');

const authenticateToken = async (req, res, next) => {
  try {
    let token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }
    token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    if (decoded.role === 'teacher') {
      user = await Teacher.findById(decoded.id);
    } else if (decoded.role === 'student') {
      user = await Student.findById(decoded.id);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error(error);
    res.status(401).json({ error: 'Token Expired or Invalid' });
  }
};

module.exports = authenticateToken;