// src/pages/admin/adminOrders.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { api } from "../../lib/api";
import Navbar from "../../components/adminavbar";
import AdminBottomNav from '../../components/mobile/AdminBottomNav';
import FullScreenLoader from "../../components/FullScreenLoader";
import {
  UtensilsCrossed,
  Timer,
  CheckCircle2,
  Search,
  ChevronRight,
  Loader2,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { refreshSessionForProtected } from "../../lib/auth";
import useOrdersSSE from "../../hooks/useOrdersSSE";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function normalizeStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "Unknown";
  if (["approved", "approve"].includes(s)) return "Approved";
  if (["preparing", "prep", "in-prep", "in_prep"].includes(s)) return "Preparing";
  if (["ready", "done"].includes(s)) return "Ready";
  if (["claimed", "pickedup", "picked_up", "picked-up"].includes(s)) return "Claimed";
  if (["pending"].includes(s)) return "Pending";
  if (["rejected", "declined"].includes(s)) return "Rejected";
  if (s && !["approved", "preparing", "ready", "claimed", "pending", "rejected", "unknown"].includes(s)) {
    console.warn('[AdminOrders] Unexpected status value:', raw);
  }
  return "Unknown";
}

const Pill = ({ status }) => {
  const tone =
    {
      Approved: "bg-emerald-100 text-emerald-700",
      Pending: "bg-amber-100 text-amber-700",
      Preparing: "bg-blue-100 text-blue-700",
      Ready: "bg-green-100 text-green-700",
      Claimed: "bg-gray-100 text-gray-700",
      Rejected: "bg-rose-100 text-rose-700",
      Unknown: "bg-gray-100 text-gray-600",
    }[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
};

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleString();
}

function getStudentName(o) {
  return (
    (o && (o.student || o.studentName || o.payerName || o.customerName)) ||
    (o && o.user && (o.user.name || o.user.fullName)) ||
    "—"
  );
}

function getStudentId(o) {
  return (
    (o && (o.studentId || o.student_id || o.sid || o.user?.studentId || o.user?.studentID)) ||
    ""
  );
}

export default function AdminOrders() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'admin' });
    })();
  }, [navigate]);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const ordersRef = useRef([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const fetchOrders = async (signal) => {
    setLoading(true);
    try {
      const data = await api.get("/reservations/admin", { signal });
      const arr = Array.isArray(data) ? data : [];
      setOrders(arr);
      setLastUpdated(new Date());
    } catch (e) {
      if (e.name === 'AbortError' || e.message?.includes('abort')) {
        return;
      }
      console.error("Load orders failed:", e);
      setOrders([]);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchOrders(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, []);

  // SSE integration
  const handleSseEvent = (payload) => {
    if (!payload || !payload.order) return;
    let updatedOrders = ordersRef.current ? [...ordersRef.current] : [];
    const { type, order } = payload;
    const orderId = order.id;
    const idx = updatedOrders.findIndex(o => String(o.id) === String(orderId));

    if (type === "order.deleted") {
      if (idx !== -1) {
        updatedOrders.splice(idx, 1);
      }
    } else if (type === "order.created") {
      if (idx === -1) {
        updatedOrders.unshift(order);
      } else {
        updatedOrders[idx] = { ...updatedOrders[idx], ...order };
      }
    } else if (type === "order.updated" || !type) {
      if (idx !== -1) {
        updatedOrders[idx] = { ...updatedOrders[idx], ...order };
      } else {
        updatedOrders.unshift(order);
      }
    }
    setOrders(updatedOrders);
    setLastUpdated(new Date());
  };

  useOrdersSSE({
    url: "/sse/admin/orders",
    enabled: true,
    onSnapshot: () => fetchOrders(),
    onEvent: handleSseEvent,
  });

  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sortField, setSortField] = useState("pickup");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  const orderTotal = (o) =>
    (o?.items || []).reduce(
      (acc, it) => acc + (Number(it?.qty ?? it?.quantity ?? 0) || 0) * (Number(it?.price ?? it?.unitPrice ?? 0) || 0),
      0
    );

  const getPickupTimeValue = (o) => {
    const when = o.when || o.slot || o.slotLabel || o.pickup || o.pickupTime || "";
    const timeOrder = { "breakfast": 0, "recess": 1, "lunch": 2, "dismissal": 3, "after": 4 };
    const normalized = String(when).toLowerCase().trim();
    return timeOrder[normalized] !== undefined ? timeOrder[normalized] : 999;
  };

  const filtered = useMemo(() => {
    const ql = String(debouncedQ || "").toLowerCase();

    let rows = (orders || [])
      .map((o) => ({ ...o, status: normalizeStatus(o.status) }))
      .filter((o) => {
        const s = o.status;
        if (tab !== "All" && s !== tab) return false;
        if (tab === "All" && (s === "Pending" || s === "Rejected")) return false;

        if (ql) {
          const student = String(o?.student || "").toLowerCase();
          const id = String(o?.id || "").toLowerCase();
          const grade = String(o?.grade || "").toLowerCase();
          const section = String(o?.section || "").toLowerCase();
          const note = String(o?.note || "").toLowerCase();
          const total = peso.format(orderTotal(o)).toLowerCase();
          const items = (o?.items || []).map((it) => String(it?.name || "").toLowerCase()).join(" ");
          const when = String(o?.when || o?.slot || o?.slotLabel || o?.pickup || o?.pickupTime || "").toLowerCase();
          const statusStr = String(o?.status || "").toLowerCase();

          return (
            student.includes(ql) ||
            id.includes(ql) ||
            grade.includes(ql) ||
            section.includes(ql) ||
            note.includes(ql) ||
            total.includes(ql) ||
            items.includes(ql) ||
            when.includes(ql) ||
            statusStr.includes(ql)
          );
        }
        return true;
      });

    rows = [...rows].sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case "pickup":
          aVal = getPickupTimeValue(a);
          bVal = getPickupTimeValue(b);
          return sortOrder === "asc" ? aVal - bVal : bVal - aVal;

        case "name":
          aVal = String(getStudentName(a) || "").toLowerCase();
          bVal = String(getStudentName(b) || "").toLowerCase();
          break;

        case "total":
          aVal = orderTotal(a);
          bVal = orderTotal(b);
          return sortOrder === "asc" ? aVal - bVal : bVal - aVal;

        case "id":
          aVal = String(a.id || "").toLowerCase();
          bVal = String(b.id || "").toLowerCase();
          break;

        case "status":
          aVal = String(a.status || "").toLowerCase();
          bVal = String(b.status || "").toLowerCase();
          break;

        default:
          return 0;
      }

      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal);
        return sortOrder === "asc" ? comparison : -comparison;
      }

      return 0;
    });

    return rows;
  }, [orders, tab, debouncedQ, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const transition = async (id, next) => {
    setBusyId(id);
    try {
      const data = await api.patch(`/reservations/admin/${id}`, { status: next });
      if (data && data.reservation) {
        setOrders((list) => list.map((o) => (String(o.id) === String(id) ? data.reservation : o)));
      } else if (data && (data.id || data.status)) {
        setOrders((list) => list.map((o) => (String(o.id) === String(id) ? { ...o, ...data } : o)));
      } else {
        await fetchOrders();
      }
    } catch (e) {
      console.error("Transition failed:", e);
      const errorMsg = e?.message || `Failed to set status to ${next}`;
      if (e?.status === 409) {
        alert(`Order already transitioned: ${errorMsg}\n\nRefreshing order list...`);
        await fetchOrders();
      } else if (e?.status === 400) {
        alert(`Invalid transition: ${errorMsg}`);
      } else {
        alert(errorMsg);
      }
    } finally {
      setBusyId(null);
    }
  };

  const tabs = ["All", "Approved", "Preparing", "Ready", "Claimed"];

  if (loading && initialLoad) {
    return <FullScreenLoader message="Loading orders..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* MOBILE HEADER */}
        <div className="md:hidden space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <UtensilsCrossed className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <h1 className="text-xl font-bold text-gray-900 truncate">Orders Queue</h1>
            </div>
            <button
              onClick={() => fetchOrders()}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-xs hover:bg-gray-50 disabled:opacity-60 flex-shrink-0"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {lastUpdated && (
            <div className="text-xs text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          {/* Mobile Search */}
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search orders..."
              className="w-full border border-gray-300 rounded-lg pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showFilters ? "Hide Sort Options" : "Show Sort Options"}
          </button>

          {/* Mobile Sort Dropdown (Collapsible) */}
          {showFilters && (
            <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">Sort By</label>
              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-");
                  setSortField(field);
                  setSortOrder(order);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pickup-asc">Pickup Time (Early → Late)</option>
                <option value="pickup-desc">Pickup Time (Late → Early)</option>
                <option value="name-asc">Student Name (A → Z)</option>
                <option value="name-desc">Student Name (Z → A)</option>
                <option value="total-asc">Total (Low → High)</option>
                <option value="total-desc">Total (High → Low)</option>
                <option value="status-asc">Status (A → Z)</option>
                <option value="status-desc">Status (Z → A)</option>
                <option value="id-asc">Order ID (A → Z)</option>
                <option value="id-desc">Order ID (Z → A)</option>
              </select>
            </div>
          )}
        </div>

        {/* DESKTOP HEADER */}
        <div className="hidden md:flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders Queue</h1>
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchOrders()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, ID, grade, total, note, items…"
                className="w-72 sm:w-80 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split("-");
                setSortField(field);
                setSortOrder(order);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pickup-asc">Pickup Time (Early → Late)</option>
              <option value="pickup-desc">Pickup Time (Late → Early)</option>
              <option value="name-asc">Student Name (A → Z)</option>
              <option value="name-desc">Student Name (Z → A)</option>
              <option value="total-asc">Total (Low → High)</option>
              <option value="total-desc">Total (High → Low)</option>
              <option value="status-asc">Status (A → Z)</option>
              <option value="status-desc">Status (Z → A)</option>
              <option value="id-asc">Order ID (A → Z)</option>
              <option value="id-desc">Order ID (Z → A)</option>
            </select>
          </div>
        </div>

        {/* Tabs - Horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          {tabs.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium border transition ${
                  active
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-24 sm:w-28 bg-gray-200 rounded" />
                    <div className="h-5 w-full max-w-[200px] sm:max-w-xs bg-gray-200 rounded" />
                    <div className="h-4 w-32 sm:w-40 bg-gray-200 rounded" />
                  </div>
                  <div className="h-6 w-16 sm:w-20 bg-gray-200 rounded" />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const studentName = getStudentName(o);
              const studentId = getStudentId(o);
              const when = o.when || o.slot || o.slotLabel || o.pickup || o.pickupTime || "";
              const claimedAt =
                o.claimedAt ?? o.pickedAt ?? o.picked_at ?? o.claimed_at ?? o.completedAt ?? o.completed_at ?? o.updatedAt;

              return (
                <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
                  {/* Card header - Mobile optimized */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm text-gray-500 truncate">{o.id}</span>
                        <Pill status={normalizeStatus(o.status)} />
                      </div>
                      <div className="mt-1 text-sm sm:text-base text-gray-900 font-medium break-words">
                        {studentName}
                        {studentId && (
                          <>
                            <br className="sm:hidden" />
                            <span className="ml-0 sm:ml-3 text-xs sm:text-sm font-mono text-gray-500 block sm:inline mt-0.5 sm:mt-0">{studentId}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-1">
                        {o.grade}-{o.section}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-1">
                        <span className="font-medium">Pickup:</span> {when || "—"}
                      </div>
                      {normalizeStatus(o.status) === "Claimed" && claimedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">Claimed:</span> {fmtDateTime(claimedAt)}
                        </div>
                      )}
                      {!!o.note && (
                        <div className="text-xs sm:text-sm text-gray-500 mt-2 italic break-words">
                          <span className="font-medium not-italic">Note:</span> {o.note}
                        </div>
                      )}
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-xs sm:text-sm text-gray-500">Total</div>
                      <div className="text-base sm:text-lg font-semibold">{peso.format(orderTotal(o))}</div>
                    </div>
                  </div>

                  {/* Items - Mobile optimized */}
                  <div className="mt-3 border-t pt-3">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Items</div>
                    <div className="space-y-1.5">
                      {(o.items || []).map((it, idx) => (
                        <div key={idx} className="flex items-start justify-between text-xs sm:text-sm py-1">
                          <div className="text-gray-700 flex-1 pr-2 break-words">{it.name}</div>
                          <div className="text-gray-600 font-medium flex-shrink-0">×{it.qty ?? it.quantity ?? 0}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions - Full width on mobile */}
                  <div className="mt-4 flex items-center justify-end">
                    {normalizeStatus(o.status) === "Approved" && (
                      <button
                        onClick={() => transition(o.id, "Preparing")}
                        disabled={busyId === o.id}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 font-medium"
                      >
                        {busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Timer className="w-4 h-4" />}
                        Move to Preparing
                      </button>
                    )}
                    {normalizeStatus(o.status) === "Preparing" && (
                      <button
                        onClick={() => transition(o.id, "Ready")}
                        disabled={busyId === o.id}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 font-medium"
                      >
                        {busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Mark Ready
                      </button>
                    )}
                    {normalizeStatus(o.status) === "Ready" && (
                      <button
                        onClick={() => transition(o.id, "Claimed")}
                        disabled={busyId === o.id}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm bg-gray-900 text-white hover:bg-black disabled:opacity-60 font-medium"
                      >
                        {busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        Mark Claimed
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-8 sm:p-10 text-center text-sm text-gray-500">
                No orders found for this filter.
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <AdminBottomNav />
    </div>
  );
}