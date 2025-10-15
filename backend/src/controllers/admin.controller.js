const path = require("path");
const fs = require("fs-extra");
const { load, save, nextId } = require("../lib/db");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.ensureDirSync(UPLOAD_DIR);

function safeName(name = "") {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

exports.listMenu = async (_req, res) => {
  const db = await load();
  res.json(db.menu || []);
};

exports.addMenu = async (req, res) => {
  const { name = "", category = "", price, stock, isActive = true } = req.body || {};
  if (!name.trim() || !category.trim()) {
    return res.status(400).json({ error: "Missing name or category" });
  }
  const p = Number(price);
  const s = Number(stock);
  if (Number.isNaN(p) || Number.isNaN(s)) {
    return res.status(400).json({ error: "Price/stock must be numeric" });
  }

  const db = await load();

  // handle optional image upload
  let img = "";
  if (req.file) {
    const ext = (req.file.mimetype || "").split("/").pop() || "png";
    const filename = `${Date.now()}_${safeName(name)}.${ext}`;
    const dest = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(dest, req.file.buffer);
    // public URL path for client (exposed by static in index.js if you added it)
    img = `/uploads/${filename}`;
  }

  const item = {
    // use string IDs like ITM-1
    id: db.menu.length ? nextId(db.menu, "ITM") : "ITM-1",
    name: name.trim(),
    category: category.trim(),
    price: p,
    stock: s,
    img,
    isActive: !!JSON.parse(String(isActive)),
    createdAt: new Date().toISOString(),
  };

  db.menu.push(item);
  await save(db);
  res.json(item);
};

exports.updateMenu = async (req, res) => {
  const id = req.params.id;
  const db = await load();
  const idx = db.menu.findIndex(m => String(m.id) === String(id));
  if (idx === -1) {
    console.log('[ADMIN] Update menu: item not found', id);
    return res.status(404).json({ error: "Item not found" });
  }

  const patch = { ...req.body };
  if ("price" in patch) patch.price = Number(patch.price);
  if ("stock" in patch) patch.stock = Number(patch.stock);
  if ("isActive" in patch) patch.isActive = !!JSON.parse(String(patch.isActive));

  if (req.file) {
    const ext = (req.file.mimetype || "").split("/").pop() || "png";
    const filename = `${Date.now()}_${safeName(db.menu[idx].name)}.${ext}`;
    const dest = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(dest, req.file.buffer);
    patch.img = `/uploads/${filename}`;
  }

  db.menu[idx] = { ...db.menu[idx], ...patch };
  await save(db);
  console.log('[ADMIN] Update menu: item updated', id);
  res.json(db.menu[idx]);
};

exports.deleteMenu = async (req, res) => {
  const id = req.params.id;
  const db = await load();
  const before = db.menu.length;
  db.menu = db.menu.filter(m => String(m.id) !== String(id));
  if (db.menu.length === before) {
    console.log('[ADMIN] Delete menu: item not found', id);
    return res.status(404).json({ error: "Item not found" });
  }
  await save(db);
  console.log('[ADMIN] Delete menu: item deleted', id);
  res.json({ ok: true });
};

// Admin dashboard: aggregate simple stats and recent orders
exports.dashboard = async (req, res) => {
  try {
    const db = await load();

    // total sales: sum of reservation totals
    const totalSales = (Array.isArray(db.reservations) ? db.reservations : []).reduce((s, r) => s + (Number(r.total) || 0), 0);

    // orders today: count reservations with createdAt on today's date
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const ordersToday = (db.reservations || []).filter(r => new Date(r.createdAt) >= startOfToday).length;

    // new users: best-effort: count users (no createdAt available) -> return total users
    const newUsers = Array.isArray(db.users) ? db.users.length : 0;

    // pending reservations
    const pending = (db.reservations || []).filter(r => String(r.status) === 'Pending').length;

    // recent orders: latest 5 reservations with small summary
    const recent = (Array.isArray(db.reservations) ? db.reservations.slice() : [])
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0,5)
      .map(r => ({
        id: r.id,
        product: (Array.isArray(r.items) && r.items[0]) ? r.items[0].name : "Reservation",
        customer: r.student || (db.users.find(u => u.id === r.userId) || {}).name || "Guest",
        time: new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount: Number(r.total) || 0,
        status: r.status || 'Pending'
      }));

    console.log('[ADMIN] Dashboard: success');
    res.json({ totalSales, ordersToday, newUsers, pending, recentOrders: recent });
  } catch (e) {
    console.log('[ADMIN] Dashboard: error', e.message);
    res.status(500).json({ error: 'Failed to compute dashboard' });
  }
};
