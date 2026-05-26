const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.json');

function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const empty = { users: [] };
      writeDB(empty);
      return empty;
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { users: [] };
  }
}

function writeDB(data) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

async function seedAdmin() {
  const db = readDB();
  if (db.users.some(u => u.role === 'admin')) return;

  const password = await bcrypt.hash('Admin123!', 12);
  db.users.push({
    id: uuidv4(),
    username: 'admin',
    email: 'admin@admin.com',
    password,
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
    loginAttempts: 0,
    lockUntil: null,
    lastLogin: null
  });
  writeDB(db);
  console.log('  Default admin created → admin@admin.com / Admin123!');
}

module.exports = { readDB, writeDB, seedAdmin };
