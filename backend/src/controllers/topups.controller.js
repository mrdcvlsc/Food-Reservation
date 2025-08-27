const { load, save } = require("../lib/db");

exports.create = (req, res) => {
  const { amount, method = "gcash", reference = "" } = req.body || {};
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: "Invalid amount" });

  const db = load();
  const topup = {
    id: "top_" + Date.now().toString(36),
    userId: req.user.id,
    amount: amt,
    method, reference,
    status: "Pending",
    createdAt: new Date().toISOString()
  };
  db.topups.push(topup);
  save(db);
  res.json(topup);
};

exports.mine = (req, res) => {
  const db = load();
  const rows = db.topups.filter(t => t.userId === req.user.id);
  res.json(rows);
};

// Admin: list all topups
exports.listAdmin = (req, res) => {
  const db = load();
  res.json(Array.isArray(db.topups) ? db.topups : []);
};

// Admin: set status for a topup (Approved|Rejected)
exports.setStatus = (req, res) => {
  const { id } = req.params || {};
  const { status } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Missing id' });
  if (!status) return res.status(400).json({ error: 'Missing status' });

  const db = load();
  const i = (db.topups || []).findIndex(t => String(t.id) === String(id));
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.topups[i].status = status;
  db.topups[i].updatedAt = new Date().toISOString();
  save(db);
  res.json(db.topups[i]);
};
