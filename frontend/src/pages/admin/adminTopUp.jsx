// src/pages/admin/adminTopUp.jsx
import React, { useRef, useState, useEffect } from "react";
import Navbar from "../../components/adminavbar";
import {
  Upload, Trash2, Image as ImageIcon,
  Check, X, Wallet, Clock4
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function AdminTopUp() {
  const [tab, setTab] = useState("wallet"); // wallet | verify
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
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
  const [provider, setProvider] = useState("gcash"); // 'gcash' | 'maya'
  const [qrPreview, setQrPreview] = useState({ gcash: null, maya: null });
  const [meta, setMeta] = useState({
    gcash: { accountName: "", mobile: "", reference: "" },
    maya: { accountName: "", mobile: "", reference: "" },
  });
  const fileRef = useRef(null);

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setQrPreview((prev) => ({ ...prev, [provider]: url }));

    // TODO: upload (multipart) to /api/admin/wallet/qr
    // const fd = new FormData(); fd.append("provider", provider); fd.append("qr", file);
    // await fetch("/api/admin/wallet/qr", { method: "POST", body: fd });
  };

  const onRemove = () => {
    setQrPreview((prev) => ({ ...prev, [provider]: null }));
    // TODO: DELETE /api/admin/wallet/qr?provider=gcash|maya
  };

  const onSaveMeta = async () => {
    const payload = { provider, ...meta[provider] };
    console.log("SAVE WALLET META ->", payload);
    // await fetch("/api/admin/wallet/meta", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) });
    alert("Saved wallet details (client-side). Wire to API next.");
  };

  const active = meta[provider];

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Tabs */}
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
            {qrPreview[provider] ? (
              <>
                <img src={qrPreview[provider]} alt={`${provider} QR`} className="w-56 h-56 object-contain rounded" />
                <div className="mt-4 flex gap-2">
                  <button onClick={onPickFile} className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black transition text-sm">
                    <Upload className="w-4 h-4" /> Replace QR
                  </button>
                  <button onClick={onRemove} className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm">
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              </>
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">No QR uploaded for <span className="font-semibold uppercase">{provider}</span>.</p>
                <button onClick={onPickFile} className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm">
                  <Upload className="w-4 h-4" /> Upload QR (PNG/JPG/SVG)
                </button>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </div>
          <p className="text-xs text-gray-500 mt-3">Users will scan this on their top-up screen; staff verifies manually.</p>
        </div>

        {/* Right: account info */}
        <div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
              <input
                value={active.accountName}
                onChange={(e) => setMeta((m) => ({ ...m, [provider]: { ...m[provider], accountName: e.target.value } }))}
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
                onChange={(e) => setMeta((m) => ({ ...m, [provider]: { ...m[provider], reference: e.target.value } }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional: e.g., 'Include student ID in note'."
              />
            </div>
          </div>

          <button
            onClick={onSaveMeta}
            className="mt-4 w-full bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-black transition text-sm font-medium"
          >
            Save {provider === "gcash" ? "GCash" : "Maya"} Details
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------------- Verify Top-Ups (queue) ---------------------- */
function VerifyQueue() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let m = true;
    import("../../lib/api").then(mod => mod.api.get('/topups/admin'))
      .then(d => { if (!m) return; setRows(d || []); })
      .catch(() => { if (!m) return; setRows([]); });
    return () => (m = false);
  }, []);

  const approve = async (id) => {
    await import("../../lib/api").then(mod => mod.api.patch(`/topups/admin/${id}`, { status: 'Approved' }));
    setRows((r) => r.filter((x) => x.id !== id));
    alert(`Approved ${id}. Balance will be credited.`);
  };

  const reject = async (id) => {
    await import("../../lib/api").then(mod => mod.api.patch(`/topups/admin/${id}`, { status: 'Rejected' }));
    setRows((r) => r.filter((x) => x.id !== id));
    alert(`Rejected ${id}.`);
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock4 className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-semibold">Pending Top-Ups</h2>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-100">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left  text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left  text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Provider</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Submitted</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.id}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{r.student}</td>
                <td className="px-6 py-4 text-sm text-center text-gray-600">{r.provider}</td>
                <td className="px-6 py-4 text-sm font-medium text-center text-gray-900">{peso.format(r.amount)}</td>
                <td className="px-6 py-4 text-sm text-center text-gray-600">{r.submittedAt}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => approve(r.id)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-green-600 text-white hover:bg-green-700"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => reject(r.id)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-red-600 text-white hover:bg-red-700"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                  No pending top-ups. 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
