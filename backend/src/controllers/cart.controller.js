const mongoose = require("mongoose");
const { load, save } = require("../lib/db");

/**
 * Helper: are we connected to Mongo?
 */
function usingMongo() {
  return !!(mongoose && mongoose.connection && mongoose.connection.readyState === 1);
}

/**
 * If you use a Mongoose Cart model, require it here.
 * If not present, controller will use file DB fallback.
 */
let CartModel = null;
try {
  CartModel = require("../models/cart.model");
} catch (e) {
  CartModel = null;
}

/**
 * GET /api/cart
 */
exports.get = async (req, res) => {
  try {
    const uid = req.user && req.user.id;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    if (usingMongo() && CartModel) {
      const doc = await CartModel.findOne({ userId: String(uid) }).lean();
      const items = doc ? doc.items : [];
      return res.json({ status: 200, data: { items, cart: items.reduce((m, it) => ({ ...m, [it.itemId]: it.qty }), {}) } });
    }

    const db = await load();
    db.carts = Array.isArray(db.carts) ? db.carts : [];
    const rec = db.carts.find((c) => String(c.userId) === String(uid));
    const items = rec ? (rec.items || []) : [];
    return res.json({ status: 200, data: { items, cart: items.reduce((m, it) => ({ ...m, [it.itemId]: it.qty }), {}) } });
  } catch (err) {
    console.error("[CART] get error:", err && err.message);
    return res.status(500).json({ error: "Failed to load cart" });
  }
};

/**
 * POST /api/cart/add
 * Body: { itemId, qty = 1, name?, price? }
 * increments qty if exists
 */
exports.addItem = async (req, res) => {
  try {
    const uid = req.user && req.user.id;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const { itemId, qty = 1, name = "", price = 0 } = req.body || {};
    if (!itemId) return res.status(400).json({ error: "Missing itemId" });
    const q = Math.max(0, Number(qty) || 0);
    if (q <= 0) return res.status(400).json({ error: "Invalid qty" });

    if (usingMongo() && CartModel) {
      const doc = await CartModel.findOne({ userId: String(uid) });
      if (!doc) {
        const created = new CartModel({ userId: String(uid), items: [{ itemId: String(itemId), qty: q, name, price }] });
        await created.save();
        return res.json({ status: 200, data: { ok: true, items: created.items } });
      }
      const idx = doc.items.findIndex((it) => String(it.itemId) === String(itemId));
      if (idx === -1) {
        doc.items.push({ itemId: String(itemId), qty: q, name, price });
      } else {
        doc.items[idx].qty = (Number(doc.items[idx].qty) || 0) + q;
      }
      doc.updatedAt = new Date();
      await doc.save();
      return res.json({ status: 200, data: { ok: true, items: doc.items } });
    }

    // file DB fallback
    const db = await load();
    db.carts = Array.isArray(db.carts) ? db.carts : [];
    let rec = db.carts.find((c) => String(c.userId) === String(uid));
    if (!rec) {
      rec = { id: `cart_user_${uid}`, userId: uid, items: [{ itemId: String(itemId), qty: q, name, price }], updatedAt: new Date().toISOString() };
      db.carts.push(rec);
    } else {
      rec.items = rec.items || [];
      const idx = rec.items.findIndex((it) => String(it.itemId) === String(itemId));
      if (idx === -1) rec.items.push({ itemId: String(itemId), qty: q, name, price });
      else rec.items[idx].qty = (Number(rec.items[idx].qty) || 0) + q;
      rec.updatedAt = new Date().toISOString();
    }
    await save(db);
    return res.json({ status: 200, data: { ok: true, items: rec.items } });
  } catch (err) {
    console.error("[CART] addItem error:", err && err.message);
    return res.status(500).json({ error: "Failed to add to cart" });
  }
};

/**
 * POST /api/cart/update
 * Body: { itemId, qty }
 * set qty (remove if 0)
 */
exports.updateItem = async (req, res) => {
  try {
    const uid = req.user && req.user.id;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const { itemId, qty } = req.body || {};
    if (!itemId || typeof qty === "undefined") return res.status(400).json({ error: "Missing fields" });
    const q = Math.max(0, Number(qty) || 0);

    if (usingMongo() && CartModel) {
      const doc = await CartModel.findOne({ userId: String(uid) });
      if (!doc) return res.status(404).json({ error: "Cart not found" });
      const idx = doc.items.findIndex((it) => String(it.itemId) === String(itemId));
      if (idx === -1) return res.status(404).json({ error: "Item not found" });
      if (q === 0) doc.items.splice(idx, 1);
      else doc.items[idx].qty = q;
      doc.updatedAt = new Date();
      await doc.save();
      return res.json({ status: 200, data: { ok: true, items: doc.items } });
    }

    // file DB fallback
    const db = await load();
    db.carts = Array.isArray(db.carts) ? db.carts : [];
    const rec = db.carts.find((c) => String(c.userId) === String(uid));
    if (!rec) return res.status(404).json({ error: "Cart not found" });
    const idx = (rec.items || []).findIndex((it) => String(it.itemId) === String(itemId));
    if (idx === -1) return res.status(404).json({ error: "Item not found" });
    if (q === 0) rec.items.splice(idx, 1);
    else rec.items[idx].qty = q;
    rec.updatedAt = new Date().toISOString();
    await save(db);
    return res.json({ status: 200, data: { ok: true, items: rec.items } });
  } catch (err) {
    console.error("[CART] updateItem error:", err && err.message);
    return res.status(500).json({ error: "Failed to update cart" });
  }
};

/**
 * POST /api/cart/remove
 * Body: { itemId }
 */
exports.removeItem = async (req, res) => {
  try {
    const uid = req.user && req.user.id;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const { itemId } = req.body || {};
    if (!itemId) return res.status(400).json({ error: "Missing itemId" });

    if (usingMongo() && CartModel) {
      const doc = await CartModel.findOne({ userId: String(uid) });
      if (!doc) return res.json({ ok: true, items: [] });
      doc.items = (doc.items || []).filter((it) => String(it.itemId) !== String(itemId));
      doc.updatedAt = new Date();
      await doc.save();
      return res.json({ ok: true, items: doc.items });
    }

    const db = await load();
    db.carts = Array.isArray(db.carts) ? db.carts : [];
    const rec = db.carts.find((c) => String(c.userId) === String(uid));
    if (!rec) return res.json({ ok: true, items: [] });
    rec.items = (rec.items || []).filter((it) => String(it.itemId) !== String(itemId));
    rec.updatedAt = new Date().toISOString();
    await save(db);
    return res.json({ ok: true, items: rec.items });
  } catch (err) {
    console.error("[CART] removeItem error:", err && err.message);
    return res.status(500).json({ error: "Failed to remove item" });
  }
};

/**
 * POST /api/cart/clear
 */
exports.clear = async (req, res) => {
  try {
    const uid = req.user && req.user.id;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    if (usingMongo() && CartModel) {
      await CartModel.findOneAndUpdate({ userId: String(uid) }, { $set: { items: [], updatedAt: new Date() } }, { upsert: true });
      return res.json({ status: 200, data: { ok: true, items: [] } });
    }

    const db = await load();
    db.carts = Array.isArray(db.carts) ? db.carts : [];
    const rec = db.carts.find((c) => String(c.userId) === String(uid));
    if (rec) {
      rec.items = [];
      rec.updatedAt = new Date().toISOString();
      await save(db);
    }
    return res.json({ status: 200, data: { ok: true, items: [] } });
  } catch (err) {
    console.error("[CART] clear error:", err && err.message);
    return res.status(500).json({ error: "Failed to clear cart" });
  }
};