// src/pages/TopUpHistory.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { refreshSessionForProtected } from "../../lib/auth";
import Navbar from "../../components/avbar";
import BottomNav from "../../components/mobile/BottomNav";
import FullScreenLoader from "../../components/FullScreenLoader";
import { api } from "../../lib/api";
import { 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  X,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Calendar,
  CreditCard,
  Image as ImageIcon
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function Pill({ status }) {
  const map = {
    Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    Approved: "bg-green-100 text-green-700 border-green-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
  };
  const icons = {
    Pending: <Clock className="w-3 h-3" />,
    Approved: <CheckCircle className="w-3 h-3" />,
    Rejected: <XCircle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${map[status] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {icons[status]}
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

function fmtDate(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v || "");
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
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
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState("");

  // UI controls
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 10;

  // image viewer
  const [viewer, setViewer] = useState({ open: false, src: "", details: null });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const d = await api.get("/topups/mine");
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
      const norm = (u) => (u && u.startsWith("/") ? API_BASE + u : u);

      const mapped = (Array.isArray(d) ? d : []).map((t) => ({
        id: t.id,
        submittedAt: t.submittedAt || t.createdAt,
        provider: String(t.provider || "").toLowerCase(),
        amount: Number(t.amount) || 0,
        status: t.status || "Pending",
        proofUrl: norm(t.proofUrl),
        reference: t.reference || t.ref || "",
        rejectionReason: t.rejectionReason || ""
      }));
      setRows(mapped);
    } catch (e) {
      setRows([]);
      setError(e?.message || "Failed to load. Please try again.");
    } finally {
      setLoading(false);
      setInitialLoad(false);
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
          String(r.provider).toLowerCase().includes(s) ||
          String(r.reference).toLowerCase().includes(s)
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
    return ["all", ...arr];
  }, [rows]);

  const openViewer = (r) => {
    setViewer({ 
      open: true, 
      src: r.proofUrl,
      details: r
    });
  };

  const closeViewer = () => {
    setViewer({ open: false, src: "", details: null });
  };

  // Full-screen loading overlay (ONLY on initial load)
  if (loading && initialLoad) {
    return <FullScreenLoader message="Loading top-up history..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Top-Up History</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Track all your top-up submissions
              </p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Summary cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Approved Total</div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{peso.format(summary.approvedTotal)}</div>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Approved</div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-green-600">{summary.approved}</div>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-yellow-600">{summary.pending}</div>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Rejected</div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-red-600">{summary.rejected}</div>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 space-y-3">
          {/* Search bar - always visible */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ID, reference..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Mobile: Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden inline-flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? <X className="w-4 h-4" /> : null}
            </button>
          </div>

          {/* Filter controls */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${showFilters ? 'block' : 'hidden'} md:grid`}>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {providerOptions.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "All providers" : p.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Active filters indicator */}
          {(q || status !== "all" || provider !== "all") && (
            <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t">
              <span>Showing {filtered.length} of {rows.length} records</span>
              <button
                onClick={() => {
                  setQ("");
                  setStatus("all");
                  setProvider("all");
                  setPage(1);
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        {/* Results */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-red-100 p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button onClick={load} className="text-sm text-red-600 hover:text-red-700 underline">
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">
              {q || status !== "all" || provider !== "all" 
                ? "No top-ups match your filters."
                : "No top-up history yet."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: Card view */}
            <div className="md:hidden space-y-3">
              {pageRows.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-500">#{r.id}</span>
                          <Pill status={r.status} />
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {fmtDate(r.submittedAt)}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold text-gray-900">{peso.format(r.amount)}</div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                          <CreditCard className="w-3 h-3" />
                          Provider
                        </div>
                        <div className="font-medium text-gray-900 uppercase">{r.provider}</div>
                      </div>

                      {r.reference && (
                        <div>
                          <div className="text-gray-500 text-xs mb-1">Reference</div>
                          <div className="font-mono text-xs text-gray-900 truncate">{r.reference}</div>
                        </div>
                      )}
                    </div>

                    {/* Rejection reason */}
                    {r.status === "Rejected" && r.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-red-900 mb-1">Rejection Reason</div>
                            <p className="text-xs text-red-700">{r.rejectionReason}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action button */}
                    {r.proofUrl && (
                      <button
                        onClick={() => openViewer(r)}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100"
                      >
                        <Eye className="w-4 h-4" />
                        View Payment Proof
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table view */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reference</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Submitted</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Provider</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Proof</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pageRows.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">#{r.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {r.reference ? (
                            <span className="font-mono text-xs">{r.reference}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{fmtDateTime(r.submittedAt)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-center uppercase">{r.provider}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-center">{peso.format(r.amount)}</td>
                        <td className="px-6 py-4 text-sm text-center">
                          {r.proofUrl ? (
                            <button
                              onClick={() => openViewer(r)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                              title="View proof"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">No proof</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Pill status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
                Page {pageSafe} of {totalPages} • {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe <= 1}
                  className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" /> 
                  <span className="hidden sm:inline">Prev</span>
                </button>
                <div className="px-3 py-2 text-sm font-medium text-gray-700">
                  {pageSafe}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Proof viewer modal - Enhanced */}
      {viewer.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="w-full sm:max-w-4xl bg-white sm:rounded-xl shadow-2xl overflow-hidden max-h-screen sm:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Payment Proof</h3>
                {viewer.details && (
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                    <span className="font-mono text-xs">#{viewer.details.id}</span>
                    <span>•</span>
                    <span className="font-semibold">{peso.format(viewer.details.amount)}</span>
                    <span>•</span>
                    <span className="uppercase">{viewer.details.provider}</span>
                  </div>
                )}
              </div>
              <button
                onClick={closeViewer}
                className="p-2 hover:bg-gray-200 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image */}
            <div className="flex-1 overflow-y-auto bg-gray-900 flex items-center justify-center p-4">
              {viewer.src ? (
                <img 
                  src={viewer.src} 
                  alt="Payment proof"
                  className="max-w-full max-h-full object-contain rounded"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f3f4f6' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='14'%3EImage not found%3C/text%3E%3C/svg%3E";
                  }}
                />
              ) : (
                <div className="text-center text-gray-400">
                  <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No image available</p>
                </div>
              )}
            </div>

            {/* Footer with details */}
            {viewer.details && (
              <div className="p-4 border-t bg-gray-50 flex-shrink-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs mb-1">Status</div>
                    <Pill status={viewer.details.status} />
                  </div>
                  {viewer.details.reference && (
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Reference</div>
                      <div className="font-mono text-xs text-gray-900 truncate">{viewer.details.reference}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-gray-500 text-xs mb-1">Submitted</div>
                    <div className="text-gray-900 text-xs">{fmtDate(viewer.details.submittedAt)}</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <button
                      onClick={closeViewer}
                      className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Rejection reason in modal */}
                {viewer.details.status === "Rejected" && viewer.details.rejectionReason && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-medium text-red-900 mb-1">Rejection Reason</div>
                        <p className="text-xs text-red-700">{viewer.details.rejectionReason}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      <BottomNav />
    </div>
  );
}