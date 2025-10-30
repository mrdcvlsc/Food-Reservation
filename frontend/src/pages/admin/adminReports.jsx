// ...new file...
import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";
import {
  TrendingUp,
  ClipboardList,
  Clock,
  Wallet,
  RefreshCw,
  Download,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const USE_FAKE = process.env.REACT_APP_FAKE_API === "1";
const FAKE_DB_KEY = "FAKE_DB_V1";

const CANONICAL_STATUSES = ["Pending", "Approved", "Preparing", "Ready", "Claimed", "Rejected"];
function normalizeStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "Pending";
  if (["pending"].includes(s)) return "Pending";
  if (["approved", "approve"].includes(s)) return "Approved";
  if (["preparing", "in-prep", "in_prep", "prep"].includes(s)) return "Preparing";
  if (["ready", "done"].includes(s)) return "Ready";
  if (["claimed", "pickedup", "picked_up", "picked-up"].includes(s)) return "Claimed";
  if (["rejected", "declined"].includes(s)) return "Rejected";
  return "Pending";
}
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
function isInThisMonth(iso, now = new Date()) {
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function AdminReports() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: "admin" });
    })();
  }, [navigate]);

  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  // report data (original)
  const [report, setReport] = useState(null);

  // stats data (from previous adminStats)
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

  const load = async () => {
    setLoading(true);
    try {
      if (USE_FAKE) {
        const db = JSON.parse(localStorage.getItem(FAKE_DB_KEY) || "{}");
        setMenu(db.menu || []);
        setReservations(db.reservations || []);
        setTopups(db.topups || []);
        setReport(db.report || null);
        setDashboard((d) => ({ ...d }));
      } else {
        const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
        const reportUrl = `/reports/monthly?month=${String(month).padStart(2, "0")}&year=${year}`;
        const [mres, rres, tres, dres, repres] = await Promise.all([
          api.get("/menu").catch(() => []),
          api.get("/reservations/admin").catch(() => []),
          api.get("/admin/topups").catch(() => []),
          api.get("/admin/dashboard").catch(() => ({})),
          api.get(reportUrl).catch(() => null),
        ]);

        const unwrap = (res) => {
          if (res == null) return null;
          if (Array.isArray(res)) return res;
          if (typeof res === "object" && Object.prototype.hasOwnProperty.call(res, "data")) return res.data;
          return res;
        };

        const m = unwrap(mres) || [];
        const r = unwrap(rres) || [];
        const t = (unwrap(tres) || []).map((x) => {
          const norm = (u) => (u && typeof u === "string" && u.startsWith("/") ? API_BASE + u : u);
          return { ...x, proofUrl: norm(x?.proofUrl) };
        });
        const d = unwrap(dres) || {};
        const rep = unwrap(repres) || null;

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
        setReport(rep);
      }
    } catch (e) {
      console.error("Load failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load + reload when month/year changes
    // also refresh when admin updates menu/reservations elsewhere
    let mounted = true;
    const doLoad = async () => {
      await load();
    };
    doLoad();
    const onUpdate = () => {
      // debounce-ish: schedule a reload in next tick
      setTimeout(() => { if (mounted) doLoad(); }, 50);
    };
    window.addEventListener("menu:updated", onUpdate);
    window.addEventListener("reservations:updated", onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener("menu:updated", onUpdate);
      window.removeEventListener("reservations:updated", onUpdate);
    };
  }, [month, year]);

  // derived helpers for stats UI (copied from adminStats)
  const menuById = useMemo(() => {
    const map = {};
    for (const m of menu || []) map[String(m.id)] = m;
    return map;
  }, [menu]);

  const now = useMemo(() => new Date(), []);
  const resMonth = useMemo(() => (reservations || []).filter((r) => isInThisMonth(getCreated(r), now)), [reservations, now]);
  const topMonth = useMemo(() => (topups || []).filter((t) => isInThisMonth(getCreated(t), now)), [topups, now]);

  const resStats = useMemo(() => {
    let revenue = 0;
    const counts = CANONICAL_STATUSES.reduce((acc, k) => { acc[k] = 0; return acc; }, {});
    const byCategory = {};
    const byItem = {};

    // only count revenue (and include items/categories) for orders that are approved or beyond
    const revenueStatuses = new Set(["Approved", "Preparing", "Ready", "Claimed"]);

    for (const r of resMonth) {
      const status = normalizeStatus(r?.status);
      counts[status] = (counts[status] || 0) + 1;
      const includeRevenue = revenueStatuses.has(status);
      if (status !== "Rejected" && Array.isArray(r?.items)) {
        for (const it of r.items) {
          // robust id/qty/price/name/category detection (include productId/itemId/_id)
          const rid = String(it?.id ?? it?.productId ?? it?.itemId ?? it?._id ?? "").trim();
          const qty = Number(it?.qty ?? it?.quantity ?? it?.count ?? 0) || 0;

          let m = menuById[rid];
          if (!m && rid) {
            const incomingSuffix = rid.split("-").pop();
            m = Object.values(menuById).find((x) => {
              const sid = String(x?.id ?? x?._id ?? "").trim();
              const sfx = sid.split("-").pop();
              return (sfx && incomingSuffix && sfx === incomingSuffix) || sid === rid;
            });
          }

          const price = Number(it?.price ?? it?.unitPrice ?? m?.price ?? 0) || 0;
          const name = m?.name ?? it?.name ?? it?.title ?? `#${rid || Math.random().toString(36).slice(2,7)}`;
          const cat = m?.category ?? it?.category ?? it?.type ?? "Uncategorized";
          const line = price * qty;
          // only add revenue / item quantities into aggregates when order is approved (or later)
          if (includeRevenue) {
            revenue += line;
            byCategory[cat] = (byCategory[cat] || 0) + line;
            if (!byItem[name]) byItem[name] = { name, qty: 0, revenue: 0, category: cat, unitPrice: price || 0 };
            byItem[name].qty += qty;
            byItem[name].revenue += line;
          } else {
            // ensure item exists so lists remain stable, but don't add qty/revenue
            if (!byItem[name]) byItem[name] = { name, qty: 0, revenue: 0, category: cat, unitPrice: price || 0 };
          }
          // keep last known unit price if available
          if (price) byItem[name].unitPrice = price;
        }
      }
    }

    const categoryRows = Object.entries(byCategory).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
    const topItems = Object.values(byItem).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    return {
      revenue,
      orders: resMonth.length,
      counts,
      categoryRows,
      topItems,
      pendingReservations: counts.Pending,
    };
  }, [resMonth, menuById]);

  // derive top-up stats for current month (used in KPIs and Top-ups table)
  const topupStats = useMemo(() => {
    const list = Array.isArray(topMonth) ? topMonth : [];
    let approvedCount = 0;
    let approvedAmt = 0;
    let pending = 0;
    let rejected = 0;
    for (const t of list) {
      const st = String(t?.status || t?.state || "").toLowerCase();
      const amt = Number(t?.amount ?? t?.amt ?? t?.value ?? 0) || 0;
      if (st.includes("approve")) {
        approvedCount += 1;
        approvedAmt += amt;
      } else if (st.includes("pending")) {
        pending += 1;
      } else if (st.includes("reject") || st.includes("decline")) {
        rejected += 1;
      } else {
        // unknown -> treat as pending
        pending += 1;
      }
    }
    return { approvedCount, approvedAmt, pending, rejected };
  }, [topMonth]);

  // report visual data (original adminReports logic)
  // unified top-products / categories source:
  // prefer server report, otherwise build from computed month stats (resStats)
  const topProducts = (Array.isArray(report?.topProducts) && report.topProducts.length > 0)
    ? report.topProducts
    : (resStats.topItems || []).map((it) => ({ name: it.name, qty: it.qty, revenue: it.revenue }));
  const topCategories = (Array.isArray(report?.topCategories) && report.topCategories.length > 0)
    ? report.topCategories
    : (resStats.categoryRows || []).map((c) => ({ category: c.category, revenue: c.amount }));

  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = useMemo(() => {
    const s = new Set();
    s.add("All");
    // source: server report categories
    if (Array.isArray(report?.topCategories)) {
      for (const c of report.topCategories) if (c?.category) s.add(c.category);
    }
    // source: server/topProducts categories
    if (Array.isArray(report?.topProducts)) {
      for (const p of report.topProducts) if (p?.category) s.add(p.category);
    }
    // source: computed categories
    for (const c of resStats.categoryRows || []) if (c?.category) s.add(c.category);
    // source: menu
    for (const m of menu || []) if (m?.category) s.add(m.category);
    return Array.from(s);
  }, [report, resStats, menu]);

  // filtered data according to selectedCategory
  const filteredTopProducts = useMemo(() => {
    const source = (Array.isArray(report?.topProducts) && report.topProducts.length > 0)
      ? report.topProducts
      : (resStats.topItems || []);
    if (!selectedCategory || selectedCategory === "All") return source;
    const sc = String(selectedCategory).toLowerCase();
    return source.filter((p) => String(p?.category || p?.cat || "").toLowerCase() === sc);
  }, [report, resStats, selectedCategory]);

  const filteredResTopItems = useMemo(() => {
    if (!selectedCategory || selectedCategory === "All") return resStats.topItems || [];
    const sc = String(selectedCategory).toLowerCase();
    return (resStats.topItems || []).filter((it) => String(it?.category || "").toLowerCase() === sc);
  }, [resStats, selectedCategory]);

  // pie data varies: all-categories -> topCategories (by category), else product breakdown for category
  const pieForCategory = useMemo(() => {
    if (!selectedCategory || selectedCategory === "All") {
      // original topCategories (server) or fallback to resStats.categoryRows
      const source = Array.isArray(topCategories) && topCategories.length > 0
        ? topCategories
        : (resStats.categoryRows || []);
      const labels = source.map((c) => c.category || c.name);
      const data = source.map((c) => Number(c.revenue || c.amount || 0));
      const colors = ["#60A5FA", "#34D399", "#FBBF24", "#F87171", "#A78BFA", "#F472B6", "#93C5FD"];
      return {
        labels,
        datasets: [{ data, backgroundColor: labels.map((_, i) => colors[i % colors.length]) }],
      };
    } else {
      // Show items in the selected category (use filteredTopProducts or filteredResTopItems)
      const source = (filteredTopProducts && filteredTopProducts.length > 0) ? filteredTopProducts : filteredResTopItems;
      const labels = source.map((p) => p.name || p.itemId || p.label);
      const data = source.map((p) => Number(p.revenue || p.amount || p.revenue || 0));
      const colors = ["#60A5FA", "#34D399", "#FBBF24", "#F87171", "#A78BFA", "#F472B6", "#93C5FD"];
      return {
        labels,
        datasets: [{ data, backgroundColor: labels.map((_, i) => colors[i % colors.length]) }],
      };
    }
  }, [selectedCategory, topCategories, resStats, filteredTopProducts, filteredResTopItems]);

  // use filteredTopProducts for bar chart
  const productsBar = useMemo(() => {
    const labels = (filteredTopProducts || []).map((p) => p.name || p.itemId || p.label);
    return {
      labels,
      datasets: [
        { label: "Qty sold", data: (filteredTopProducts || []).map((p) => Number(p.qty || 0)), backgroundColor: "rgba(59,130,246,0.85)" },
        { label: "Revenue", data: (filteredTopProducts || []).map((p) => Number(p.revenue || 0)), backgroundColor: "rgba(16,185,129,0.85)" },
      ],
    };
  }, [filteredTopProducts]);

  const fmt = (v) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(v || 0);

  // Export helper: request server export endpoint with desired format.
  // Server may return a direct file (blob) or JSON { url: "<public url>" }.
  const doExport = async (format = "xlsx") => {
    try {
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
      const exportUrl = `${API_BASE}/reports/export?month=${String(month).padStart(2, "0")}&year=${year}&format=${format}`;

      const token = localStorage.getItem("token");
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const resp = await fetch(exportUrl, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!resp.ok) {
        // try to read JSON { url } or error message
        const text = await resp.text();
        try {
          const j = JSON.parse(text);
          if (j && j.url) {
            window.open(j.url, "_blank");
            return;
          }
        } catch {}
        console.error("Export failed status", resp.status, text);
        throw new Error(`Export failed (${resp.status})`);
      }

      const contentType = (resp.headers.get("content-type") || "").toLowerCase();

      if (contentType.includes("application/json")) {
        const j = await resp.json();
        if (j && j.url) {
          window.open(j.url, "_blank");
          return;
        }
        throw new Error("Export returned no file URL");
      }

      // download blob - prefer filename from Content-Disposition
      const blob = await resp.blob();
      const cd = resp.headers.get("content-disposition") || "";
      let filename = `report_${String(month).padStart(2, "0")}_${year}.${format === "pdf" ? "pdf" : format === "xlsx" ? "xlsx" : "csv"}`;
      const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/i);
      if (m && m[1]) {
        filename = decodeURIComponent(m[1].replace(/["']/g, ""));
      }

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Export failed", e);
      alert("Export failed — check backend export endpoint and server logs.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <section className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Statistics</h1>
            <p className="text-gray-600">Combined monthly reports and current month statistics.</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border rounded px-3 py-2">
              {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{String(i+1).padStart(2,"0")}</option>)}
            </select>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 border rounded px-3 py-2" />
            <button type="button" onClick={load} className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={() => doExport("xlsx")} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-emerald-700">
              <Download className="w-4 h-4" /> Download Excel
            </button>
            <button onClick={() => doExport("pdf")} className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700">
              <Download className="w-4 h-4" /> Download PDF
            </button>
           </div>
        </section>

        {/* KPI cards (from previous Stats page) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Revenue (this month)</span>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{peso.format((dashboard.totalSales || 0) || resStats.revenue || 0)}</div>
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
            <div className="text-3xl font-bold text-gray-900">{topupStats?.pending ?? topMonth.length}</div>
          </div>
        </section>

        {/* Reservation status + revenue by category (from previous Stats page) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reservation status (this month)</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {CANONICAL_STATUSES.map((label) => (
                  <tr key={label}>
                    <td className="py-2 text-gray-600">{label}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{resStats.counts[label]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top-ups (this month)</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr><td className="py-2 text-gray-600">Approved</td><td className="py-2 text-right font-semibold text-gray-900">{topupStats?.approvedCount ?? 0}</td></tr>
                <tr><td className="py-2 text-gray-600">Approved amount</td><td className="py-2 text-right font-semibold text-gray-900">{fmt(topupStats?.approvedAmt ?? 0)}</td></tr>
                <tr><td className="py-2 text-gray-600">Pending</td><td className="py-2 text-right font-semibold text-gray-900">{topupStats?.pending ?? 0}</td></tr>
                <tr><td className="py-2 text-gray-600">Rejected</td><td className="py-2 text-right font-semibold text-gray-900">{topupStats?.rejected ?? 0}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by category</h3>
            {resStats.categoryRows.length === 0 ? (
              <p className="text-sm text-gray-500">No data yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr><th className="py-2">Category</th><th className="py-2 text-right">Revenue</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resStats.categoryRows.map((row) => (
                    <tr key={row.category}><td className="py-2 text-gray-700">{row.category}</td><td className="py-2 text-right font-semibold text-gray-900">{peso.format(row.amount)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Category filters (APPLIES TO ALL TOP LISTS & CHARTS) */}
        <section className="bg-white p-4 rounded shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex flex-wrap gap-2 items-center">
                {categories.map((c) => {
                  const active = String(c) === String(selectedCategory);
                  return (
                    <button
                      key={c}
                      onClick={() => setSelectedCategory(c)}
                      className={`text-sm px-3 py-2 rounded-lg border ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200"} hover:opacity-90`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <div className="text-sm text-gray-500 mt-2">Filters apply to all top lists and charts. Showing: <strong>{selectedCategory}</strong></div>
            </div>
            <div className="text-sm text-gray-500">Tip: select a category to filter Top Products, Top items (this month) and the charts.</div>
          </div>
        </section>

        {/* Top items & report visuals (existing adminReports content) */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top items (this month)</h3>
          {filteredResTopItems.length === 0 ? (
            <p className="text-sm text-gray-500">No data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2">Item</th>
                  <th className="py-2">Category</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredResTopItems.map((it, idx) => (
                  <tr key={(it.name || idx) + idx}>
                    <td className="py-2 text-gray-700">{it.name}</td>
                    <td className="py-2 text-gray-600">{it.category || "Uncategorized"}</td>
                    <td className="py-2 text-right text-gray-700">{it.qty}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{peso.format(it.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Top Products (from monthly report if available, otherwise fall back to computed top items) */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products (report)</h3>
          { ((filteredTopProducts && filteredTopProducts.length > 0) || (filteredResTopItems && filteredResTopItems.length > 0)) ? (
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(filteredTopProducts && filteredTopProducts.length > 0 ? filteredTopProducts : filteredResTopItems).map((p, i) => {
                  const name = p.name || p.itemId || p.label || `#${i+1}`;
                  const qty = Number(p.qty || p.quantity || p.qty_sold || 0) || 0;
                  const revenue = Number(p.revenue || p.amount || 0) || 0;
                  return (
                    <tr key={name + i}>
                      <td className="py-2 text-gray-700">{name}</td>
                      <td className="py-2 text-right text-gray-700">{qty}</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{peso.format(revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500">No report data available yet.</p>
          )}
        </section>

        {/* Charts: show using report data when present or computed fallback otherwise */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="col-span-2 bg-white p-6 rounded shadow">
            <h3 className="font-semibold mb-3">Top Products (Qty & Revenue)</h3>
            {topProducts.length === 0 ? <div className="text-sm text-gray-500">No top product data yet.</div> : <Bar data={productsBar} options={{ responsive: true, plugins: { legend: { position: "top" } } }} />}
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h3 className="font-semibold mb-3">Category Revenue Share</h3>
            <div className="mb-3">
              {topCategories.length === 0 ? <div className="text-sm text-gray-500">No category data yet.</div> : <Pie data={pieForCategory} options={{ responsive: true, plugins: { legend: { position: "right" } } }} />}
            </div>
            <div className="text-sm text-gray-600">
              {
                // show category list when "All", otherwise show top items for selected category
                (selectedCategory === "All"
                  ? (topCategories || []).slice(0, 5).map((c, idx) => ({ label: c.category || c.name, amount: Number(c.revenue || c.amount || 0) }))
                  : ((filteredTopProducts && filteredTopProducts.length > 0
                      ? filteredTopProducts.slice(0, 5)
                      : (filteredResTopItems || []).slice(0, 5)
                    ).map((p) => ({ label: p.name, amount: Number(p.revenue || p.amount || 0) })))
                ).map((row, idx) => (
                  <div key={(row.label || idx) + idx} className="flex justify-between py-1">
                    <div>{row.label}</div>
                    <div className="font-medium">{fmt(row.amount)}</div>
                  </div>
                ))
              }
            </div>
          </div>
        </section>

        {loading && <div className="text-center text-sm text-gray-500">Loading…</div>}
      </main>
    </div>
  );
}