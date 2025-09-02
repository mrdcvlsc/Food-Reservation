const { load, save, nextId } = require("../lib/db");

exports.list = (req, res) => {
  const db = load();
  res.json(db.menu);
};

exports.create = (req, res) => {
  const body = req.body || {};
  console.log('[menu.controller] CREATE incoming:', {
    contentType: req.headers['content-type'],
    bodyKeys: Object.keys(body || {}),
    file: req.file && req.file.filename ? req.file.filename : null,
  });
  const name = body.name;
  const category = body.category;
  const price = Number(body.price);
  const stock = Number(body.stock || 0);

  if (!name || !category || isNaN(price)) return res.status(400).json({ error: "Invalid payload" });

  // If a file was uploaded via multer, prefer that as the image
  const img = req.file && req.file.filename ? `/uploads/${req.file.filename}` : (body.img || "");

  const db = load();
  // Use nextId helper to produce consistent string IDs like "ITM-1"
  const id = nextId(db.menu, "ITM");
  const item = { id, name, category, price, stock, img };
  db.menu.push(item);
  save(db);
  res.json({ ...item, _fileUploaded: !!req.file, _fileName: req.file && req.file.filename ? req.file.filename : null });
};

exports.update = (req, res) => {
  const id = req.params.id;
  console.log('[menu.controller] UPDATE incoming:', {
    id,
    contentType: req.headers['content-type'],
    bodyKeys: Object.keys(req.body || {}),
    file: req.file && req.file.filename ? req.file.filename : null,
  });
  const db = load();
  const i = db.menu.findIndex(m => String(m.id) === String(id));
  if (i === -1) return res.status(404).json({ error: "Not found" });
  // Build patch from body, and if multer uploaded a file, use it
  const patch = { ...(req.body || {}) };
  if (req.file && req.file.filename) {
    patch.img = `/uploads/${req.file.filename}`;
  }
  if ("price" in patch) patch.price = Number(patch.price);
  if ("stock" in patch) patch.stock = Number(patch.stock);

  db.menu[i] = { ...db.menu[i], ...patch };
  save(db);
  res.json({ ...db.menu[i], _fileUploaded: !!req.file, _fileName: req.file && req.file.filename ? req.file.filename : null });
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
