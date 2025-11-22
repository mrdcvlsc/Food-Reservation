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

    // 🔥 CRITICAL: Validate user is authenticated and cart belongs to them
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Invalid user session" });
    }

    if (usingMongo() && CartModel) {
      // Mongoose implementation
      let cart = await CartModel.findOne({ userId: uid });
      if (!cart) {
        // New user - create empty cart
        cart = new CartModel({ userId: uid, items: [] });
        await cart.save();
      }
      const items = cart.items || [];
      return res.json({ 
        status: 200, 
        data: { 
          items, 
          cart: items.reduce((m, it) => ({ ...m, [it.itemId]: it.qty }), {}) 
        } 
      });
    }

    // File DB fallback
    const db = await load();
    db.carts = Array.isArray(db.carts) ? db.carts : [];
    
    // 🔥 Find cart for THIS user only
    let rec = db.carts.find((c) => String(c.userId) === String(uid));
    
    // If user has no cart, create empty one
    if (!rec) {
      rec = { userId: uid, items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      db.carts.push(rec);
      await save(db);
    }
    
    const items = rec.items || [];
    return res.json({ 
      status: 200, 
      data: { 
        items, 
        cart: items.reduce((m, it) => ({ ...m, [it.itemId]: it.qty }), {}) 
      } 
    });
  } catch (err) {
    console.error("[CART] get error:", err && err.message);
    return res.status(500).json({ error: "Failed to load cart" });
  }
};

/**
 * POST /api/cart/add
 * Body: { itemId, qty = 1, name?, price? }
 */
exports.addItem = async (req, res) => {
  try {
    const uid = req.user && req.user.id;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const { itemId, qty = 1, name = "", price = 0 } = req.body || {};
    if (!itemId) return res.status(400).json({ error: "itemId required" });
    
    const q = Math.max(0, Number(qty) || 0);
    if (q <= 0) return res.status(400).json({ error: "qty must be > 0" });

    if (usingMongo() && CartModel) {
      // Mongoose implementation
      let cart = await CartModel.findOne({ userId: uid });
      if (!cart) {
        cart = new CartModel({ userId: uid, items: [] });
      }
      
      const existingItem = cart.items.find((it) => String(it.itemId) === String(itemId));
      if (existingItem) {
        existingItem.qty = (existingItem.qty || 0) + q;
      } else {
        cart.items.push({ itemId: String(itemId), qty: q, name, price });
      }
      
      cart.updatedAt = new Date();
      await cart.save();
      return res.json({ status: 200, data: { ok: true, items: cart.items } });
    }

    // File DB fallback
    const db = await load();
    db.carts = Array.isArray(db.carts) ? db.carts : [];
    
    // 🔥 Find cart for THIS user only
    let rec = db.carts.find((c) => String(c.userId) === String(uid));
    if (!rec) {
      rec = { userId: uid, items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      db.carts.push(rec);
    }
    
    const idx = (rec.items || []).findIndex((it) => String(it.itemId) === String(itemId));
    if (idx >= 0) {
      rec.items[idx].qty = (rec.items[idx].qty || 0) + q;
    } else {
      rec.items.push({ itemId: String(itemId), qty: q, name, price });
    }
    
    rec.updatedAt = new Date().toISOString();
    await save(db);
    return res.json({ status: 200, data: { ok: true, items: rec.items } });
  } catch (err) {
    console.error("[CART] addItem error:", err && err.message);
    return res.status(500).json({ error: "Failed to add to cart" });
  }
};

/**
 * POST /api/cart/update
 */
exports.updateItem = async (req, res) => {
  try {
    const uid = req.user && req.user.id;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    
    const { itemId, qty } = req.body || {};
    if (!itemId || typeof qty === "undefined") return res.status(400).json({ error: "itemId and qty required" });
    
    const q = Math.max(0, Number(qty) || 0);

    if (usingMongo() && CartModel) {
      let cart = await CartModel.findOne({ userId: uid });
      if (!cart) return res.status(404).json({ error: "Cart not found" });
      
      const idx = (cart.items || []).findIndex((it) => String(it.itemId) === String(itemId));
      if (idx === -1) return res.status(404).json({ error: "Item not in cart" });
      
      if (q === 0) {
        cart.items.splice(idx, 1);
      } else {
        cart.items[idx].qty = q;
      }
      
      cart.updatedAt = new Date();
      await cart.save();
      return res.json({ status: 200, data: { ok: true, items: cart.items } });
    }

    // File DB fallback
    const db = await load();
    db.carts = Array.isArray(db.carts) ? db.carts : [];
    
    // 🔥 Find cart for THIS user only
    const rec = db.carts.find((c) => String(c.userId) === String(uid));
    if (!rec) return res.status(404).json({ error: "Cart not found" });
    
    const idx = (rec.items || []).findIndex((it) => String(it.itemId) === String(itemId));
    if (idx === -1) return res.status(404).json({ error: "Item not in cart" });
    
    if (q === 0) {
      rec.items.splice(idx, 1);
    } else {
      rec.items[idx].qty = q;
    }
    
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
 */
exports.removeItem = async (req, res) => {
  try {
    const uid = req.user && req.user.id;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    
    const { itemId } = req.body || {};
    if (!itemId) return res.status(400).json({ error: "itemId required" });

    if (usingMongo() && CartModel) {
      let cart = await CartModel.findOne({ userId: uid });
      if (!cart) return res.status(404).json({ error: "Cart not found" });
      
      cart.items = (cart.items || []).filter((it) => String(it.itemId) !== String(itemId));
      cart.updatedAt = new Date();
      await cart.save();
      return res.json({ status: 200, data: { ok: true, items: cart.items } });
    }

    const db = await load();
    db.carts = Array.isArray(db.carts) ? db.carts : [];
    
    // 🔥 Find cart for THIS user only
    const rec = db.carts.find((c) => String(c.userId) === String(uid));
    if (!rec) return res.status(404).json({ error: "Cart not found" });
    
    rec.items = (rec.items || []).filter((it) => String(it.itemId) !== String(itemId));
    rec.updatedAt = new Date().toISOString();
    await save(db);
    return res.json({ status: 200, data: { ok: true, items: rec.items } });
  } catch (err) {
    console.error("[CART] removeItem error:", err && err.message);
    return res.status(500).json({ error: "Failed to remove from cart" });
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
      let cart = await CartModel.findOne({ userId: uid });
      if (cart) {
        cart.items = [];
        cart.updatedAt = new Date();
        await cart.save();
      }
      return res.json({ status: 200, data: { ok: true } });
    }

    const db = await load();
    db.carts = Array.isArray(db.carts) ? db.carts : [];
    
    // 🔥 Find cart for THIS user only
    const rec = db.carts.find((c) => String(c.userId) === String(uid));
    if (rec) {
      rec.items = [];
      rec.updatedAt = new Date().toISOString();
    }
    await save(db);
    return res.json({ status: 200, data: { ok: true } });
  } catch (err) {
    console.error("[CART] clear error:", err && err.message);
    return res.status(500).json({ error: "Failed to clear cart" });
  }
};