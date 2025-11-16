// backend/src/controllers/reservations.controller.js
const { load, save, nextId: libNextId } = require("../lib/db");
const Notifications = require("./notifications.controller");

/**
 * fallback nextId generator (used when lib/db does not export nextId)
 */
function nextId(arr, prefix = "ID") {
  if (typeof libNextId === "function") {
    try { return libNextId(arr, prefix); } catch (e) { /* fallthrough to fallback */ }
  }
  // simple, collision-resistant id: PREFIX_ + base36(timestamp) + random3
  const ts = Date.now().toString(36);
  const rnd = Math.floor(Math.random() * 900 + 100).toString(36);
  return `${String(prefix).toUpperCase()}_${ts}${rnd}`;
}

/**
 * POST /api/reservations
 * Create a reservation (Pending). Validate items and total but do NOT
 * deduct stock or charge wallet here. That happens when admin approves.
 */
exports.create = async (req, res) => {
  try {
    const db = await load();
    const {
      items = [],
      grade = "",
      section = "",
      slot = "",
      note = "",
      student = "",
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      console.log('[RESERVATION] Create: no items');
      return res.status(400).json({ error: "No items" });
    }
    if (!slot) {
      console.log('[RESERVATION] Create: missing pickup slot');
      return res.status(400).json({ error: "Missing pickup slot" });
    }

    const user = db.users.find(x => x.id === req?.user.id);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Validate and normalize items
    const normalized = [];
    for (const it of items) {
      const { id, qty } = it || {};

      let m = (db.menu || []).find((x) => String(x.id) === String(id));
      if (!m) {
        const incoming = String(id || "").trim();
        const incomingSuffix = incoming.split("-").pop();
        m = (db.menu || []).find((x) => {
          const sid = String(x.id || "").trim();
          const sfx = sid.split("-").pop();
          return (sfx && incomingSuffix && sfx === incomingSuffix) || sid === incoming;
        });
      }
      if (!m) {
        console.log('[RESERVATION] Create: item not found', id);
        return res.status(400).json({ error: `Item ${id} not found` });
      }

      const q = Number(qty) || 0;
      if (q <= 0) {
        console.log('[RESERVATION] Create: invalid quantity', id);
        return res.status(400).json({ error: "Invalid quantity" });
      }

      if (typeof m.stock === "number" && m.stock < 0) {
        console.log('[RESERVATION] Create: invalid stock', m.name);
        return res.status(400).json({ error: `Invalid stock for ${m.name}` });
      }

      normalized.push({
        id: m.id,
        name: m.name,
        price: Number(m.price) || 0,
        qty: q,
      });
    }

    const total = normalized.reduce((s, r) => s + r.price * r.qty, 0);

    // **CHECK WALLET BALANCE BEFORE CREATING RESERVATION**
    user.balance = Number(user.balance) || 0;
    if (user.balance < total) {
      return res.status(400).json({ error: "Insufficient balance. Please top-up first." });
    }

    // **DEDUCT WALLET IMMEDIATELY**
    user.balance -= total;

    // **DEDUCT STOCK IMMEDIATELY**
    for (const it of normalized) {
      const menuItem = (db.menu || []).find(m => String(m.id) === String(it.id));
      if (menuItem && typeof menuItem.stock === "number") {
        menuItem.stock = Math.max(0, menuItem.stock - it.qty);
      }
    }

    // Create transaction (debit) IMMEDIATELY
    db.transactions = db.transactions || [];
    const txId = nextId(db.transactions, "TX");
    const tx = {
      id: txId,
      userId: user.id,
      title: "Reservation Hold",
      ref: null, // will be set when reservation is created
      amount: total,
      direction: "debit",
      status: "Pending",
      createdAt: new Date().toISOString(),
    };
    db.transactions.push(tx);

    const reservation = {
      id: nextId(db.reservations, "RES"),
      userId: user.id,
      student: user.name || req.user?.name,
      grade,
      section,
      when: slot,
      note,
      items: normalized,
      total,
      status: "Pending",
      transactionId: tx.id,
      charged: true,
      chargedAt: new Date().toISOString(),
      stockDeducted: true,
      createdAt: new Date().toISOString(),
    };

    // Update transaction with reservation reference
    tx.ref = reservation.id;

    db.reservations = db.reservations || [];
    db.reservations.push(reservation);
    await save(db);

    // Notify admins
    try {
      Notifications.addNotification({
        id: "notif_" + Date.now().toString(36),
        for: "admin",
        actor: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          profilePictureUrl: user.profilePictureUrl
        } : req.user.id,
        type: "reservation:created",
        title: "New reservation submitted",
        body: `${user?.name || reservation.student || req.user?.email || req.user?.id} submitted a reservation`,
        data: { 
          reservationId: reservation.id,
          items: reservation.items,
          total: reservation.total,
          note: reservation.note || "",
          slot: reservation.when || reservation.slot || "",
          grade: reservation.grade || "",
          section: reservation.section || "",
          student: reservation.student || ""
        },
        read: false,
        createdAt: reservation.createdAt
      });
    } catch (e) {
      console.error("Notification publish failed", e && e.message);
    }

    res.json(reservation);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create reservation" });
  }
};

/**
 * GET /api/reservations/mine
 */
exports.mine = async (req, res) => {
  try {
    const db = await load();
    const uid = req.user?.id;

    let rows = [];
    if (uid) {
      const users = Array.isArray(db.users) ? db.users : [];
      const me = users.find((u) => String(u.id) === String(uid));

      rows = (db.reservations || []).filter((r) => {
        // primary: explicit userId match
        if (String(r.userId || "") === String(uid)) return true;

        // legacy fallback: match by student name/email/id when reservation has no userId
        if (!r.userId && me) {
          const student = String(r.student || "").trim().toLowerCase();
          if (!student) return false;
          const name = String(me.name || "").trim().toLowerCase();
          const email = String(me.email || "").trim().toLowerCase();
          const id = String(me.id || "").trim().toLowerCase();
          if (student === name || student === email || student === id) return true;
        }
        return false;
      });
    } else if (req.query.student) {
      const s = String(req.query.student).toLowerCase();
      rows = (db.reservations || []).filter((r) => String(r.student || "").toLowerCase() === s);
    } else {
      return res.status(400).json({ error: "Missing identity" });
    }

    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ status: 200, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
};

/**
 * GET /api/reservations/admin
 * Optional ?status=Pending|Approved|Rejected|Claimed
 */
exports.listAdmin = async (req, res) => {
  try {
    const db = await load();
    let rows = Array.isArray(db.reservations) ? db.reservations.slice() : [];
    if (req.query.status) {
      rows = rows.filter((r) => String(r.status) === String(req.query.status));
    }
    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    console.log(rows)
    res.json({ status: 200, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list reservations" });
  }
};

/**
 * PATCH /api/reservations/admin/:id
 * body: { status }
 *
 * - Approve: Pending -> check stock, check wallet >= total,
 *   deduct wallet & stock, create debit transaction, set charged flags.
 * - Reject: Pending -> Rejected.
 * - Other (Preparing, Ready, Claimed): direct status update.
 */
exports.setStatus = async (req, res) => {
  try {
    const { id } = req.params || {};
    let { status } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing id" });
    if (!status) return res.status(400).json({ error: "Missing status" });

    // Normalize Cancelled -> Rejected
    let newStatus = status;
    if (String(newStatus).toLowerCase() === "cancelled") newStatus = "Rejected";

    const db = await load();
    db.reservations = db.reservations || [];

    const row = db.reservations.find((r) => String(r.id || "").toLowerCase() === String(id).toLowerCase());
    if (!row) return res.status(404).json({ error: "Not found" });

    const prev = row.status;

    // Approve flow (ensure userId is attached if resolved)
    if (newStatus === "Approved") {
      const prevNorm = String(prev || "").trim();
      if (prevNorm !== "Pending") {
        console.log(`[RESERVATION] Cannot approve: status is "${prevNorm}" (expected "Pending") for reservation ${id}`);
        return res.status(400).json({ error: `Cannot approve: current status is "${prevNorm}". Only pending reservations can be approved.` });
      }

      // **SKIP WALLET CHECK - ALREADY DEDUCTED AT CREATION**
      
      // Stock check (should already be deducted, but verify)
      for (const it of row.items || []) {
        const menuItem = (db.menu || []).find(m => String(m.id) === String(it.id));
        if (!menuItem) {
          return res.status(400).json({ error: `Item ${it.id} not found` });
        }
      }

      // Update transaction status from Pending to Success
      const tx = (db.transactions || []).find(t => String(t.id) === String(row.transactionId));
      if (tx) {
        tx.status = "Success";
      }

      row.status = "Approved";
      row.updatedAt = new Date().toISOString();
      await save(db);

      // Notify user
      try {
        Notifications.addNotification({
          id: "notif_" + Date.now().toString(36),
          for: row.userId,
          actor: req.user && req.user.id,
          type: "reservation:status",
          title: `Reservation ${row.id} Approved`,
          body: `Your reservation ${row.id} has been approved.`,
          data: { 
            reservationId: row.id, 
            status: "Approved",
            items: row.items,
            total: row.total,
            note: row.note || "",
            slot: row.when || row.slot || "",
            grade: row.grade,
            section: row.section,
            student: row.student,
            transactionId: row.transactionId
          },
          read: false,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error("Notification publish failed", e && e.message);
      }

      const user = (db.users || []).find((u) => String(u.id) === String(row.userId));
      return res.json({ status: 200, data: { reservation: row, transaction: tx, user } });
    }

    if (newStatus === "Rejected") {
      // Only allow refund/cancel if previous state was Pending or Approved
      const allowedPrev = ["Pending", "Approved"];
      if (!allowedPrev.includes(prev)) {
        return res.status(400).json({ error: "Refund/cancellation not allowed for current order state" });
      }

      const total = Number(row.total || 0);
      
      // **RESTORE WALLET & STOCK IF NOT ALREADY REFUNDED**
      if (!row.refunded && row.charged && total > 0) {
        db.users = db.users || [];
        const user = db.users.find(u => String(u.id) === String(row.userId));
        if (user) {
          user.balance = Number(user.balance || 0) + total;
        }

        // Restore stock
        if (row.stockDeducted) {
          for (const it of row.items || []) {
            const menuItem = (db.menu || []).find(m => String(m.id) === String(it.id));
            if (menuItem && typeof menuItem.stock === "number") {
              menuItem.stock = Number(menuItem.stock) + it.qty;
            }
          }
        }

        // Create refund transaction
        db.transactions = db.transactions || [];
        const refundTx = {
          id: nextId(db.transactions, "TX"),
          userId: row.userId,
          title: "Refund",
          ref: row.id,
          amount: total,
          direction: "credit",
          status: "Success",
          createdAt: new Date().toISOString(),
        };
        db.transactions.push(refundTx);

        row.refunded = true;
        row.refundTransactionId = refundTx.id;
      }

      row.status = "Rejected";
      row.updatedAt = new Date().toISOString();
      await save(db);

      // Notify user
      try {
        if (row.userId) {
          Notifications.addNotification({
            id: "notif_" + Date.now().toString(36),
            for: row.userId,
            actor: req.user && req.user.id,
            type: "reservation:status",
            title: `Reservation ${row.id} Rejected`,
            body: `Your reservation ${row.id} has been rejected. Refund has been applied.`,
            data: { 
              reservationId: row.id, 
              status: "Rejected",
              items: row.items,
              total: row.total,
              note: row.note || "",
              slot: row.when || row.slot || "",
              grade: row.grade,
              section: row.section,
              student: row.student
            },
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("Notification publish failed", e && e.message);
      }

      return res.json({ status: 200, data: { reservation: row } });
    }

    // Preparing / Ready / Claimed - validate state machine transitions
    const validTransitions = {
      'Approved': ['Preparing'],
      'Preparing': ['Ready'],
      'Ready': ['Claimed'],
      'Claimed': [] // Terminal state
    };

    const allowedNext = validTransitions[prev] || [];
    if (!allowedNext.includes(newStatus)) {
      console.warn(`[RESERVATION] Invalid transition: ${prev} -> ${newStatus} for ${id}`);
      return res.status(400).json({ 
        error: `Invalid status transition from ${prev} to ${newStatus}`,
        details: `Allowed transitions from ${prev}: ${allowedNext.join(', ') || 'none (terminal state)'}`
      });
    }

    // Check if already in requested state (idempotency)
    if (prev === newStatus) {
      return res.status(409).json({ 
        error: `Order is already in ${newStatus} status`,
        reservation: row
      });
    }

    row.status = newStatus;
    row.updatedAt = new Date().toISOString();
    await save(db);

    // notify user about reservation status change (best-effort)
    try {
      const targetUser = row.userId;
      if (targetUser) {
        Notifications.addNotification({
          id: "notif_" + Date.now().toString(36),
          for: targetUser,
          actor: req.user && req.user.id,
          type: "reservation:status",
          title: `Reservation ${row.id} ${status}`,
          body: `Your reservation ${row.id} is now ${status}.`,
          data: { reservationId: row.id, status },
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error("Notification publish failed", e && e.message);
    }

    res.json({ status: 200, data: { reservation: row } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update reservation" });
  }
};

// helper: safely deduct or restore stock for a reservation's items
async function adjustReservationStock(db, row, direction = "deduct") {
  // direction: "deduct" or "restore"
  // returns { ok: boolean, problems: [] }
  const problems = [];
  db.menu = db.menu || [];
  db.inventory = db.inventory || []; // optional inventory collection
  for (const it of row.items || []) {
    const qty = Number(it.qty || 0);
    if (!qty) continue;
    const menuItem = db.menu.find((m) => String(m.id) === String(it.id));
    if (!menuItem) {
      problems.push(`Menu item ${it.id} not found`);
      continue;
    }

    if (direction === "deduct") {
      if (typeof menuItem.stock === "number") {
        // avoid negative
        menuItem.stock = Math.max(0, Number(menuItem.stock) - qty);
      }
    } else {
      // restore
      if (typeof menuItem.stock === "number") {
        menuItem.stock = Number(menuItem.stock) + qty;
      }
    }

    // Try to apply same change to inventory records if present
    try {
      const inv = db.inventory.find((x) =>
        String(x.productId || x.id) === String(menuItem.id)
      );
      if (inv && typeof inv.stock === "number") {
        inv.stock = direction === "deduct"
          ? Math.max(0, Number(inv.stock) - qty)
          : Number(inv.stock) + qty;
      }
    } catch (e) {
      // non-fatal — note and continue
      problems.push(`Inventory update failed for ${menuItem.id}: ${String(e && e.message)}`);
    }
  }
  return { ok: problems.length === 0, problems };
}
