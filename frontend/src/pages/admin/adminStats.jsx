// src/pages/admin/adminStats.jsx
import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import { TrendingUp, ClipboardList, Clock, Wallet, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const USE_FAKE = process.env.REACT_APP_FAKE_API === "1";
const FAKE_DB_KEY = "FAKE_DB_V1";

const CANONICAL_STATUSES = ["Pending", "Approved", "Preparing", "Ready", "Claimed", "Rejected"];

/** Normalize any incoming status to one of our canonical keys */
function normalizeStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "Pending";
  if (["pending"].includes(s)) return "Pending";
  if (["approved", "approve"].includes(s)) return "Approved";
  if (["preparing", "in-prep", "in_prep", "prep"].includes(s)) return "Preparing";
  if (["ready", "done"].includes(s)) return "Ready";
  if (["claimed", "pickedup", "picked_up", "picked-up"].includes(s)) return "Claimed";
  if (["rejected", "declined"].includes(s)) return "Rejected";
  // If API sends unknown strings, keep them from breaking counts:
  return "Pending";
}

/** Extract a creation/submission timestamp from many possible fields */
function getCreated(obj) {
  return (
    obj?.createdAt ||
    obj?.created_at ||
    obj?.submittedAt ||
    obj?.submitted_at ||
    obj?.date ||
    obj?.created ||
    obj?.updatedAt ||
    obj?.updated_at ||
    null
  );
}

/** Safe month check */
function isInThisMonth(iso, now = new Date()) {
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function AdminStats() {
  const navigate = useNavigate();
  useEffect(() => {
    const authToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!authToken || !storedUser) {
      navigate('/status/unauthorized');
    }
  }, [navigate]);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [topups, setTopups] = useState([]);
  const [dashboard, setDashboard] = useState({
    totalSales: 0,
    ordersToday: 0,
    newUsers: 0,
    pending: 0,
    recentOrders: [],
  });

  async function load() {
    setLoading(true);
    try {
      if (USE_FAKE) {
        const db = JSON.parse(localStorage.getItem(FAKE_DB_KEY) || "{}");
        setMenu(db.menu || []);
        setReservations(db.reservations || []);
        setTopups(db.topups || []);
      } else {
        // Correct endpoints:
        // - menu: GET /api/menu
        // - reservations (admin): GET /api/reservations/admin
        // - topups (admin): GET /api/admin/topups
        // - dashboard (admin): GET /api/admin/dashboard
        const [mres, rres, tres, dres] = await Promise.all([
          api.get("/menu").catch(() => []),
          api.get("/reservations/admin").catch(() => []),
          api.get("/admin/topups").catch(() => []),
          api.get("/admin/dashboard").catch(() => ({})),
        ]);

        const unwrap = (res) => {
          if (res == null) return null;
          if (Array.isArray(res)) return res;
          if (typeof res === "object" && Object.prototype.hasOwnProperty.call(res, "data")) return res.data;
          return res;
        };

        const m = unwrap(mres) || [];
        const r = unwrap(rres) || [];

        // normalize topup proof URLs if server returns relative paths
        const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
        const norm = (u) => (u && typeof u === "string" && u.startsWith("/") ? API_BASE + u : u);
        const t = (unwrap(tres) || []).map((x) => ({ ...x, proofUrl: norm(x?.proofUrl) }));

        const d = unwrap(dres) || {};

        setMenu(m);
        setReservations(r);
        setTopups(t);
        setDashboard({
          totalSales: Number(d.totalSales) || 0,
          ordersToday: Number(d.ordersToday) || 0,
          newUsers: Number(d.newUsers) || 0,
          pending: Number(d.pending) || 0,
          recentOrders: Array.isArray(d.recentOrders) ? d.recentOrders : d.recentOrders ? [d.recentOrders] : [],
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Map menu by id for quick lookup
  const menuById = useMemo(() => {
    const map = {};
    for (const m of menu || []) map[String(m.id)] = m;
    return map;
  }, [menu]);

  // Filter reservations/topups to this month
  const now = new Date();
  const resMonth = useMemo(
    () => (reservations || []).filter((r) => isInThisMonth(getCreated(r), now)),
    [reservations, now]
  );

  const topMonth = useMemo(
    () => (topups || []).filter((t) => isInThisMonth(getCreated(t), now)),
    [topups, now]
  );

  // Revenue & reservation status breakdown
  const resStats = useMemo(() => {
    let revenue = 0;

    // initialize counts with all keys so UI never shows undefined
    const counts = CANONICAL_STATUSES.reduce((acc, k) => ((acc[k] = 0), acc), {});
    const byCategory = {};
    const byItem = {};

    for (const r of resMonth) {
      const status = normalizeStatus(r?.status);
      if (counts[status] !== undefined) counts[status]++;

      // Only add to revenue if not rejected and items are present
      if (status !== "Rejected" && Array.isArray(r?.items)) {
        for (const it of r.items) {
          const rid = it?.id;
          const qty = Number(it?.qty) || 0;

          // Attempt to resolve through the current menu
          let m = menuById[String(rid)];
          if (!m) {
            // Support ids like "ITM-5" vs "5"
            const incoming = String(rid ?? "").trim();
            const incomingSuffix = incoming.split("-").pop();
            m = Object.values(menuById).find((x) => {
              const sid = String(x?.id ?? "").trim();
              const sfx = sid.split("-").pop();
              return (sfx && incomingSuffix && sfx === incomingSuffix) || sid === incoming;
            });
          }

          const price = Number(m?.price ?? it?.price ?? 0) || 0;
          const name = m?.name ?? it?.name ?? `#${rid}`;
          const cat = m?.category ?? it?.category ?? "Uncategorized";

          const line = price * qty;
          revenue += line;

          byCategory[cat] = (byCategory[cat] || 0) + line;

          if (!byItem[name]) byItem[name] = { name, qty: 0, revenue: 0 };
          byItem[name].qty += qty;
          byItem[name].revenue += line;
        }
      }
    }

    const categoryRows = Object.entries(byCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const topItems = Object.values(byItem)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      revenue,
      orders: resMonth.length,
      counts,
      categoryRows,
      topItems,
      pendingReservations: counts.Pending,
    };
  }, [resMonth, menuById]);

  // Top-up stats
  const topupStats = useMemo(() => {
    let pending = 0,
      approvedAmt = 0,
      approvedCount = 0,
      rejected = 0;
    for (const t of topMonth) {
      const s = String(t?.status || "").toLowerCase();
      if (s === "pending") pending++;
      else if (s === "approved") {
        approvedCount++;
        approvedAmt += Number(t?.amount) || 0;
      } else if (s === "rejected") rejected++;
    }
    return { pending, approvedAmt, approvedCount, rejected, total: topMonth.length };
  }, [topMonth]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <section className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Statistics</h1>
            <p className="text-gray-600">Month-to-date overview for the canteen.</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </section>

        {/* KPI cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Revenue (this month)</span>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {peso.format((dashboard.totalSales || 0) || resStats.revenue || 0)}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Orders (this month)</span>
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {resStats.orders}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Pending reservations</span>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {resStats.pendingReservations}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Pending top-ups</span>
              <Wallet className="w-5 h-5 text-violet-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{topupStats.pending}</div>
          </div>
        </section>

        {/* Status breakdown + Top-ups summary + Revenue by category */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reservation status table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reservation status (this month)</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {CANONICAL_STATUSES.map((label) => (
                  <tr key={label}>
                    <td className="py-2 text-gray-600">{label}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">
                      {resStats.counts[label]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top-ups quick stats */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top-ups (this month)</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 text-gray-600">Approved</td>
                  <td className="py-2 text-right font-semibold text-gray-900">
                    {topupStats.approvedCount}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">Approved amount</td>
                  <td className="py-2 text-right font-semibold text-gray-900">
                    {peso.format(topupStats.approvedAmt || 0)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">Pending</td>
                  <td className="py-2 text-right font-semibold text-gray-900">
                    {topupStats.pending}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">Rejected</td>
                  <td className="py-2 text-right font-semibold text-gray-900">
                    {topupStats.rejected}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Revenue by category */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by category</h3>
            {resStats.categoryRows.length === 0 ? (
              <p className="text-sm text-gray-500">No data yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-2">Category</th>
                    <th className="py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resStats.categoryRows.map((row) => (
                    <tr key={row.category}>
                      <td className="py-2 text-gray-700">{row.category}</td>
                      <td className="py-2 text-right font-semibold text-gray-900">
                        {peso.format(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Top items */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top items (this month)</h3>
          {resStats.topItems.length === 0 ? (
            <p className="text-sm text-gray-500">No data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resStats.topItems.map((it) => (
                  <tr key={it.name}>
                    <td className="py-2 text-gray-700">{it.name}</td>
                    <td className="py-2 text-right text-gray-700">{it.qty}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">
                      {peso.format(it.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {loading && <div className="text-center text-sm text-gray-500">Loading…</div>}
      </main>
    </div>
  );
}
