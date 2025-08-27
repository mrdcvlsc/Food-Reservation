const { load, save } = require("./db");
const bcrypt = require("bcryptjs");

async function ensureSeed() {
  const db = load() || {};

  db.users = Array.isArray(db.users) ? db.users : [];
  db.menu = Array.isArray(db.menu) ? db.menu : [];
  db.reservations = Array.isArray(db.reservations) ? db.reservations : [];
  db.topups = Array.isArray(db.topups) ? db.topups : [];
  db.transactions = Array.isArray(db.transactions) ? db.transactions : [];

  const adminEmail = "admin@school.test";
  let admin = db.users.find(u => u.email === adminEmail);

  if (!admin) {
    admin = {
      id: 1,
      name: "Admin",
      email: adminEmail,
      role: "admin",
      balance: 0,
      passwordHash: bcrypt.hashSync("admin123", 10),
    };
    db.users.push(admin);
    console.log("Seed: created default admin user.");
  } else if (!admin.passwordHash) {
    // Migrate legacy plain password to hashed
    const plain = admin.password || "admin123";
    admin.passwordHash = bcrypt.hashSync(plain, 10);
    delete admin.password;
    console.log("Seed: migrated admin password to hashed.");
  }

  save(db);
  return Promise.resolve();
}

module.exports.ensureSeed = ensureSeed;
