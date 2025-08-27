const bcrypt = require("bcryptjs");
const { load, save } = require("../lib/db");
const { sign } = require("../lib/auth");

exports.register = (req, res) => {
  const { name, email, password, grade = "", section = "" } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" });

  const db = load();
  if (db.users.some(u => u.email === email)) return res.status(400).json({ error: "Email already used" });

  db.users.push({
    id: "usr_" + Date.now().toString(36),
    name, email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: "student",
    grade, section,
    balance: 0
  });
  save(db);
  res.json({ ok: true });
};

exports.login = (req, res) => {
  const { email, password } = req.body || {};
  const db = load();
  const u = db.users.find(x => x.email === email);
  if (!u) return res.status(401).json({ error: "Invalid credentials" });
  // Support legacy records where a plain `password` field was stored.
  if (u.passwordHash) {
    if (!bcrypt.compareSync(password, u.passwordHash)) return res.status(401).json({ error: "Invalid credentials" });
  } else if (u.password) {
    // verify plain password then migrate to hashed password
    if (password !== u.password) return res.status(401).json({ error: "Invalid credentials" });
    u.passwordHash = bcrypt.hashSync(password, 10);
    delete u.password;
    save(db);
  } else {
    // no password info available
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = sign({ id: u.id, role: u.role });
  const user = { id: u.id, name: u.name, role: u.role, grade: u.grade, section: u.section, balance: u.balance };
  res.json({ token, user });
};

exports.me = (req, res) => {
  const db = load();
  const u = db.users.find(x => x.id === req.user.id);
  if (!u) return res.status(404).json({ error: "Not found" });
  res.json({ id: u.id, name: u.name, role: u.role, grade: u.grade, section: u.section, balance: u.balance });
};
