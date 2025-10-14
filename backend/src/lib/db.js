// server/src/lib/db.js
const path = require("path");
const fs = require("fs-extra");

const DB_FILE = path.join(__dirname, "..", "data", "db.json");

// Database cache to prevent loading from disk on every request
let dbCache = null;
let lastModified = 0;

function ensureFile() {
  fs.ensureFileSync(DB_FILE);
  try {
    const txt = fs.readFileSync(DB_FILE, "utf8");
    if (txt && txt.trim()) return JSON.parse(txt);
  } catch (err) {
    console.warn("db: parse error, recreating db.json:", err.message);
  }
  // IMPORTANT: include wallets
  const seed = {
    menu: [],
    reservations: [],
    topups: [],
    users: [],
    transactions: [],
    wallets: [],
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
  return seed;
}

async function _loadAsync() {
  return ensureFile();
}

async function _saveAsync(dbObj) {
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

function load() {
  try {
    // Check if file was modified since last load
    const stats = fs.statSync(DB_FILE);
    const currentModified = stats.mtime.getTime();
    
    // Return cached data if file hasn't changed
    if (dbCache && currentModified <= lastModified) {
      console.log('[DB] Using cached database (file unchanged)');
      return dbCache;
    }
    
    console.log('[DB] Loading database from disk:', DB_FILE);
    const result = ensureFile();
    console.log('[DB] Database loaded successfully. Collections:', Object.keys(result));
    
    // Update cache
    dbCache = result;
    lastModified = currentModified;
    
    return result;
  } catch (error) {
    console.error('[DB] Error loading database:', error.message);
    throw error;
  }
}

function save(dbObj) {
  console.log('[DB] Saving database to:', DB_FILE);
  try {
    _saveAsync(dbObj);
    console.log('[DB] Database saved successfully');
    
    // Update cache with new data
    dbCache = dbObj;
    lastModified = Date.now();
  } catch (error) {
    console.error('[DB] Error saving database:', error.message);
    throw error;
  }
}

module.exports = { load, save, nextId, DB_FILE };
