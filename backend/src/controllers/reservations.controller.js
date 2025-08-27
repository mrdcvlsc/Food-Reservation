// server/src/controllers/reservations.controller.js
const { load, save, nextId } = require("../lib/db");

/**
 * POST /api/reservations
 * body: { student?, grade, section, slot, note?, items: [{id, qty}] }
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

    // Validate & normalize items, ensure stock is sufficient
    const normalized = [];
    for (const { id, qty } of items) {
      const m = db.menu.find((x) => Number(x.id) === Number(id));
      if (!m) return res.status(400).json({ error: `Item ${id} not found` });

      const q = Number(qty) || 0;
      if (q <= 0) return res.status(400).json({ error: "Invalid quantity" });

      if (typeof m.stock === "number" && m.stock < q) {
        return res.status(400).json({ error: `Not enough stock for ${m.name}` });
      }

      normalized.push({
        id: m.id,
        name: m.name,
        price: Number(m.price) || 0,
        qty: q,
      });
    }

    // Deduct stock
    for (const n of normalized) {
      const m = db.menu.find((x) => Number(x.id) === Number(n.id));
      if (typeof m.stock === "number") m.stock -= n.qty;
    }

    const total = normalized.reduce((s, r) => s + r.price * r.qty, 0);

    const reservation = {
      id: nextId(db.reservations, "RES"),
      userId: req.user?.id || null,                  // works with or without auth
      student: student || req.user?.name || "Student",
      grade,
      section,
      when: slot,                                    // store slot id; UI maps to label
      note,
      items: normalized,
      total,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

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
 * If auth exists, filters by req.user.id.
 * Otherwise, support ?student=<name> as a simple fallback for now.
 */
exports.mine = async (req, res) => {
  try {
    const db = await load();
    const uid = req.user?.id;

    let rows;
    if (uid) {
      rows = db.reservations.filter((r) => r.userId === uid);
    } else if (req.query.student) {
      const s = String(req.query.student).toLowerCase();
      rows = db.reservations.filter(
        (r) => (r.student || "").toLowerCase() === s
      );
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
 * GET /api/admin/reservations
 * Optional ?status=Pending|Approved|Rejected
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
 * PATCH /api/admin/reservations/:id
 * body: { status: "Approved" | "Rejected" }
 */
exports.setStatus = async (req, res) => {
  try {
    const { id } = req.params || {};
    const { status } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing id" });
    if (!status) return res.status(400).json({ error: "Missing status" });

    const db = await load();
    const row = db.reservations.find((r) => String(r.id) === String(id));
    if (!row) return res.status(404).json({ error: "Not found" });

    row.status = status;
    row.updatedAt = new Date().toISOString();

    await save(db);
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update reservation" });
  }
};
