// src/pages/admin/adminReservations.jsx
import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import {
  CalendarClock,
  Check,
  X,
  Search,
  RefreshCw,
  Loader2,
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function Pill({ status }) {
  const map = {
    Pending: "bg-yellow-100 text-yellow-700",
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
        map[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

export default function AdminReservations() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      // api() returns parsed JSON directly
      const data = await api.get("/admin/reservations?status=Pending");
      // be defensive about shapes coming from the server
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Load reservations failed:", e);
      setRows([]);
      alert("Failed to load reservations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const normalized = useMemo(
    () =>
      rows.map((r) => {
        const items = Array.isArray(r.items)
          ? r.items
          : Array.isArray(r.order)
          ? r.order
          : [];
        const student =
          r.student || r.studentName || r.name || "Student";
        const grade = r.grade || r.gradeLevel || r.grade_level || "";
        const section = r.section || r.classSection || r.section_name || "";
        const when = r.when || r.slotLabel || r.slot || "";
        const status = r.status || "Pending";
        return { ...r, items, student, grade, section, when, status };
      }),
    [rows]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = normalized.filter((r) => r.status === "Pending");
    if (!s) return list;
    return list.filter(
      (r) =>
        (r.id || "").toString().toLowerCase().includes(s) ||
        (r.student || "").toLowerCase().includes(s) ||
        (r.grade || "").toLowerCase().includes(s) ||
        (r.section || "").toLowerCase().includes(s)
    );
  }, [normalized, q]);

  const total = (r) =>
    (r.items || []).reduce((sum, it) => {
      const price = Number(it.price ?? it.unitPrice ?? it.amount ?? 0);
      const qty = Number(it.qty ?? it.quantity ?? 1);
      return sum + price * qty;
    }, 0);

  const updateStatus = async (id, status) => {
    setBusyId(id);
    try {
      await api.put(`/admin/reservations/${id}`, { status });
      // Optimistic update: remove from pending list
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e) {
      console.error(`Set status ${status} failed:`, e);
      alert(`Failed to mark as ${status}.`);
    } finally {
      setBusyId(null);
    }
  };

  const approve = (id) => updateStatus(id, "Approved");
  const reject = (id) => updateStatus(id, "Rejected");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Reservations (Pending)
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, ID, grade/section…"
                className="w-64 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              onClick={fetchReservations}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-500">
            Loading reservations…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-500">
            No pending reservations right now.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{r.id}</span>
                      <Pill status={r.status} />
                    </div>
                    <div className="mt-1 text-gray-900 font-medium">
                      {r.student} • {r.grade}
                      {r.section ? `-${r.section}` : ""}
                    </div>
                    {r.when && (
                      <div className="text-sm text-gray-600">When: {r.when}</div>
                    )}
                    {r.note && (
                      <div className="text-sm text-gray-500 mt-1">
                        Note: {r.note}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total</div>
                    <div className="text-lg font-semibold">
                      {peso.format(total(r))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 border-t pt-3">
                  {(r.items || []).map((it, idx) => {
                    const price = Number(
                      it.price ?? it.unitPrice ?? it.amount ?? 0
                    );
                    const qty = Number(it.qty ?? it.quantity ?? 1);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm py-1"
                      >
                        <div className="text-gray-700">
                          {it.name || it.product || "Item"}
                        </div>
                        <div className="text-gray-600">x{qty}</div>
                        <div className="text-gray-900 font-medium">
                          {peso.format(qty * price)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => approve(r.id)}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {busyId === r.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => reject(r.id)}
                    disabled={busyId === r.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {busyId === r.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
