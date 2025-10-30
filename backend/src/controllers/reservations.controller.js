// backend/src/controllers/reservations.controller.js
const { load, save, nextId } = require("../lib/db");
const Notifications = require("./notifications.controller");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

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
    }

    const total = normalized.reduce((s, r) => s + r.price * r.qty, 0);

    const reservation = {
      id: nextId(db.reservations, "RES"),
      userId: req.user?.id || null,
      student: student || req.user?.name || "Student",
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
    }

    db.reservations = db.reservations || [];
    db.reservations.push(reservation);
    await save(db);

    // Notify admins about new reservation (best-effort)
    try {
      Notifications.addNotification({
        id: "notif_" + Date.now().toString(36),
        for: "admin",
        actor: req.user && req.user.id,
        type: "reservation:created",
        title: "New reservation submitted",
        body: `${reservation.student || req.user?.name || req.user?.email || req.user?.id} submitted a reservation`,
        data: { reservationId: reservation.id },
        read: false,
        createdAt: reservation.createdAt || new Date().toISOString(),
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
    res.json(rows);
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
    res.json(rows);
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
      if (prev !== "Pending") {
        return res.status(400).json({ error: "Only pending reservations can be approved" });
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
        // attach transaction and mark reservation as approved/charged
        if (!row.transactionId) row.transactionId = existingTx.id;
        // ensure reservation is linked to the user from the existing transaction
        if (!row.userId && existingTx.userId) row.userId = existingTx.userId;
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
              data: { reservationId: row.id, status: "Approved" },
              read: false,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error("Notification publish failed", e && e.message);
        }

        const user = (db.users || []).find((u) => String(u.id) === String(existingTx.userId));
        return res.json({ reservation: row, transaction: existingTx, user });
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
      for (const it of row.items || []) {
        const qty = Math.max(0, Number(it.qty || 0));
        const menuItem = (db.menu || []).find((m) => String(m.id) === String(it.id));
        if (menuItem && typeof menuItem.stock === "number") {
          menuItem.stock = Math.max(0, Number(menuItem.stock || 0) - qty);
        }
      }

      // Also decrement stock in MongoDB collection (if connected) so other views that read from Mongo see the change
      try {
        if (mongoose && mongoose.connection && mongoose.connection.db) {
          const menuCol = mongoose.connection.db.collection("menu");
          for (const it of row.items || []) {
            const qty = Math.max(0, Number(it.qty || 0));
            if (!qty) continue;
            const rid = String(it.id || it.productId || it._id || "").trim();
            if (!rid) continue;
            const itemFilter = ObjectId.isValid(rid) ? { $or: [{ id: rid }, { _id: ObjectId(rid) }] } : { id: rid };
            // atomic decrement but never below 0
            await menuCol.updateOne(
              itemFilter,
              [
                {
                  $set: {
                    stock: {
                      $max: [
                        0,
                        { $subtract: [{ $ifNull: ["$stock", 0] }, qty] }
                      ]
                    }
                  }
                }
              ]
            );
          }
        }
      } catch (err) {
        console.warn("[reservations] mongo stock decrement failed:", err && err.message ? err.message : err);
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
            data: { reservationId: row.id, status: "Approved", transactionId: tx.id },
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("Notification publish failed", e && e.message);
      }

      return res.json({ reservation: row, transaction: tx, user });
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
        const studentNorm = String(row.student || "").trim().toLowerCase();
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

      // Update reservation status and timestamp
      row.status = "Rejected";
      row.updatedAt = new Date().toISOString();
      // attach resolved userId if we found one
      if (targetUserId && !row.userId) row.userId = targetUserId;

      await save(db);

      // Send notification (best-effort)
      try {
        if (row.userId) {
          Notifications.addNotification({
            id: "notif_" + Date.now().toString(36),
            for: row.userId,
            actor: req.user && req.user.id,
            type: "reservation:status",
            title: `Reservation ${row.id} Rejected`,
            body: `Your reservation ${row.id} has been rejected.`,
            data: { reservationId: row.id, status: "Rejected" },
            read: false,
            createdAt: new Date().toISOString(),
          });
        } else {
          console.warn("[RESERVATION] Rejected: no userId found for", row.id);
        }
      } catch (e) {
        console.error("Notification publish failed", e && e.message);
      }

      // If we are rejecting an already-approved reservation, restore stock
      if (prev === "Approved" && Array.isArray(row.items)) {
        // restore in file DB
        for (const it of row.items) {
          const qty = Math.max(0, Number(it.qty || 0));
          const menuItem = (db.menu || []).find((m) => String(m.id) === String(it.id));
          if (menuItem && typeof menuItem.stock === "number") {
            menuItem.stock = Number(menuItem.stock || 0) + qty;
          }
        }
        // restore in MongoDB (if connected)
        try {
          if (mongoose && mongoose.connection && mongoose.connection.db) {
            const menuCol = mongoose.connection.db.collection("menu");
            for (const it of row.items || []) {
              const qty = Math.max(0, Number(it.qty || 0));
              if (!qty) continue;
              const rid = String(it.id || it.productId || it._id || "").trim();
              if (!rid) continue;
              const filter = ObjectId.isValid(rid) ? { $or: [{ id: rid }, { _id: ObjectId(rid) }] } : { id: rid };
              await menuCol.updateOne(filter, { $inc: { stock: qty } });
            }
          }
        } catch (err) {
          console.warn("[reservations] mongo stock restore failed:", err && err.message ? err.message : err);
        }
      }

      // Update reservation status and timestamp
      row.status = "Rejected";
      row.updatedAt = new Date().toISOString();
      // attach resolved userId if we found one
      if (targetUserId && !row.userId) row.userId = targetUserId;

      await save(db);

      // Send notification (best-effort)
      try {
        if (row.userId) {
          Notifications.addNotification({
            id: "notif_" + Date.now().toString(36),
            for: row.userId,
            actor: req.user && req.user.id,
            type: "reservation:status",
            title: `Reservation ${row.id} Rejected`,
            body: `Your reservation ${row.id} has been rejected.`,
            data: { reservationId: row.id, status: "Rejected" },
            read: false,
            createdAt: new Date().toISOString(),
          });
        } else {
          console.warn("[RESERVATION] Rejected: no userId found for", row.id);
        }
      } catch (e) {
        console.error("Notification publish failed", e && e.message);
      }

      return res.json(row);
    }

    // Preparing / Ready / Claimed
    row.status = status;
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

    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update reservation" });
  }
};

// ensure this handler is used by the route that updates reservation status
exports.updateStatus = async (req, res) => {
  try {
    const reservationId = req.params.id;
    const newStatus = String(req.body.status || "").trim();
    if (!reservationId) return res.status(400).json({ error: "Missing reservation id" });

    // get DB / collections
    const db = mongoose && mongoose.connection && mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not available" });

    const reservationsCol = db.collection("reservations");
    const menuCol = db.collection("menu");

    // find reservation (try ObjectId then raw id)
    const tryId = (v) => (ObjectId.isValid(v) ? ObjectId(v) : v);
    const resDoc = await reservationsCol.findOne({ _id: tryId(reservationId) }) || await reservationsCol.findOne({ id: reservationId });
    if (!resDoc) return res.status(404).json({ error: "Reservation not found" });

    const prevStatus = String(resDoc.status || "").trim();

    // update reservation status
    await reservationsCol.updateOne({ _id: resDoc._id }, { $set: { status: newStatus } });

    // Only decrement stock when transitioning into Approved (and not if already approved)
    const shouldDecrement = prevStatus.toLowerCase() !== "approved" && newStatus.toLowerCase() === "approved";

    if (shouldDecrement && Array.isArray(resDoc.items)) {
      // Loop items and decrement stock safely
      for (const it of resDoc.items) {
        const rid = String(it?.id ?? it?.productId ?? it?.itemId ?? it?._id ?? "").trim();
        const qty = Math.max(0, Number(it?.qty ?? it?.quantity ?? it?.count ?? 0));

        if (!rid || qty <= 0) continue;

        // Try to find menu doc by _id or id field or suffix match
        let menuDoc = null;
        try {
          if (ObjectId.isValid(rid)) menuDoc = await menuCol.findOne({ _id: ObjectId(rid) });
          if (!menuDoc) menuDoc = await menuCol.findOne({ id: rid });
          if (!menuDoc) {
            // suffix heuristic (fallback)
            const incomingSuffix = rid.split("-").pop();
            menuDoc = await menuCol.findOne({ $where: function() {
              const sid = (this.id ?? this._id ?? "") + "";
              return sid.split("-").pop() === incomingSuffix;
            }});
          }
        } catch (err) {
          // ignore lookup errors for this item and continue
          console.warn("[stock] lookup error for", rid, err && err.message ? err.message : err);
        }

        if (!menuDoc) continue;

        const currentStock = Number(menuDoc.stock ?? 0);
        const newStock = Math.max(0, currentStock - qty);

        try {
          await menuCol.updateOne({ _id: menuDoc._id }, { $set: { stock: newStock } });
        } catch (err) {
          console.error("[stock] failed to update menu stock for", menuDoc._id, err);
        }
      }
    }

    // success
    return res.json({ ok: true });
  } catch (err) {
    console.error("[reservations] updateStatus error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Failed to update reservation status", details: String(err && err.message ? err.message : err) });
  }
};

// helper: adjust stock for a reservation (sign = -1 to subtract, +1 to restore)
async function adjustStockForReservation(reservation, sign = -1) {
  if (!reservation || !Array.isArray(reservation.items)) return;
  const db = mongoose.connection.db;
  const menuCol = db.collection("menu");
  for (const it of reservation.items) {
    const rid = String(it?.id ?? it?.productId ?? it?.itemId ?? it?._id ?? "").trim();
    const qty = Math.max(0, Number(it?.qty ?? it?.quantity ?? it?.count ?? 0) || 0);
    if (!rid || qty === 0) continue;

    try {
      // read current stock
      const existing = await menuCol.findOne({ $or: [{ id: rid }, { _id: rid }, { _id: new mongoose.Types.ObjectId(rid) }, { id: new RegExp(rid + "$") }] });
      if (!existing) continue;
      const curStock = Number(existing.stock ?? 0);
      const nextStock = Math.max(0, curStock + sign * (-1) * qty); // sign -1 subtracts, +1 restores: compute cur - qty or cur + qty
      // simpler: if sign === -1 -> curStock - qty ; if sign === 1 -> curStock + qty
      const computed = sign === -1 ? Math.max(0, curStock - qty) : curStock + qty;
      await menuCol.updateOne({ _id: existing._id }, { $set: { stock: computed } });
    } catch (err) {
      console.error("[STOCK] adjust failed for item", rid, err && err.message ? err.message : err);
      // continue attempting other items
    }
  }
}

// Example: integrate into your existing update-status handler
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const newStatus = req.body.status;
    const Reservations = mongoose.connection.db.collection("reservations");

    // load existing reservation
    const existing = await Reservations.findOne({ _id: id }) || await Reservations.findOne({ id });
    if (!existing) return res.status(404).json({ error: "Reservation not found" });

    const prevStatus = existing.status;

    // perform the status update (your current logic)
    await Reservations.updateOne({ _id: existing._id }, { $set: { ...req.body, updatedAt: new Date().toISOString() } });
    const updated = await Reservations.findOne({ _id: existing._id });

    // If status changed to Approved => subtract stock
    const approvedNames = new Set(["Approved", "approved", "APPROVED"]);
    if (!approvedNames.has(prevStatus) && approvedNames.has(newStatus)) {
      await adjustStockForReservation(updated, -1); // subtract
      try { // notify other services/clients if you have websockets or rely on frontend events
        // nothing here — frontend will reload via API and menu:updated event dispatched client-side by admin UI
      } catch {}
    }

    // If status was Approved and now reverted => restore stock
    if (approvedNames.has(prevStatus) && !approvedNames.has(newStatus)) {
      await adjustStockForReservation(existing, 1); // restore
    }

    return res.json({ success: true, reservation: updated });
  } catch (err) {
    console.error("[RESERVATIONS] update error", err);
    return res.status(500).json({ error: "Update failed", details: String(err && err.message ? err.message : err) });
  }
};
