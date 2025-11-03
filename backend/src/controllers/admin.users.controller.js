const { load, save } = require("../lib/db");
const path = require("path");
const crypto = require("crypto");
const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

// GET /admin/users
exports.list = async (req, res) => {
  try {
    // prefer Mongo if available
    const mongoose = require("mongoose");
    if (mongoose && mongoose.connection && mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      const users = await db.collection("users").find({}, {
        projection: { password: 0, passwordHash: 0, salt: 0 } // never expose secrets
      }).toArray();
      const safe = users.map(u => ({
        id: u.id || u._id,
        name: u.name,
        email: u.email,
        role: u.role || "student",
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        passwordSet: !!(u.passwordHash || u.password),
        studentId: u.studentId || null,
      }));
      return res.json(safe);
    }

    // file-db fallback
    const db = await load();
    const users = Array.isArray(db.users) ? db.users : [];
    const safe = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role || "student",
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      passwordSet: !!(u.passwordHash || u.password),
      studentId: u.studentId || null,
    }));
    res.json(safe);
  } catch (err) {
    console.error("[ADMIN.USERS] list error:", err);
    res.status(500).json({ error: "Failed to list users" });
  }
};

// POST /admin/users/:id/reset-token  -> generate one-time reset token
exports.generateResetToken = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing user id" });

    // generate token
    const token = crypto.randomBytes(20).toString("hex");
    const expiresAt = Date.now() + TOKEN_TTL_MS;

    // persist in file-db or Mongo
    const mongoose = require("mongoose");
    if (mongoose && mongoose.connection && mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      const usersCol = db.collection("users");
      const updated = await usersCol.findOneAndUpdate(
        { $or: [{ id }, { _id: id }] },
        { $set: { resetToken: token, resetTokenExpiresAt: new Date(expiresAt).toISOString() } }
      );
      if (!updated.value) return res.status(404).json({ error: "User not found" });
      return res.json({ ok: true, token, expiresAt });
    }

    const db = await load();
    db.users = db.users || [];
    const u = db.users.find(u => String(u.id) === String(id) || String(u._id) === String(id));
    if (!u) return res.status(404).json({ error: "User not found" });
    u.resetToken = token;
    u.resetTokenExpiresAt = new Date(expiresAt).toISOString();
    await save(db);
    res.json({ ok: true, token, expiresAt });
  } catch (err) {
    console.error("[ADMIN.USERS] reset token error:", err);
    res.status(500).json({ error: "Failed to generate reset token" });
  }
};