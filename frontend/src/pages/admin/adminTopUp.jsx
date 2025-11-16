import React, { useRef, useState, useEffect, useCallback } from "react";
import Navbar from "../../components/adminavbar";
import AdminBottomNav from "../../components/mobile/AdminBottomNav";
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  Wallet,
  Clock,
  RefreshCw,
  ExternalLink,
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import { refreshSessionForProtected } from "../../lib/auth";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const fmtDT = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v || "");
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
};

const providerBadge = (p) => {
  const provider = String(p || "").toLowerCase();
  if (provider === "maya") {
    return "inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700";
  }
  return "inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700";
};

export default function AdminTopUp() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("verify");

  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: "admin" });
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Top-Up Management</h1>
              <p className="text-xs sm:text-sm text-gray-500">Manage wallet settings and verify transactions</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setTab("verify")}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                tab === "verify" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Clock className="w-4 h-4 inline-block mr-2" />
              Verify Top-Ups
            </button>
            <button
              onClick={() => setTab("wallet")}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                tab === "wallet" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Wallet className="w-4 h-4 inline-block mr-2" />
              Wallet Setup
            </button>
          </div>
        </header>

        {tab === "wallet" ? <TopUpManager /> : <VerifyQueue />}
      </main>

      {/* Fixed mobile bottom nav (hidden on lg+) */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
        <AdminBottomNav />
      </div>
    </div>
  );
}

/* ---------------- Wallet Setup Component ---------------- */
function TopUpManager() {
  const navigate = useNavigate();
  const [provider, setProvider] = useState("gcash");
  const [qrPreview, setQrPreview] = useState({ gcash: null, maya: null });
  const [meta, setMeta] = useState({
    gcash: { accountName: "", mobile: "", reference: "" },
    maya: { accountName: "", mobile: "", reference: "" },
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: "admin" });
    })();
  }, [navigate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const list = await api.get("/wallets");
        const nextMeta = {
          gcash: { accountName: "", mobile: "", reference: "" },
          maya: { accountName: "", mobile: "", reference: "" },
        };
        const nextPrev = { gcash: null, maya: null };

        (list || []).forEach((w) => {
          const key = (w.provider || "").toLowerCase();
          if (key === "gcash" || key === "maya") {
            nextMeta[key] = {
              accountName: w.accountName || "",
              mobile: w.mobile || "",
              reference: w.reference || "",
            };
            nextPrev[key] = w.qrImageUrl || null;
          }
        });

        if (!alive) return;
        setMeta(nextMeta);
        setQrPreview(nextPrev);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setQrPreview((prev) => ({ ...prev, [provider]: localUrl }));

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("provider", provider);
      fd.append("qr", file);
      const data = await api.post("/admin/wallets", fd);
      setQrPreview((prev) => ({ ...prev, [provider]: data.qrImageUrl || localUrl }));
      setMeta((m) => ({
        ...m,
        [provider]: {
          accountName: data.accountName || m[provider].accountName,
          mobile: data.mobile || m[provider].mobile,
          reference: data.reference || m[provider].reference,
        },
      }));
      alert("QR code uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to upload QR code");
      setQrPreview((prev) => ({ ...prev, [provider]: null }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onRemove = () => {
    setQrPreview((prev) => ({ ...prev, [provider]: null }));
  };

  const onSaveMeta = async () => {
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("provider", provider);
      fd.append("accountName", meta[provider].accountName || "");
      fd.append("mobile", meta[provider].mobile || "");
      fd.append("reference", meta[provider].reference || "");
      await api.post("/admin/wallets", fd);
      alert("Wallet details saved successfully!");
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to save wallet details");
    } finally {
      setSaving(false);
    }
  };

  const active = meta[provider];

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Provider Toggle */}
      <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex gap-2">
          <button
            onClick={() => setProvider("gcash")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
              provider === "gcash"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            GCash
          </button>
          <button
            onClick={() => setProvider("maya")}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
              provider === "maya"
                ? "bg-green-600 text-white shadow-lg shadow-green-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Maya
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* QR Upload Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">QR Code</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[280px] bg-gray-50">
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  <p className="text-sm text-gray-500">Loading...</p>
                </div>
              ) : qrPreview[provider] ? (
                <div className="space-y-4 w-full">
                  <img
                    src={qrPreview[provider]}
                    alt={`${provider} QR`}
                    className="w-full max-w-[240px] h-auto object-contain rounded-xl mx-auto shadow-lg"
                  />
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={onPickFile}
                      disabled={uploading}
                      className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" /> Replace QR
                        </>
                      )}
                    </button>
                    <button
                      onClick={onRemove}
                      disabled={uploading}
                      className="inline-flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 transition text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center mx-auto">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      No QR code uploaded for <span className="font-semibold uppercase">{provider}</span>
                    </p>
                    <p className="text-xs text-gray-500">Upload a QR code image for customers to scan</p>
                  </div>
                  <button
                    onClick={onPickFile}
                    disabled={uploading}
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" /> Upload QR Code
                      </>
                    )}
                  </button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900">
                Customers will scan this QR code when topping up. Make sure it's clear and accurate.
              </p>
            </div>
          </div>

          {/* Account Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Account Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                <input
                  value={active?.accountName}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, [provider]: { ...m[provider], accountName: e.target.value } }))
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder={provider === "gcash" ? "e.g., Canteen GCash" : "e.g., Canteen Maya"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                <input
                  value={active?.mobile}
                  onChange={(e) => setMeta((m) => ({ ...m, [provider]: { ...m[provider], mobile: e.target.value } }))}
                  type="tel"
                  inputMode="numeric"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="09•• ••• ••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference / Notes</label>
                <textarea
                  rows={3}
                  value={active?.reference}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, [provider]: { ...m[provider], reference: e.target.value } }))
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  placeholder="Optional: e.g., 'Include student ID in payment note'"
                />
              </div>

              <button
                onClick={onSaveMeta}
                disabled={saving}
                className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3.5 px-4 rounded-xl hover:from-black hover:to-gray-900 transition text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Save {provider === "gcash" ? "GCash" : "Maya"} Details
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Verify Queue Component ---------------- */
function VerifyQueue() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState("all");
  const [lightbox, setLightbox] = useState({ open: false, src: "", alt: "" });

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
  const norm = (u) => (u && u.startsWith("/") ? API_BASE + u : u);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await api.get("/admin/topups");
      const list = (d || [])
        .map((r) => ({
          ...r,
          proofUrl: norm(r.proofUrl),
          statusLC: String(r.status || "").toLowerCase(),
        }))
        .filter((r) => r.statusLC === "pending");
      setRows(list);
    } catch (e) {
      console.error(e);
      setError("Failed to load top-ups.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
    const id = setInterval(fetchRows, 30000);
    return () => clearInterval(id);
  }, [fetchRows]);

  const approve = async (r) => {
    if (!window.confirm(`Approve ${peso.format(r.amount)} for ${r.student || r.payerName || "user"}?`)) return;
    try {
      setBusyId(r.id);
      await api.patch(`/admin/topups/${r.id}`, { status: "Approved" });
      setRows((list) => list.filter((x) => x.id !== r.id));
      alert(`Approved transaction ${r.id}. Balance has been credited.`);
    } catch (e) {
      alert(e?.message || "Failed to approve.");
    } finally {
      setBusyId("");
    }
  };

  const reject = async (r) => {
    const reason = window.prompt("Reason for rejection (optional):", "");
    if (reason === null) return; // User cancelled
    if (!window.confirm(`Reject top-up ${r.id}?`)) return;
    try {
      setBusyId(r.id);
      await api.patch(`/admin/topups/${r.id}`, { status: "Rejected", reason: reason || "" });
      setRows((list) => list.filter((x) => x.id !== r.id));
      alert(`Transaction ${r.id} has been rejected.`);
    } catch (e) {
      alert(e?.message || "Failed to reject.");
    } finally {
      setBusyId("");
    }
  };

  const filtered = rows.filter((r) => {
    const s = q.trim().toLowerCase();
    const providerOk = provider === "all" || String(r.provider || "").toLowerCase() === provider;
    if (!s) return providerOk;
    return (
      providerOk &&
      (String(r.id).toLowerCase().includes(s) ||
        String(r.reference || "").toLowerCase().includes(s) ||
        String(r.student || r.payerName || "").toLowerCase().includes(s) ||
        String(r.studentId || "").toLowerCase().includes(s))
    );
  });

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pending Top-Ups</h2>
              <p className="text-xs text-gray-500">
                {filtered.length} transaction{filtered.length !== 1 ? "s" : ""} waiting
              </p>
            </div>
          </div>

          <button
            onClick={fetchRows}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-300 hover:bg-gray-50 transition disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ID, name, reference..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div className="relative sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none bg-white"
            >
              <option value="all">All providers</option>
              <option value="gcash">GCash</option>
              <option value="maya">Maya</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="m-4 sm:m-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">{error}</p>
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reference</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Provider</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Proof</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Submitted</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading transactions...</p>
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono font-medium text-gray-900">#{r.id}</div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{r.payerName || r.student || "—"}</div>
                    <div className="text-xs text-gray-500">{r.studentId ? `ID: ${r.studentId}` : "—"}</div>
                    {r.contact && <div className="text-xs text-gray-400">{r.contact}</div>}
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 font-mono">{r.reference || "—"}</div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className={providerBadge(r.provider)}>{String(r.provider || "").toUpperCase()}</span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="text-sm font-bold text-emerald-600">{peso.format(Number(r.amount || 0))}</div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      {r.proofUrl ? (
                        <div className="flex flex-col items-center gap-1">
                          <img
                            src={r.proofUrl}
                            alt="payment proof"
                            className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 cursor-zoom-in hover:border-blue-400 transition"
                            onClick={() => setLightbox({ open: true, src: r.proofUrl, alt: `Proof ${r.id}` })}
                          />
                          <button
                            onClick={() => setLightbox({ open: true, src: r.proofUrl, alt: `Proof ${r.id}` })}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            View
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No proof</span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{fmtDT(r.submittedAt || r.createdAt)}</div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        disabled={busyId === r.id}
                        onClick={() => approve(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => reject(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">All caught up!</p>
                  <p className="text-xs text-gray-500 mt-1">No pending top-ups at the moment.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile/List View */}
      <div className="lg:hidden p-4 space-y-3">
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading transactions...</p>
          </div>
        )}

        {!loading &&
          filtered.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-mono font-medium text-gray-900">#{r.id}</div>
                      <div className="text-xs text-gray-500">{fmtDT(r.submittedAt || r.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-600">{peso.format(Number(r.amount || 0))}</div>
                      <div className="text-xs mt-1">
                        <span className={providerBadge(r.provider)}>{String(r.provider || "").toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-gray-700">
                    <div className="font-medium">{r.payerName || r.student || "—"}</div>
                    <div className="text-xs text-gray-500">{r.reference || "—"}</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {r.proofUrl ? (
                  <>
                    <img
                      src={r.proofUrl}
                      alt="proof"
                      className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 cursor-pointer"
                      onClick={() => setLightbox({ open: true, src: r.proofUrl, alt: `Proof ${r.id}` })}
                    />
                    <button
                      onClick={() => setLightbox({ open: true, src: r.proofUrl, alt: `Proof ${r.id}` })}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View proof
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">No proof</span>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <button
                    disabled={busyId === r.id}
                    onClick={() => approve(r)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => reject(r)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">All caught up!</p>
            <p className="text-xs text-gray-500 mt-1">No pending top-ups at the moment.</p>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightbox.open && (
        <div
          onClick={() => setLightbox({ open: false, src: "", alt: "" })}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="max-w-3xl w-full bg-white rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <div className="text-sm font-medium text-gray-900">{lightbox.alt}</div>
              <button
                onClick={() => setLightbox({ open: false, src: "", alt: "" })}
                className="p-2 rounded-md hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-gray-50">
              <img src={lightbox.src} alt={lightbox.alt} className="max-h-[70vh] w-auto h-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
