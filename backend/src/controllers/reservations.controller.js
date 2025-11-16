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
    console.log('mag pakita ka na user = ', user);
    let studentName;
    // Validate and normalize items (no stock changes here)
    const normalized = [];
    for (const it of items) {
      const { id, qty } = it || {};

      // Robust item lookup (exact id or suffix match like "abc-123")
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
      console.log('m.name = ', m?.name)
      console.log('m.id = ', m?.id)
    }

    const total = normalized.reduce((s, r) => s + r.price * r.qty, 0);
    const reservation = {
      id: nextId(db.reservations, "RES"),
      userId: req.user?.id || null,
      student: user.name || req.user?.name,
      grade,
      section,
      when: slot,
      note,
      items: normalized,
      total,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    // Best effort: resolve user from student (legacy/guest)
    if (!reservation.userId) {
      const studentNorm = String(reservation.student || "").trim().toLowerCase();
      if (studentNorm) {
        const found = (db.users || []).find((u) => {
          const name = String(u.name || "").trim().toLowerCase();
          const email = String(u.email || "").trim().toLowerCase();
          const uid = String(u.id || "").trim().toLowerCase();
          return studentNorm === name || studentNorm === email || studentNorm === uid;
        });
        if (found) {
          reservation.userId = found.id; // <-- ensure we attach resolved userId
        }
      }
      console.log('studentNorm = ', studentNorm)
    }
    console.log(req.body)
    console.log('req.user= ', req?.user)
    db.reservations = db.reservations || [];
    db.reservations.push(reservation);
    await save(db);

    // Notify admins about new reservation (best-effort)
    try {
      const user = db.users.find(u => String(u.id) === String(req.user.id));
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
        // include note and slot so admins see "less sauce" etc.
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

      // Resolve user from reservation.userId or student (legacy)
      if (!row.userId) {
        const studentNorm = String(row.student || "").trim().toLowerCase();
        if (studentNorm) {
          const found = (db.users || []).find((u) => {
            const name = String(u.name || "").trim().toLowerCase();
            const email = String(u.email || "").trim().toLowerCase();
            const uid = String(u.id || "").trim().toLowerCase();
            return studentNorm === name || studentNorm === email || studentNorm === uid;
          });
          if (found) {
            row.userId = found.id; // <-- attach userId so /reservations/mine will include it
          }
        }
      }

      // (do not require user here — existing transaction or later student-resolution can supply user)
      // Stock check
      for (const it of row.items || []) {
        const menuItem = (db.menu || []).find(
          (m) => String(m.id) === String(it.id)
        );
        if (!menuItem) {
          return res.status(400).json({ error: `Item ${it.id} not found` });
        }
        if (
          typeof menuItem.stock === "number" &&
          menuItem.stock < (it.qty || 0)
        ) {
          return res
            .status(400)
            .json({ error: `Not enough stock for ${menuItem.name}` });
        }
      }

      // If a transaction already exists that references this reservation,
      // treat the reservation as already charged/approved (idempotency and
      // legacy-data fix). This avoids 'Reservation has no user to charge'
      // when transactions were created earlier but the reservation record
      // wasn't updated.
      const existingTx = (db.transactions || []).find(
        (t) => String(t.ref || "") === String(row.id)
      );
      if (existingTx) {
        // ensure reservation is linked to the user from the existing transaction
        if (!row.transactionId) row.transactionId = existingTx.id;
        if (!row.userId && existingTx.userId) row.userId = existingTx.userId;

        // Deduct stock if it wasn't already deducted for this reservation
        if (!row.stockDeducted) {
          try {
            const adj = await adjustReservationStock(db, row, "deduct");
            if (!adj.ok) {
              // do not fail existing-tx branch hard — log and continue, but attach problems
              console.warn("[RESERVATION] existingTx stock adjust problems:", adj.problems);
            } else {
              row.stockDeducted = true;
            }
            await save(db);
          } catch (e) {
            console.error("[RESERVATION] failed to adjust stock for existingTx:", e && e.message);
          }
        }

        row.charged = true;
        row.chargedAt = row.chargedAt || existingTx.createdAt || new Date().toISOString();
        row.status = "Approved";
        row.updatedAt = new Date().toISOString();
        await save(db);

        // notify user about approval (best-effort)
        try {
          const targetUser = row.userId || existingTx.userId;
          if (targetUser) {
            Notifications.addNotification({
              id: "notif_" + Date.now().toString(36),
              for: targetUser,
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
                grade: row.grade || "",
                section: row.section || "",
                student: row.student || "",
                transactionId: existingTx.id
              },
              read: false,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error("Notification publish failed", e && e.message);
        }

        const user = (db.users || []).find((u) => String(u.id) === String(existingTx.userId));
        return res.json({ status: 200, data: { reservation: row, transaction: existingTx, user } });
      }

      // Resolve user from the reservation 'student' field (legacy/guest resolution)
      if (!row.userId) {
        const studentNorm = String(row.student || "").trim().toLowerCase();
        if (studentNorm) {
          const found = (db.users || []).find((u) => {
            const name = String(u.name || "").trim().toLowerCase();
            const email = String(u.email || "").trim().toLowerCase();
            const uid = String(u.id || "").trim().toLowerCase();
            return (
              studentNorm === name || studentNorm === email || studentNorm === uid
            );
          });
          if (found) row.userId = found.id;
        }
      }
      if (!row.userId) {
        return res.status(400).json({ error: "Reservation has no user to charge" });
      }

      const user = (db.users || []).find(
        (u) => String(u.id) === String(row.userId)
      );
      if (!user) return res.status(400).json({ error: "User not found" });

      user.balance = Number(user.balance) || 0;
      const total = Number(row.total || 0);
      if (user.balance < total) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // Deduct wallet & stock
      user.balance -= total;

      // perform stock deduction and mark flag
      const adj = await adjustReservationStock(db, row, "deduct");
      if (!adj.ok) {
        // this should rarely happen because we pre-checked stock, but surface error if it does
        return res.status(500).json({ error: "Failed to adjust stock", details: adj.problems });
      }
      row.stockDeducted = true;

      for (const it of row.items || []) {
        // keep legacy per-item menu stock decrement (menu already adjusted in adjustReservationStock)
        // nothing additional needed here
      }

      // Create transaction (debit)
      db.transactions = db.transactions || [];
      const txId = nextId(db.transactions, "TX");
      const tx = {
        id: txId,
        userId: user.id,
        title: "Reservation",
        ref: row.id,
        amount: total,
        direction: "debit",
        status: "Success",
        createdAt: new Date().toISOString(),
      };
      db.transactions.push(tx);

      // Update reservation flags
      row.status = "Approved";
      row.charged = true;
      row.chargedAt = new Date().toISOString();
      row.transactionId = tx.id;
      row.updatedAt = new Date().toISOString();

      await save(db);

      // notify user about approval (best-effort)
      try {
        const targetUser = row.userId;
        if (targetUser) {
          Notifications.addNotification({
            id: "notif_" + Date.now().toString(36),
            for: targetUser,
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
              transactionId: tx.id
            },
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("Notification publish failed", e && e.message);
      }

      return res.json({ status: 200, data: { reservation: row, transaction: tx, user } });
    }

    if (newStatus === "Rejected") {
      // Only allow refund/cancel if previous state was Pending or Approved
      const allowedPrev = ["Pending", "Approved"];
      if (!allowedPrev.includes(prev)) {
        return res.status(400).json({ error: "Refund/cancellation not allowed for current order state" });
      }

      // Resolve userId (prefer reservation.userId, then transaction, then student best-effort)
      let targetUserId = row.userId || null;
      const total = Number(row.total || 0);

      // Try resolve from existing transaction
      if (!targetUserId) {
        const existingTx = (db.transactions || []).find((t) => String(t.ref || "") === String(row.id));
        if (existingTx && existingTx.userId) targetUserId = existingTx.userId;
      }

      // Best-effort resolve from student field
      if (!targetUserId && row.student) {
        const studentNorm = String(row.student).trim().toLowerCase();
        if (studentNorm) {
          const found = (db.users || []).find((u) => {
            const name = String(u.name || "").trim().toLowerCase();
            const email = String(u.email || "").trim().toLowerCase();
            const uid = String(u.id || "").trim().toLowerCase();
            return studentNorm === name || studentNorm === email || studentNorm === uid;
          });
          if (found) targetUserId = found.id;
        }
      }

      // Prevent duplicate refunds: check for any existing credit/refund txn referencing this reservation
      const alreadyRefunded = (db.transactions || []).some((t) => {
        const refMatch = String(t.ref || "") === String(row.id);
        const isCredit = t.direction === "credit" || t.type === "Refund" || String(t.title || "").toLowerCase().includes("refund");
        return refMatch && isCredit;
      });

      let refundTx = null;
      // If we have a user and amount > 0 and not already refunded => apply refund
      if (!alreadyRefunded && targetUserId && total > 0) {
        db.users = db.users || [];
        const user = db.users.find((u) => String(u.id) === String(targetUserId));
        if (user) {
          user.balance = Number(user.balance || 0) + total;

          // record refund transaction
          db.transactions = db.transactions || [];
          const txId = nextId(db.transactions, "TX");
          refundTx = {
            id: txId,
            userId: user.id,
            title: "Refund",
            ref: row.id,
            amount: total,
            direction: "credit",
            status: "Success",
            createdAt: new Date().toISOString(),
          };
          db.transactions.push(refundTx);
        }
      }

      // If previous was Approved, restore stock that was deducted earlier
      if (prev === "Approved" && row.stockDeducted) {
        try {
          const adj = await adjustReservationStock(db, row, "restore");
          if (!adj.ok) {
            console.warn("[RESERVATION] restore stock problems:", adj.problems);
          }
          // clear flag so repeated transitions won't double-restore
          row.stockDeducted = false;
        } catch (e) {
          console.error("[RESERVATION] failed to restore stock on refund:", e && e.message);
        }
      }

      // Update reservation status and timestamp
      row.status = "Rejected";
      row.updatedAt = new Date().toISOString();
      // attach resolved userId if we found one
      if (targetUserId && !row.userId) row.userId = targetUserId;

      await save(db);

      // Send notification with FULL details (best-effort)
      try {
        if (row.userId) {
          Notifications.addNotification({
            id: "notif_" + Date.now().toString(36),
            for: row.userId,
            actor: req.user && req.user.id,
            type: "reservation:status",
            title: `Reservation ${row.id} Rejected`,
            body: `Your reservation ${row.id} has been rejected.`,
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
        } else {
          console.warn("[RESERVATION] Rejected: no userId found for", row.id);
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
