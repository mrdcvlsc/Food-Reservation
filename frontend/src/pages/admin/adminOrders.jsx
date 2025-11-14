// src/pages/admin/adminOrders.jsx
import React, { useMemo, useState, useEffect } from "react";
import { api } from "../../lib/api";
import Navbar from "../../components/adminavbar";
import {
  UtensilsCrossed,
  Timer,
  CheckCircle2,
  Search,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { refreshSessionForProtected } from "../../lib/auth";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function normalizeStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "Approved";
  if (["approved", "approve"].includes(s)) return "Approved";
  if (["preparing", "prep", "in-prep", "in_prep"].includes(s)) return "Preparing";
  if (["ready", "done"].includes(s)) return "Ready";
  if (["claimed", "pickedup", "picked_up", "picked-up"].includes(s)) return "Claimed";
  if (["pending"].includes(s)) return "Pending";
  if (["rejected", "declined"].includes(s)) return "Rejected";
  return "Approved";
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
    }[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
};

// add helpers for student name/id and datetime formatting
function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleString();
}

function getStudentName(o) {
  // prefer explicit student name fields, then fallback to nested user.name or payerName
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
  const [busyId, setBusyId] = useState(null);

  // ---- fetch orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reservations/admin");
      const arr = Array.isArray(data) ? data : [];
      setOrders(arr);
    } catch (e) {
      console.error("Load orders failed:", e);
      setOrders([]);
      alert(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    fetchOrders();
    return () => {
      alive = false;
    };
  }, []);

  // ---- ui state
  const [tab, setTab] = useState("All"); // All | Approved | Preparing | Ready | Claimed
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState("pickup"); // pickup | name | total | id
  const [sortOrder, setSortOrder] = useState("asc"); // asc | desc

  // ---- Helper functions (moved BEFORE useMemo)
  const orderTotal = (o) =>
    (o?.items || []).reduce(
      (acc, it) => acc + (Number(it?.qty ?? it?.quantity ?? 0) || 0) * (Number(it?.price ?? it?.unitPrice ?? 0) || 0),
      0
    );

  const getPickupTimeValue = (o) => {
    const when = o.when || o.slot || o.slotLabel || o.pickup || o.pickupTime || "";
    // Try to parse as time format (e.g., "recess", "lunch", "breakfast")
    const timeOrder = { "breakfast": 0, "recess": 1, "lunch": 2, "dismissal": 3, "after": 4 };
    const normalized = String(when).toLowerCase().trim();
    return timeOrder[normalized] !== undefined ? timeOrder[normalized] : 999;
  };

  // ---- derived
  const filtered = useMemo(() => {
    const ql = String(q || "").toLowerCase();

    // Filter orders
    let rows = (orders || [])
      .map((o) => ({ ...o, status: normalizeStatus(o.status) }))
      .filter((o) => {
        const s = o.status;
        if (tab !== "All" && s !== tab) return false;
        if (tab === "All" && (s === "Pending" || s === "Rejected")) return false;

        // Search across all fields
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

    // Sort orders
    rows = [...rows].sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case "pickup":
          aVal = getPickupTimeValue(a);
          bVal = getPickupTimeValue(b);
          // Numeric comparison for pickup times
          return sortOrder === "asc" ? aVal - bVal : bVal - aVal;

        case "name":
          aVal = String(getStudentName(a) || "").toLowerCase();
          bVal = String(getStudentName(b) || "").toLowerCase();
          break;

        case "total":
          aVal = orderTotal(a);
          bVal = orderTotal(b);
          // Numeric comparison
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

      // Handle string comparison (for name, id, status)
      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal);
        return sortOrder === "asc" ? comparison : -comparison;
      }

      return 0;
    });

    return rows;
  }, [orders, tab, q, sortField, sortOrder]);

  // Handle sort column click
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle sort order if clicking same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // ---- actions
  const transition = async (id, next) => {
    setBusyId(id);
    try {
      const res = await api.patch(`/reservations/admin/${id}`, { status: next });
      if (res && res.reservation) {
        setOrders((list) => list.map((o) => (String(o.id) === String(id) ? res.reservation : o)));
      } else if (res && (res.id || res.status)) {
        setOrders((list) => list.map((o) => (String(o.id) === String(id) ? { ...o, ...res } : o)));
      } else {
        await fetchOrders();
      }
    } catch (e) {
      console.error("Transition failed:", e);
      alert(e?.message || `Failed to set status to ${next}`);
    } finally {
      setBusyId(null);
    }
  };

  const tabs = ["All", "Approved", "Preparing", "Ready", "Claimed"];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders Queue</h1>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Tabs (chip style) */}
        <div className="flex items-center gap-2">
          {tabs.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
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
              <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-gray-200 rounded" />
                    <div className="h-5 w-60 bg-gray-200 rounded" />
                    <div className="h-4 w-40 bg-gray-200 rounded" />
                  </div>
                  <div className="h-6 w-24 bg-gray-200 rounded" />
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
                <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{o.id}</span>
                        <Pill status={normalizeStatus(o.status)} />
                      </div>
                      <div className="mt-1 text-gray-900 font-medium">
                        {studentName}{" "}
                        {studentId ? (
                          <span className="ml-3 text-sm font-mono text-gray-500">{studentId}</span>
                        ) : null}{" "}
                        • {o.grade}-{o.section}
                      </div>
                      <div className="text-sm text-gray-600">
                        Pickup Time: {when || "—"}
                        {normalizeStatus(o.status) === "Claimed" && claimedAt ? (
                          <div className="text-xs text-gray-500 mt-1">Claimed: {fmtDateTime(claimedAt)}</div>
                        ) : null}
                      </div>
                      {!!o.note && <div className="text-sm text-gray-500 mt-1">Note: {o.note}</div>}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm text-gray-500">Total</div>
                      <div className="text-lg font-semibold">{peso.format(orderTotal(o))}</div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mt-3 border-t pt-3">
                    {(o.items || []).map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm py-1">
                        <div className="text-gray-700">{it.name}</div>
                        <div className="text-gray-600">x{it.qty ?? it.quantity ?? 0}</div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-end">
                    {normalizeStatus(o.status) === "Approved" && (
                      <button
                        onClick={() => transition(o.id, "Preparing")}
                        disabled={busyId === o.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Timer className="w-4 h-4" />}
                        Move to Preparing
                      </button>
                    )}
                    {normalizeStatus(o.status) === "Preparing" && (
                      <button
                        onClick={() => transition(o.id, "Ready")}
                        disabled={busyId === o.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Mark Ready
                      </button>
                    )}
                    {normalizeStatus(o.status) === "Ready" && (
                      <button
                        onClick={() => transition(o.id, "Claimed")}
                        disabled={busyId === o.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-gray-900 text-white hover:bg-black disabled:opacity-60"
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
              <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-500">
                No orders found for this filter.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
