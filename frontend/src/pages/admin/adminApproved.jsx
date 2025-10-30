// src/pages/admin/adminApproved.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";
import Navbar from "../../components/adminavbar";
import { CheckCircle2, PackageCheck, Search } from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function Pill({ status }) {
  const map = {
    Approved: "bg-green-100 text-green-700",
    Preparing: "bg-blue-100 text-blue-700",
    Ready: "bg-emerald-100 text-emerald-700",
    Claimed: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

export default function AdminApproved() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'admin' });
    })();
  }, [navigate]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    setLoading(true);
    api.get('/reservations/admin')
      .then(d => { if (!m) return; setRows((d || []).filter(r => r.status === 'Approved' || r.status === 'Preparing' || r.status === 'Ready')); })
      .catch(() => setRows([]))
      .finally(() => m && setLoading(false));
    return () => (m = false);
  }, []);

  const [q, setQ] = useState("");

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.student.toLowerCase().includes(q.toLowerCase()) ||
          r.id.toLowerCase().includes(q.toLowerCase()) ||
          r.grade.toLowerCase().includes(q.toLowerCase()) ||
          r.section.toLowerCase().includes(q.toLowerCase())
      ),
    [rows, q]
  );

  const total = (r) => r.items.reduce((a, b) => a + b.qty * b.price, 0);

  const toPreparing = async (id) => {
    await api.patch(`/reservations/admin/${id}`, { status: 'Preparing' });
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: "Preparing" } : r)));
  };

  const toReady = async (id) => {
    await api.patch(`/reservations/admin/${id}`, { status: 'Ready' });
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: "Ready" } : r)));
  };

  const toClaimed = async (id) => {
    await api.patch(`/reservations/admin/${id}`, { status: 'Claimed' });
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: "Claimed" } : r)));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Approved Reservations</h1>
          </div>
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, ID, grade/section…"
              className="w-64 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{r.id}</span>
                    <Pill status={r.status} />
                  </div>
                  <div className="mt-1 text-gray-900 font-medium">{r.student} • {r.grade}-{r.section}</div>
                  <div className="text-sm text-gray-600">When: {r.when}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="text-lg font-semibold">{peso.format(total(r))}</div>
                </div>
              </div>

              <div className="mt-3 border-t pt-3">
                {r.items.map((it, idx) => (
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
                {r.status === "Approved" && (
                  <button
                    onClick={() => toPreparing(r.id)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <PackageCheck className="w-4 h-4" /> Move to Preparing
                  </button>
                )}
                {r.status === "Preparing" && (
                  <button
                    onClick={() => toReady(r.id)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Mark Ready
                  </button>
                )}
                {r.status === "Ready" && (
                  <button
                    onClick={() => toClaimed(r.id)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-gray-900 text-white hover:bg-black"
                  >
                    Mark Claimed
                  </button>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-500">
              No approved reservations right now.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
