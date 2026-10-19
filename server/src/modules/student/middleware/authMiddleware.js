import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lectureloop_dev_secret_key_2026';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (mongoose.connection.readyState === 1 && !decoded.id.startsWith('mem_')) {
      req.user = await User.findById(decoded.id).select('-password');
    } else {
      req.user = {
        id: decoded.id,
        _id: decoded.id,
        name: 'Student User',
        role: 'student',
        semester: 'Semester 5 • Fall 2024',
      };
    }

    if (!req.user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Not authorized, token invalid or expired' });
  }
};
