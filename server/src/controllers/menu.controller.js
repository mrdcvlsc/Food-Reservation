const { load, save, nextId } = require("../lib/db");

exports.list = (req, res) => {
  const db = load();
  res.json(db.menu);
};

exports.create = (req, res) => {
  const { name, category, price, stock = 0, img = "" } = req.body || {};
  if (!name || !category || typeof price !== "number") return res.status(400).json({ error: "Invalid payload" });

  const db = load();
  // Use nextId helper to produce consistent string IDs like "ITM-1"
  const id = nextId(db.menu, "ITM");
  const item = { id, name, category, price, stock, img };
  db.menu.push(item);
  save(db);
  res.json(item);
};

exports.update = (req, res) => {
  const id = req.params.id;
  const db = load();
  const i = db.menu.findIndex(m => String(m.id) === String(id));
  if (i === -1) return res.status(404).json({ error: "Not found" });

  const patch = { ...req.body };
  if ("price" in patch) patch.price = Number(patch.price);
  if ("stock" in patch) patch.stock = Number(patch.stock);

  db.menu[i] = { ...db.menu[i], ...patch };
  save(db);
  res.json(db.menu[i]);
};

exports.remove = (req, res) => {
  const id = req.params.id;
  const db = load();
  const i = db.menu.findIndex(m => String(m.id) === String(id));
  if (i === -1) return res.status(404).json({ error: "Not found" });

  const removed = db.menu.splice(i, 1)[0];
  save(db);
  res.json(removed);
};
