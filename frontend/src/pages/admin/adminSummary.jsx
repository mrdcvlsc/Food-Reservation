// src/pages/admin/adminSummary.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import {
  RefreshCw,
  Search,
  Filter,
  Download,
  Clock,
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const USE_FAKE = process.env.REACT_APP_FAKE_API === "1";
const FAKE_DB_KEY = "FAKE_DB_V1";

const SLOT_LABELS = {
  recess: "Recess",
  lunch: "Lunch",
  after: "After Class",
};

export default function AdminSummary() {
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      navigate('/status/unauthorized');
    }
  }, [navigate]);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState([]);
  const [reservations, setReservations] = useState([]);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [slot, setSlot] = useState("all");
  const [range, setRange] = useState("today"); // today | week | all

  // ---------- load ----------
  const load = async () => {
    setLoading(true);
    try {
      if (USE_FAKE) {
        const db = JSON.parse(localStorage.getItem(FAKE_DB_KEY) || "{}");
        setMenu(db.menu || []);
        setReservations(db.reservations || []);
      } else {
        const [m, r] = await Promise.all([
          api.get("/menu").catch(() => []),
          api.get("/admin/reservations").catch(() => []),
        ]);
        setMenu(Array.isArray(m) ? m : []);
        setReservations(Array.isArray(r) ? r : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const menuById = useMemo(() => {
    const map = {};
    for (const m of menu) map[Number(m.id)] = m;
    return map;
  }, [menu]);

  // ---------- helpers ----------
  const inSelectedRange = (iso) => {
    if (range === "all") return true;
    const d = new Date(iso);
    if (isNaN(d)) return false;

    const now = new Date();
    if (range === "today") {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
    if (range === "week") {
      // last 7 days
      const seven = new Date(now);
      seven.setDate(now.getDate() - 6);
      // zero-out times for inclusive range
      seven.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return d >= seven && d <= end;
    }
    return true;
  };

  const deriveTotal = (r) => {
    // prefer backend-provided total
    if (typeof r.total === "number") return r.total;
    if (!Array.isArray(r.items)) return 0;
    return r.items.reduce((sum, { id, qty }) => {
      const m = menuById[Number(id)];
      return sum + (Number(m?.price) || 0) * (Number(qty) || 0);
    }, 0);
  };

  // ---------- filtered rows ----------
  const filtered = useMemo(() => {
    let rows = reservations.slice();

    // date range
    rows = rows.filter((r) => inSelectedRange(r.createdAt));

    // status
    if (status !== "all") rows = rows.filter((r) => (r.status || "Pending") === status);

    // slot
    if (slot !== "all") rows = rows.filter((r) => (r.slot || "") === slot);

    // search (id / grade / section / note)
    const s = q.trim().toLowerCase();
    if (s) {
      rows = rows.filter((r) => {
        const hay = [
          r.id,
          r.grade,
          r.section,
          r.note,
          (SLOT_LABELS[r.slot] || r.slot || ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(s);
      });
    }

    // attach derived fields for rendering/sorting if needed
    return rows.map((r) => ({
      ...r,
      _total: deriveTotal(r),
      _itemsCount: Array.isArray(r.items)
        ? r.items.reduce((n, it) => n + (Number(it.qty) || 0), 0)
        : 0,
    }));
  }, [reservations, status, slot, q, range, menuById]);

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const orders = filtered.length;
    const revenue = filtered
      .filter((r) => (r.status || "Pending") !== "Rejected")
      .reduce((s, r) => s + (r._total || 0), 0);

    let pending = 0, approved = 0, preparing = 0, ready = 0, claimed = 0, rejected = 0;
    for (const r of filtered) {
      const st = r.status || "Pending";
      if (st === "Pending") pending++;
      else if (st === "Approved") approved++;
      else if (st === "Preparing") preparing++;
      else if (st === "Ready") ready++;
      else if (st === "Claimed") claimed++;
      else if (st === "Rejected") rejected++;
    }

    return { orders, revenue, pending, approved, preparing, ready, claimed, rejected };
  }, [filtered]);

  // ---------- export CSV ----------
  const exportCSV = () => {
    const headers = [
      "id",
      "createdAt",
      "slot",
      "grade",
      "section",
      "status",
      "items",
      "total",
      "note",
    ];
    const lines = [headers.join(",")];

    for (const r of filtered) {
      const row = [
        r.id,
        r.createdAt,
        SLOT_LABELS[r.slot] || r.slot || "",
        r.grade || "",
        r.section || "",
        r.status || "",
        r._itemsCount,
        (r._total || 0).toFixed(2),
        (r.note || "").replace(/[\r\n,]/g, " "), // basic sanitization
      ];
      lines.push(row.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const label =
      range === "today" ? "today" : range === "week" ? "week" : "all";
    a.download = `order-summary-${label}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Summary</h1>
            <p className="text-gray-600">Track revenue and reservations at a glance.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search ID / grade / section / note…"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All status</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Preparing</option>
                <option>Ready</option>
                <option>Claimed</option>
                <option>Rejected</option>
              </select>
            </div>

            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All pickup windows</option>
              <option value="recess">Recess</option>
              <option value="lunch">Lunch</option>
              <option value="after">After Class</option>
            </select>

            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-600">Revenue ({rangeLabel(range)})</div>
            <div className="mt-1 text-3xl font-bold text-gray-900">{peso.format(kpis.revenue || 0)}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-600">Orders</div>
            <div className="mt-1 text-3xl font-bold text-gray-900">{kpis.orders}</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-600">Pending / Approved</div>
            <div className="mt-1 text-3xl font-bold text-gray-900">
              {kpis.pending + kpis.approved}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Ready</div>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="mt-1 text-3xl font-bold text-gray-900">{kpis.ready}</div>
          </div>
        </section>

        {/* Table */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Pickup</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Grade/Section</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">Loading…</td>
                  </tr>
                )}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                      No reservations found for the selected filters.
                    </td>
                  </tr>
                )}

                {!loading && filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{r.id}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{SLOT_LABELS[r.slot] || r.slot || "-"}</td>
                    <td className="px-6 py-3 text-center text-sm text-gray-700">{r._itemsCount}</td>
                    <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      {peso.format(r._total || 0)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusPill(r.status)}`}>
                        {r.status || "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {(r.grade || "-")}/{(r.section || "-")}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 max-w-[16rem] truncate" title={r.note || ""}>
                      {r.note || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---------- small UI helpers ---------- */
function rangeLabel(r) {
  if (r === "today") return "today";
  if (r === "week") return "this week";
  return "all time";
}
function statusPill(st) {
  switch (st) {
    case "Approved":  return "bg-amber-50 text-amber-700 border border-amber-200";
    case "Preparing": return "bg-amber-50 text-amber-700 border border-amber-200";
    case "Ready":     return "bg-blue-50 text-blue-700 border border-blue-200";
    case "Claimed":   return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "Rejected":  return "bg-rose-50 text-rose-700 border border-rose-200";
    case "Pending":
    default:          return "bg-gray-100 text-gray-700 border border-gray-200";
  }
}
