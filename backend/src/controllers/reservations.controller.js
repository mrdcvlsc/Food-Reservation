// backend/src/controllers/reservations.controller.js
const { load, save, nextId } = require("../lib/db");

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
      return res.status(400).json({ error: "No items" });
    }
    if (!slot) return res.status(400).json({ error: "Missing pickup slot" });

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
      if (!m) return res.status(400).json({ error: `Item ${id} not found` });

      const q = Number(qty) || 0;
      if (q <= 0) return res.status(400).json({ error: "Invalid quantity" });

      if (typeof m.stock === "number" && m.stock < 0) {
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
          return studentNorm === name || studentNorm === email;
        });
        if (found) reservation.userId = found.id;
      }
    }

    db.reservations = db.reservations || [];
    db.reservations.push(reservation);
    await save(db);
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

    // If authenticated, try to return reservations belonging to the user.
    // Also include legacy/guest reservations where `userId` is missing but the
    // reservation.student matches the user's name/email/id.
    let rows = [];
    if (uid) {
      const users = Array.isArray(db.users) ? db.users : [];
      const me = users.find((u) => String(u.id) === String(uid));

      rows = (db.reservations || []).filter((r) => {
        const rid = r.userId || r.user || r.ownerId || r.uid;
        if (String(rid) === String(uid)) return true;
        // no explicit user id: try matching by student name/email/uid
        if (!rid && me) {
          const student = String(r.student || "").trim().toLowerCase();
          if (!student) return false;
          const name = String(me.name || "").trim().toLowerCase();
          const email = String(me.email || "").trim().toLowerCase();
          const meId = String(me.id || "").trim().toLowerCase();
          if (student === name || student === email || student === meId) return true;
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
    const { status } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing id" });
    if (!status) return res.status(400).json({ error: "Missing status" });

    const db = await load();
    db.reservations = db.reservations || [];

    // Robust id compare (case-insensitive)
    const row = db.reservations.find(
      (r) => String(r.id || "").toLowerCase() === String(id).toLowerCase()
    );
    if (!row) return res.status(404).json({ error: "Not found" });

    const prev = row.status;

    if (status === "Approved") {
      if (prev !== "Pending") {
        return res
          .status(400)
          .json({ error: "Only pending reservations can be approved" });
      }

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
        row.charged = true;
        row.chargedAt = row.chargedAt || existingTx.createdAt || new Date().toISOString();
        row.status = "Approved";
        row.updatedAt = new Date().toISOString();
        await save(db);
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
        return res.status(400).json({ error: "Insufficient wallet balance" });
      }

      // Deduct wallet & stock
      user.balance -= total;
      for (const it of row.items || []) {
        const menuItem = (db.menu || []).find(
          (m) => String(m.id) === String(it.id)
        );
        if (menuItem && typeof menuItem.stock === "number") {
          menuItem.stock -= (it.qty || 0);
        }
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
      return res.json({ reservation: row, transaction: tx, user });
    }

    if (status === "Rejected") {
      if (prev !== "Pending") {
        return res
          .status(400)
          .json({ error: "Only pending reservations can be rejected" });
      }
      row.status = "Rejected";
      row.updatedAt = new Date().toISOString();
      await save(db);
      return res.json(row);
    }

    // Preparing / Ready / Claimed
    row.status = status;
    row.updatedAt = new Date().toISOString();
    await save(db);
    return res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update reservation" });
  }
};
