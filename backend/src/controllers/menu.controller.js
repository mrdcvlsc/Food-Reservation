const { load, save, nextId } = require("../lib/db");

exports.list = (req, res) => {
  const db = load();
  console.log('[MENU] List: returning', (db.menu || []).length, 'items');
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

  if (!name || !category || isNaN(price)) {
    console.log('[MENU] Create: invalid payload');
    return res.status(400).json({ error: "Invalid payload" });
  }

  // If a file was uploaded via multer, prefer that as the image
  const img = req.file && req.file.filename ? `/uploads/${req.file.filename}` : (body.img || "");

  const db = load();
  // Use nextId helper to produce consistent string IDs like "ITM-1"
  const id = nextId(db.menu, "ITM");
  const item = { id, name, category, price, stock, img };
  db.menu.push(item);
  save(db);
  console.log('[MENU] Create: item created', id);
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
  if (i === -1) {
    console.log('[MENU] Update: item not found', id);
    return res.status(404).json({ error: "Not found" });
  }
  // Build patch from body, and if multer uploaded a file, use it
  const patch = { ...(req.body || {}) };
  const prevImg = db.menu[i] && db.menu[i].img ? db.menu[i].img : null;
  if (req.file && req.file.filename) {
    patch.img = `/uploads/${req.file.filename}`;
  }
  if ("price" in patch) patch.price = Number(patch.price);
  if ("stock" in patch) patch.stock = Number(patch.stock);

  db.menu[i] = { ...db.menu[i], ...patch };
  save(db);
  console.log('[MENU] Update: item updated', id);
  // If the image changed or was cleared, delete the previous file if it was in uploads/
  try {
    const fs = require('fs');
    const path = require('path');
    if (prevImg && prevImg.includes('/uploads/') && prevImg !== db.menu[i].img) {
      const fname = path.basename(prevImg);
      const fp = path.join(__dirname, '..', 'uploads', fname);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
  } catch (e) {
    // ignore cleanup errors
  }

  res.json({ ...db.menu[i], _fileUploaded: !!req.file, _fileName: req.file && req.file.filename ? req.file.filename : null });
};

exports.remove = (req, res) => {
  const id = req.params.id;
  const db = load();
  const i = db.menu.findIndex(m => String(m.id) === String(id));
  if (i === -1) {
    console.log('[MENU] Delete: item not found', id);
    return res.status(404).json({ error: "Not found" });
  }

  const removed = db.menu.splice(i, 1)[0];
  save(db);
  // remove associated image file
  try {
    const fs = require('fs');
    const path = require('path');
    if (removed && removed.img && removed.img.includes('/uploads/')) {
      const fname = path.basename(removed.img);
      const fp = path.join(__dirname, '..', 'uploads', fname);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
  } catch (e) {}

  console.log('[MENU] Delete: item deleted', id);
  res.json(removed);
};
