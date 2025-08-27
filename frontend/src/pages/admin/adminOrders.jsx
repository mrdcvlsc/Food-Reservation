// src/pages/admin/adminOrders.jsx
import React, { useMemo, useState, useEffect } from "react";
import { api } from "../../lib/api";
import Navbar from "../../components/adminavbar";
import {
  UtensilsCrossed,
  Timer,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function Pill({ status }) {
  const map = {
    Pending: "bg-yellow-100 text-yellow-700",
    Preparing: "bg-blue-100 text-blue-700",
    Ready: "bg-green-100 text-green-700",
    Claimed: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    setLoading(true);
    api.get('/reservations/admin')
      .then(d => { if (!m) return; setOrders(d || []); })
      .catch(() => setOrders([]))
      .finally(() => m && setLoading(false));
    return () => (m = false);
  }, []);

  const [tab, setTab] = useState("All"); // All | Pending | Preparing | Ready
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("time-asc"); // time-asc | time-desc

  const filtered = useMemo(() => {
    let data = orders.filter(
      (o) =>
        (tab === "All" || o.status === tab) &&
        (o.student.toLowerCase().includes(q.toLowerCase()) ||
          o.id.toLowerCase().includes(q.toLowerCase()) ||
          o.grade.toLowerCase().includes(q.toLowerCase()) ||
          o.section.toLowerCase().includes(q.toLowerCase()))
    );
    const sorter = {
      "time-asc": (a, b) => a.pickup.localeCompare(b.pickup),
      "time-desc": (a, b) => b.pickup.localeCompare(a.pickup),
    }[sort];
    return data.sort(sorter);
  }, [orders, tab, q, sort]);

  const transition = async (id, next) => {
    await api.patch(`/reservations/admin/${id}`, { status: next });
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status: next } : o)));
  };

  const total = (o) => o.items.reduce((acc, it) => acc + it.qty * it.price, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
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
                className="w-64 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
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

        {/* Tabs */}
        <div className="flex rounded-lg overflow-hidden border bg-white">
          {["All", "Pending", "Preparing", "Ready"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium ${
                tab === t ? "bg-gray-900 text-white" : "bg-white text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {filtered.map((o) => (
            <div
              key={o.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{o.id}</span>
                    <Pill status={o.status} />
                  </div>
                  <div className="mt-1 text-gray-900 font-medium">{o.student} • {o.grade}-{o.section}</div>
                  <div className="text-sm text-gray-600">Pickup: {o.pickup}</div>
                  {o.note && <div className="text-sm text-gray-500 mt-1">Note: {o.note}</div>}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="text-lg font-semibold">{peso.format(total(o))}</div>
                </div>
              </div>

              <div className="mt-3 border-t pt-3">
                {o.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1">
                    <div className="text-gray-700">{it.name}</div>
                    <div className="text-gray-600">x{it.qty}</div>
                    <div className="text-gray-900 font-medium">
                      {peso.format(it.qty * it.price)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center justify-end gap-2">
                {o.status === "Pending" && (
                  <button
                    onClick={() => transition(o.id, "Preparing")}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Timer className="w-4 h-4" /> Move to Preparing
                  </button>
                )}
                {o.status === "Preparing" && (
                  <button
                    onClick={() => transition(o.id, "Ready")}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark Ready
                  </button>
                )}
                {o.status === "Ready" && (
                  <button
                    onClick={() => transition(o.id, "Claimed")}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-gray-900 text-white hover:bg-black"
                  >
                    <ChevronRight className="w-4 h-4" /> Mark Claimed
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
      </main>
    </div>
  );
}
