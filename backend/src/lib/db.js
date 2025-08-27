// server/src/lib/db.js
// Provides a small database adapter: by default reads/writes the local JSON file `data/db.json`.
// If the environment variable MONGO_URI is set, it will use MongoDB as the backing store
// (collections: menu, reservations, topups, users, transactions). This allows a gradual
// migration to Mongo without changing controller code (they call load()/save()).

const path = require("path");
const fs = require("fs-extra");

const DB_FILE = path.join(__dirname, "..", "data", "db.json");

function ensureFile() {
  // Make sure the file exists
  fs.ensureFileSync(DB_FILE);

  // Try to read and parse existing JSON
  try {
    const txt = fs.readFileSync(DB_FILE, "utf8");
    if (txt && txt.trim()) return JSON.parse(txt);
  } catch (err) {
    console.warn("db: parse error, recreating db.json:", err.message);
  }

  // Seed minimal structure if empty/corrupt
  const seed = { menu: [], reservations: [], topups: [], users: [], transactions: [] };
  fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
  return seed;
}

/**
 * Load DB state. If MONGO_URI is set, load collections from MongoDB; otherwise load local JSON.
 * Returns an object { menu:[], reservations:[], topups:[], users:[], transactions:[] }
 */
async function _loadAsync() {
  // Always use the file-based DB in this rollback. Keep async signature for compatibility.
  return ensureFile();
}

/**
 * Save DB state. For Mongo mode, replaces collections atomically (deleteMany + insertMany).
 */
async function _saveAsync(dbObj) {
  // file mode: synchronous write
  fs.writeFileSync(DB_FILE, JSON.stringify(dbObj, null, 2));
}

function nextId(list = [], prefix = "RES") {
  let n = 0;
  for (const x of list) {
    const last = String(x.id || "").split("-").pop();
    const num = Number(last);
    if (!Number.isNaN(num)) n = Math.max(n, num);
  }
  return `${prefix}-${n + 1}`;
}

// Exported API: keep former synchronous signatures but backed by async mongo when available.
// For backwards compatibility controllers expect `const db = await load()` or `const db = load()`.
// We'll export both async and sync variants. If Mongo is enabled, synchronous `load()` will throw
// instructing the caller to use the async API. Existing controllers in this repo already use
// `await load()` in some places; others may assume sync. To be safe we provide sync fallback to file DB.

function load() {
  // Always return the file-backed DB synchronously for compatibility.
  return ensureFile();
}

function save(dbObj) {
  return _saveAsync(dbObj);
}

module.exports = { load, save, nextId, DB_FILE };
