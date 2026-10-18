import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { execute, queryOne } from '../db/sqlite.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const credentials = z.object({ email: z.string().email().max(200), password: z.string().min(8).max(128), name: z.string().trim().min(1).max(80).optional() });
const tokenFor = (user) => jwt.sign({ id: user.id, name: user.name, email: user.email }, process.env.JWT_SECRET || 'local-oral-test-development-secret', { expiresIn: '7d' });

router.post('/register', async (request, response) => {
  const parsed = credentials.safeParse(request.body);
  if (!parsed.success || !parsed.data.name) return response.status(400).json({ error: 'Provide a name, valid email, and password of at least 8 characters.' });
  const email = parsed.data.email.trim().toLowerCase();
  if (queryOne('SELECT id FROM users WHERE email = ?', [email])) return response.status(409).json({ error: 'An account with this email already exists.' });
  const user = { id: randomUUID(), name: parsed.data.name, email };
  const hash = await bcrypt.hash(parsed.data.password, 12);
  execute('INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)', [user.id, user.name, user.email, hash, new Date().toISOString()]);
  return response.status(201).json({ token: tokenFor(user), user });
});

router.post('/login', async (request, response) => {
  const parsed = credentials.pick({ email: true, password: true }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Provide a valid email and password.' });
  const email = parsed.data.email.trim().toLowerCase();
  const user = queryOne('SELECT id, name, email, password_hash FROM users WHERE email = ?', [email]);
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) return response.status(401).json({ error: 'Email or password is incorrect.' });
  return response.json({ token: tokenFor(user), user: { id: user.id, name: user.name, email: user.email } });
});

router.get('/me', requireAuth, (request, response) => response.json({ user: request.user }));

export default router;