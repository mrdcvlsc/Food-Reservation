const { load, save } = require("../lib/db");
const Notifications = require("./notifications.controller");

exports.create = (req, res) => {
  // multer may attach a file and may also raise a MulterError which is handled
  // by Express' error middleware; however, in some setups multer errors
  // surface here as `req.fileValidationError` or thrown. We'll defensively
  // check for common multer overflow case and return a 413.
  if (req.file && req.file.size && req.file.size > 8 * 1024 * 1024) {
    console.log('[TOPUP] Create: uploaded file too large');
    return res.status(413).json({ error: 'Uploaded file too large (limit 8MB).' });
  }
  const { amount, reference = "", provider } = req.body || {};
  const method = provider || req.body.method || 'gcash';
  const amt = Number(amount);
  if (!amt || amt <= 0) {
    console.log('[TOPUP] Create: invalid amount');
    return res.status(400).json({ error: "Invalid amount" });
  }

  const db = load();
  const now = new Date().toISOString();
  const users = Array.isArray(db.users) ? db.users : [];
  const owner = users.find((u) => String(u.id) === String(req.user.id)) || {};

  const studentName = req.body.payerName || owner.name || "—";
  // prefer provided studentId but fallback to owner's studentId if present
  const submittedStudentId = (req?.body?.studentId && String(req.body.studentId).trim()) || owner.studentId || "N/A";

  const topup = {
    id: "top_" + Date.now().toString(36),
    userId: req.user.id,
    student: studentName,
    studentId: submittedStudentId,
    contact: (req?.body?.contact) ? req.body.contact : (owner.phone || 'N/A'),
    email: (req?.body?.email) ? req.body.email : (owner.email || 'N/A'),
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

  // Notify admins about new top-up
  try {
    Notifications.addNotification({
      id: "notif_" + Date.now().toString(36),
      for: "admin",
      actor: req.user && req.user.id,
      type: "topup:created",
      title: "New top-up submitted",
      body: `${topup.student || req.user?.name || req.user?.email || req.user?.id} requested ₱${topup.amount}`,
      data: { topupId: topup.id },
      read: false,
      createdAt: topup.createdAt || new Date().toISOString(),
    });
  } catch (e) {
    console.error("Notification publish failed", e && e.message);
  }

  res.json(topup);
};

exports.mine = (req, res) => {
  const db = load();
  const rows = db.topups.filter(t => t.userId === req.user.id);
  console.log('[TOPUP] Mine: returning', rows.length, 'topups for user', req.user && req.user.id);
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
  console.log('[TOPUP] ListAdmin: returning', topups.length, 'topups');
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
  // Notify student of topup status change
  try {
    const target = db.topups[i];
    if (target && target.userId) {
      Notifications.addNotification({
        id: "notif_" + Date.now().toString(36),
        for: target.userId,
        actor: req.user && req.user.id,
        type: "topup:status",
        title: `Top-up ${target.id} ${target.status}`,
        body: `Your top-up ${target.id} was ${target.status}`,
        data: { topupId: target.id, status: target.status },
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error("Notification publish failed", e && e.message);
  }
  res.json(db.topups[i]);
};
