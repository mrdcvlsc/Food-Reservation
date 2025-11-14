// backend/src/controllers/transactions.controller.js
// Orders-only "transactions" for the current user (db.json edition)

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const data = JSON.parse(raw || "{}");
    return {
      users: data.users || [],
      reservations: data.reservations || [],
      menu: data.menu || [],
      transactions: data.transactions || [],
      topups: data.topups || [],
    };
  } catch {
    return { users: [], reservations: [], menu: [], transactions: [], topups: [] };
  }
}

// Map one reservation/order into a transaction row for the UI
function mapReservationToTx(r) {
  const id = r.id || r.ref || r.reference || r._id || `R-${Math.random().toString(36).slice(2)}`;
  const createdAt = r.createdAt || r.date || r.time || r.when || r.pickupTime || new Date().toISOString();
  const status = r.status || "Success";

  // best-effort total
  let total = Number(r.total ?? r.amount ?? 0);
  if (!Number.isFinite(total) || total === 0) {
    // compute from items + menu if needed
    const items = Array.isArray(r.items) ? r.items : [];
    const priceMap = new Map((r.menu || []).map(m => [m.id, Number(m.price) || 0])); // fallback if reservation carries menu
    total = items.reduce((sum, it) => {
      const qty = Number(it.qty || it.quantity || 1);
      const price =
        Number(it.price) ||
        Number(priceMap.get(it.menuId || it.id)) ||
        0;
      return sum + qty * price;
    }, 0);
  }

  return {
    id,                          // show in Ref column
    title: r.title || "Food Order",
    createdAt,                   // date/time
    status,                      // Pending | Success | etc.
    statusLC: String(status).toLowerCase(),
    direction: "debit",          // orders are always money-out
    sign: -1,
    amount: Math.abs(Number(total) || 0),
    raw: r,
  };
}

exports.getMyTransactions = (req, res) => {
  // your auth middleware typically sets req.user (id or {_id, id})
  const userId = req.user?.id || req.user?._id || req.user;

  if (!userId) {
      console.log('[TRANSACTION] GetMyTransactions: unauthorized');
      return res.status(401).json({ error: "Unauthorized" });
  }

  const db = readDB();
    console.log('[TRANSACTION] GetMyTransactions: userId', userId);

  // Try to find the user record so we can also match by student name/email
  const me = (db.users || []).find((u) => String(u.id) === String(userId));

  // Filter only this user's reservations (orders). Some reservations were
  // created without a `userId` (guest/student flow) — include those when the
  // reservation.student matches the authenticated user's name or email.
  const mine = (db.reservations || []).filter((r) => {
    const uid = r.userId || r.user || r.ownerId || r.uid;
    if (String(uid) === String(userId)) return true;

    // No explicit user id on reservation: try matching by student name/email
    if (!uid && me) {
      const student = String(r.student || "").trim().toLowerCase();
      if (!student) return false;
      const name = String(me.name || "").trim().toLowerCase();
      const email = String(me.email || "").trim().toLowerCase();
      if (student === name || student === email) return true;
    }

    return false;
  });

  const resRows = mine.map(mapReservationToTx);

  // Also include persisted ledger transactions (manual ledger entries).
  // Only include persisted rows that belong to the authenticated user, or
  // that explicitly reference a reservation that belongs to this user. This
  // prevents showing global ledger rows to other users.
  const myResIds = new Set((mine || []).map((r) => String(r.id)));

  const persisted = (db.transactions || [])
    .filter((t) => {
      // basic ownership: userId match
      if (String(t.userId) === String(userId)) return true;

      // allow transactions that reference one of this user's reservations
      const ref = String(t.ref || t.reference || "").trim();
      if (ref && myResIds.has(ref)) return true;

      return false;
    })
    .filter((t) => {
      // of the owned/related rows, exclude pure top-up rows unless they are
      // explicitly linked to a topup object we own (handled above by userId)
      const type = (t.type || t.kind || "").toString().toLowerCase();
      const isTopup = type.includes("topup") || type === "topup" || (t.topupId != null) || type.includes("top-");
      const ref = String(t.ref || t.reference || "").toLowerCase();
      const hasResRef = ref.includes("res-") || ref.startsWith("res-");
      // keep rows that are not topups, or those that reference a reservation
      return !isTopup || hasResRef;
    })
    .map((t) => {
      const isTopup = ((t.type || "") + "").toString().toLowerCase().includes("topup") || (t.topupId != null);
      return {
        id: t.id || t.txId || t._id || `TX-${Math.random().toString(36).slice(2)}`,
        title: isTopup ? "Top-Up" : (t.title || t.type || "Transaction"),
        createdAt: t.createdAt || t.date || new Date().toISOString(),
        status: t.status || "Success",
        statusLC: String(t.status || "Success").toLowerCase(),
        direction: isTopup ? "credit" : (t.direction || (Number(t.amount || 0) < 0 ? "debit" : "credit")),
        sign: isTopup ? 1 : (Number(t.amount || 0) < 0 ? -1 : 1),
        amount: Math.abs(Number(t.amount || t.value || 0) || 0),
        raw: t,
      };
    });

  const merged = [...persisted, ...resRows];
  merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    console.log('[TRANSACTION] GetMyTransactions: returning', merged.length, 'transactions for user', userId);
  return res.json({ status: 200, data: merged });
};

// Alias `mine` to match route import: `const { mine } = require(...);`
exports.mine = exports.getMyTransactions;
