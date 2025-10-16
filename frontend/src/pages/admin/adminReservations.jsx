// src/pages/admin/adminReservations.jsx
import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/adminavbar";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

// ---- helpers ---------------------------------------------------------------
const CANON = ["Pending", "Approved", "Rejected", "Claimed"];

function normalizeStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "Pending";
  if (["pending"].includes(s)) return "Pending";
  if (["approved", "approve"].includes(s)) return "Approved";
  if (["rejected", "declined"].includes(s)) return "Rejected";
  if (["claimed", "pickedup", "picked_up", "picked-up"].includes(s)) return "Claimed";
  return "Pending";
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
  const [tab, setTab] = useState("Pending"); // make Pending the default (admin workflow)
  const [selected, setSelected] = useState({}); // id -> true

  // fetch
  const fetchReservations = async () => {
    setLoading(true);
    try {
      const data = await api.get("/reservations/admin");
      const arr = Array.isArray(data)
        ? data
        : data && Array.isArray(data.reservations)
        ? data.reservations
        : [];
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
        const student = r.student || r.studentName || r.name || "Student";
        const grade = r.grade || r.gradeLevel || r.grade_level || "";
        const section = r.section || r.classSection || r.section_name || "";
        const when = r.when || r.slotLabel || r.slot || r.pickup || "";
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
      .sort((a, b) => b.createdNum - a.createdNum); // newest first
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
      const res = await api.patch(`/reservations/admin/${id}`, { status });
      // optimistic fallback if server doesn't echo the obj
      const patch = res && (res.reservation || res);
      if (patch && (patch.id || patch.status)) {
        setRows((rs) => rs.map((r) => (String(r.id) === String(id) ? { ...r, ...patch } : r)));
      } else {
        await fetchReservations();
      }
    } catch (e) {
      console.error(`Set status ${status} failed:`, e);
      alert(e?.message || `Failed to mark as ${status}.`);
    } finally {
      setBusyId(null);
    }
  };

  // bulk actions (only for Pending)
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const anySelected = selectedIds.length > 0;

  const bulkUpdate = async (nextStatus) => {
    if (!anySelected) return;
    const ids = selectedIds.slice();
    setSelected({});
    for (const id of ids) {
      // show subtle progress by marking busyId briefly
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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Reservations {tab !== "All" ? `(${tab})` : ""}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, ID, grade/section…"
                className="w-72 sm:w-80 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* Tabs with counts */}
        <div className="flex items-center gap-2">
          {["All", ...CANON].map((t) => {
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
                <span className="inline-flex items-center gap-2">
                  {t}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] ${
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

        {/* Bulk bar (only in Pending tab) */}
        {tab === "Pending" && (
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>
                {anySelected ? `${selectedIds.length} selected` : "Select rows to bulk approve/reject"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!anySelected}
                onClick={() => bulkUpdate("Approved")}
                className="px-3 py-1.5 rounded-lg text-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Approve Selected
              </button>
              <button
                disabled={!anySelected}
                onClick={() => bulkUpdate("Rejected")}
                className="px-3 py-1.5 rounded-lg text-xs bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Reject Selected
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-500">
            Loading reservations…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-500">
            No reservations for this filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const isPending = r.status === "Pending";
              const isChecked = !!selected[r.id];

              return (
                <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* checkbox only in Pending tab */}
                      {tab === "Pending" && (
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                          checked={isChecked}
                          onChange={(e) =>
                            setSelected((m) => ({ ...m, [r.id]: e.target.checked }))
                          }
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">RES-{r.id}</span>
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
                          <div className="text-sm text-gray-500 mt-1">Note: {r.note}</div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500">Total</div>
                      <div className="text-lg font-semibold">{peso.format(total(r))}</div>
                    </div>
                  </div>

                  <div className="mt-3 border-t pt-3">
                    {(r.items || []).map((it, idx) => {
                      const qty = Number(it.qty ?? it.quantity ?? 1);
                      return (
                        <div key={idx} className="flex items-center justify-between text-sm py-1">
                          <div className="text-gray-700">{it.name || it.product || "Item"}</div>
                          <div className="text-gray-600">x{qty}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  {isPending && (
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => updateStatus(r.id, "Approved")}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
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
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
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
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
