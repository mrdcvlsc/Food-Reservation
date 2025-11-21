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
  Info,
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

// ============================================================================
// PRODUCTION-READY SEARCH PARSER
// ============================================================================

/**
 * Normalize text: lowercase, remove accents, collapse whitespace, strip trailing punctuation
 */
function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^\w\s]/g, " ") // Replace punctuation with space
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

/**
 * Field aliases - map user-friendly names to canonical fields
 */
const FIELD_ALIASES = {
  name: "name",
  student: "name",
  payer: "name",
  customer: "name",
  id: "id",
  order: "id",
  orderid: "id",
  grade: "grade",
  section: "section",
  sec: "section",
  pickup: "pickup",
  time: "pickup",
  slot: "pickup",
  item: "item",
  food: "item",
  status: "status",
  state: "status",
  total: "total",
  price: "total",
  amount: "total",
  note: "note",
  notes: "note",
  comment: "note",
};

/**
 * Parse search query with proper comma handling and quoted phrase support
 * Returns: { filters: { field: [values] }, plainTerms: [tokens] }
 */
function parseSearchQuery(query) {
  const filters = {};
  const plainTerms = [];
  
  if (!query || !query.trim()) {
    return { filters, plainTerms };
  }

  // First, split by commas to get major tokens (commas act as AND separators)
  const commaSeparatedTokens = [];
  let currentToken = "";
  let insideQuotes = false;
  let quoteChar = null;

  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    
    if ((char === '"' || char === "'") && (i === 0 || query[i - 1] !== "\\")) {
      if (!insideQuotes) {
        insideQuotes = true;
        quoteChar = char;
        currentToken += char;
      } else if (char === quoteChar) {
        insideQuotes = false;
        quoteChar = null;
        currentToken += char;
      } else {
        currentToken += char;
      }
    } else if (char === "," && !insideQuotes) {
      if (currentToken.trim()) {
        commaSeparatedTokens.push(currentToken.trim());
      }
      currentToken = "";
    } else {
      currentToken += char;
    }
  }
  
  if (currentToken.trim()) {
    commaSeparatedTokens.push(currentToken.trim());
  }

  // Now parse each comma-separated token for field:value or plain terms
  commaSeparatedTokens.forEach(token => {
    // Match field:"quoted value" or field:'quoted value'
    const quotedMatch = token.match(/^([\w-]+):(["'])(.*?)\2$/);
    if (quotedMatch) {
      const field = normalizeText(quotedMatch[1]);
      const value = normalizeText(quotedMatch[3]);
      const canonicalField = FIELD_ALIASES[field] || field;
      
      if (!filters[canonicalField]) filters[canonicalField] = [];
      if (value) filters[canonicalField].push(value);
      return;
    }

    // Match field:value (no quotes, no spaces in value)
    const unquotedMatch = token.match(/^([\w-]+):(\S+)$/);
    if (unquotedMatch) {
      const field = normalizeText(unquotedMatch[1]);
      const value = normalizeText(unquotedMatch[2]);
      const canonicalField = FIELD_ALIASES[field] || field;
      
      if (!filters[canonicalField]) filters[canonicalField] = [];
      if (value) filters[canonicalField].push(value);
      return;
    }

    // Check if entire token is a quoted phrase
    const plainQuotedMatch = token.match(/^(["'])(.*?)\1$/);
    if (plainQuotedMatch) {
      const value = normalizeText(plainQuotedMatch[2]);
      if (value) plainTerms.push(value);
      return;
    }

    // Plain token - split by whitespace and add each word
    const words = token.split(/\s+/).filter(w => w.trim());
    words.forEach(word => {
      const normalized = normalizeText(word);
      if (normalized) plainTerms.push(normalized);
    });
  });

  return { filters, plainTerms };
}

/**
 * Extract active filter chips from parsed query (for UI display)
 */
function getActiveFilters(parsedQuery) {
  const chips = [];
  const { filters } = parsedQuery;
  
  const fieldLabels = {
    name: "Name",
    id: "Order ID",
    grade: "Grade",
    section: "Section",
    pickup: "Pickup Time",
    item: "Item",
    status: "Status",
    total: "Total",
    note: "Note",
  };
  
  Object.entries(filters).forEach(([field, values]) => {
    values.forEach(value => {
      chips.push({
        field,
        value,
        label: `${fieldLabels[field] || field}: ${value}`,
      });
    });
  });
  
  return chips;
}

/**
 * Normalize currency for comparison
 */
function normalizeCurrency(text) {
  return String(text || "")
    .replace(/[₱$,\s]/g, "")
    .toLowerCase()
    .trim();
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
  const [showSearchHelp, setShowSearchHelp] = useState(false);

  const ordersRef = useRef([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const fetchOrders = async (signal) => {
    setLoading(true);
    try {
      const data = await api.get("/reservations/admin", { signal });
      console.log("[AdminOrders] /reservations/admin response:", data);
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
    console.debug("[AdminOrders][SSE] event:", payload);

    const type = payload?.type || payload?.event || payload?.action || "";
    const order = payload?.order || payload?.data?.order || payload?.data || payload?.reservation;

    if (!order) {
      console.warn("[AdminOrders][SSE] no order in payload:", payload);
      return;
    }

    const orderId = order.id ?? order._id ?? order.orderId;
    let updated = ordersRef.current ? [...ordersRef.current] : [];
    const idx = updated.findIndex(o => String(o.id) === String(orderId));

    if (String(type).includes("deleted")) {
      if (idx !== -1) updated.splice(idx, 1);
    } else if (String(type).includes("created")) {
      if (idx === -1) updated.unshift(order);
      else updated[idx] = { ...updated[idx], ...order };
    } else {
      if (idx !== -1) updated[idx] = { ...updated[idx], ...order };
      else updated.unshift(order);
    }

    setOrders(updated);
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
    }, 300);
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

  // Parse search query
  const parsedQuery = useMemo(() => parseSearchQuery(debouncedQ), [debouncedQ]);
  const activeFilters = useMemo(() => getActiveFilters(parsedQuery), [parsedQuery]);

  // Remove a specific filter chip
  const removeFilter = (chipToRemove) => {
    const { filters, plainTerms } = parsedQuery;
    const newFilters = { ...filters };
    
    if (newFilters[chipToRemove.field]) {
      newFilters[chipToRemove.field] = newFilters[chipToRemove.field].filter(
        v => v !== chipToRemove.value
      );
      if (newFilters[chipToRemove.field].length === 0) {
        delete newFilters[chipToRemove.field];
      }
    }
    
    // Rebuild query string
    let newQuery = "";
    Object.entries(newFilters).forEach(([field, values]) => {
      values.forEach(value => {
        const needsQuotes = value.includes(" ");
        newQuery += needsQuotes ? `${field}:"${value}", ` : `${field}:${value}, `;
      });
    });
    newQuery += plainTerms.join(", ");
    setQ(newQuery.trim().replace(/,\s*$/, ""));
  };

  const filtered = useMemo(() => {
    const { filters, plainTerms } = parsedQuery;

    let rows = (orders || [])
      .map((o) => ({ ...o, status: normalizeStatus(o.status) }))
      .filter((o) => {
        const s = o.status;
        if (tab !== "All" && s !== tab) return false;

        // Build searchable fields with normalized text
        const searchableData = {
          name: normalizeText(getStudentName(o)),
          id: normalizeText(String(o?.id || "")),
          grade: normalizeText(String(o?.grade || "")),
          section: normalizeText(String(o?.section || "")),
          note: normalizeText(String(o?.note || "")),
          total: normalizeCurrency(peso.format(orderTotal(o))),
          item: normalizeText((o?.items || []).map((it) => String(it?.name || "")).join(" ")),
          pickup: normalizeText(String(o?.when || o?.slot || o?.slotLabel || o?.pickup || o?.pickupTime || "")),
          status: normalizeText(String(o?.status || "")),
        };

        // Check field-specific filters (OR within same field, AND across different fields)
        for (const [field, values] of Object.entries(filters)) {
          const fieldData = searchableData[field] || "";
          
          // Special handling for numeric total field
          if (field === "total") {
            const orderTotalNum = orderTotal(o);
            const matches = values.some(value => {
              const numericValue = parseFloat(value.replace(/[^\d.]/g, ""));
              if (!isNaN(numericValue)) {
                return Math.abs(orderTotalNum - numericValue) < 0.01;
              }
              return fieldData.includes(value);
            });
            if (!matches) return false;
          } else {
            // OR within same field: any value must match
            const matches = values.some(value => fieldData.includes(value));
            if (!matches) return false;
          }
        }

        // Check plain search terms (AND logic: all terms must match somewhere)
        if (plainTerms.length > 0) {
          const allFieldsText = Object.values(searchableData).join(" ");
          const allTermsMatch = plainTerms.every(term => allFieldsText.includes(term));
          if (!allTermsMatch) return false;
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
          aVal = normalizeText(getStudentName(a));
          bVal = normalizeText(getStudentName(b));
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
  }, [orders, tab, parsedQuery, sortField, sortOrder]);

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
          <div className="space-y-2">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Try: St. Rose, Anm or name:john, section:rose'
                className="w-full border border-gray-300 rounded-lg pl-9 pr-20 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={() => setShowSearchHelp(!showSearchHelp)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Search help"
                >
                  <Info className="w-4 h-4" />
                </button>
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Help Tooltip */}
            {showSearchHelp && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs space-y-3">
                <div className="font-semibold text-blue-900">🔍 Search Guide:</div>
                
                <div className="space-y-2">
                  <div className="font-semibold text-blue-800 text-[11px] uppercase tracking-wide">Basic Search</div>
                  <div className="text-blue-800 space-y-1">
                    <div><span className="font-mono bg-blue-100 px-1 rounded">john breakfast</span> → Find "john" AND "breakfast" anywhere</div>
                    <div><span className="font-mono bg-blue-100 px-1 rounded">St. Rose, Anm</span> → Use commas to separate terms (AND)</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-blue-800 text-[11px] uppercase tracking-wide">Field-Specific Search</div>
                  <div className="text-blue-800 space-y-1">
                    <div><span className="font-mono bg-blue-100 px-1 rounded">name:john</span> → Search only in name</div>
                    <div><span className="font-mono bg-blue-100 px-1 rounded">section:rose</span> → Search only in section</div>
                    <div><span className="font-mono bg-blue-100 px-1 rounded">grade:10</span> → Search only in grade</div>
                    <div><span className="font-mono bg-blue-100 px-1 rounded">pickup:lunch</span> → Search by pickup time</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-blue-800 text-[11px] uppercase tracking-wide">Advanced Tips</div>
                  <div className="text-blue-800 space-y-1">
                    <div><span className="font-mono bg-blue-100 px-1 rounded">section:"St. Rose"</span> → Use quotes for phrases</div>
                    <div><span className="font-mono bg-blue-100 px-1 rounded">name:john, grade:12</span> → Combine filters (AND)</div>
                    <div><span className="font-mono bg-blue-100 px-1 rounded">section:rose section:blue</span> → Same field = OR</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-300 text-blue-700 text-[11px]">
                  <strong>Aliases:</strong> name/student/payer, id/order, section/sec, pickup/time/slot, item/food, note/comment
                </div>
              </div>
            )}

            {/* Active Filter Chips */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => removeFilter(chip)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs hover:bg-blue-200"
                  >
                    {chip.label}
                    <X className="w-3 h-3" />
                  </button>
                ))}
                <button
                  onClick={() => setQ("")}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200"
                >
                  Clear all
                </button>
              </div>
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
        <div className="hidden md:block space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders Queue</h1>
              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>

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
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder='Search: St. Rose, Anm  |  name:john, section:rose  |  grade:10 pickup:lunch'
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-20 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    onClick={() => setShowSearchHelp(!showSearchHelp)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Search help"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {q && (
                    <button
                      onClick={() => setQ("")}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Search Help Tooltip */}
              {showSearchHelp && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-3">
                  <div className="font-semibold text-blue-900 flex items-center gap-2">
                    🔍 Advanced Search Guide
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="font-semibold text-blue-800 text-xs uppercase tracking-wide">Basic Search</div>
                      <div className="text-blue-800 space-y-1.5 text-sm">
                        <div><span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">john breakfast</span> → Match both terms (AND)</div>
                        <div><span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">St. Rose, Anm</span> → Comma separates terms</div>
                        <div><span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">"St. Rose"</span> → Keep phrase together</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="font-semibold text-blue-800 text-xs uppercase tracking-wide">Field-Specific</div>
                      <div className="text-blue-800 space-y-1.5 text-sm">
                        <div><span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">name:john</span> → Search in name only</div>
                        <div><span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">section:rose</span> → Search in section</div>
                        <div><span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">grade:10</span> → Filter by grade</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="font-semibold text-blue-800 text-xs uppercase tracking-wide">More Fields</div>
                      <div className="text-blue-800 space-y-1.5 text-sm">
                        <div><span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">pickup:lunch</span> → By pickup time</div>
                        <div><span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">item:burger</span> → By item name</div>
                        <div><span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">id:12345</span> → By order ID</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="font-semibold text-blue-800 text-xs uppercase tracking-wide">Advanced</div>
                      <div className="text-blue-800 space-y-1.5 text-sm">
                        <div><span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">status:ready</span> → By status</div>
                        <div><span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">note:allergy</span> → Search notes</div>
                        <div><span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">total:120</span> → By total amount</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-blue-200 space-y-2">
                    <div className="font-semibold text-blue-800 text-xs uppercase tracking-wide">How It Works</div>
                    <div className="text-blue-800 space-y-1.5 text-sm">
                      <div>✓ <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">name:john, grade:12</span> → Multiple fields = AND (both must match)</div>
                      <div>✓ <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">section:rose section:blue</span> → Same field = OR (either matches)</div>
                      <div>✓ <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">section:"St. Rose"</span> → Quotes preserve spaces</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-blue-300 text-blue-700 text-xs">
                    <strong>Field Aliases:</strong> name/student/payer/customer · id/order/orderid · section/sec · pickup/time/slot · item/food · note/notes/comment · status/state · total/price/amount
                  </div>
                </div>
              )}

              {/* Active Filter Chips */}
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => removeFilter(chip)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                    >
                      {chip.label}
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ))}
                  <button
                    onClick={() => setQ("")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split("-");
                setSortField(field);
                setSortOrder(order);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
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
            const count = orders.filter(o => {
              const status = normalizeStatus(o.status);
              if (t === "All") {
                return status !== "Pending" && status !== "Rejected";
              }
              return status === t;
            }).length;
            
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
                {t} <span className={`ml-1.5 ${active ? 'text-gray-300' : 'text-gray-500'}`}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total Orders</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
              {orders.filter(o => {
                const s = normalizeStatus(o.status);
                return s !== "Pending" && s !== "Rejected";
              }).length}
            </div>
          </div>
          <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-3 sm:p-4">
            <div className="text-xs text-emerald-700 uppercase tracking-wide">Approved</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-900 mt-1">
              {orders.filter(o => normalizeStatus(o.status) === "Approved").length}
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 sm:p-4">
            <div className="text-xs text-blue-700 uppercase tracking-wide">Preparing</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">
              {orders.filter(o => normalizeStatus(o.status) === "Preparing").length}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-3 sm:p-4">
            <div className="text-xs text-green-700 uppercase tracking-wide">Ready</div>
            <div className="text-xl sm:text-2xl font-bold text-green-900 mt-1">
              {orders.filter(o => normalizeStatus(o.status) === "Ready").length}
            </div>
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filtered.length}</span> of{" "}
            <span className="font-semibold">
              {orders.filter(o => {
                const s = normalizeStatus(o.status);
                if (tab === "All") return s !== "Pending" && s !== "Rejected";
                return s === tab;
              }).length}
            </span>{" "}
            orders
          </div>
        )}

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
                <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-shadow">
                  {/* Card header - Mobile optimized */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm text-gray-500 truncate font-mono">#{o.id}</span>
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
                        <span className="font-medium">Grade:</span> {o.grade}-{o.section}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-1">
                        <span className="inline-flex items-center gap-1">
                          <span className="font-medium">Pickup:</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                            {when || "—"}
                          </span>
                        </span>
                      </div>
                      {normalizeStatus(o.status) === "Claimed" && claimedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">Claimed:</span> {fmtDateTime(claimedAt)}
                        </div>
                      )}
                      {!!o.note && (
                        <div className="text-xs sm:text-sm text-gray-500 mt-2 italic break-words bg-amber-50 border border-amber-200 rounded p-2">
                          <span className="font-medium not-italic text-amber-800">📝 Note:</span> {o.note}
                        </div>
                      )}
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-xs sm:text-sm text-gray-500">Total</div>
                      <div className="text-base sm:text-lg font-semibold text-gray-900">{peso.format(orderTotal(o))}</div>
                    </div>
                  </div>

                  {/* Items - Mobile optimized */}
                  <div className="mt-3 border-t pt-3">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Items Ordered</div>
                    <div className="space-y-1.5">
                      {(o.items || []).map((it, idx) => (
                        <div key={idx} className="flex items-start justify-between text-xs sm:text-sm py-1 hover:bg-gray-50 px-2 -mx-2 rounded">
                          <div className="text-gray-700 flex-1 pr-2 break-words">{it.name}</div>
                          <div className="text-gray-600 font-medium flex-shrink-0">
                            <span className="text-gray-500">×</span>{it.qty ?? it.quantity ?? 0}
                          </div>
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
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 font-medium transition-colors"
                      >
                        {busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Timer className="w-4 h-4" />}
                        Move to Preparing
                      </button>
                    )}
                    {normalizeStatus(o.status) === "Preparing" && (
                      <button
                        onClick={() => transition(o.id, "Ready")}
                        disabled={busyId === o.id}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 font-medium transition-colors"
                      >
                        {busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Mark Ready
                      </button>
                    )}
                    {normalizeStatus(o.status) === "Ready" && (
                      <button
                        onClick={() => transition(o.id, "Claimed")}
                        disabled={busyId === o.id}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm bg-gray-900 text-white hover:bg-black disabled:opacity-60 font-medium transition-colors"
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
              <div className="bg-white rounded-xl border border-gray-100 p-8 sm:p-10 text-center">
                <div className="text-gray-400 mb-3">
                  <Search className="w-12 h-12 mx-auto" />
                </div>
                <div className="text-base font-medium text-gray-900 mb-1">No orders found</div>
                <div className="text-sm text-gray-500">
                  {activeFilters.length > 0 || parsedQuery.plainTerms.length > 0
                    ? "Try adjusting your search filters"
                    : "No orders match the current filter"}
                </div>
                {(activeFilters.length > 0 || parsedQuery.plainTerms.length > 0) && (
                  <button
                    onClick={() => setQ("")}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear Search
                  </button>
                )}
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