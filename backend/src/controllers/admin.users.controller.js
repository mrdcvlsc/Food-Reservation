const path = require('path');
const fs = require('fs-extra');
const { load, save } = require('../lib/db');
const Notifications = require('./notifications.controller');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.ensureDirSync(UPLOAD_DIR);

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
        phone: u.phone || null,
        profilePictureUrl: u.profilePictureUrl || null // Add this line
      }));
      return res.json(safe);
    }

    // file-db fallback
    const db = await load();
    const users = Array.isArray(db.users) ? db.users : [];
    console.log("Second element:", users[1]);
    const safe = users.map(u => ({
      balance: u.balance,
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role || "student",
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      passwordSet: !!(u.passwordHash || u.password),
      studentId: u.studentId || null,
      phone: u.phone || null,
      profilePictureUrl: u.profilePictureUrl || null // Add this line
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

// PUT /admin/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = load();
    const userIndex = db.users.findIndex(u => String(u.id) === String(id));

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = db.users[userIndex];
    const { name, studentId, phone, removePhoto, note } = req.body;

    // Validate student ID uniqueness
    if (studentId && studentId !== user.studentId) {
      const exists = db.users.some(u => 
        String(u.id) !== String(id) && 
        String(u.studentId) === String(studentId)
      );
      if (exists) {
        return res.status(409).json({ error: 'Student ID already in use' });
      }
    }

    // Update basic info
    if (name) user.name = name;
    if (studentId) user.studentId = studentId;
    if (phone) user.phone = phone;

    // Handle profile picture
    if (removePhoto === 'true') {
      if (user.profilePictureUrl) {
        const filePath = path.join(UPLOAD_DIR, path.basename(user.profilePictureUrl));
        try {
          await fs.unlink(filePath);
        } catch (err) {
          console.error('Failed to delete profile picture:', err);
        }
        user.profilePictureUrl = null;
      }
    } else if (req.file) {
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `profile-${user.id}-${Date.now()}${ext}`;
      const filePath = path.join(UPLOAD_DIR, filename);

      // Delete old photo if exists
      if (user.profilePictureUrl) {
        const oldPath = path.join(UPLOAD_DIR, path.basename(user.profilePictureUrl));
        try {
          await fs.unlink(oldPath);
        } catch (err) {
          console.error('Failed to delete old profile picture:', err);
        }
      }

      // Save new photo
      await fs.writeFile(filePath, req.file.buffer);
      user.profilePictureUrl = `/uploads/${filename}`;
    }

    user.updatedAt = new Date().toISOString();
    db.users[userIndex] = user;
    save(db);

    // If admin left a note, notify the user
    if (note && String(note).trim()) {
      try {
        Notifications.addNotification({
          id: "notif_" + Date.now().toString(36),
          for: user.id,
          actor: req.user?.id || 'admin',
          type: 'admin:profile-note',
          title: 'Message from Admin',
          body: String(note),
          data: { note: String(note) },
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Failed to create admin-note notification:", e && e.message);
      }
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        phone: user.phone,
        profilePictureUrl: user.profilePictureUrl,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Update user failed:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};