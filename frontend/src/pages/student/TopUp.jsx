// src/pages/TopUp.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../../components/avbar";
import { api, ApiError } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";
import {
  Upload,
  Image as ImageIcon,
  Wallet,
  CheckCircle2,
  Loader2,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

// ---------- helpers ----------
const clamp2 = (s) => {
  // keep only digits + one dot, clamp to 2 decimals
  s = (s || "").replace(/[^\d.]/g, "");
  const parts = s.split(".");
  if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
  const [a, b = ""] = s.split(".");
  return b.length ? `${a}.${b.slice(0, 2)}` : a;
};

const toNumber = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const normProvider = (p) => (String(p || "").toLowerCase() === "maya" ? "maya" : "gcash");

const within = (n, min, max) => n >= min && n <= max;

async function sha256File(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const view = new Uint8Array(hash);
  return Array.from(view)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readLocalUser() {
  const keys = ["user", "auth", "profile", "account"];
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const obj = JSON.parse(raw);
      const u = obj?.user && typeof obj.user === "object" ? obj.user : obj;
      if (u && (u.email || u.name)) return u;
    } catch {}
  }
  return {};
}

// ---------- component ----------
export default function TopUp() {
  const navigate = useNavigate();

  // wallet QR + meta
  const [provider, setProvider] = useState("gcash"); // 'gcash' | 'maya'
  const [qr, setQr] = useState({ gcash: null, maya: null });
  const [meta, setMeta] = useState({
    gcash: { accountName: "", mobile: "" },
    maya: { accountName: "", mobile: "" },
  });

  // user
  const [user, setUser] = useState(() => {
    const u = readLocalUser();
    return {
      name: u.name || u.fullName || "",
      email: u.email || u.username || "",
      studentId: u.studentId || u.studentID || u.sid || "",
      phone: u.phone || u.contact || "",
      balance: toNumber(u.balance ?? u.wallet ?? 0, 0),
      createdAt: u.createdAt || u.memberSince || u.registeredAt || null,
    };
  });

  // form
  const [amount, setAmount] = useState("");
  const [refNo, setRefNo] = useState(""); // required
  const [payerName, setPayerName] = useState("");
  // initialize studentId from stored user so field is populated immediately
  const [studentId, setStudentId] = useState(user.studentId || user.studentID || user.sid || "");
  const [contact, setContact] = useState("");
  const [agree, setAgree] = useState(false);

  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [imgMeta, setImgMeta] = useState({ w: 0, h: 0 });
  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fileRef = useRef(null);

  // Load wallets (QR + meta) and refresh user from /me if token is present
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'student', setUser });
    })();

    let alive = true;
    (async () => {
      try {
        setLoading(true);

        // ---- wallets ----
        const list = await api.get("/wallets").catch((e) => {
          if (e instanceof ApiError) {
            switch (e.status) {
              case ApiError.Maintenance:  navigate("/status/maintenance");  break;
              case ApiError.NotFound:     navigate("/status/not_found");    break;
              case ApiError.ServerError:  navigate("/status/server_error"); break;
              case ApiError.Unauthorized: navigate("/status/unauthorized"); break;
              case ApiError.Forbidden:    navigate("/status/unauthorized"); break;
              default:
            }
          }    
          
          return []
        });
        const nextQr = { gcash: null, maya: null };
        const nextMeta = { gcash: { accountName: "", mobile: "" }, maya: { accountName: "", mobile: "" } };
        (list || []).forEach((w) => {
          const key = String(w.provider || "").toLowerCase();
          if (key === "gcash" || key === "maya") {
            const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
            const q = w.qrImageUrl || null;
            nextQr[key] = q && q.startsWith("/") ? API_BASE + q : q;
            nextMeta[key] = { accountName: w.accountName || "", mobile: w.mobile || "" };
          }
        });

        // ---- user (/me) ----
        // ensure we fetch authenticated user (so studentId is present)
        const meRes = await api.get("/wallets/me").catch((e) => {
          if (e instanceof ApiError) {
            switch (e.status) {
              case ApiError.Maintenance:
                navigate("/status/maintenance");
                break;
              case ApiError.ServerError:
                navigate("/status/server_error");
                break;
              case ApiError.Unauthorized:
              case ApiError.Forbidden:
                navigate("/status/unauthorized");
                break;
              default:
            }
          }
          return {};
        });
        
        const me = meRes?.data ?? meRes;
        if (alive && me && typeof me === "object") {
          console.log('meRes = ', meRes)
          setUser((u) => ({
            ...u,
            name: me.name || me.fullName || u.name,
            email: me.email || u.email,
            studentId: me.user || me.studentID || me.sid || u.studentId,
            phone: me.phone || me.contact || u.phone,
            balance: toNumber(me.balance ?? me.walletBalance ?? u.balance, u.balance),
          }));
        }

        if (!alive) return;
        setQr(nextQr);
        setMeta(nextMeta);
        const first = (nextQr.gcash && "gcash") || (nextQr.maya && "maya") || "gcash";
        setProvider(first);
      } catch (e) {
        console.log(e);
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  // remove local studentId state usage: keep but keep in sync with user and readonly
  //  const [studentId, setStudentId] = useState("");

  // initialize form defaults once user is known
  useEffect(() => {
    if (payerName === "") setPayerName(user.name || "");
    // force studentId from logged-in profile (readonly)
    // normalize multiple name variants
    setStudentId(String(user.studentId || user.studentID || user.sid || "").trim());
    if (contact === "") setContact(user.phone || "");
  }, [user]); // eslint-disable-line

  const activeMeta = meta[provider];

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
    // get basic image dimensions for server-side sanity checks
    const img = new Image();
    img.onload = () => setImgMeta({ w: img.width, h: img.height });
    img.src = URL.createObjectURL(f);
    // compute sha256
    sha256File(f).then(setFileHash).catch(() => setFileHash(""));
  };

  const resetForm = () => {
    setAmount("");
    setRefNo("");
    setAgree(false);
    setFile(null);
    setFileHash("");
    setImgMeta({ w: 0, h: 0 });
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // derived flags
  const numAmount = useMemo(() => toNumber(amount, 0), [amount]);
  const amountOk = useMemo(() => within(numAmount, 20, 20000), [numAmount]); // sensible range
  const refOk = useMemo(() => refNo.trim().length >= 6, [refNo]);
  const nameOk = useMemo(() => payerName.trim().length >= 3, [payerName]);
  const sidOk = useMemo(() => studentId.trim().length >= 3, [studentId]);
  const contactOk = useMemo(() => contact.trim().length >= 7, [contact]);
  const imgOk = useMemo(() => !!file && imgMeta.w >= 300 && imgMeta.h >= 300, [file, imgMeta]);

  const canSubmit = amountOk && refOk && nameOk && sidOk && contactOk && imgOk && agree && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) {
      alert("Please complete all required fields correctly.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("provider", normProvider(provider));
      fd.append("amount", numAmount.toFixed(2));
      fd.append("reference", refNo.trim());
      fd.append("payerName", payerName.trim());
      fd.append("studentId", (studentId || user.studentId || "").trim());
      fd.append("contact", contact.trim());
      if (user.email) fd.append("email", user.email);
      if (fileHash) fd.append("fileHash", fileHash);
      if (imgMeta?.w) fd.append("imgWidth", String(imgMeta.w));
      if (imgMeta?.h) fd.append("imgHeight", String(imgMeta.h));
      fd.append("proof", file);

      await api.post("/topups", fd);
      alert("Top-up submitted! Please wait for canteen approval.");
      resetForm();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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

        {/* User summary */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            <div className="font-medium">{user.name || "—"}</div>
            <div className="text-gray-500">{user.email || "—"}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Current Balance</div>
            <div className="text-xl font-bold text-green-700">{peso.format(user.balance || 0)}</div>
          </div>
        </div>

        {/* Provider tabs */}
        <div className="flex w-full rounded-lg overflow-hidden">
          <button
            onClick={() => setProvider("gcash")}
            className={`flex-1 py-2 text-sm font-medium ${
              provider === "gcash" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            GCash
          </button>
          <button
            onClick={() => setProvider("maya")}
            className={`flex-1 py-2 text-sm font-medium ${
              provider === "maya" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            Maya
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: QR + account info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">Scan & Pay</h2>

            <div className="border border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
              {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : qr[provider] ? (
                <img
                  src={qr[provider]}
                  alt={`${provider} qr`}
                  className="w-56 h-56 object-contain rounded"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "";
                  }}
                />
              ) : (
                <>
                  <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">QR not available. Ask the canteen to upload one.</p>
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

            <div className="mt-4 flex items-start gap-2 text-xs text-gray-600">
              <Info className="w-4 h-4 mt-0.5" />
              <p>
                Tip: Include your full name & student ID in the payment note. Make sure the app shows the{" "}
                <strong>reference/transaction ID</strong>—you will type it below.
              </p>
            </div>
          </div>

          {/* Right: submit proof */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4">Submit Proof</h2>

            <div className="space-y-4">
              {/* Payer Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payer Full Name</label>
                <input
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Your name as shown in GCash/Maya"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {!nameOk && <p className="text-xs text-rose-600 mt-1">Enter at least 3 characters.</p>}
              </div>

              {/* Student ID & contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                  <input
                    value={studentId}
                    readOnly
                    title="Student ID is taken from your account and cannot be changed here"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
                  />
                  {!studentId && <p className="text-xs text-rose-600 mt-1">No student ID found on your profile.</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="09xxxxxxxxx"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {!contactOk && <p className="text-xs text-rose-600 mt-1">Provide a valid contact number.</p>}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PHP)</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(clamp2(e.target.value))}
                  inputMode="decimal"
                  placeholder="e.g., 200.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Preview: {amount ? peso.format(numAmount) : "—"} (Allowed: ₱20 – ₱20,000)
                </p>
                {!amountOk && amount !== "" && (
                  <p className="text-xs text-rose-600 mt-1">Enter an amount between ₱20 and ₱20,000.</p>
                )}
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  placeholder="e.g., GCash/Maya reference number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {!refOk && refNo !== "" && (
                  <p className="text-xs text-rose-600 mt-1">Enter at least 6 characters.</p>
                )}
              </div>

              {/* Proof upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Screenshot</label>
                <div className="border border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[220px]">
                  {preview ? (
                    <>
                      <img src={preview} alt="proof" className="w-56 h-56 object-contain rounded" />
                      <div className="mt-3 text-xs text-gray-500">
                        {imgMeta.w && imgMeta.h ? `${imgMeta.w}×${imgMeta.h}px` : "Ready to submit"}
                        {fileHash ? ` • hash: ${fileHash.slice(0, 8)}…` : ""}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          setPreview(null);
                          setFileHash("");
                          setImgMeta({ w: 0, h: 0 });
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        className="mt-2 text-xs underline text-gray-600"
                      >
                        Choose a different file
                      </button>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">No file selected.</p>
                      <button
                        onClick={openPicker}
                        className="mt-3 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        Upload (PNG/JPG, ≤ 5MB)
                      </button>
                    </>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                </div>
                {!imgOk && file && (
                  <p className="text-xs text-rose-600 mt-2">
                    Image seems too small. Please upload a clearer screenshot (≥300×300).
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Make sure the amount and reference number are clearly visible.
                </p>
              </div>

              {/* Checklist & consent */}
              <div className="rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Before you submit</span>
                </div>
                <ul className="list-disc pl-5 text-gray-600 space-y-1">
                  <li>
                    Name on the app matches <strong>{payerName || "your name"}</strong>.
                  </li>
                  <li>Reference/Transaction ID typed correctly.</li>
                  <li>Screenshot shows the amount clearly.</li>
                </ul>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-gray-700">
                    I confirm the details are accurate and understand false submissions may be rejected.
                  </span>
                </label>
              </div>

              {/* Submit */}
              <button
                disabled={!canSubmit}
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
