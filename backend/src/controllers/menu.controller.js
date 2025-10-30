const { load, save } = require("../lib/db");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");

// generate a stable fallback id for file-db (timestamp + random suffix)
const genId = () => String(Date.now()) + String(Math.floor(Math.random() * 1000));

exports.list = (req, res) => {
  const db = load();
  console.log('[MENU] List: returning', (db.menu || []).length, 'items');
  res.json(db.menu);
};

exports.create = async (req, res) => {
  try {
    const payload = { ...(req.body || {}) };
    if (req.file && req.file.filename) {
      payload.img = payload.img || `/uploads/${req.file.filename}`;
    }

    if (payload.price != null) payload.price = Number(payload.price);
    if (payload.stock != null) payload.stock = Number(payload.stock);

    // ensure visibility flag defaults to true
    if (payload.visible === undefined) payload.visible = true;

    // If Mongo connected -> insert to collection
    if (mongoose && mongoose.connection && mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      const col = db.collection("menu");
      const now = new Date().toISOString();
      const item = {
        ...payload,
        createdAt: now,
        updatedAt: now,
      };
      const r = await col.insertOne(item);
      return res.json({ ok: true, item: r.ops ? r.ops[0] : { ...item, _id: r.insertedId } });
    }

    // File DB fallback
    const dbFile = await load();
    dbFile.menu = Array.isArray(dbFile.menu) ? dbFile.menu : [];

    const id = payload.id || genId();
    const now = new Date().toISOString();
    const newItem = {
      id,
      ...payload,
      createdAt: now,
      updatedAt: now,
    };

    dbFile.menu.push(newItem);
    await save(dbFile);
    return res.json({ ok: true, item: newItem });
  } catch (err) {
    console.error("[MENU] create error:", err);
    return res.status(500).json({ error: "Failed to create item", details: err.message || String(err) });
  }
};

exports.update = async (req, res) => {
  const id = req.params.id;
  const payload = { ...(req.body || {}) };
  if (req.file) {
    if (req.file.filename) {
      payload.img = payload.img || `/uploads/${req.file.filename}`;
    } else if (req.file.path) {
      payload.img = payload.img || req.file.path;
    }
  }

  if (payload.price != null) payload.price = Number(payload.price);
  if (payload.stock != null) payload.stock = Number(payload.stock);

  try {
    if (mongoose && mongoose.connection && mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      const col = db.collection("menu");
      const filterCandidates = [{ id }, { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }];
      const filter = { $or: filterCandidates.filter(Boolean) };
      const update = { $set: {} };
      // include visible so admin can toggle show/hide
      ["name", "price", "category", "stock", "img", "desc", "visible"].forEach((f) => {
        if (payload[f] !== undefined) update.$set[f] = payload[f];
      });
      if (Object.keys(update.$set).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      const out = await col.findOneAndUpdate(filter, update, { returnDocument: "after" });
      if (!out.value) return res.status(404).json({ error: "Not Found" });
      return res.json({ ok: true, item: out.value });
    }

    // File DB fallback
    const dbFile = await load();
    dbFile.menu = Array.isArray(dbFile.menu) ? dbFile.menu : [];
    const idx = dbFile.menu.findIndex((m) => String(m.id) === String(id) || String(m._id) === String(id));
    if (idx === -1) return res.status(404).json({ error: "Not Found" });

    const item = dbFile.menu[idx];
    ["name", "price", "category", "stock", "img", "desc", "visible"].forEach((f) => {
      if (payload[f] !== undefined) item[f] = payload[f];
    });
    item.updatedAt = new Date().toISOString();
    await save(dbFile);
    return res.json({ ok: true, item });
  } catch (err) {
    console.error("[MENU] update error:", err);
    return res.status(500).json({ error: "Failed to update item", details: err.message || String(err) });
  }
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
