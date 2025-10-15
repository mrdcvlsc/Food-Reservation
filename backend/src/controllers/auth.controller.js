const bcrypt = require("bcryptjs");
const { load, save } = require("../lib/db");
const { sign } = require("../lib/auth");

exports.register = (req, res) => {
  console.log('[AUTH] Register endpoint called');
  const { name, email, password, grade = "", section = "" } = req.body || {};
  
  console.log('[AUTH] Registration attempt:', { 
    name: name ? 'provided' : 'missing', 
    email: email ? 'provided' : 'missing', 
    password: password ? 'provided' : 'missing',
    grade, 
    section 
  });
  
    if (!name || !email || !password) {
      console.log('[AUTH] Registration failed: Missing required fields');
      return res.status(400).json({ error: "Missing fields" });
    }

  console.log('[AUTH] Loading database...');
  const db = load();
  console.log('[AUTH] Database loaded, current users count:', db.users?.length || 0);
  
    if (db.users.some(u => u.email === email)) {
      console.log('[AUTH] Registration failed: Email already exists');
      return res.status(409).json({ error: "Email already used" });
    }

  const newUser = {
    id: "usr_" + Date.now().toString(36),
    name, email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: "student",
    grade, section,
    balance: 0
  };
  
  console.log('[AUTH] Creating new user:', { 
    id: newUser.id, 
    name: newUser.name, 
    email: newUser.email, 
    role: newUser.role 
  });
  
  db.users.push(newUser);
  
  console.log('[AUTH] Saving database...');
  save(db);
    console.log('[AUTH] Registration successful for user:', newUser.id);
  
  res.json({ ok: true });
};

exports.login = (req, res) => {
  console.log('[AUTH] Login endpoint called');
  const { email, password } = req.body || {};
  
  console.log('[AUTH] Login attempt for email:', email ? 'provided' : 'missing');
  
  const db = load();
  const u = db.users.find(x => x.email === email);
  
    if (!u) {
      console.log('[AUTH] Login failed: User not found');
      return res.status(401).json({ error: "Invalid credentials" });
    }
  
  console.log('[AUTH] User found:', { id: u.id, name: u.name, role: u.role });
  
  // Support legacy records where a plain `password` field was stored.
  if (u.passwordHash) {
    console.log('[AUTH] Checking hashed password...');
      if (!bcrypt.compareSync(password, u.passwordHash)) {
        console.log('[AUTH] Login failed: Invalid password');
        return res.status(401).json({ error: "Invalid credentials" });
      }
  } else if (u.password) {
    console.log('[AUTH] Checking plain password and migrating to hash...');
    if (password !== u.password) {
      console.log('[AUTH] Login failed: Invalid password');
      return res.status(401).json({ error: "Invalid credentials" });
    }
    u.passwordHash = bcrypt.hashSync(password, 10);
    delete u.password;
    save(db);
    console.log('[AUTH] Password migrated to hash');
  } else {
    console.log('[AUTH] Login failed: No password info available');
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  const token = sign({ id: u.id, role: u.role });
  const user = { id: u.id, name: u.name, role: u.role, grade: u.grade, section: u.section, balance: u.balance };
  
    console.log('[AUTH] Login successful for user:', u.id);
  res.json({ token, user });
};

exports.me = (req, res) => {
  const db = load();
  const u = db.users.find(x => x.id === req.user.id);
    if (!u) {
      console.log('[AUTH] Get profile: user not found', req.user && req.user.id);
      return res.status(404).json({ error: "Not found" });
    }
    console.log('[AUTH] Get profile: success', u.id);
    res.json({ id: u.id, name: u.name, role: u.role, grade: u.grade, section: u.section, balance: u.balance });
};
