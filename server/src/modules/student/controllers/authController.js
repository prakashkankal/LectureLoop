import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lectureloop_dev_secret_key_2026';

// In-memory fallback user store when MongoDB is not connected
const inMemoryUsers = new Map();

const isDbConnected = () => mongoose.connection.readyState === 1;

const generateToken = (id, role = 'student') => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, role = 'student' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'Choose a student or teacher account type' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (isDbConnected()) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }

      const user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role,
      });

      const token = generateToken(user._id, user.role);

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          semester: user.semester,
        },
      });
    } else {
      console.warn('[AUTH] MongoDB is NOT connected (readyState = ' + mongoose.connection.readyState + '). User saved only in temporary memory!');
      // Robust Fallback in-memory store
      if (inMemoryUsers.has(normalizedEmail)) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }

      const id = 'mem_' + Date.now();
      const mockUser = {
        _id: id,
        id,
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role,
        semester: 'Semester 5 • Fall 2024',
      };

      inMemoryUsers.set(normalizedEmail, mockUser);
      const token = generateToken(id, role);

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          semester: mockUser.semester,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server registration error' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    if (role !== undefined && !['student', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'Choose a student or teacher account type' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (isDbConnected()) {
      const user = await User.findOne({ email: normalizedEmail }).select('+password');
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (role && user.role !== role) {
        return res.status(403).json({ error: `This account is registered as a ${user.role}. Choose ${user.role} to sign in.` });
      }

      const token = generateToken(user._id, user.role);

      return res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          semester: user.semester,
        },
      });
    } else {
      const user = inMemoryUsers.get(normalizedEmail);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (role && user.role !== role) {
        return res.status(403).json({ error: `This account is registered as a ${user.role}. Choose ${user.role} to sign in.` });
      }

      const token = generateToken(user.id, user.role);

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          semester: user.semester,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server login error' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server profile error' });
  }
};
