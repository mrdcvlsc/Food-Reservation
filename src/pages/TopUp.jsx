// src/pages/TopUp.jsx
import React, { useEffect, useRef, useState } from "react";
import Navbar from "../components/avbar";
import { Upload, Image as ImageIcon, Wallet, CheckCircle2, Loader2 } from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function TopUp() {
  const [provider, setProvider] = useState("gcash"); // 'gcash' | 'maya'
  const [qr, setQr] = useState({ gcash: null, maya: null });
  const [meta, setMeta] = useState({
    gcash: { accountName: "", mobile: "" },
    maya: { accountName: "", mobile: "" },
  });

  const [amount, setAmount] = useState("");
  const [refNo, setRefNo] = useState(""); // optional user note / last 4 digits
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  // TODO: replace with real fetch to your API
  useEffect(() => {
    // Example: GET /api/wallet  -> { gcash: {qrUrl, accountName, mobile}, maya: {...} }
    // For now, just placeholders so UI works.
    setQr({
      gcash: null, // put a URL if you have one already like "https://.../gcash.png"
      maya: null,  // put a URL if you have one already like "https://.../maya.png"
    });
    setMeta({
      gcash: { accountName: "Canteen GCash", mobile: "09•• ••• ••••" },
      maya: { accountName: "Canteen Maya", mobile: "09•• ••• ••••" },
    });
  }, []);

  const openPicker = () => fileRef.current?.click();

  const onPickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      alert("Max image size is 5MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const resetForm = () => {
    setAmount("");
    setRefNo("");
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      alert("Enter a valid amount.");
      return;
    }
    if (!file) {
      alert("Upload a screenshot or proof of payment.");
      return;
    }

    setSubmitting(true);
    try {
      // ---- Replace with your real API call ----
      // const fd = new FormData();
      // fd.append("provider", provider);
      // fd.append("amount", amount);
      // fd.append("refNo", refNo);
      // fd.append("proof", file);
      // await fetch("/api/topups", { method: "POST", body: fd, headers: { Authorization: `Bearer ${token}` }});
      await new Promise((r) => setTimeout(r, 900));
      // -----------------------------------------

      alert("Top-up submitted! Please wait for canteen approval.");
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeMeta = meta[provider];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Wallet Top-Up</h1>
        </div>
        <p className="text-gray-600">
          Send money to the canteen wallet using the QR below, then upload a screenshot of the payment.
          Your balance updates after staff approval.
        </p>

        {/* Provider tabs */}
        <div className="flex w-full rounded-lg overflow-hidden">
          <button
            onClick={() => setProvider("gcash")}
            className={`flex-1 py-2 text-sm font-medium ${provider === "gcash" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            GCash
          </button>
          <button
            onClick={() => setProvider("maya")}
            className={`flex-1 py-2 text-sm font-medium ${provider === "maya" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Maya
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: QR + account info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">Scan & Pay</h2>
            <div className="border border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
              {qr[provider] ? (
                <img src={qr[provider]} alt={`${provider} qr`} className="w-56 h-56 object-contain rounded" />
              ) : (
                <>
                  <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">QR not available. Ask canteen to upload one.</p>
                </>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Account Name</p>
                <p className="font-medium text-gray-900">{activeMeta.accountName || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Mobile</p>
                <p className="font-medium text-gray-900">{activeMeta.mobile || "—"}</p>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Tip: put your full name & student ID in the payment note to speed up verification.
            </p>
          </div>

          {/* Right: submit proof */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">Submit Proof</h2>

            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PHP)</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="e.g., 200"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Preview: {amount ? peso.format(Number(amount)) : "—"}
                </p>
              </div>

              {/* Optional ref */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Note (optional)</label>
                <input
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="e.g., GCash ref # or 'Juan D. - G10'"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Proof upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Screenshot</label>
                <div className="border border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[220px]">
                  {preview ? (
                    <>
                      <img src={preview} alt="proof" className="w-56 h-56 object-contain rounded" />
                      <div className="mt-3 text-xs text-gray-500">Ready to submit</div>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">No file selected.</p>
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="mt-3 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        Upload (PNG/JPG, ≤ 5MB)
                      </button>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onPickImage}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Make sure the amount and reference are visible.
                </p>
              </div>

              {/* Submit */}
              <button
                disabled={submitting}
                onClick={onSubmit}
                className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-lg hover:bg-black transition text-sm disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Submit Top-Up for Review
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
