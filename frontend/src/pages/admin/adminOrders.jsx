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

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  // ---- fetch orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await api.get("/reservations/admin");
      const arr = Array.isArray(data) ? data : data?.reservations || [];
      setOrders(arr);
    } catch (e) {
      console.error("Load orders failed:", e);
      setOrders([]);
      // surface error to admin
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
  const [sort, setSort] = useState("time-asc"); // time-asc | time-desc

  // ---- derived
  const filtered = useMemo(() => {
    const ql = String(q || "").toLowerCase();

    // show only fulfillment states; All excludes Pending/Rejected
    let rows = (orders || [])
      .map((o) => ({ ...o, status: normalizeStatus(o.status) }))
      .filter((o) => {
        const s = o.status;
        if (tab !== "All" && s !== tab) return false;
        if (tab === "All" && (s === "Pending" || s === "Rejected")) return false;
        const student = String(o?.student || "").toLowerCase();
        const id = String(o?.id || "").toLowerCase();
        const grade = String(o?.grade || "").toLowerCase();
        const section = String(o?.section || "").toLowerCase();
        return (
          student.includes(ql) || id.includes(ql) || grade.includes(ql) || section.includes(ql)
        );
      });

    const sorter =
      {
        "time-asc": (a, b) => String(a?.pickup || "").localeCompare(String(b?.pickup || "")),
        "time-desc": (a, b) => String(b?.pickup || "").localeCompare(String(a?.pickup || "")),
      }[sort] || ((a) => a);

    return rows.slice().sort(sorter);
  }, [orders, tab, q, sort]);

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
        // fallback: refresh whole list
        await fetchOrders();
      }
    } catch (e) {
      console.error("Transition failed:", e);
      alert(e?.message || `Failed to set status to ${next}`);
    } finally {
      setBusyId(null);
    }
  };

  const orderTotal = (o) =>
    (o?.items || []).reduce(
      (acc, it) => acc + (Number(it?.qty ?? it?.quantity ?? 0) || 0) * (Number(it?.price ?? it?.unitPrice ?? 0) || 0),
      0
    );

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
                placeholder="Search name, ID, grade/section…"
                className="w-72 sm:w-80 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="time-asc">Pickup (Early → Late)</option>
              <option value="time-desc">Pickup (Late → Early)</option>
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
            {filtered.map((o) => (
              <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{o.id}</span>
                      <Pill status={normalizeStatus(o.status)} />
                    </div>
                    <div className="mt-1 text-gray-900 font-medium">
                      {o.student} • {o.grade}-{o.section}
                    </div>
                    <div className="text-sm text-gray-600">Pickup: {o.pickup || "—"}</div>
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
            ))}

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
