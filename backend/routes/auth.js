const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { readDB, writeDB } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000 // 8 hours
};

function issueToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

// POST /api/auth/login
router.post(
  '/login',
  loginLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid email or password' });

    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is disabled. Contact an administrator.' });

    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const mins = Math.ceil((new Date(user.lockUntil) - Date.now()) / 60000);
      return res.status(429).json({ error: `Account locked. Try again in ${mins} minute(s).` });
    }

    const valid = await bcrypt.compare(password, user.password);
    const idx = db.users.findIndex(u => u.id === user.id);

    if (!valid) {
      db.users[idx].loginAttempts = (user.loginAttempts || 0) + 1;
      if (db.users[idx].loginAttempts >= 5) {
        db.users[idx].lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        writeDB(db);
        return res.status(429).json({ error: 'Too many failed attempts. Account locked for 15 minutes.' });
      }
      writeDB(db);
      const remaining = 5 - db.users[idx].loginAttempts;
      return res.status(401).json({ error: `Invalid credentials. ${remaining} attempt(s) remaining.` });
    }

    db.users[idx].loginAttempts = 0;
    db.users[idx].lockUntil = null;
    db.users[idx].lastLogin = new Date().toISOString();
    writeDB(db);

    res.cookie('token', issueToken(user.id), COOKIE_OPTS);
    const { password: _, ...safeUser } = db.users[idx];
    res.json({ user: safeUser });
  }
);

// POST /api/auth/register
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username must be 3-30 characters, letters/numbers/underscores only'),
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/)
      .withMessage('Password must be 8+ characters with uppercase, lowercase, and a number')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { username, email, password } = req.body;
    const db = readDB();

    if (db.users.some(u => u.email === email)) {
      return res.status(409).json({ error: 'Email is already registered' });
    }
    if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password: hashed,
      role: 'user',
      isActive: true,
      createdAt: new Date().toISOString(),
      loginAttempts: 0,
      lockUntil: null,
      lastLogin: null
    };
    db.users.push(newUser);
    writeDB(db);

    res.cookie('token', issueToken(newUser.id), COOKIE_OPTS);
    const { password: _, ...safeUser } = newUser;
    res.status(201).json({ user: safeUser });
  }
);

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict' });
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/password
router.put(
  '/password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/)
      .withMessage('Password must be 8+ characters with uppercase, lowercase, and a number')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { currentPassword, newPassword } = req.body;
    const db = readDB();
    const idx = db.users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, db.users[idx].password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    db.users[idx].password = await bcrypt.hash(newPassword, 12);
    writeDB(db);
    res.json({ message: 'Password updated successfully' });
  }
);

module.exports = router;
