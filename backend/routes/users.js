const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { readDB, writeDB } = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

// GET /api/users
router.get('/', (req, res) => {
  const db = readDB();
  const users = db.users.map(({ password, ...u }) => u);
  res.json({ users, total: users.length });
});

// POST /api/users — admin creates a user directly
router.post(
  '/',
  [
    body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/),
    body('role').isIn(['admin', 'user'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { username, email, password, role } = req.body;
    const db = readDB();

    if (db.users.some(u => u.email === email)) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password: hashed,
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      loginAttempts: 0,
      lockUntil: null,
      lastLogin: null
    };
    db.users.push(newUser);
    writeDB(db);

    const { password: _, ...safeUser } = newUser;
    res.status(201).json({ user: safeUser });
  }
);

// PUT /api/users/:id — update role, active status, username
router.put('/:id', (req, res) => {
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  if (req.params.id === req.user.id && req.body.isActive === false) {
    return res.status(400).json({ error: 'You cannot disable your own account' });
  }
  if (req.params.id === req.user.id && req.body.role && req.body.role !== 'admin') {
    return res.status(400).json({ error: 'You cannot remove your own admin role' });
  }

  const { role, isActive, username } = req.body;
  if (role !== undefined && ['admin', 'user'].includes(role)) db.users[idx].role = role;
  if (isActive !== undefined) {
    db.users[idx].isActive = Boolean(isActive);
    if (isActive) {
      db.users[idx].loginAttempts = 0;
      db.users[idx].lockUntil = null;
    }
  }
  if (username !== undefined && username.trim().length >= 3) db.users[idx].username = username.trim();

  writeDB(db);
  const { password, ...safeUser } = db.users[idx];
  res.json({ user: safeUser });
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  db.users.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'User deleted' });
});

// POST /api/users/:id/unlock — clear lockout
router.post('/:id/unlock', (req, res) => {
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  db.users[idx].loginAttempts = 0;
  db.users[idx].lockUntil = null;
  writeDB(db);
  res.json({ message: 'Account unlocked' });
});

module.exports = router;
