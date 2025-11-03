const bcrypt = require("bcryptjs");
const { load, save } = require("../lib/db");
const { sign } = require("../lib/auth");

exports.register = (req, res) => {
  console.log('[AUTH] Register endpoint called');
  const { name, email, password, grade = "", section = "", studentId } = req.body || {};
  
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

  // require studentId and validate digits-only (whole number)
  if (!studentId || !/^\d+$/.test(String(studentId).trim())) {
    console.log('[AUTH] Registration failed: Invalid or missing studentId');
    return res.status(400).json({ error: "studentId is required and must contain only digits" });
  }
  
  console.log('[AUTH] Loading database...');
  const db = load();
  console.log('[AUTH] Database loaded, current users count:', db.users?.length || 0);
  
    if (db.users.some(u => u.email === email)) {
      console.log('[AUTH] Registration failed: Email already exists');
      return res.status(409).json({ error: "Email already used" });
    }
  // ensure studentId uniqueness
  if (db.users.some(u => u.studentId === String(studentId).trim())) {
    console.log('[AUTH] Registration failed: studentId already exists');
    return res.status(409).json({ error: "studentId already used" });
  }

  const newUser = {
    id: "usr_" + Date.now().toString(36),
    name, email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: "student",
    grade, section,
    balance: 0,
    studentId: String(studentId).trim()
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
  const { email, password } = req.body || {};
  const db = load();
  const u = db.users.find(x => x.email === email);
  if (!u) return res.status(401).json({ error: "Invalid credentials" });

  // password check (existing logic)
  if (u.passwordHash) {
    if (!bcrypt.compareSync(password, u.passwordHash)) return res.status(401).json({ error: "Invalid credentials" });
  } else if (u.password) {
    if (password !== u.password) return res.status(401).json({ error: "Invalid credentials" });
    u.passwordHash = bcrypt.hashSync(password, 10);
    delete u.password;
    save(db);
  } else {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = sign({ id: u.id, role: u.role });
  // include studentId so frontend can auto-fill it
  const user = {
    id: u.id,
    name: u.name,
    role: u.role,
    grade: u.grade,
    section: u.section,
    balance: u.balance,
    studentId: u.studentId || null
  };
  res.json({ token, user });
};

exports.me = (req, res) => {
  const db = load();
  const u = db.users.find(x => x.id === req.user.id);
  if (!u) return res.status(404).json({ error: "Not found" });
  // return studentId as well
  res.json({
    id: u.id,
    name: u.name,
    role: u.role,
    grade: u.grade,
    section: u.section,
    balance: u.balance,
    studentId: u.studentId || null
  });
};
