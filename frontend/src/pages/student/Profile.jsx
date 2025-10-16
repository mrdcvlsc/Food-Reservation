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
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'student', setUser });
    })();
  }, [navigate]);

  // Initialize user with a stable shape using localStorage as fallback.
  const initialLocalUser = (() => {
    try {
      const raw = localStorage.getItem('user') || '{}';
      const u = JSON.parse(raw) || {};
      return {
        name: firstDefined(u.name, u.fullName, 'Guest User'),
        email: firstDefined(u.email, u.username, 'guest@example.com'),
        balance: coerceNumber(firstDefined(u.balance, u.wallet, u.amount), 0),
        createdAt: firstDefined(u.createdAt, u.memberSince, u.registeredAt),
      };
    } catch (err) {
      return {
        name: 'Guest User',
        email: 'guest@example.com',
        balance: 0,
        createdAt: null,
      };
    }
  })();

  const [user, setUser] = useState(initialLocalUser);
  const [loading, setLoading] = useState(false);

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
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="text-lg font-medium text-gray-900 break-words">
                  {/* Always prefer the stored/returned email, never the placeholder */}
                  {user?.email && user.email !== "guest@example.com" ? user.email : "—"}
                </p>
              </div>

              {/* Balance */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white border">
                      <Wallet className="w-5 h-5 text-green-700" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Current Balance</p>
                      <p className="text-2xl font-extrabold text-green-600">
                        {peso.format(coerceNumber(user?.balance, 0))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/topup"
                      className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                    >
                      Top Up
                    </Link>
                    <Link
                      to="/topup-history"
                      className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                    >
                      Top-Up History
                    </Link>
                  </div>
                </div>
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
