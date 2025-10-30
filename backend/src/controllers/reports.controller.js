// ...new file...
const path = require("path");
const fs = require("fs-extra");
const mongoose = require("mongoose");
const { load } = require("../lib/db");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const REPORTS_DIR = path.join(__dirname, "..", "reports");
fs.ensureDirSync(REPORTS_DIR);

function usingMongo() {
  return !!(mongoose && mongoose.connection && mongoose.connection.readyState === 1);
}

/**
 * Compute monthly report data for given month/year.
 * month: 1-12, year: 4-digit
 */
async function computeMonthlyReport(month, year) {
  // Normalize month/year
  const m = Number(month) || (new Date().getMonth() + 1);
  const y = Number(year) || new Date().getFullYear();
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  if (usingMongo()) {
    // Use MongoDB aggregation on reservations collection
    const db = mongoose.connection.db;
    const reservationsCol = db.collection("reservations");
    const menuCol = db.collection("menu");

    // Match completed reservations in the given month
    const matchStage = {
      $match: {
        createdAt: { $gte: start.toISOString(), $lt: end.toISOString() },
        status: { $nin: ["Pending", "Rejected"] }, // completed-ish
      },
    };

    // Total earnings & order count
    const totalsPromise = reservationsCol.aggregate([
      matchStage,
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: { $toDouble: { $ifNull: ["$total", 0] } } },
          totalOrders: { $sum: 1 },
        },
      },
    ]).toArray();

    // Best-selling products: unwind items, group by item id/name
    // Resolve name/category/price from items or fallback to menu collection
    const topProductsPromise = reservationsCol.aggregate([
      matchStage,
      { $unwind: "$items" },
      {
        $project: {
          itemId: { $ifNull: ["$items.id", "$items.itemId"] },
          name: "$items.name",
          qty: { $toDouble: { $ifNull: ["$items.qty", "$items.quantity", "$items.q", 0] } },
          price: { $toDouble: { $ifNull: ["$items.price", "$items.unitPrice", 0] } },
          category: "$items.category",
        },
      },
      // Try to enrich from menu collection when fields are missing
      {
        $lookup: {
          from: "menu",
          localField: "itemId",
          foreignField: "id",
          as: "menuItem",
        },
      },
      {
        $addFields: {
          name: { $ifNull: ["$name", { $arrayElemAt: ["$menuItem.name", 0] }, "$itemId"] },
          category: { $ifNull: ["$category", { $arrayElemAt: ["$menuItem.category", 0] }, "Uncategorized"] },
          price: {
            $toDouble: {
              $ifNull: ["$price", { $arrayElemAt: ["$menuItem.price", 0] }, 0],
            },
          },
        },
      },
      {
        $group: {
          _id: "$itemId",
          name: { $first: "$name" },
          category: { $first: "$category" },
          totalQty: { $sum: "$qty" },
          revenue: { $sum: { $multiply: ["$qty", "$price"] } },
        },
      },
      { $sort: { totalQty: -1, revenue: -1 } },
      { $limit: 20 },
    ]).toArray();

    // Top categories (by revenue)
    const topCategoriesPromise = reservationsCol.aggregate([
      matchStage,
      { $unwind: "$items" },
      {
        $project: {
          category: { $ifNull: ["$items.category", null] },
          qty: { $toDouble: { $ifNull: ["$items.qty", 0] } },
          price: { $toDouble: { $ifNull: ["$items.price", 0] } },
          itemId: { $ifNull: ["$items.id", "$items.itemId"] },
        },
      },
      // For items without category, try to lookup menu by itemId
      {
        $lookup: {
          from: "menu",
          localField: "itemId",
          foreignField: "id",
          as: "menuItem",
        },
      },
      {
        $addFields: {
          categoryResolved: {
            $ifNull: ["$category", { $ifNull: [{ $arrayElemAt: ["$menuItem.category", 0] }, "Uncategorized"] }],
          },
        },
      },
      {
        $group: {
          _id: "$categoryResolved",
          revenue: { $sum: { $multiply: ["$qty", "$price"] } },
          qty: { $sum: "$qty" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 20 },
    ]).toArray();

    const [totals, topProducts, topCategories] = await Promise.all([
      totalsPromise,
      topProductsPromise,
      topCategoriesPromise,
    ]);

    const totalsRow = totals[0] || { totalEarnings: 0, totalOrders: 0 };

    return {
      month: m,
      year: y,
      totalEarnings: Number(totalsRow.totalEarnings || 0),
      totalOrders: Number(totalsRow.totalOrders || 0),
      topProducts: topProducts.map((p) => ({
        itemId: p._id,
        name: p.name || String(p._id),
        category: p.category || "Uncategorized",
        qty: Number(p.totalQty || 0),
        revenue: Number(p.revenue || 0),
      })),
      topCategories: topCategories.map((c) => ({
        category: c._id || "Uncategorized",
        revenue: Number(c.revenue || 0),
        qty: Number(c.qty || 0),
      })),
    };
  }

  // Fallback: file DB
  const db = await load();
  const rows = Array.isArray(db.reservations) ? db.reservations.slice() : [];
  const filtered = rows.filter((r) => {
    const created = new Date(r.createdAt);
    return created >= start && created < end && !["Pending", "Rejected"].includes(r.status);
  });

  const totalEarnings = filtered.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const totalOrders = filtered.length;

  const prodMap = {};
  const catMap = {};
  const menuList = Array.isArray(db.menu) ? db.menu : [];
  for (const r of filtered) {
    for (const it of r.items || []) {
      const id = it.id || it.itemId || String(Math.random());
      const menuItem = menuList.find((m) => String(m.id) === String(id) || String(m._id) === String(id));
      const name = it.name || (menuItem && (menuItem.name || menuItem.title)) || id;
      const qty = Number(it.qty || it.quantity || 0);
      const price = Number(it.price || it.unitPrice || (menuItem && (menuItem.price || menuItem.unitPrice)) || 0);
      const cat = it.category || (menuItem && (menuItem.category || menuItem.cat)) || "Uncategorized";

      prodMap[id] = prodMap[id] || { itemId: id, name, category: cat, qty: 0, revenue: 0 };
      prodMap[id].qty += qty;
      prodMap[id].revenue += qty * price;

      catMap[cat] = catMap[cat] || { category: cat, qty: 0, revenue: 0 };
      catMap[cat].qty += qty;
      catMap[cat].revenue += qty * price;
    }
  }

  const topProducts = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 20);
  const topCategories = Object.values(catMap).sort((a, b) => b.revenue - a.revenue).slice(0, 20);

  return {
    month: m,
    year: y,
    totalEarnings,
    totalOrders,
    topProducts,
    topCategories,
  };
}

/**
 * GET /reports/monthly?month=MM&year=YYYY
 */
exports.monthly = async (req, res) => {
  try {
    const { month, year } = req.query || {};
    const data = await computeMonthlyReport(month, year);
    res.json(data);
  } catch (err) {
    console.error("[REPORTS] monthly error:", err);
    res.status(500).json({ error: "Failed to compute report" });
  }
};

/**
 * GET /reports/export?month=MM&year=YYYY&format=xlsx|pdf
 * Responds with a file attachment (binary).
 */
exports.exportMonthly = async (req, res) => {
  try {
    const month = Number(req.query.month || 0);
    const year = Number(req.query.year || 0);
    const format = (req.query.format || "xlsx").toLowerCase();

    // helper: is in requested month
    const inMonth = (iso) => {
      if (!iso) return false;
      const d = new Date(iso);
      if (isNaN(d)) return false;
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    };

    // load reservations (mongo if available, otherwise file db)
    let reservations = [];
    if (mongoose && mongoose.connection && mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      const col = db.collection("reservations");
      // try to filter by month if Mongo - fallback to fetching all and filtering
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 1);
      reservations = await col.find({ createdAt: { $gte: from.toISOString(), $lt: to.toISOString() } }).toArray().catch(async () => {
        return (await col.find({}).toArray()) || [];
      });
    } else {
      const dbFile = await load();
      reservations = Array.isArray(dbFile.reservations) ? dbFile.reservations.filter((r) => inMonth(r.createdAt || r.date || r.submittedAt)) : [];
    }

    // load menu map to compute names/prices if needed
    let menuMap = {};
    if (mongoose && mongoose.connection && mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      const mcol = db.collection("menu");
      const allMenu = await mcol.find({}).toArray().catch(() => []);
      for (const m of allMenu || []) menuMap[String(m.id ?? m._id)] = m;
    } else {
      const dbFile = await load();
      const mm = Array.isArray(dbFile.menu) ? dbFile.menu : [];
      for (const m of mm) menuMap[String(m.id ?? m._id)] = m;
    }

    // build rows
    const rows = (reservations || []).map((r) => {
      const items = Array.isArray(r.items)
        ? r.items
            .map((it) => {
              const mid = String(it.id ?? it._id ?? "");
              const m = menuMap[mid] || {};
              const name = it.name || m.name || `#${mid}`;
              const qty = Number(it.qty || it.quantity || 0);
              const price = Number(it.price ?? m.price ?? 0);
              return `${name} x${qty} (${(price * qty).toFixed(2)})`;
            })
            .join("; ")
        : (r.items && JSON.stringify(r.items)) || "";
      const total = Number(r.total ?? r.amount ?? r.totalAmount ?? 0) || 0;
      return {
        id: r.id ?? r._id ?? r.reservationId ?? "",
        user: r.userId ?? r.user ?? r.userEmail ?? "",
        status: r.status ?? r.state ?? "",
        createdAt: r.createdAt ?? r.date ?? r.submittedAt ?? "",
        items,
        total,
      };
    });

    if (format === "xlsx") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Reservations");
      ws.columns = [
        { header: "Reservation ID", key: "id", width: 20 },
        { header: "User", key: "user", width: 25 },
        { header: "Status", key: "status", width: 15 },
        { header: "Created At", key: "createdAt", width: 20 },
        { header: "Items", key: "items", width: 80 },
        { header: "Total", key: "total", width: 12 },
      ];
      rows.forEach((r) => ws.addRow(r));
      const buffer = await wb.xlsx.writeBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="report_${String(month).padStart(2, "0")}_${year}.xlsx"`);
      return res.send(Buffer.from(buffer));
    }

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 30, size: "A4" });
      const filename = `report_${String(month).padStart(2, "0")}_${year}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      // stream PDF to response
      doc.pipe(res);
      doc.fontSize(16).text(`Monthly Report — ${String(month).padStart(2, "0")}/${year}`, { align: "center" });
      doc.moveDown();
      doc.fontSize(10);
      for (const r of rows) {
        doc.font("Helvetica-Bold").text(`Reservation: ${r.id} — ${r.status}`, { continued: false });
        doc.font("Helvetica").text(`User: ${r.user}  Created: ${r.createdAt}  Total: ${r.total.toFixed(2)}`);
        doc.text(`Items: ${r.items}`);
        doc.moveDown(0.5);
      }
      doc.end();
      return;
    }

    // fallback: return JSON url or CSV
    // produce CSV
    const csvHeader = ["Reservation ID,User,Status,Created At,Items,Total"].join(",");
    const csvRows = rows.map((r) => {
      const esc = (s) => `"${String(s || "").replace(/"/g, '""')}"`;
      return [esc(r.id), esc(r.user), esc(r.status), esc(r.createdAt), esc(r.items), esc(r.total)].join(",");
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="report_${String(month).padStart(2, "0")}_${year}.csv"`);
    return res.send([csvHeader].concat(csvRows).join("\n"));
  } catch (err) {
    console.error("[REPORTS] export error:", err);
    return res.status(500).json({ error: "Export failed", details: String(err.message || err) });
  }
};