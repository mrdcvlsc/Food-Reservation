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
