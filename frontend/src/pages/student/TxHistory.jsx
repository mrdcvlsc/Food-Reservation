// src/pages/TxHistory.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import Navbar from "../../components/avbar";
import BottomNav from "../../components/mobile/BottomNav";
import FullScreenLoader from "../../components/FullScreenLoader";
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";
import { Search, RefreshCw, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

/* ---------- small UI helpers ---------- */
function Pill({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${tones[tone] || tones.gray}`}>{children}</span>;
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v || "");
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

/* ---------- data normalization helpers (kept intact + robust) ---------- */
function computeReservationTotal(r) {
  if (!r) return 0;
  if (typeof r.total === "number") return r.total;
  if (Array.isArray(r.items)) {
    return r.items.reduce((s, it) => {
      const q = Number(it.qty ?? it.quantity ?? 1) || 0;
      const p = Number(it.price ?? it.unitPrice ?? it.amount ?? 0) || 0;
      return s + q * p;
    }, 0);
  }
  return Number(r.amount ?? 0) || 0;
}

function extractItemsArray(r) {
  const arr = Array.isArray(r?.items)
    ? r.items
    : Array.isArray(r?.order)
    ? r.order
    : Array.isArray(r?.lines)
    ? r.lines
    : [];
  return arr.map((it) => ({
    name: it.name ?? it.product ?? it.title ?? "Item",
    qty: Number(it.qty ?? it.quantity ?? 1) || 1,
    price: Number(it.price ?? it.unitPrice ?? it.amount ?? 0) || 0,
  }));
}

function looksLikeFood(raw) {
  if (!raw || typeof raw !== "object") return false;
  if (Array.isArray(raw.items) && raw.items.length) return true;
  const txt = String(raw.type || raw.kind || raw.title || raw.description || raw.note || "").toLowerCase();
  if (txt.includes("reservation") || txt.includes("order") || txt.includes("purchase")) return true;
  const refish = String(raw.id || raw.ref || raw.reference || raw.orderId || raw.reservationId || "").toLowerCase();
  if (refish.startsWith("res") || refish.includes("res-")) return true;
  return false;
}

function mapFoodToRow(raw) {
  const id = raw.id || raw.orderId || raw.reservationId || raw.ref || raw.reference || raw._id || Math.random().toString(36).slice(2);
  const createdAt = raw.createdAt || raw.created || raw.time || raw.date || raw.when || raw.submittedAt || raw.updatedAt || null;
  const items = extractItemsArray(raw);
  const amount = computeReservationTotal(raw);
  const products = items.map(({ name, qty }) => `${name} ×${qty}`).join(" • ");
  const status = String(raw.status || raw.result || raw.state || "Success");
  const statusLC = status.toLowerCase();

  return {
    id,
    createdAt,
    title: raw.title || raw.name || "Reservation",
    products,
    productsTitle: products,
    amount: Math.abs(amount || 0),
    status,
    statusLC,
    sign: -1,
    raw,
  };
}

/* ---------- utility hooks ---------- */
function useDebounce(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/* ---------- fetcher with server-side attempt and robust fallbacks ---------- */
const fetchReservationsWithParams = async ({ signal, params }) => {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.sort) qs.set("sort", params.sort);
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("perPage", String(params.perPage));

  // Primary: try server-side paginated endpoint
  try {
    const url = `/reservations?${qs.toString()}`;
    const res = await api.get(url, { signal });
    if (Array.isArray(res)) return { items: res.map(mapFoodToRow), total: res.length };
    if (res && Array.isArray(res.data)) return { items: res.data.map(mapFoodToRow), total: res.total ?? res.data.length };
    if (res && Array.isArray(res.payload)) return { items: res.payload.map(mapFoodToRow), total: res.total ?? res.payload.length };
  } catch (e) {
    if (e?.name === "AbortError") throw e;
  }

  // Fallbacks: alternate endpoints
  let pool = [];
  try {
    const mine = await api.get("/reservations/mine", { signal }).catch(() => null);
    if (Array.isArray(mine)) pool.push(...mine);
    else if (mine && Array.isArray(mine.data)) pool.push(...mine.data);
  } catch (e) { if (e?.name === "AbortError") throw e; }

  try {
    const alt = await api.get("/reservations", { signal }).catch(() => null);
    if (Array.isArray(alt)) pool.push(...alt);
    else if (alt && Array.isArray(alt.data)) pool.push(...alt.data);
  } catch (e) { if (e?.name === "AbortError") throw e; }

  if (pool.length === 0) {
    try {
      const tx = await api.get("/transactions/mine", { signal }).catch(() => null);
      if (Array.isArray(tx)) pool.push(...tx);
      else if (tx && Array.isArray(tx.data)) pool.push(...tx.data);
    } catch (e) { if (e?.name === "AbortError") throw e; }
  }

  if (pool.length === 0) {
    const dash = await api.get("/dashboard").catch(() => null);
    const recent = dash?.recent || dash?.recentActivity || dash?.recentOrders || [];
    if (Array.isArray(recent)) pool.push(...recent);
  }

  const normalized = pool.filter(Boolean);
  const mapped = normalized.map(mapFoodToRow);

  // Client-side filters (for fallback)
  const qLower = (params.q || "").trim().toLowerCase();
  let filtered = mapped;
  if (qLower) {
    const toks = qLower.split(/\s+/).filter(Boolean);
    filtered = filtered.filter((r) => {
      const hay = [String(r.id), r.title, r.status, r.products].join(" ").toLowerCase();
      return toks.every((t) => hay.includes(t));
    });
  }
  if (params.status && params.status !== "all") {
    filtered = filtered.filter((r) => r.statusLC === (params.status || "").toLowerCase());
  }
  if (params.from || params.to) {
    const fromD = params.from ? new Date(params.from) : null;
    const toD = params.to ? new Date(params.to) : null;
    if (fromD) fromD.setHours(0, 0, 0, 0);
    if (toD) toD.setHours(23, 59, 59, 999);
    filtered = filtered.filter((r) => {
      const d = new Date(r.createdAt);
      if (Number.isNaN(d.getTime())) return false;
      if (fromD && d < fromD) return false;
      if (toD && d > toD) return false;
      return true;
    });
  }

  switch (params.sort) {
    case "date-asc":
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case "amount-desc":
      filtered.sort((a, b) => b.amount - a.amount);
      break;
    case "amount-asc":
      filtered.sort((a, b) => a.amount - b.amount);
      break;
    default:
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const total = filtered.length;
  const page = Number(params.page || 1);
  const perPage = Number(params.perPage || 10);
  const start = (page - 1) * perPage;
  const items = filtered.slice(start, start + perPage);

  return { items, total };
};

/* ---------- main component ---------- */
export default function TxHistory() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: "student" });
    })();
  }, [navigate]);

  // UI state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("date-desc");

  const debouncedQ = useDebounce(q, 300);

  // modal for details
  const [selected, setSelected] = useState(null);
  const modalCloseRef = useRef(null);

  // mobile detection
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 820 : false);
  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= 820);
    }
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // query key and fetching
  const queryKey = ["txHistory", { q: debouncedQ, status, from, to, sort, page, perPage }];

  const {
    data,
    error: queryError,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const res = await fetchReservationsWithParams({ signal, params: { q: debouncedQ, status, from, to, sort, page, perPage } });
      return res;
    },
    keepPreviousData: true,
    retry: 1,
    staleTime: 1000 * 10,
  });

  // derived data
  const rows = data?.items ?? [];
  const total = data?.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil((total || 0) / perPage));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = rows; // already paginated by fetcher

  // error mapping
  let friendlyError = null;
  if (queryError) {
    const msg = String(queryError?.message || queryError || "");
    const lower = msg.toLowerCase();
    if (lower.includes("401") || lower.includes("unauthorized")) {
      friendlyError = "You are not logged in. Please login, then refresh.";
    } else if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed")) {
      friendlyError = "Network error. Make sure the API is reachable, then refresh.";
    } else {
      friendlyError = "Could not load your order history. Please try again.";
    }
  }

  const handleRefresh = useCallback(async () => {
    setPage(1);
    await refetch();
  }, [refetch]);

  // export CSV for current filtered results (not all server data)
  const exportCSV = useCallback(() => {
    const items = rows.map((r) => ({
      id: r.id,
      title: r.title,
      date: fmtDateTime(r.createdAt),
      amount: r.amount,
      status: r.status,
      products: r.products,
    }));
    const header = ["id", "title", "date", "amount", "status", "products"];
    const csv = [header.join(",")]
      .concat(
        items.map((it) =>
          header
            .map((h) => {
              const v = String(it[h] ?? "");
              return `"${v.replace(/"/g, '""')}"`;
            })
            .join(",")
        )
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_export_page${pageSafe}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [rows, pageSafe]);

  // modal keyboard handling (escape to close)
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && selected) setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // focus trap / bring focus to modal close button
  useEffect(() => {
    if (selected && modalCloseRef.current) modalCloseRef.current.focus();
  }, [selected]);

  if (isLoading) {
    return <FullScreenLoader message="Loading transaction history..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-8 space-y-3 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link to="/dashboard" className="text-gray-600 hover:underline flex items-center mb-1">← Back to home</Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Order History</h1>
            <p className="text-sm text-gray-500 mt-1">Food reservations and purchases only. (Top-ups live on the Top-Up History page.)</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
              title="Refresh"
              aria-label="Refresh orders"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
              title="Export visible results to CSV"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Search */}
            <div className="lg:col-span-6">
              <div className="relative w-full">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  aria-label="Search orders"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  placeholder="Search by ID, product, status…"
                  className="w-full min-w-0 border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status */}
            <div className="lg:col-span-2">
              <select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="w-full min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="approved">Approved</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="claimed">Claimed</option>
                <option value="pending">Pending</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="rejected">Rejected</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Date range */}
            <div className="lg:col-span-2">
              <div className="flex gap-2">
                <input
                  aria-label="From date"
                  type="date"
                  value={from}
                  onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                  className="w-1/2 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-gray-400 self-center">–</span>
                <input
                  aria-label="To date"
                  type="date"
                  value={to}
                  onChange={(e) => { setTo(e.target.value); setPage(1); }}
                  className="w-1/2 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="lg:col-span-1">
              <select
                aria-label="Sort"
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="w-full min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="amount-desc">Amount (high → low)</option>
                <option value="amount-asc">Amount (low → high)</option>
              </select>
            </div>

            {/* Per page */}
            <div className="lg:col-span-1 flex justify-end">
              <label className="text-sm text-gray-600 flex items-center gap-2">
                Per page:
                <select
                  aria-label="Results per page"
                  value={perPage}
                  onChange={(e) => { setPerPage(Number(e.target.value) || 10); setPage(1); }}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                >
                  <option value={7}>7</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        {/* Error */}
        {!isLoading && friendlyError && (
          <div role="status" aria-live="polite" className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3 flex items-start justify-between gap-4">
            <div>{friendlyError}</div>
            <div className="flex gap-2">
              <button onClick={() => refetch()} className="px-3 py-1 border rounded bg-white text-sm">Retry</button>
            </div>
          </div>
        )}

        {/* Main content (mobile cards or desktop table) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isFetching && !isLoading && (
            <div className="px-4 py-2 text-xs text-gray-500 border-b">Updating…</div>
          )}

          {isMobile ? (
            <div className="p-3 space-y-3">
              {isLoading &&
                Array.from({ length: perPage }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-white border rounded-lg p-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                ))}

              {!isLoading && rows.length === 0 && (
                <div className="p-6 text-sm text-gray-600 text-center">No food orders found.</div>
              )}

              {!isLoading && rows.length > 0 && pageRows.map((t) => (
                <article key={t.id} className="bg-white border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate">
                          <div className="text-xs text-gray-500">{fmtDateTime(t.createdAt)}</div>
                          <div className="font-semibold truncate">{t.title}</div>
                          <div className="text-xs text-gray-400 truncate">{t.id}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{peso.format(t.amount)}</div>
                          <div className="mt-2">
                            {(() => {
                              const s = t.statusLC;
                              if (s === "success" || s === "approved" || s === "claimed" || s === "ready") return <Pill tone="green">{t.status}</Pill>;
                              if (s === "preparing" || s === "pending") return <Pill tone="yellow">{t.status}</Pill>;
                              if (s === "failed" || s === "rejected") return <Pill tone="red">{t.status}</Pill>;
                              if (s === "refunded") return <Pill tone="blue">{t.status}</Pill>;
                              return <Pill>{t.status}</Pill>;
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-gray-700">
                        <div className="line-clamp-2" title={t.productsTitle}>{t.products || "—"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => navigator.clipboard?.writeText(String(t.id || ""))} className="text-xs px-3 py-1 border rounded-md">Copy Ref</button>
                    <button onClick={() => navigator.clipboard?.writeText(String(t.products || ""))} className="text-xs px-3 py-1 border rounded-md">Copy Items</button>
                    <button onClick={() => setSelected(t)} className="ml-auto text-xs px-3 py-1 border rounded-md">View</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ref</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Products</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading &&
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={`sk-${i}`} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 w-40 bg-gray-200 rounded" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-64 bg-gray-200 rounded" /></td>
                        <td className="px-6 py-4 text-center"><div className="h-4 w-28 bg-gray-200 rounded inline-block" /></td>
                        <td className="px-6 py-4 text-right"><div className="h-4 w-20 bg-gray-200 rounded inline-block" /></td>
                        <td className="px-6 py-4 text-center"><div className="h-5 w-20 bg-gray-200 rounded inline-block" /></td>
                      </tr>
                    ))}

                  {!isLoading && rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-sm text-gray-600">
                        No food orders found.
                        <div className="text-xs text-gray-400 mt-1">Tip: make a reservation in the Shop, then check back here.</div>
                      </td>
                    </tr>
                  )}

                  {!isLoading && rows.length > 0 && pageRows.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{t.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{t.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700"><span className="line-clamp-2 block" title={t.productsTitle}>{t.products || "—"}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center">{fmtDateTime(t.createdAt)}</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-rose-700">−{peso.format(t.amount)}</td>
                      <td className="px-6 py-4 text-sm text-center">
                        {(() => {
                          const s = t.statusLC;
                          if (s === "success" || s === "approved" || s === "claimed" || s === "ready") return <Pill tone="green">{t.status}</Pill>;
                          if (s === "preparing" || s === "pending") return <Pill tone="yellow">{t.status}</Pill>;
                          if (s === "failed" || s === "rejected") return <Pill tone="red">{t.status}</Pill>;
                          if (s === "refunded") return <Pill tone="blue">{t.status}</Pill>;
                          return <Pill>{t.status}</Pill>;
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && !friendlyError && total > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Page {pageSafe} of {totalPages} • {total} record{total !== 1 ? "s" : ""}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe <= 1} className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe >= totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Order details">
          <div className="max-w-3xl w-full bg-white rounded-lg overflow-hidden shadow-lg">
            <div className="p-4 border-b flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm text-gray-500">Top-up by</div>
                <div className="text-lg font-semibold truncate">{selected.title || selected.name || "—"}</div>
                <div className="text-xs text-gray-400 truncate">{selected.id}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Amount</div>
                <div className="text-lg font-bold">{peso.format(Number(selected.amount) || 0)}</div>
                <div className="mt-2"><Pill tone={selected.statusLC === "success" ? "green" : selected.statusLC === "pending" ? "yellow" : "gray"}>{selected.status}</Pill></div>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Reference</div>
                <div className="p-3 border rounded break-words">{selected.id || "—"}</div>

                <div className="text-sm text-gray-600 mt-3 mb-2">Products</div>
                <div className="p-3 border rounded break-words text-sm">{selected.products || "—"}</div>

                <div className="text-sm text-gray-600 mt-3 mb-2">Notes</div>
                <div className="p-3 border rounded text-sm">{selected.raw?.note || selected.raw?.notes || "—"}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-2">Proof</div>
                {selected.raw?.proofUrl || selected.raw?.image || selected.raw?.proof ? (
                  // try multiple possible proof fields
                  <img
                    src={selected.raw?.proofUrl || selected.raw?.image || selected.raw?.proof}
                    alt="proof"
                    className="w-full h-56 object-contain rounded border"
                    loading="lazy"
                  />
                ) : (
                  <div className="p-6 border rounded text-sm text-gray-500">No proof image available.</div>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex justify-between gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard?.writeText(String(selected.id || ""))}
                  className="px-3 py-2 border rounded"
                >
                  Copy Ref
                </button>
                <button
                  onClick={() => {
                    // open in new tab if there's a proof url
                    const u = selected.raw?.proofUrl || selected.raw?.image || selected.raw?.proof;
                    if (u) window.open(u, "_blank");
                  }}
                  className="px-3 py-2 border rounded"
                >
                  Open Proof
                </button>
              </div>
              <div>
                <button
                  ref={modalCloseRef}
                  onClick={() => setSelected(null)}
                  className="inline-flex items-center gap-2 px-3 py-2 border rounded"
                >
                  <X className="w-4 h-4" />
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
