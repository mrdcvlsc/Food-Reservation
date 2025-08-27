// migrate-json-to-mongo.js
// Usage: set MONGO_URI and run: node migrate-json-to-mongo.js

const fs = require('fs');
const path = require('path');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set');
    process.exit(2);
  }

  const mongoose = require('mongoose');
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  console.log('Connected to MongoDB');

  const file = path.join(__dirname, 'src', 'data', 'db.json');
  if (!fs.existsSync(file)) {
    console.error('db.json not found at', file);
    process.exit(2);
  }

  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));

  // Collections: menu, reservations, topups, users, transactions
  const colNames = ['menu', 'reservations', 'topups', 'users', 'transactions'];

  for (const name of colNames) {
    const col = db.collection(name);
    await col.deleteMany({});
    const docs = Array.isArray(raw[name]) ? raw[name] : [];
    if (docs.length) {
      // ensure _id does not exist
      const clean = docs.map(d => { const c = { ...d }; delete c._id; return c; });
      await col.insertMany(clean);
      console.log(`Inserted ${clean.length} into ${name}`);
    } else {
      console.log(`No documents for ${name}`);
    }
  }

  console.log('Migration complete');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
