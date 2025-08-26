// server/src/lib/db.js
const path = require("path");
const fs = require("fs-extra");

const DB_FILE = path.join(__dirname, "..", "data", "db.json");

function ensure() {
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

function load() {
  // Synchronous: controllers can do `const db = load();`
  return ensure();
}

function save(db) {
  // Synchronous: controllers can do `save(db);`
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
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

module.exports = { load, save, nextId, DB_FILE };
