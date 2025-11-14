// src/pages/TopUpHistory.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { refreshSessionForProtected } from "../../lib/auth";
import Navbar from "../../components/avbar";
import { api } from "../../lib/api";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Eye } from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function Pill({ status }) {
  const map = {
    Pending: "bg-yellow-100 text-yellow-700",
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function fmtDateTime(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v || "");
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default function TopUpHistory() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'student' });
    })();
  }, [navigate]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI controls
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all"); // all | Pending | Approved | Rejected
  const [provider, setProvider] = useState("all"); // all | gcash | maya (case-insensitive)
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // image viewer
  const [viewer, setViewer] = useState({ open: false, src: "" });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: d } = await api.get("/topups/mine");
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
      const norm = (u) => (u && u.startsWith("/") ? API_BASE + u : u);

      const mapped = (Array.isArray(d) ? d : []).map((t) => ({
        id: t.id,
        submittedAt: t.submittedAt || t.createdAt,
        provider: String(t.provider || "").toLowerCase(), // store lowercase for filters
        amount: Number(t.amount) || 0,
        status: t.status || "Pending",
        proofUrl: norm(t.proofUrl),
        reference: t.reference || t.ref || ""
      }));
      setRows(mapped);
    } catch (e) {
      setRows([]);
      setError(e?.message || "Failed to load. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // summary
  const summary = useMemo(() => {
    let pending = 0,
      approved = 0,
      rejected = 0,
      approvedTotal = 0;
    for (const r of rows) {
      if (r.status === "Pending") pending++;
      else if (r.status === "Approved") {
        approved++;
        approvedTotal += r.amount;
      } else if (r.status === "Rejected") rejected++;
    }
    return { pending, approved, rejected, approvedTotal };
  }, [rows]);

  // filtered + sorted (newest first)
  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    let list = rows.slice(0);

    if (status !== "all") list = list.filter((r) => r.status === status);
    if (provider !== "all") list = list.filter((r) => r.provider === provider);

    if (s) {
      list = list.filter(
        (r) =>
          String(r.id).toLowerCase().includes(s) ||
          String(r.status).toLowerCase().includes(s) ||
          String(r.provider).toLowerCase().includes(s)
      );
    }

    list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    return list;
  }, [rows, q, status, provider]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageSafe]);

  // computed provider options from data
  const providerOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.provider).filter(Boolean));
    const arr = Array.from(set);
    arr.sort();
    return ["all", ...arr]; // e.g., ["all","gcash","maya"]
  }, [rows]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Top-Up History</h1>
            <p className="text-gray-600">Track all your top-up submissions and their status.</p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </header>

        {/* Summary cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-600">Approved total</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{peso.format(summary.approvedTotal)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-600">Approved</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{summary.approved}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{summary.pending}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-600">Rejected</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{summary.rejected}</div>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-3">
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by ID, provider or status…"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {providerOptions.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "All providers" : p.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left  text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left  text-xs font-semibold text-gray-600 uppercase tracking-wider">Reference Number</th>
                <th className="px-6 py-3 text-left  text-xs font-semibold text-gray-600 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Provider</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Proof</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-36 bg-gray-200 rounded" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 w-16 bg-gray-200 rounded inline-block" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-4 w-20 bg-gray-200 rounded inline-block" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-8 w-24 bg-gray-200 rounded inline-block" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-5 w-20 bg-gray-200 rounded inline-block" /></td>
                    </tr>
                  ))}
                </>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-sm text-red-600">
                    {error}{" "}
                    <button onClick={load} className="underline text-red-700">
                      Retry
                    </button>
                  </td>
                </tr>
              )}

              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-sm text-gray-600">
                    No top-ups found.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                pageRows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{r.reference || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{fmtDateTime(r.submittedAt)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center">{r.provider?.toUpperCase()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-center">{peso.format(r.amount)}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      {r.proofUrl ? (
                        <button
                          onClick={() => setViewer({ open: true, src: r.proofUrl })}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          title="View proof"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">No proof</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <Pill status={r.status} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {pageSafe} of {totalPages} • {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pageSafe <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={pageSafe >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="text-sm text-gray-600">
          Approved total added to wallet:{" "}
          <span className="font-semibold">{peso.format(summary.approvedTotal)}</span>
        </p>
      </main>

      {/* Proof viewer modal */}
      {viewer.open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setViewer({ open: false, src: "" })} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b">
                <div className="text-sm font-medium">Payment Proof</div>
                <button
                  onClick={() => setViewer({ open: false, src: "" })}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
              <div className="p-3 bg-gray-50">
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img src={viewer.src} className="max-h-[70vh] w-full object-contain rounded" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
