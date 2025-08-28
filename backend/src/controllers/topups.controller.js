const { load, save } = require("../lib/db");

exports.create = (req, res) => {
  const { amount, reference = "", provider } = req.body || {};
  const method = provider || req.body.method || 'gcash';
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: "Invalid amount" });

  const db = load();
  const now = new Date().toISOString();
  // Derive a human-friendly student name from the users table when possible
  const users = Array.isArray(db.users) ? db.users : [];
  const owner = users.find((u) => String(u.id) === String(req.user.id)) || {};
  const studentName = owner.name || owner.email || req.user.name || req.user.email || req.user.id;

  const topup = {
    id: "top_" + Date.now().toString(36),
    userId: req.user.id,
    student: studentName,
    provider: method,
    amount: amt,
    reference,
    status: "Pending",
    proofUrl: req.file ? (req.file.filename ? `/uploads/${req.file.filename}` : (req.file.path || null)) : null,
    submittedAt: now,
    createdAt: now
  };
  db.topups = Array.isArray(db.topups) ? db.topups : [];
  db.topups.push(topup);
  save(db);
  res.json(topup);
};

exports.mine = (req, res) => {
  const db = load();
  const rows = db.topups.filter(t => t.userId === req.user.id);
  res.json(rows);
};

// Admin: list all topups
exports.listAdmin = (req, res) => {
  const db = load();
  const users = Array.isArray(db.users) ? db.users : [];
  const topups = (Array.isArray(db.topups) ? db.topups : []).map((t) => {
    const u = users.find((x) => String(x.id) === String(t.userId));
    return {
      ...t,
      // prefer user's full name or email when available for admin display
      student: (u && (u.name || u.email)) || t.student || t.userId,
    };
  });
  res.json(topups);
};

// Admin: set status for a topup (Approved|Rejected)
exports.setStatus = (req, res) => {
  const { id } = req.params || {};
  const { status } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Missing id' });
  if (!status) return res.status(400).json({ error: 'Missing status' });

  const db = load();
  const i = (db.topups || []).findIndex(t => String(t.id) === String(id));
  if (i === -1) return res.status(404).json({ error: 'Not found' });

  const prev = db.topups[i].status;
  const now = new Date().toISOString();
  db.topups[i].status = status;
  db.topups[i].updatedAt = now;

  // If moving into Approved from a non-approved state, credit user's balance and add a transaction.
  // Make this idempotent: skip if we've already recorded a transaction for this topup.
  const newStatus = String(status || '').toLowerCase();
  const prevStatus = String(prev || '').toLowerCase();
  if (newStatus === 'approved' && prevStatus !== 'approved') {
    const userId = db.topups[i].userId;
    const amount = Number(db.topups[i].amount) || 0;
    if (amount > 0 && userId) {
      db.users = Array.isArray(db.users) ? db.users : [];
      const uidx = db.users.findIndex((x) => String(x.id) === String(userId));
      if (uidx !== -1) {
        db.transactions = Array.isArray(db.transactions) ? db.transactions : [];
        const already = db.transactions.some(t => String(t.topupId) === String(db.topups[i].id) && t.type === 'TopUp');
        if (!already) {
          // ensure numeric balance
          db.users[uidx].balance = Number(db.users[uidx].balance || 0) + amount;

          // record a transaction (link to topup to make it idempotent)
          const txn = {
            id: 'txn_' + Date.now().toString(36),
            userId: userId,
            type: 'TopUp',
            amount: amount,
            reference: db.topups[i].reference || null,
            topupId: db.topups[i].id,
            createdAt: now
          };
          db.transactions.push(txn);

          // mark topup as credited so UI / future logic can inspect it
          db.topups[i].credited = true;
          db.topups[i].creditedAt = now;
        }
      }
    }
  }

  save(db);
  res.json(db.topups[i]);
};
