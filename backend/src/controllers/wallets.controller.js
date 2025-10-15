// server/src/controllers/wallets.controller.js
const path = require('path');
const fs = require('fs-extra');
const { load, save } = require('../lib/db');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.ensureDirSync(UPLOAD_DIR);

function safeName(name = '') {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Public: list active wallets
exports.list = async (req, res) => {
  const db = await load();
  const wallets = Array.isArray(db.wallets)
    ? db.wallets.filter(w => w.active !== false)
    : [];
  console.log('[WALLET] List: returning', wallets.length, 'wallets');
  res.json(wallets);
};

// Public: get one by provider (e.g., "gcash", "maya")
exports.getOne = async (req, res) => {
  const provider = String(req.params.provider || '').trim().toLowerCase();
  if (!provider) {
    console.log('[WALLET] GetOne: missing provider');
    return res.status(400).json({ error: 'Missing provider' });
  }

  const db = await load();
  const list = Array.isArray(db.wallets) ? db.wallets : [];
  const found = list.find(w => String(w.provider).toLowerCase() === provider);

  if (!found || found.active === false) {
    console.log('[WALLET] GetOne: wallet not found', provider);
    return res.status(404).json({ error: 'Wallet not found' });
  }
  console.log('[WALLET] GetOne: wallet found', provider);
  res.json(found);
};

// Authenticated: return current user's wallet/balance information
exports.me = async (req, res) => {
  try {
    const db = await load();
    const uid = req.user && req.user.id;
    if (!uid) {
      console.log('[WALLET] Me: unauthorized');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = (db.users || []).find((u) => String(u.id) === String(uid));
    if (!user) {
      console.log('[WALLET] Me: user not found', uid);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('[WALLET] Me: returning wallet for user', uid);
    return res.json({ balance: Number(user.balance) || 0, id: user.id, name: user.name, email: user.email });
  } catch (e) {
    console.error(e);
  console.log('[WALLET] Me: failed to load wallet', e.message);
  res.status(500).json({ error: 'Failed to load wallet' });
  }
};

// Admin: add/update wallet with optional qr image (req.file provided by multer)
exports.upsert = async (req, res) => {
  const provider =
    (req.params && req.params.provider) ||
    (req.body && req.body.provider);
  if (!provider) return res.status(400).json({ error: 'Missing provider' });

  const db = await load();
  db.wallets = Array.isArray(db.wallets) ? db.wallets : [];

  const key = String(provider).toLowerCase();
  let existing = db.wallets.find(
    w => String(w.provider).toLowerCase() === key
  );

  // Save QR file if provided
  let qrUrl = existing ? existing.qrImageUrl : '';
  if (req.file) {
    // multer may have written the file to disk (diskStorage) -> req.file.path/filename
    // or provided a buffer (memoryStorage) -> req.file.buffer
    if (req.file.path || req.file.filename) {
      // file already saved by multer into uploads directory
      const filename = req.file.filename || path.basename(req.file.path);
      // ensure file is inside our uploads dir; if not, move it
      const current = req.file.path || path.join(UPLOAD_DIR, filename);
      const dest = path.join(UPLOAD_DIR, filename);
      if (current !== dest) {
        await fs.move(current, dest, { overwrite: true });
      }
      qrUrl = `/uploads/${filename}`;
    } else if (req.file.buffer) {
      const ext = (req.file.mimetype || '').split('/').pop() || 'png';
      const filename = `${Date.now()}_${safeName(provider)}.${ext}`;
      const dest = path.join(UPLOAD_DIR, filename);
      await fs.writeFile(dest, req.file.buffer);
      qrUrl = `/uploads/${filename}`;
    }
  }

  const payload = {
    provider: key,
    accountName:
      (req.body && req.body.accountName) ||
      (existing && existing.accountName) ||
      '',
    mobile:
      (req.body && req.body.mobile) ||
      (existing && existing.mobile) ||
      '',
    reference:
      (req.body && req.body.reference) ||
      (existing && existing.reference) ||
      '',
    qrImageUrl: qrUrl,
    active:
      req.body && Object.prototype.hasOwnProperty.call(req.body, 'active')
        ? (req.body.active === 'true' || req.body.active === true)
        : (existing ? existing.active : true),
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    db.wallets.push({
      ...payload,
      createdAt: new Date().toISOString(),
    });
    existing = payload;
  }

  await save(db);
  res.json(existing);
};

// Authenticated: charge the current user's wallet for a reservation or other ref
exports.charge = async (req, res) => {
  try {
    const db = await load();
    const uid = req.user && req.user.id;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const { amount, refType, refId } = req.body || {};
    const amt = Number(amount || 0);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

    db.transactions = Array.isArray(db.transactions) ? db.transactions : [];

    // Idempotent: if a transaction already exists for this refId+refType, return it
    if (refId) {
      const exists = db.transactions.find(
        (t) => String(t.ref || t.refId || t.reference) === String(refId) && String(t.type || t.refType || '') === String(refType || '')
      );
      if (exists) return res.json({ transaction: exists });
    }

    const user = (db.users || []).find((u) => String(u.id) === String(uid));
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (typeof user.balance !== 'number') user.balance = Number(user.balance) || 0;

    // Ensure sufficient balance
    if (user.balance < amt) return res.status(400).json({ error: 'Insufficient balance' });

    user.balance = Number(user.balance) - amt;

    const txId = `txn_${Date.now().toString(36)}`;
    const tx = {
      id: txId,
      userId: user.id,
      type: refType || 'Reservation',
      amount: amt,
      ref: refId || null,
      createdAt: new Date().toISOString(),
      status: 'Success',
    };
    db.transactions.push(tx);

    await save(db);
    return res.json({ transaction: tx, balance: user.balance });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to charge wallet' });
  }
};
