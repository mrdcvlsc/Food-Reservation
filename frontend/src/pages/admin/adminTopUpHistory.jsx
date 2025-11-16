// AdminTopUpHistory.jsx
import React, { useEffect, useState, useMemo } from "react";
import Navbar from "../../components/adminavbar";
import AdminBottomNav from "../../components/mobile/AdminBottomNav";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  RefreshCw, 
  Filter, 
  X,
  Eye,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  User,
  CreditCard,
  Phone,
  Calendar,
  FileText,
  Image as ImageIcon
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function StatusBadge({ status }) {
  const s = String(status || "pending").toLowerCase();
  const label = String(status || "Pending");
  
  const configs = {
    approved: {
      class: "bg-emerald-100 text-emerald-700 border-emerald-200",
      icon: <CheckCircle className="w-3 h-3" />
    },
    pending: {
      class: "bg-amber-100 text-amber-700 border-amber-200",
      icon: <Clock className="w-3 h-3" />
    },
    rejected: {
      class: "bg-rose-100 text-rose-700 border-rose-200",
      icon: <XCircle className="w-3 h-3" />
    }
  };

  const config = s.includes("approve") ? configs.approved :
                 s.includes("reject") ? configs.rejected :
                 s.includes("pending") ? configs.pending :
                 { class: "bg-slate-100 text-slate-700 border-slate-200", icon: null };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.class}`}>
      {config.icon}
      {label}
    </span>
  );
}

function shortDate(dt) {
  try {
    const d = new Date(dt);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dt || "—";
  }
}

export default function AdminTopUpHistory() {
  const navigate = useNavigate();
  const [rawList, setRawList] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const load = async () => {
    try {
      setListLoading(true);
      const tryEndpoints = ["/topups", "/admin/topups", "/topups/all", "/topups?all=1"];
      let data = null;
      for (const ep of tryEndpoints) {
        try {
          const res = await api.get(ep);
          const arr = Array.isArray(res) ? res : res;
          if (Array.isArray(arr)) {
            data = arr;
            break;
          }
        } catch (e) {
          // try next endpoint
        }
      }
      const raw = Array.isArray(data) ? data : [];

      const normalizeProvider = (p) => {
        if (!p) return "";
        const pp = String(p).toLowerCase();
        if (pp.includes("pay") || pp.includes("maya")) return "paymaya";
        if (pp.includes("gcash")) return "gcash";
        return pp;
      };

      const normalizeStatus = (s) => {
        if (!s) return "pending";
        const ss = String(s).toLowerCase();
        if (ss.includes("approve")) return "approved";
        if (ss.includes("reject")) return "rejected";
        if (ss.includes("pending") || ss === "") return "pending";
        return ss;
      };

      const mapped = raw.map((t) => ({
        id: t.id || t._id || Math.random().toString(36).slice(2, 9),
        createdAt: t.createdAt || t.date || t.submittedAt || (t.raw && t.raw.createdAt) || new Date().toISOString(),
        name: t.student || t.name || t.userName || t.email || (t.user && t.user.name) || "—",
        studentId: t.studentId || t.sid || t.student || (t.user && t.user.studentId) || "—",
        contact: t.contact || t.phone || t.mobile || (t.user && t.user.phone) || "—",
        provider: normalizeProvider(t.provider || t.raw?.provider),
        amount: Number(t.amount) || 0,
        status: normalizeStatus(t.status || t.state || t.raw?.status),
        reference: t.reference || t.ref || t.referenceNumber || "—",
        proofUrl: t.proofUrl || t.proof || t.image || "",
        note: t.note || t.notes || "",
        rejectionReason: t.rejectionReason || t.raw?.rejectionReason || "",
        raw: t,
      }));

      mapped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRawList(mapped);
    } catch (e) {
      console.error("Failed to load topups", e);
      setRawList([]);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  const providerOptions = useMemo(() => {
    const s = new Set();
    for (const r of rawList) {
      if (r.provider) s.add(r.provider.toLowerCase());
    }
    ["gcash", "paymaya"].forEach((f) => s.add(f));
    return ["all", ...Array.from(s).filter(Boolean)];
  }, [rawList]);

  const statusOptions = useMemo(() => {
    const s = new Set();
    for (const r of rawList) {
      if (r.status) s.add(String(r.status).toLowerCase());
    }
    ["pending", "approved", "rejected"].forEach((st) => s.add(st));
    return ["all", ...Array.from(s).filter(Boolean)];
  }, [rawList]);

  const filtered = useMemo(() => {
    if (!rawList || rawList.length === 0) return [];

    const tokens = debouncedQ
      .split(/\s+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    return rawList.filter((r) => {
      if (providerFilter !== "all" && String(r.provider || "").toLowerCase() !== String(providerFilter || "").toLowerCase()) return false;
      if (statusFilter !== "all" && String(r.status || "").toLowerCase() !== String(statusFilter || "").toLowerCase()) return false;
      if (tokens.length === 0) return true;
      const haystack = [
        String(r.name || "").toLowerCase(),
        String(r.studentId || "").toLowerCase(),
        String(r.reference || "").toLowerCase(),
        String(r.contact || "").toLowerCase(),
        String(r.id || "").toLowerCase(),
      ].join(" ");
      return tokens.every((tok) => haystack.includes(tok));
    });
  }, [rawList, debouncedQ, providerFilter, statusFilter]);

  const totals = useMemo(() => {
    const totalCount = rawList.length;
    const filteredCount = filtered.length;
    const sum = filtered.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pending = rawList.filter((r) => String(r.status).toLowerCase() === "pending").length;
    const approved = rawList.filter((r) => String(r.status).toLowerCase() === "approved").length;
    const rejected = rawList.filter((r) => String(r.status).toLowerCase() === "rejected").length;
    return { totalCount, filteredCount, sum, pending, approved, rejected };
  }, [rawList, filtered]);

  const viewTopUp = (t) => setSelected(t);

  const copyToClipboard = async (text, e) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard?.writeText(String(text || ""));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Top-Up History</h1>
            <p className="text-sm text-gray-600 mt-1">Review and manage all top-up requests</p>
          </div>
          <button
            onClick={load}
            disabled={listLoading}
            className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${listLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xs text-gray-600">Total Amount</div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900">{peso.format(totals.sum)}</div>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="text-xs text-gray-600">Pending</div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-yellow-600">{totals.pending}</div>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-xs text-gray-600">Approved</div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-green-600">{totals.approved}</div>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-xs text-gray-600">Rejected</div>
            </div>
            <div className="text-lg sm:text-xl font-bold text-red-600">{totals.rejected}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 space-y-3">
          {/* Search bar - always visible */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, student ID, reference..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Mobile: Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden inline-flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              {showFilters && <X className="w-4 h-4" />}
            </button>
          </div>

          {/* Filter controls */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${showFilters ? 'block' : 'hidden'} md:grid`}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {providerOptions.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "All providers" : p.toUpperCase()}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setQ("");
                setDebouncedQ("");
                setStatusFilter("all");
                setProviderFilter("all");
              }}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
            >
              Reset Filters
            </button>
          </div>

          {/* Results counter */}
          <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t">
            <span>Showing <strong>{totals.filteredCount}</strong> of {totals.totalCount}</span>
            {(q || statusFilter !== "all" || providerFilter !== "all") && (
              <button
                onClick={() => {
                  setQ("");
                  setStatusFilter("all");
                  setProviderFilter("all");
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {listLoading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Loading top-ups...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">
              {q || statusFilter !== "all" || providerFilter !== "all" 
                ? "No top-ups match your filters."
                : "No top-up requests yet."}
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE: Card layout */}
            <div className="md:hidden space-y-3">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  onClick={() => viewTopUp(t)}
                  className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900 truncate">{t.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{t.studentId}</div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>

                  {/* Amount - Large */}
                  <div className="mb-3 pb-3 border-b">
                    <div className="text-2xl font-bold text-gray-900">{peso.format(t.amount)}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Calendar className="w-3 h-3" />
                      {shortDate(t.createdAt)}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                        <CreditCard className="w-3 h-3" />
                        Provider
                      </div>
                      <div className="font-medium text-gray-900 uppercase">{t.provider || "—"}</div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                        <Phone className="w-3 h-3" />
                        Contact
                      </div>
                      <div className="font-medium text-gray-900">{t.contact}</div>
                    </div>
                  </div>

                  {/* Reference */}
                  <div className="mb-3">
                    <div className="text-gray-500 text-xs mb-1">Reference Number</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 font-mono text-sm text-gray-900 truncate">{t.reference}</div>
                      <button
                        onClick={(e) => copyToClipboard(t.reference, e)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Notes/Rejection Reason */}
                  {(t.status?.toLowerCase() === "rejected" && t.rejectionReason) && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-red-900 mb-1">Rejection Reason</div>
                          <p className="text-xs text-red-700">{t.rejectionReason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* View button */}
                  <button className="w-full mt-3 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </div>
              ))}
            </div>

            {/* DESKTOP: Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Provider</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reference</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(t.createdAt).toLocaleDateString()}
                          <div className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">{t.studentId}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{t.contact}</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600 uppercase font-medium">{t.provider || "—"}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 max-w-xs">
                            <span className="text-sm text-gray-900 font-mono truncate">{t.reference}</span>
                            <button
                              onClick={(e) => copyToClipboard(t.reference, e)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Copy reference"
                            >
                              <Copy className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{peso.format(t.amount)}</td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => viewTopUp(t)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal - Enhanced */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="w-full sm:max-w-4xl bg-white sm:rounded-xl overflow-hidden max-h-screen sm:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b flex items-start justify-between gap-4 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-lg font-semibold text-gray-900">{selected.name}</span>
                </div>
                <div className="text-sm text-gray-500 font-mono">{selected.studentId}</div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Calendar className="w-3 h-3" />
                  {shortDate(selected.createdAt)}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm text-gray-500 mb-1">Amount</div>
                <div className="text-2xl font-bold text-gray-900">{peso.format(selected.amount)}</div>
                <div className="mt-2">
                  <StatusBadge status={selected.status} />
                </div>
              </div>
            </div>

            {/* Body - Scrollable */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Details */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <FileText className="w-4 h-4" />
                      Reference Number
                    </div>
                    <div className="p-3 border rounded-lg bg-gray-50 font-mono text-sm break-all">{selected.reference}</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Phone className="w-4 h-4" />
                      Contact
                    </div>
                    <div className="p-3 border rounded-lg bg-gray-50 text-sm">{selected.contact}</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <CreditCard className="w-4 h-4" />
                      Provider
                    </div>
                    <div className="p-3 border rounded-lg bg-gray-50 text-sm uppercase font-medium">{selected.provider || "—"}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-2">
                      {selected.status?.toLowerCase() === "rejected" ? "Rejection Reason" : "Notes"}
                    </div>
                    <div className={`p-3 border rounded-lg text-sm ${
                      selected.status?.toLowerCase() === "rejected" 
                        ? "bg-red-50 border-red-200 text-red-900" 
                        : "bg-gray-50 text-gray-700"
                    }`}>
                      {selected.status?.toLowerCase() === "rejected"
                        ? (selected.rejectionReason || "No reason provided")
                        : (selected.note || "—")}
                    </div>
                  </div>
                </div>

                {/* Right Column - Proof */}
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <ImageIcon className="w-4 h-4" />
                    Payment Proof
                  </div>
                  {selected.proofUrl ? (
                    <div className="border rounded-lg overflow-hidden bg-gray-900 p-4">
                      <img 
                        src={selected.proofUrl} 
                        alt="Payment proof" 
                        className="w-full h-auto max-h-96 object-contain rounded"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23374151' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='14'%3EImage not found%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="border rounded-lg p-12 text-center bg-gray-50">
                      <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No proof image available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t bg-gray-50 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={(e) => copyToClipboard(selected.reference, e)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 order-2 sm:order-1"
              >
                <Copy className="w-4 h-4" />
                {copySuccess ? "Copied!" : "Copy Reference"}
              </button>
              <button
                onClick={() => setSelected(null)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 order-1 sm:order-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy success toast */}
      {copySuccess && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">Copied to clipboard!</span>
        </div>
      )}

      {/* Bottom Nav - Mobile only */}
      <AdminBottomNav badgeCounts={{ topups: totals.pending }} />
    </div>
  );
}