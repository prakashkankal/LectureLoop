import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { findFallbackUserByEmail, saveFallbackUser } from '../services/fallbackUserStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lectureloop_dev_secret_key_2026';

const isDbConnected = () => mongoose.connection.readyState === 1;

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, roll } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRoll = typeof roll === 'string' ? roll.trim() : '';

    if (isDbConnected()) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        roll: normalizedRoll,
      });

      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          roll: user.roll,
          role: user.role,
          semester: user.semester,
        },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const id = `mem_${randomUUID()}`;
    const fallbackUser = {
      id,
      name,
      email: normalizedEmail,
      roll: normalizedRoll,
      password: hashedPassword,
      role: 'student',
      semester: 'Semester 5 • Fall 2024',
    };

    if (!saveFallbackUser(fallbackUser)) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    console.warn('[AUTH] MongoDB is unavailable. User saved in the local development store.');
    const token = generateToken(id);
    return res.status(201).json({
      success: true,
      token,
      user: {
        id: fallbackUser.id,
        name: fallbackUser.name,
        email: fallbackUser.email,
        roll: fallbackUser.roll,
        role: fallbackUser.role,
        semester: fallbackUser.semester,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server registration error' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const databaseUser = isDbConnected()
      ? await User.findOne({ email: normalizedEmail }).select('+password')
      : null;
    const user = databaseUser || findFallbackUserByEmail(normalizedEmail);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const id = user.id || user._id;
    const token = generateToken(id);
    return res.json({
      success: true,
      token,
      user: {
        id,
        name: user.name,
        email: user.email,
        roll: user.roll,
        role: user.role,
        semester: user.semester,
      },
    });
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
