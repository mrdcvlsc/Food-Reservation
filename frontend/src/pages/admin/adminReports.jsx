// filepath: c:\Documents\Food-Reservation\Food-Reservation\frontend\src\pages\admin\adminReports.jsx
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
// iso: date string; month: string ("all" or "1".."12"); year: string ("all" or "2025"...)
function isInMonth(iso, month = "all", year = "all") {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d)) return false;
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  if ((month === "all" || month === undefined) && (year === "all" || year === undefined)) {
    return true; // all time
  }
  if (month === "all" || month === undefined) {
    // match any month of the given year
    return Number(year) === y;
  }
  if (year === "all" || year === undefined) {
    // match given month across all years
    return Number(month) === m;
  }
  // both specified
  return Number(month) === m && Number(year) === y;
}

export default function AdminReports() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: "admin" });
    })();
  }, [navigate]);

  // keep month/year as strings so we can use "all"
  const now = new Date();
  const [month, setMonth] = useState(() => String(now.getMonth() + 1));
  const [year, setYear] = useState(() => String(now.getFullYear()));
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
        // build report url depending on "all" selection
        const qp = [];
        if (month !== "all") qp.push(`month=${String(month).padStart(2, "0")}`);
        if (year !== "all") qp.push(`year=${year}`);
        const reportUrl = qp.length ? `/reports/monthly?${qp.join("&")}` : `/reports/monthly`;
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

  // compute reservations/topups that fall into the selected month/year (supports "all")
  const resMonth = useMemo(() => (reservations || []).filter((r) => isInMonth(getCreated(r), month, year)), [reservations, month, year]);
  const topMonth = useMemo(() => (topups || []).filter((t) => isInMonth(getCreated(t), month, year)), [topups, month, year]);

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
  // base topProducts (from server report if available, otherwise from computed resStats)
  const topProducts = (Array.isArray(report?.topProducts) && report.topProducts.length > 0)
    ? report.topProducts
    : (resStats.topItems || []).map((it) => ({ name: it.name, qty: it.qty, revenue: it.revenue, category: it.category }));

  // Ensure menu items (new uploads) appear in the "All" period:
  // Build totals from raw reservations (useful for All-time merges)
  const totalsFromReservations = useMemo(() => {
    const byName = {};
    const byId = {};
    const bySuffix = {};
    const APPROVED_SET = new Set(["Approved", "Preparing", "Ready", "Claimed"]);
    for (const r of reservations || []) {
      // only include reservations that are approved or beyond
      const rStatus = normalizeStatus(r?.status);
      if (!APPROVED_SET.has(rStatus)) continue;
      // apply month/year filter so totals match the current period selection
      if (!(month === "all" && year === "all")) {
        const created = getCreated(r);
        if (!isInMonth(created, month, year)) continue;
      }
      if (!Array.isArray(r.items)) continue;
      for (const it of r.items) {
        const rawId = String(it?.id ?? it?.productId ?? it?._id ?? "").trim();
        const suffix = rawId ? rawId.split("-").pop() : "";
        const rawName = String(it?.name ?? it?.title ?? "").trim();
        const keyName = rawName.toLowerCase();
        const qty = Number(it?.qty ?? it?.quantity ?? it?.count ?? 0) || 0;
        const price = Number(it?.price ?? it?.unitPrice ?? 0) || 0;
        const rev = qty * price;
        if (keyName && qty > 0) {
          byName[keyName] = byName[keyName] || { qty: 0, revenue: 0, name: rawName };
          byName[keyName].qty += qty;
          byName[keyName].revenue += rev;
        }
        if (rawId && qty > 0) {
          byId[rawId] = byId[rawId] || { qty: 0, revenue: 0, id: rawId, name: rawName };
          byId[rawId].qty += qty;
          byId[rawId].revenue += rev;
        }
        if (suffix && qty > 0) {
          bySuffix[suffix] = bySuffix[suffix] || { qty: 0, revenue: 0, suffix };
          bySuffix[suffix].qty += qty;
          bySuffix[suffix].revenue += rev;
        }
      }
    }
    return { byName, byId, bySuffix };
  }, [reservations, month, year]);

  const mergedTopProducts = useMemo(() => {
     // start from server report or computed topProducts
     const base = (topProducts || []).map((p) => ({ ...p }));
 
     // If month === "all", keep existing merging logic (merge menu with all-time totals)
     if (month === "all") {
       const seen = new Set(base.map((p) => String(p.name || "").toLowerCase()));
       for (const m of menu || []) {
         const mName = String(m?.name || "").trim();
         if (!mName) continue;
         const keyName = mName.toLowerCase();
         if (seen.has(keyName)) continue;
         // try to find totals by id / suffix / name
         let qty = 0, revenue = 0;
         // by id
         if (m.id) {
           const matched = totalsFromReservations.byId[String(m.id)];
           if (matched) { qty = matched.qty; revenue = matched.revenue; }
         }
         // by suffix
         if (qty === 0 && String(m.id || "").includes("-")) {
           const sfx = String(m.id).split("-").pop();
           const matched = totalsFromReservations.bySuffix[sfx];
           if (matched) { qty = matched.qty; revenue = matched.revenue; }
         }
         // by name
         if (qty === 0) {
           const matched = totalsFromReservations.byName[keyName];
           if (matched) { qty = matched.qty; revenue = matched.revenue; }
         }
         // Only merge menu item into All-time if it has approved-order qty (> 0)
         if ((qty && qty > 0) || (revenue && revenue > 0)) {
           base.push({ name: mName, qty, revenue, category: m?.category || "Uncategorized" });
           seen.add(keyName);
         }
       }
       return base;
     }
 
     // For a specific month: include server/computed topProducts + any menu items
     // that were added/updated in the selected month (so new products show up with 0 sales).
     const seen = new Set(base.map((p) => String(p.name || "").toLowerCase()));
     for (const m of menu || []) {
       const mName = String(m?.name || "").trim();
       if (!mName) continue;
       const keyName = mName.toLowerCase();
       if (seen.has(keyName)) continue;
 
       // include if menu item has approved sales in this month (from totalsFromReservations)
       let qty = 0, revenue = 0;
       if (m.id) {
         const byIdMatch = totalsFromReservations.byId[String(m.id)];
         if (byIdMatch) { qty = byIdMatch.qty; revenue = byIdMatch.revenue; }
       }
       if ((qty === 0 || revenue === 0) && String(m.id || "").includes("-")) {
         const sfx = String(m.id).split("-").pop();
         const bySfx = totalsFromReservations.bySuffix[sfx];
         if (bySfx) { qty = bySfx.qty; revenue = bySfx.revenue; }
       }
       if ((qty === 0 || revenue === 0)) {
         const byName = totalsFromReservations.byName[keyName];
         if (byName) { qty = byName.qty; revenue = byName.revenue; }
       }
 
       // if it has approved sales this month, include with totals; otherwise include if menu was created/updated in this month
       const candidateDate = m.createdAt || m.created_at || m.updatedAt || m.updated_at || m?.created || m?.updated;
       const createdInMonth = candidateDate ? isInMonth(candidateDate, month, year) : false;
 
       if ((qty && qty > 0) || (revenue && revenue > 0)) {
         base.push({ name: mName, qty, revenue, category: m?.category || "Uncategorized", unitPrice: m?.price || 0 });
         seen.add(keyName);
       } else if (createdInMonth) {
         base.push({ name: mName, qty: 0, revenue: 0, category: m?.category || "Uncategorized", unitPrice: m?.price || 0 });
         seen.add(keyName);
       }
     }
 
     return base;
   }, [topProducts, menu, month, year, totalsFromReservations]);
 
   const topCategories = (Array.isArray(report?.topCategories) && report.topCategories.length > 0)
     ? report.topCategories
     : (resStats.categoryRows || []).map((c) => ({ category: c.category, revenue: c.amount }));

  const [selectedCategory, setSelectedCategory] = useState("All");

  // derive year options from data (include "all")
  const yearOptions = useMemo(() => {
    const s = new Set();
    // collect years from reservations, topups and report if present
    const collect = (arr) => {
      for (const it of arr || []) {
        const d = new Date(getCreated(it));
        if (!isNaN(d)) s.add(String(d.getFullYear()));
      }
    };
    collect(reservations);
    collect(topups);
    if (Array.isArray(report?.years)) {
      for (const y of report.years) s.add(String(y));
    }
    const years = Array.from(s).map((y) => Number(y)).filter(Boolean).sort((a,b) => b - a).map(String);
    // ensure current year exists
    if (!years.includes(String(now.getFullYear()))) years.unshift(String(now.getFullYear()));
    return ["all", ...years];
  }, [reservations, topups, report]);

  const monthNames = useMemo(() => ["All","January","February","March","April","May","June","July","August","September","October","November","December"], []);

  // helper to render human-friendly period label
  const periodLabel = useMemo(() => {
    if (month === "all" && year === "all") return "All time";
    if (month === "all" && year !== "all") return `${year} (all months)`;
    if (month !== "all" && year === "all") {
      const mName = monthNames[Number(month)] || `Month ${month}`;
      return `${mName} (all years)`;
    }
    const mName = monthNames[Number(month)] || `Month ${month}`;
    return `${mName} ${year}`;
  }, [month, year, monthNames]);

  // build categories list for UI (include menu categories)
  const categories = useMemo(() => {
    const s = new Set();
    s.add("All");
    if (Array.isArray(report?.topCategories)) for (const c of report.topCategories) if (c?.category) s.add(c.category);
    if (Array.isArray(report?.topProducts)) for (const p of report.topProducts) if (p?.category) s.add(p.category);
    for (const r of resStats.categoryRows || []) if (r?.category) s.add(r.category);
    for (const m of menu || []) if (m?.category) s.add(m.category);
    return Array.from(s);
  }, [report, resStats, menu]);

  // filtered data according to selectedCategory
  const filteredTopProducts = useMemo(() => {
    const source = mergedTopProducts || [];
    if (!selectedCategory || selectedCategory === "All") return source;
    const sc = String(selectedCategory).toLowerCase();
    return source.filter((p) => String(p?.category || p?.cat || "").toLowerCase() === sc);
  }, [mergedTopProducts, selectedCategory]);
 
  // include unsold menu items in the All-time top-items table (qty/revenue = 0)
  const mergedResTopItems = useMemo(() => {
    // base is computed item aggregates for the selected period (resStats.topItems)
    const base = (resStats.topItems || []).map((it) => ({ ...it }));
    if (month !== "all") return base;
    const mapByName = {};
    for (const it of base) mapByName[String(it.name || "").toLowerCase()] = it;
    for (const m of menu || []) {
      const nm = String(m?.name || "").trim();
      if (!nm) continue;
      const key = nm.toLowerCase();
      if (mapByName[key]) {
        // ensure metadata exists
        mapByName[key].category = mapByName[key].category || m?.category || "Uncategorized";
        mapByName[key].unitPrice = mapByName[key].unitPrice || m?.price || 0;
        continue;
      }
      // try to find totals from reservation totals (computed above)
      let qty = 0, revenue = 0;
      if (m.id) {
        const byIdMatch = totalsFromReservations.byId[String(m.id)];
        if (byIdMatch) { qty = byIdMatch.qty; revenue = byIdMatch.revenue; }
      }
      if (qty === 0 && String(m.id || "").includes("-")) {
        const sfx = String(m.id).split("-").pop();
        const bySfx = totalsFromReservations.bySuffix[sfx];
        if (bySfx) { qty = bySfx.qty; revenue = bySfx.revenue; }
      }
      if (qty === 0) {
        const byName = totalsFromReservations.byName[key];
        if (byName) { qty = byName.qty; revenue = byName.revenue; }
      }
      mapByName[key] = { name: nm, qty: qty || 0, revenue: revenue || 0, category: m?.category || "Uncategorized", unitPrice: m?.price || 0 };
    }
    // return sorted list (highest revenue first)
    return Object.values(mapByName).sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  }, [resStats, menu, month, totalsFromReservations]);
 
  const filteredResTopItems = useMemo(() => {
    const source = mergedResTopItems || [];
    if (!selectedCategory || selectedCategory === "All") return source;
    const sc = String(selectedCategory).toLowerCase();
    return source.filter((it) => String(it?.category || "").toLowerCase() === sc);
  }, [mergedResTopItems, selectedCategory]);

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
      const qp = [];
      if (month !== "all") qp.push(`month=${String(month).padStart(2, "0")}`);
      if (year !== "all") qp.push(`year=${year}`);
      const exportUrl = qp.length ? `${API_BASE}/reports/export?${qp.join("&")}&format=${format}` : `${API_BASE}/reports/export?format=${format}`;

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
      let filename = `${periodLabel.replace(/\s+/g, "_")}.${format === "pdf" ? "pdf" : format === "xlsx" ? "xlsx" : "csv"}`;
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
            {/* month select with "All" option */}
            <select value={month} onChange={(e) => setMonth(String(e.target.value))} className="border rounded px-3 py-2">
              <option value="all">All</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            {/* year select derived from data, include "All" */}
            <select value={year} onChange={(e) => setYear(String(e.target.value))} className="w-36 border rounded px-3 py-2">
              {yearOptions.map((y) => <option key={y} value={y}>{y === "all" ? "All years" : y}</option>)}
            </select>
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
              <span className="text-sm text-gray-600">Revenue (this period)</span>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{peso.format((dashboard.totalSales || 0) || resStats.revenue || 0)}</div>
            <div className="text-xs text-gray-500 mt-1">{periodLabel}</div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Orders (this period)</span>
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{resStats.orders}</div>
            <div className="text-xs text-gray-500 mt-1">{periodLabel}</div>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reservation status ({periodLabel})</h3>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top-ups ({periodLabel})</h3>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by category ({periodLabel})</h3>
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
            <div className="text-sm text-gray-500">Tip: select a category to filter Top Products, Top items and the charts.</div>
          </div>
        </section>

        {/* Top items & report visuals (existing adminReports content) */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top items ({periodLabel})</h3>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products (report) — {periodLabel}</h3>
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
            {(mergedTopProducts || []).length === 0 ? <div className="text-sm text-gray-500">No top product data yet.</div> : <Bar data={productsBar} options={{ responsive: true, plugins: { legend: { position: "top" } } }} />}
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