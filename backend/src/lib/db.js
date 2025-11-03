// server/src/lib/db.js
const fs = require("fs");
const path = require("path");
const DB = path.join(__dirname, "..", "data", "db.json");

function readRaw() {
  try {
    return fs.readFileSync(DB, "utf8");
  } catch (err) {
    return null;
  }
}

function save(obj) {
  fs.writeFileSync(DB, JSON.stringify(obj, null, 2), "utf8");
}

function load() {
  let data = { users: [], menu: [], reservations: [], topups: [], transactions: [], notifications: [] };
  const raw = readRaw();
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("[DB] invalid db.json, starting with empty DB", err && err.message);
    }
  }

  data.users = Array.isArray(data.users) ? data.users : [];
  data.menu = Array.isArray(data.menu) ? data.menu : [];
  data.reservations = Array.isArray(data.reservations) ? data.reservations : [];
  data.topups = Array.isArray(data.topups) ? data.topups : [];
  data.transactions = Array.isArray(data.transactions) ? data.transactions : [];
  data.notifications = Array.isArray(data.notifications) ? data.notifications : [];

  // --- migration: ensure studentId for all users ---
  const used = new Set();
  for (const u of data.users) {
    if (u && u.studentId) used.add(String(u.studentId).trim());
  }

  const genUnique9 = () => {
    let id;
    let attempts = 0;
    do {
      const num = Math.floor(100000000 + Math.random() * 900000000); // 9-digit
      id = String(num).padStart(9, "0");
      attempts++;
      if (attempts > 10000) break;
    } while (used.has(id));
    used.add(id);
    return id;
  };

  // try to assign preferred admin id
  for (const u of data.users) {
    if (u && (u.role === "admin" || String(u.email || "").toLowerCase().includes("admin"))) {
      if (!u.studentId) {
        const preferred = "000000001";
        if (!used.has(preferred)) {
          u.studentId = preferred;
          used.add(preferred);
        } else {
          u.studentId = genUnique9();
        }
      } else {
        u.studentId = String(u.studentId).trim();
      }
    }
  }

  // assign for remaining users
  for (const u of data.users) {
    if (!u.studentId) {
      u.studentId = genUnique9();
    } else {
      u.studentId = String(u.studentId).trim();
      if (!used.has(u.studentId)) used.add(u.studentId);
    }
  }

  // --- migration: populate topups' studentId from user records when possible ---
  const usersById = {};
  for (const u of data.users) {
    if (u && u.id) usersById[String(u.id)] = u;
  }
  let topupsChanged = false;
  for (const t of data.topups) {
    if (!t) continue;
    // prefer existing explicit studentId, else resolve by userId
    if (!t.studentId || t.studentId === "N/A") {
      if (t.userId && usersById[t.userId] && usersById[t.userId].studentId) {
        t.studentId = usersById[t.userId].studentId;
        topupsChanged = true;
      }
    } else {
      // normalize string
      t.studentId = String(t.studentId);
    }
  }

  // persist migration changes if any
  if (topupsChanged || true) {
    // always persist user studentId normalization/creation
    try {
      fs.writeFileSync(DB, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
      console.error("[DB] failed to save db.json after migration", err && err.message);
    }
  }

  return data;
}

module.exports = { load, save };
