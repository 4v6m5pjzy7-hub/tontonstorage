// Tiny JSON-file store. Good enough for a rough draft; swap for a real DB later.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ rentals: [] }, null, 2));
}

function read() {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { rentals: [] };
  }
}

function write(data) {
  ensure();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function all() {
  return read().rentals.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function findById(id) {
  return read().rentals.find((r) => r.id === id) || null;
}

function findByToken(token) {
  return read().rentals.find((r) => r.token === token) || null;
}

function insert(rental) {
  const data = read();
  data.rentals.push(rental);
  write(data);
  return rental;
}

function update(id, patch) {
  const data = read();
  const idx = data.rentals.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  data.rentals[idx] = { ...data.rentals[idx], ...patch };
  write(data);
  return data.rentals[idx];
}

module.exports = { all, findById, findByToken, insert, update };
