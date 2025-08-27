const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "dev_secret_key";

function sign(user) {
  return jwt.sign(
    { id: user.id, role: user.role || "user", name: user.name },
    SECRET,
    { expiresIn: "7d" }
  );
}

function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role === "admin") return next();
  return res.status(403).json({ error: "Forbidden" });
}

module.exports = { sign, requireAuth, requireAdmin };
