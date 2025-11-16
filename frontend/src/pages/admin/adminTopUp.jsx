// src/pages/admin/adminTopUp.jsx
import React, { useRef, useState, useEffect } from "react";
import Navbar from "../../components/adminavbar";
import {
  Upload, Trash2, Image as ImageIcon,
  Check, X, Wallet, Clock4, RefreshCw, ExternalLink
} from "lucide-react";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import { refreshSessionForProtected } from "../../lib/auth";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const fmtDT = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v || "");
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
};
const badge = (p) =>
  p?.toLowerCase() === "maya"
    ? "inline-flex px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700"
    : "inline-flex px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700";

export default function AdminTopUp() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'admin' });
    })();
  }, [navigate]);

  const [tab, setTab] = useState("verify"); // default to verify
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-8 space-y-3 sm:space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Top-Up Management</h1>
          </div>
          <div className="flex rounded-lg overflow-hidden border">
            <button
              onClick={() => setTab("wallet")}
              className={`px-4 py-2 text-sm font-medium ${tab === "wallet" ? "bg-gray-900 text-white" : "bg-white text-gray-700"}`}
            >
              Wallet Setup
            </button>
            <button
              onClick={() => setTab("verify")}
              className={`px-4 py-2 text-sm font-medium ${tab === "verify" ? "bg-gray-900 text-white" : "bg-white text-gray-700"}`}
            >
              Verify Top-Ups
            </button>
          </div>
        </header>

        {tab === "wallet" ? <TopUpManager /> : <VerifyQueue />}
      </main>
    </div>
  );
}

/* ---------------- Wallet Setup (QR upload + meta) ---------------- */
function TopUpManager() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'admin' });
    })();
  }, [navigate]);

  const [provider, setProvider] = useState("gcash"); // 'gcash' | 'maya'
  const [qrPreview, setQrPreview] = useState({ gcash: null, maya: null });
  const [meta, setMeta] = useState({
    gcash: { accountName: "", mobile: "", reference: "" },
    maya: { accountName: "", mobile: "", reference: "" },
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef(null);
  const onPickFile = () => fileRef.current?.click();

  // Initial load of wallets (qr + meta)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const list = await api.get("/wallets"); // [{provider, accountName, mobile, reference, qrImageUrl, active}]
        const nextMeta = { gcash: { accountName: "", mobile: "", reference: "" }, maya: { accountName: "", mobile: "", reference: "" } };
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
    return () => { alive = false; };
  }, []);

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // optimistic local preview
    const localUrl = URL.createObjectURL(file);
    setQrPreview((prev) => ({ ...prev, [provider]: localUrl }));

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("provider", provider);
      fd.append("qr", file); // server expects 'qr'
      const data = await api.post("/admin/wallets", fd); // { qrImageUrl, accountName, mobile, reference, ... }
      setQrPreview((prev) => ({ ...prev, [provider]: data.qrImageUrl || localUrl }));
      setMeta((m) => ({
        ...m,
        [provider]: {
          accountName: data.accountName || m[provider].accountName,
          mobile: data.mobile || m[provider].mobile,
          reference: data.reference || m[provider].reference,
        },
      }));
      alert("Saved wallet QR");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onRemove = () => {
    // (Optional) Call a DELETE endpoint if you implement one.
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
      alert("Saved wallet details");
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const active = meta[provider];

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Provider toggle */}
      <div className="flex w-full rounded-lg overflow-hidden mb-6">
        <button
          type="button"
          onClick={() => setProvider("gcash")}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            provider === "gcash" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
          }`}
        >
          GCash
        </button>
        <button
          type="button"
          onClick={() => setProvider("maya")}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            provider === "maya" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"
          }`}
        >
          Maya
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: QR upload/preview */}
        <div>
          <div className="border border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : qrPreview[provider] ? (
              <>
                <img src={qrPreview[provider]} alt={`${provider} QR`} className="w-56 h-56 object-contain rounded" />
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={onPickFile}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black transition text-sm disabled:opacity-60"
                  >
                    <Upload className="w-4 h-4" /> {uploading ? "Uploading…" : "Replace QR"}
                  </button>
                  <button
                    onClick={onRemove}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              </>
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  No QR uploaded for <span className="font-semibold uppercase">{provider}</span>.
                </p>
                <button
                  onClick={onPickFile}
                  disabled={uploading}
                  className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-60"
                >
                  <Upload className="w-4 h-4" /> {uploading ? "Uploading…" : "Upload QR (PNG/JPG/SVG)"}
                </button>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Users will scan this on their top-up screen; staff verifies manually.
          </p>
        </div>

        {/* Right: account info */}
        <div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
              <input
                value={active.accountName}
                onChange={(e) =>
                  setMeta((m) => ({ ...m, [provider]: { ...m[provider], accountName: e.target.value } }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={provider === "gcash" ? "e.g., Canteen GCash" : "e.g., Canteen Maya"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile No.</label>
              <input
                value={active.mobile}
                onChange={(e) => setMeta((m) => ({ ...m, [provider]: { ...m[provider], mobile: e.target.value } }))}
                inputMode="numeric"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="09•• ••• ••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Notes</label>
              <textarea
                rows={3}
                value={active.reference}
                onChange={(e) =>
                  setMeta((m) => ({ ...m, [provider]: { ...m[provider], reference: e.target.value } }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional: e.g., 'Include student ID in note'."
              />
            </div>
          </div>

          <button
            onClick={onSaveMeta}
            disabled={saving}
            className="mt-4 w-full bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-black transition text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : `Save ${provider === "gcash" ? "GCash" : "Maya"} Details`}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------------- Verify Top-Ups (queue) ---------------------- */
function VerifyQueue() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(""); // disable buttons per row while acting
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState("all");
  const [lightbox, setLightbox] = useState({ open: false, src: "", alt: "" });

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
  const norm = (u) => (u && u.startsWith("/") ? API_BASE + u : u);

  const fetchRows = async () => {
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
        .filter((r) => r.statusLC === "pending"); // only show pending
      setRows(list);
    } catch (e) {
      console.error(e);
      setError("Failed to load top-ups.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    const id = setInterval(fetchRows, 30000); // auto-refresh every 30s
    return () => clearInterval(id);
  }, []);

  const approve = async (r) => {
    if (!window.confirm(`Approve ₱${r.amount} for ${r.student || r.payerName || "user"}?`)) return;
    try {
      setBusyId(r.id);
      await api.patch(`/admin/topups/${r.id}`, { status: "Approved" });
      setRows((list) => list.filter((x) => x.id !== r.id));
      alert(`Approved ${r.id}. Balance will be credited.`);
    } catch (e) {
      alert(e?.message || "Failed to approve.");
    } finally {
      setBusyId("");
    }
  };

  const reject = async (r) => {
    const reason = window.prompt("Reject reason (optional):", "");
    if (!window.confirm(`Reject top-up ${r.id}?`)) return;
    try {
      setBusyId(r.id);
      await api.patch(`/admin/topups/${r.id}`, { status: "Rejected", reason: reason || "" });
      setRows((list) => list.filter((x) => x.id !== r.id));
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
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Clock4 className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Pending Top-Ups</h2>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ID, name, student ID, ref…"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All providers</option>
            <option value="gcash">GCash</option>
            <option value="maya">Maya</option>
          </select>
          <button
            onClick={fetchRows}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-3">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left  text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left  text-xs font-semibold text-gray-600 uppercase tracking-wider">Payer / Student</th>
              <th className="px-4 py-3 text-left  text-xs font-semibold text-gray-600 uppercase tracking-wider">Ref #</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Provider</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Proof</th>
              <th className="px-4 py-3 text-left  text-xs font-semibold text-gray-600 uppercase tracking-wider">Meta</th>
              <th className="px-4 py-3 text-left  text-xs font-semibold text-gray-600 uppercase tracking-wider">Submitted</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-500">Loading…</td>
              </tr>
            )}

            {!loading && filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.id}</td>

                <td className="px-4 py-3 text-sm text-gray-700">
                  <div className="font-medium">{r.payerName || r.student || "—"}</div>
                  <div className="text-xs text-gray-500">
                    {r.studentId ? `ID: ${r.studentId}` : "ID: —"} • {r.contact || "No contact"}
                  </div>
                  {r.email && <div className="text-xs text-gray-400">{r.email}</div>}
                </td>

                <td className="px-4 py-3 text-sm text-gray-700">{r.reference || "—"}</td>

                <td className="px-4 py-3 text-sm text-center">
                  <span className={badge(r.provider)}>{String(r.provider || "").toUpperCase()}</span>
                </td>

                <td className="px-4 py-3 text-sm font-semibold text-center text-emerald-700">
                  {peso.format(Number(r.amount || 0))}
                </td>

                <td className="px-4 py-3 text-sm text-center">
                  {r.proofUrl ? (
                    <div className="inline-flex flex-col items-center gap-1">
                      <img
                        src={r.proofUrl}
                        alt="payment proof"
                        className="w-20 h-12 object-contain rounded border cursor-zoom-in"
                        onClick={() => setLightbox({ open: true, src: r.proofUrl, alt: `Proof ${r.id}` })}
                      />
                      <a
                        href={r.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 inline-flex items-center gap-1 hover:underline"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-3 h-3" /> open
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">No proof</span>
                  )}
                </td>

                <td className="px-4 py-3 text-xs text-gray-600 leading-5">
                  {(r.imgWidth && r.imgHeight) ? `${r.imgWidth}×${r.imgHeight}px` : "—"}
                  {r.fileHash && (
                    <> • hash: <span title={r.fileHash} className="font-mono">{String(r.fileHash).slice(0, 8)}…</span></>
                  )}
                </td>

                <td className="px-4 py-3 text-sm text-gray-600">{fmtDT(r.submittedAt || r.createdAt)}</td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      disabled={busyId === r.id}
                      onClick={() => approve(r)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      disabled={busyId === r.id}
                      onClick={() => reject(r)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-500">
                  No pending top-ups. 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lightbox modal for proof image */}
      {lightbox.open && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setLightbox({ open: false, src: "", alt: "" })}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 flex items-center justify-between border-b">
              <div className="text-sm font-medium truncate pr-3">{lightbox.alt}</div>
              <button
                className="text-sm px-3 py-1.5 rounded bg-gray-900 text-white hover:bg-black"
                onClick={() => setLightbox({ open: false, src: "", alt: "" })}
              >
                Close
              </button>
            </div>
            <div className="p-4 bg-gray-50">
              <img src={lightbox.src} alt={lightbox.alt} className="max-h-[75vh] mx-auto w-auto object-contain rounded" />
            </div>
            <div className="p-3 border-t text-right">
              <a
                href={lightbox.src}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Open original
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
