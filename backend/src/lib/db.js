// server/src/lib/db.js
const path = require("path");
const fs = require("fs-extra");

const DB_FILE = path.join(__dirname, "..", "data", "db.json");

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
  return ensureFile();
}

function save(dbObj) {
  return _saveAsync(dbObj);
}

module.exports = { load, save, nextId, DB_FILE };
