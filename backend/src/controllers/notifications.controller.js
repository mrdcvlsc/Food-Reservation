const { load, save } = require("../lib/db");

function nowISO() {
  return new Date().toISOString();
}

/**
 * Notification shape:
 * { id, for: "admin" | "<userId>", actor, type, title, body, data?, read: false, createdAt }
 */

exports.addNotification = (notif = {}) => {
  const db = load();
  db.notifications = Array.isArray(db.notifications) ? db.notifications : [];
  const n = {
    id: notif.id || "notif_" + Date.now().toString(36),
    for: notif.for || "admin",
    actor: notif.actor || null,
    type: notif.type || "misc",
    title: notif.title || "",
    body: notif.body || "",
    data: notif.data || null,
    read: !!notif.read,
    createdAt: notif.createdAt || nowISO(),
  };
  // newest first
  db.notifications.unshift(n);
  save(db);
  return n;
};

exports.listAdmin = (req, res) => {
  const db = load();
  const rows = (db.notifications || []).filter((x) => x.for === "admin");
  res.json(rows);
};

exports.mine = (req, res) => {
  const db = load();
  const uid = req.user && req.user.id;
  if (!uid) return res.status(401).json({ error: "Unauthorized" });
  const rows = (db.notifications || []).filter((n) => String(n.for) === String(uid));
  res.json(rows);
};

exports.markRead = (req, res) => {
  const { id } = req.params || {};
  if (!id) return res.status(400).json({ error: "Missing id" });
  const db = load();
  db.notifications = db.notifications || [];
  const i = db.notifications.findIndex((n) => String(n.id) === String(id));
  if (i === -1) return res.status(404).json({ error: "Not found" });

  const target = db.notifications[i];
  if (req.user?.role !== "admin" && String(target.for) !== String(req.user.id)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  db.notifications[i].read = true;
  save(db);
  res.json({ ok: true, id });
};

exports.markManyReadAdmin = (req, res) => {
  const { ids = [], all = false } = req.body || {};
  const db = load();
  db.notifications = db.notifications || [];
  if (all) {
    for (const n of db.notifications) {
      if (n.for === "admin") n.read = true;
    }
    save(db);
    return res.json({ ok: true });
  }
  const set = new Set((Array.isArray(ids) ? ids : []).map(String));
  for (const n of db.notifications) {
    if (n.for === "admin" && set.has(String(n.id))) n.read = true;
  }
  save(db);
  res.json({ ok: true });
};