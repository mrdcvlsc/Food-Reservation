// src/pages/admin/adminStats.jsx
import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import {
  TrendingUp,
  ClipboardList,
  Clock,
  Wallet,
  RefreshCw,
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const USE_FAKE = process.env.REACT_APP_FAKE_API === "1";
const FAKE_DB_KEY = "FAKE_DB_V1";

export default function AdminStats() {
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [topups, setTopups] = useState([]);

  const now = new Date();
  const inThisMonth = (iso) => {
    const d = new Date(iso);
    return !isNaN(d) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  async function load() {
    setLoading(true);
    try {
      if (USE_FAKE) {
        const db = JSON.parse(localStorage.getItem(FAKE_DB_KEY) || "{}");
        setMenu(db.menu || []);
        setReservations(db.reservations || []);
        setTopups(db.topups || []);
      } else {
        const m = await api.get("/menu").catch(() => []);
        const r = await api.get("/admin/reservations").catch(() => []);
        const t = await api.get("/admin/topups").catch(() => []);
        setMenu(Array.isArray(m) ? m : []);
        setReservations(Array.isArray(r) ? r : []);
        setTopups(Array.isArray(t) ? t : []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const menuById = useMemo(() => {
    const map = {};
    for (const m of menu || []) map[Number(m.id)] = m;
    return map;
  }, [menu]);

  // Only this month’s reservations/topups
  const resMonth = useMemo(
    () => reservations.filter((r) => inThisMonth(r.createdAt)),
    [reservations]
  );
  const topMonth = useMemo(
    () => topups.filter((t) => inThisMonth(t.createdAt)),
    [topups]
  );

  // Build revenue + breakdowns
  const resStats = useMemo(() => {
    let revenue = 0;
    let counts = { Pending: 0, Approved: 0, Preparing: 0, Ready: 0, Claimed: 0, Rejected: 0 };
    const byCategory = {};
    const byItem = {};

    for (const r of resMonth) {
      const status = r.status || "Pending";
      if (counts[status] !== undefined) counts[status]++;

      // Revenue: count every non-rejected reservation by item lines
      if (status !== "Rejected" && Array.isArray(r.items)) {
        for (const { id, qty } of r.items) {
          const m = menuById[Number(id)];
          const price = Number(m?.price || 0);
          const cat = m?.category || "Uncategorized";
          const name = m?.name || `#${id}`;
          const line = price * (Number(qty) || 0);

          revenue += line;
          byCategory[cat] = (byCategory[cat] || 0) + line;

          if (!byItem[name]) byItem[name] = { name, qty: 0, revenue: 0 };
          byItem[name].qty += Number(qty) || 0;
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
      readyReservations: counts.Ready,
    };
  }, [resMonth, menuById]);

  const topupStats = useMemo(() => {
    let pending = 0, approvedAmt = 0, approvedCount = 0, rejected = 0;
    for (const t of topMonth) {
      if (t.status === "Pending") pending++;
      else if (t.status === "Approved") { approvedCount++; approvedAmt += Number(t.amount) || 0; }
      else if (t.status === "Rejected") rejected++;
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
              {peso.format(resStats.revenue || 0)}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Orders (this month)</span>
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{resStats.orders}</div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Pending reservations</span>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{resStats.pendingReservations}</div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Pending top-ups</span>
              <Wallet className="w-5 h-5 text-violet-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{topupStats.pending}</div>
          </div>
        </section>

        {/* Status breakdown + Top-ups summary */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reservation status table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reservation status (this month)</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {[
                  ["Pending", resStats.counts.Pending],
                  ["Approved", resStats.counts.Approved],
                  ["Preparing", resStats.counts.Preparing],
                  ["Ready", resStats.counts.Ready],
                  ["Claimed", resStats.counts.Claimed],
                  ["Rejected", resStats.counts.Rejected],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td className="py-2 text-gray-600">{label}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{val}</td>
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

        {loading && (
          <div className="text-center text-sm text-gray-500">Loading…</div>
        )}
      </main>
    </div>
  );
}
