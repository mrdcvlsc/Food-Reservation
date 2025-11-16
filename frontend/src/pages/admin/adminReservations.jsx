// src/pages/admin/adminReservations.jsx
import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/adminavbar";
import AdminBottomNav from '../../components/mobile/AdminBottomNav';
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";
import {
  CalendarClock,
  Check,
  X,
  Search,
  RefreshCw,
  Loader2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

// ---- helpers ---------------------------------------------------------------
const CANON = ["Pending", "Approved", "Rejected", "Claimed"];

function normalizeStatus(raw) {
  const s = String(raw || "").trim();
  if (!s) return "Pending";
  const lower = s.toLowerCase();
  if (["pending"].includes(lower)) return "Pending";
  if (["approved", "approve"].includes(lower)) return "Approved";
  if (["rejected", "declined", "cancelled"].includes(lower)) return "Rejected";
  if (["claimed", "pickedup", "picked_up", "picked-up"].includes(lower)) return "Claimed";
  return s;
}

const Pill = ({ status }) => {
  const map = {
    Pending: "bg-amber-100 text-amber-700",
    Approved: "bg-emerald-100 text-emerald-700",
    Rejected: "bg-rose-100 text-rose-700",
    Claimed: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
};

// ---- component -------------------------------------------------------------
export default function AdminReservations() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'admin' });
    })();
  }, [navigate]);

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState("Pending");
  const [selected, setSelected] = useState({});
  const [expandedCards, setExpandedCards] = useState({}); // for mobile expand/collapse

  // fetch
  const fetchReservations = async () => {
    setLoading(true);
    try {
      const data = await api.get("/reservations/admin");
      const arr = Array.isArray(data) ? data : [];
      setRows(arr);
    } catch (e) {
      console.error("Load reservations failed:", e);
      setRows([]);
      alert(e?.message || "Failed to load reservations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  // normalize & sort
  const normalized = useMemo(() => {
    return (rows || [])
      .map((r) => {
        const items = Array.isArray(r.items)
          ? r.items
          : Array.isArray(r.order)
          ? r.order
          : [];
        const student =
          r.student ||
          r.studentName ||
          r.name ||
          (r.user && (r.user.name || r.user.fullName)) ||
          r.payerName ||
          "Student";
        const grade = r.grade || r.gradeLevel || r.grade_level || "";
        const section = r.section || r.classSection || r.section_name || "";
        const when = r.when || r.slotLabel || r.slot || r.pickup || r.pickupTime || "";
        const status = normalizeStatus(r.status);
        const created =
          r.createdAt ||
          r.submittedAt ||
          r.date ||
          r.created ||
          r.updatedAt ||
          null;
        const createdNum = created ? new Date(created).getTime() : 0;
        return { ...r, items, student, grade, section, when, status, createdNum };
      })
      .sort((a, b) => b.createdNum - a.createdNum);
  }, [rows]);

  // counts for tabs
  const counts = useMemo(() => {
    const acc = CANON.reduce((m, k) => { m[k] = 0; return m; }, {});
    for (const r of normalized) acc[r.status] = (acc[r.status] || 0) + 1;
    acc["All"] = normalized.length;
    return acc;
  }, [normalized]);

  // filter by tab + search
  const filtered = useMemo(() => {
    const s = String(q || "").trim().toLowerCase();
    let list = normalized;
    if (tab !== "All") list = list.filter((r) => r.status === tab);
    if (!s) return list;
    return list.filter((r) =>
      (
        String(r.id || "") +
        " " +
        String(r.student || "") +
        " " +
        String(r.grade || "") +
        " " +
        String(r.section || "")
      )
        .toLowerCase()
        .includes(s)
    );
  }, [normalized, q, tab]);

  const lineTotal = (it) => {
    const price = Number(it.price ?? it.unitPrice ?? it.amount ?? 0);
    const qty = Number(it.qty ?? it.quantity ?? 1);
    return price * qty;
  };

  const total = (r) => (r.items || []).reduce((s, it) => s + lineTotal(it), 0);

  const updateStatus = async (id, status) => {
    setBusyId(id);
    try {
      const data = await api.patch(`/reservations/admin/${id}`, { status });
      const patch = data && (data.reservation || data);
      if (patch && (patch.id || patch.status)) {
        setRows((rs) => rs.map((r) => (String(r.id) === String(id) ? { ...r, ...patch } : r)));
      } else {
        await fetchReservations();
      }

      try { window.dispatchEvent(new Event("reservations:updated")); } catch {}
      if (String(status).toLowerCase() === "approved") {
        try { window.dispatchEvent(new Event("menu:updated")); } catch {}
      }
    } catch (e) {
      console.error(`Set status ${status} failed:`, e);
      alert(e?.message || `Failed to mark as ${status}.`);
    } finally {
      setBusyId(null);
    }
  };

  // bulk actions
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const anySelected = selectedIds.length > 0;

  const bulkUpdate = async (nextStatus) => {
    if (!anySelected) return;
    const ids = selectedIds.slice();
    setSelected({});
    for (const id of ids) {
      setBusyId(id);
      try {
        await api.patch(`/reservations/admin/${id}`, { status: nextStatus });
        setRows((rs) => rs.map((r) => (String(r.id) === String(id) ? { ...r, status: nextStatus } : r)));
      } catch (e) {
        console.error(`Bulk ${nextStatus} failed for ${id}`, e);
      } finally {
        setBusyId(null);
      }
    }

    try { window.dispatchEvent(new Event("reservations:updated")); } catch {}
    if (String(nextStatus).toLowerCase() === "approved") {
      try { window.dispatchEvent(new Event("menu:updated")); } catch {}
    }
  };

  const toggleExpand = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // derive badge counts for bottom nav
  const badgeCounts = {
    orders: 0,
    topups: 0,
    reservations: counts["Pending"] || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Reservations
            </h1>
          </div>

          {/* Search bar - full width on mobile */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search student, ID, grade..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              onClick={fetchReservations}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm disabled:opacity-60 whitespace-nowrap"
              aria-label="Refresh reservations"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Tabs - scrollable on mobile */}
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2 min-w-max">
            {["All", ...CANON].map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition whitespace-nowrap ${
                    active
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {t}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] ${
                        active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {counts[t] ?? 0}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bulk action bar - responsive */}
        {tab === "Pending" && (
          <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>
                  {anySelected ? `${selectedIds.length} selected` : "Select items to bulk approve/reject"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={!anySelected}
                  onClick={() => bulkUpdate("Approved")}
                  className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs sm:text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Approve Selected
                </button>
                <button
                  disabled={!anySelected}
                  onClick={() => bulkUpdate("Rejected")}
                  className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs sm:text-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject Selected
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 sm:p-10 text-center text-sm text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading reservations…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 sm:p-10 text-center text-sm text-gray-500">
            {q ? "No reservations match your search." : "No reservations for this filter."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const isPending = r.status === "Pending";
              const isChecked = !!selected[r.id];
              const isExpanded = !!expandedCards[r.id];

              return (
                <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Card Header - Always visible */}
                  <div className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox - only in Pending tab */}
                      {tab === "Pending" && (
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300 flex-shrink-0"
                          checked={isChecked}
                          onChange={(e) =>
                            setSelected((m) => ({ ...m, [r.id]: e.target.checked }))
                          }
                        />
                      )}

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm text-gray-500 font-mono">RES-{r.id}</span>
                          <Pill status={r.status} />
                        </div>
                        <div className="mt-1 text-sm sm:text-base text-gray-900 font-medium">
                          {r.student}
                          {r.studentId && (
                            <span className="ml-2 text-xs sm:text-sm font-mono text-gray-500">
                              {r.studentId}
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-0.5">
                          {r.grade}{r.section ? `-${r.section}` : ""}
                        </div>
                        {r.when && (
                          <div className="text-xs sm:text-sm text-gray-600 mt-1">
                            Pickup: {r.when}
                          </div>
                        )}
                        {r.status === "Claimed" && (r.claimedAt || r.pickedAt || r.picked_at || r.claimed_at) && (
                          <div className="text-xs text-gray-500 mt-1">
                            Claimed: {new Date(r.claimedAt || r.pickedAt || r.picked_at || r.claimed_at).toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Total - Right side */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-base sm:text-lg font-semibold text-gray-900">
                          {peso.format(total(r))}
                        </div>
                      </div>
                    </div>

                    {/* Expand/Collapse button - Mobile only */}
                    <button
                      onClick={() => toggleExpand(r.id)}
                      className="md:hidden mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-600 hover:text-gray-900 border-t"
                    >
                      {isExpanded ? (
                        <>
                          <span>Hide Items</span>
                          <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <span>View {r.items?.length || 0} Item{(r.items?.length || 0) !== 1 ? 's' : ''}</span>
                          <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Items list - Hidden on mobile unless expanded, always visible on desktop */}
                  <div className={`border-t ${isExpanded ? 'block' : 'hidden'} md:block`}>
                    <div className="p-3 sm:p-4 space-y-2">
                      {(r.items || []).map((it, idx) => {
                        const qty = Number(it.qty ?? it.quantity ?? 1);
                        const itemPrice = Number(it.price ?? it.unitPrice ?? it.amount ?? 0);
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs sm:text-sm">
                            <div className="text-gray-700 flex-1 min-w-0 truncate">
                              {it.name || it.product || "Item"}
                            </div>
                            <div className="text-gray-600 ml-3 flex-shrink-0">
                              x{qty} = {peso.format(itemPrice * qty)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions - only for Pending */}
                    {isPending && (
                      <div className="p-3 sm:p-4 bg-gray-50 border-t flex items-center justify-end gap-2">
                        <button
                          onClick={() => updateStatus(r.id, "Approved")}
                          disabled={busyId === r.id}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {busyId === r.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, "Rejected")}
                          disabled={busyId === r.id}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                        >
                          {busyId === r.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Navigation - Mobile only */}
      <AdminBottomNav badgeCounts={badgeCounts} />
    </div>
  );
}