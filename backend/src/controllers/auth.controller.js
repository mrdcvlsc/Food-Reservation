const bcrypt = require("bcryptjs");
const { load, save } = require("../lib/db");
const { sign } = require("../lib/auth");
const Notifications = require("./notifications.controller");
const path = require("path");
const fs = require("fs-extra");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.ensureDirSync(UPLOAD_DIR);

// Helper to save profile picture
function saveProfilePicture(file, userId) {
  if (!file || !file.buffer) return null;
  const ext = path.extname(file.originalname) || '.jpg';
  const filename = `${userId}-${Date.now()}${ext}`;
  const outPath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(outPath, file.buffer);
  return `/uploads/${filename}`;
}

exports.me = (req, res) => {
  const db = load();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  const { passwordHash, ...safeUser } = user;
  res.json({ status: 200, data: safeUser });
};

exports.register = (req, res) => {
  console.log('[AUTH] Register endpoint called');
  const { name, email, password, grade = "", section = "", studentId, phone } = req.body || {};
  
  console.log('[AUTH] Registration attempt:', { 
    name: name ? 'provided' : 'missing', 
    email: email ? 'provided' : 'missing', 
    password: password ? 'provided' : 'missing',
    grade, section, phone: phone ? 'provided' : 'missing'
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

  // require phone (basic validation: digits, +, spaces, dashes, parentheses)
  if (!phone || !/^[\d+\-\s\(\)]+$/.test(String(phone).trim())) {
    console.log('[AUTH] Registration failed: Invalid or missing phone');
    return res.status(400).json({ error: "Contact number is required and must be a valid phone string" });
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
    studentId: String(studentId).trim(),
    phone: String(phone).trim(),
    createdAt: new Date().toISOString()
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
  
  // Send notification to admin about new registration
  try {
    Notifications.addNotification({
      id: "notif_" + Date.now().toString(36),
      for: "admin",
      actor: null, // System notification
      type: "student:registered",
      title: `New Student Registration: ${name}`,
      body: `A new student account has been created.\n\nName: ${name}\nStudent ID: ${String(studentId).trim()}\nEmail: ${email}\nPhone: ${String(phone).trim()}`,
      data: {
        userId: newUser.id,
        studentName: name,
        studentId: String(studentId).trim(),
        email: email,
        phone: String(phone).trim(),
        grade: grade || "",
        section: section || ""
      },
      read: false,
      createdAt: new Date().toISOString()
    });
    console.log('[AUTH] Admin notification sent for new registration:', newUser.id);
  } catch (err) {
    console.error('[AUTH] Failed to send admin notification:', err && err.message);
  }
  
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
  // include studentId and phone so frontend can auto-fill it
  const user = {
    id: u.id,
    name: u.name,
    role: u.role,
    grade: u.grade,
    section: u.section,
    balance: u.balance,
    studentId: u.studentId || null,
    phone: u.phone || null
  };
  res.json({ status: 200, data: { token, user } });
};

// Add new PATCH endpoint for profile updates
exports.updateProfile = async (req, res) => {
  try {
    const db = load();
    const uid = req.user && req.user.id;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const users = Array.isArray(db.users) ? db.users : [];
    const idx = users.findIndex(u => String(u.id) === String(uid));
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const user = users[idx];
    const { name, email, studentId, phone } = req.body || {};

    // Update fields if provided
    if (typeof name === 'string' && name.trim()) user.name = name.trim();
    if (typeof email === 'string' && email.trim()) {
      // Check email uniqueness (except self)
      if (users.some(u => u.id !== uid && u.email === email.trim())) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      user.email = email.trim();
    }
    if (typeof studentId === 'string' && studentId.trim()) {
      if (!/^\d+$/.test(studentId.trim())) {
        return res.status(400).json({ error: 'Student ID must contain only digits' });
      }
      // Check studentId uniqueness (except self)
      if (users.some(u => u.id !== uid && String(u.studentId) === studentId.trim())) {
        return res.status(409).json({ error: 'Student ID already in use' });
      }
      user.studentId = studentId.trim();
    }
    if (typeof phone === 'string' && phone.trim()) {
      if (!/^[\d+\-\s\(\)]+$/.test(phone.trim())) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }
      user.phone = phone.trim();
    }

    // Handle profile picture upload if present
    if (req.file) {
      const pictureUrl = saveProfilePicture(req.file, user.id);
      if (pictureUrl) user.profilePictureUrl = pictureUrl;
    }

    user.updatedAt = new Date().toISOString();
    users[idx] = user;
    db.users = users;
    save(db);

    return res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        phone: user.phone || null,
        profilePictureUrl: user.profilePictureUrl || null,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    console.error('[AUTH] updateProfile failed:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};
