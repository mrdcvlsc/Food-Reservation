// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/avbar";
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";
import { Pencil, Wallet } from "lucide-react";

// Peso formatter
const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

// ---- helpers ---------------------------------------------------------------
function coerceNumber(n, fallback = 0) {
  if (typeof n === "number" && !isNaN(n)) return n;
  const v = parseFloat(n);
  return isNaN(v) ? fallback : v;
}

function firstDefined(...arr) {
  for (const v of arr) if (v !== undefined && v !== null && v !== "") return v;
  return undefined;
}

function safeDateLabel(isoLike) {
  if (!isoLike) return null;
  const d = new Date(isoLike);
  if (isNaN(d)) return null;
  // “Jan 2024” style
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

// (removed unused readLocalUser helper)

// ---- component -------------------------------------------------------------
export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    name: "Guest User",
    email: "guest@example.com",
    balance: 0,
    createdAt: null,
    studentId: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: "student" });
    })();

    (async () => {
      setLoading(true);
      try {
        const meRes = await api.get("/wallets/me").catch(() => null);
        console.log('meRes = ', meRes)
        const me = meRes?.data ?? meRes;
        if (me && typeof me === "object") {
          console.log(me.studentId)
          setUser((u) => ({
            ...u,
            name: me.name || me.fullName || u.name,
            email: me.email || u.email,
            balance: Number(me.balance ?? me.wallet ?? u.balance),
            createdAt: me.createdAt || me.registeredAt || u.createdAt,
            studentId: me.user 
          }));
        } else {
          // fallback to localStorage if /me not available
          try {
            const raw = localStorage.getItem("user") || "{}";
            const lu = JSON.parse(raw) || {};
            setUser((u) => ({
              ...u,
              name: lu.name || lu.fullName || u.name,
              email: lu.email || u.email,
              balance: Number(lu.balance ?? lu.wallet ?? u.balance),
              createdAt: lu.createdAt || u.createdAt,
              studentId: lu.studentId || lu.studentID || lu.sid || u.studentId
            }));
          } catch {}
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  // initials (fallback to email first letters if name missing)
  const initials = useMemo(() => {
    const base = user?.name && user.name !== "Guest User" ? user.name : user?.email || "";
    const parts = String(base)
      .trim()
      .split(/\s+|@|\./)
      .filter(Boolean);
    const raw = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
    return raw.toUpperCase() || "U";
  }, [user?.name, user?.email]);

  const memberSince = useMemo(() => safeDateLabel(user?.createdAt), [user?.createdAt]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <Link
            to="/profile/edit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </Link>
        </div>

        {/* Card */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Avatar + meta */}
            <div className="flex md:block items-center md:items-start gap-4 md:gap-0">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-3xl font-bold">
                  {initials}
                </div>
              </div>
              <div className="md:mt-4">
                {memberSince ? (
                  <p className="text-gray-600 text-sm">Member since {memberSince}</p>
                ) : (
                  <p className="text-gray-400 text-sm">Member since —</p>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="text-lg font-medium text-gray-900 break-words">{user?.name || "—"}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Student ID</p>
                <p className="text-lg font-mono text-gray-900 break-words">{user?.studentId || "—"}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="text-lg font-medium text-gray-900 break-words">
                  {user?.email && user.email !== "guest@example.com" ? user.email : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-lg font-medium text-gray-900">{user?.phone || "—"}</p>
              </div>
            </div>
          </div>

          {/* Extra quick links row (optional) */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/transactions"
              className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              View Orders
            </Link>
            <Link
              to="/transactions"
              className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              Purchase History
            </Link>
            <Link
              to="/profile/edit"
              className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              Security & Password
            </Link>
          </div>
        </section>

        {loading && (
          <p className="text-center text-sm text-gray-500">Refreshing your profile…</p>
        )}
      </main>
    </div>
  );
}
