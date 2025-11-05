const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}
function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

/**
 * POST /api/auth/change-password
 * body: { email, currentPassword, newPassword }
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { email, currentPassword, newPassword } = req.body || {};
    if (!email || !newPassword) return res.status(400).json({ error: "Missing email or newPassword" });

    const db = readDb();
    const users = db.users || [];
    const uidx = users.findIndex((u) => String(u.email || u.username || u.user || "").toLowerCase() === String(email).toLowerCase());
    if (uidx === -1) return res.status(404).json({ error: "User not found" });

    const user = users[uidx];

    // If user stores bcrypt hash
    if (user.passwordHash) {
      const ok = await bcrypt.compare(String(currentPassword || ""), String(user.passwordHash || ""));
      if (!ok) return res.status(401).json({ error: "Invalid current password" });

      // prevent using the same password again
      if (String(currentPassword || "") === String(newPassword || "")) {
        return res.status(400).json({ error: "New password must be different from current password" });
      }

      const newHash = await bcrypt.hash(String(newPassword), 10);
      users[uidx].passwordHash = newHash;
      // optional: remove plain password field if exists
      if (users[uidx].password) delete users[uidx].password;
      writeDb(db);
      return res.json({ ok: true });
    }

    // If user stores plain text password
    if (user.password !== undefined) {
      if (String(user.password) !== String(currentPassword)) return res.status(401).json({ error: "Invalid current password" });

      // prevent using the same password again
      if (String(currentPassword || "") === String(newPassword || "")) {
        return res.status(400).json({ error: "New password must be different from current password" });
      }

      // keep plain password field (or hash it)
      users[uidx].password = String(newPassword);
      writeDb(db);
      return res.json({ ok: true });
    }

    // If no password fields: allow set (only if currentPassword omitted)
    // This is permissive; change as needed for your app security.
    if (!currentPassword) {
      users[uidx].password = String(newPassword);
      writeDb(db);
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: "Unable to change password" });
  } catch (err) {
    next(err);
  }
};