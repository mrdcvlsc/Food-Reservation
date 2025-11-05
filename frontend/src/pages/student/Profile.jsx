// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/avbar";
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";
import { Pencil, Wallet, ShoppingBag, Clock } from "lucide-react";

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

// Add this helper function near the top with other helpers
const fetchArr = async (path) => {
  try {
    const d = await api.get(path);
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.data)) return d.data;
    return [];
  } catch {
    return [];
  }
};

// ---- component -------------------------------------------------------------
export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    name: "",
    email: "",
    balance: 0,
    studentId: "",
    phone: "",
    createdAt: null
  });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);

  // Update the stats calculation in useMemo
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter for current month's activity
    const thisMonth = activity.filter((a) => {
      const d = new Date(a.time);
      return !isNaN(d) && 
             d.getMonth() === currentMonth && 
             d.getFullYear() === currentYear;
    });

    // Only count orders that weren't rejected
    const validOrders = thisMonth.filter(a => a.status !== "Rejected");
    const ordersCount = validOrders.length;

    // Only sum amounts for non-rejected orders
    const totalSpent = validOrders.reduce((s, a) => {
      if (a.direction === "debit") {
        return s + (a.amount || 0);
      }
      return s;
    }, 0);

    const readySet = new Set(["Ready"]);
    const readyCount = activity.filter((a) => readySet.has(a.status)).length;

    return { ordersCount, totalSpent, readyCount };
  }, [activity]);

  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: "student" });
    })();

    const loadActivity = async () => {
      try {
        setLoading(true);
        // Fetch both sources in parallel and merge them
        const [reservations, txs] = await Promise.all([
          fetchArr('/reservations/mine'), 
          fetchArr('/transactions/mine')
        ]);

        const rows = [];

        if (Array.isArray(reservations) && reservations.length > 0) {
          for (const r of reservations) {
            rows.push({
              id: r.id || `R-${rows.length + 1}`,
              title: r.title || 'reservation',
              amount: Math.abs(Number(r.total || r.amount || 0) || 0),
              time: r.createdAt || r.date || r.time || new Date().toISOString(),
              status: r.status || 'Success',
              direction: 'debit',
            });
          }
        }

        if (Array.isArray(txs) && txs.length > 0) {
          for (const t of txs) {
            const id = t.id || t.txId || `TX-${rows.length + 1}`;
            const direction = (t.direction || (String(t.type || '')).toLowerCase().includes('reservation') ? 'debit' : (t.direction || 'credit'));
            const ref = String(t.ref || t.reference || t.reservationId || '').toLowerCase();
            const isReservationRef = ref.includes('res') || ref.startsWith('r-');
            if (direction === 'debit' || isReservationRef) {
              rows.push({
                id,
                title: t.title || t.type || (isReservationRef ? 'Reservation' : 'Transaction'),
                amount: Math.abs(Number(t.amount ?? t.total ?? t.value ?? 0) || 0),
                time: t.createdAt || t.time || t.date || new Date().toISOString(),
                status: t.status || t.state || 'Success',
                direction,
              });
            }
          }
        }

        // Sort by time desc
        rows.sort((a, b) => new Date(b.time) - new Date(a.time));
        setActivity(rows);

        // Get user's wallet info
        const meRes = await api.get("/wallets/me");
        const me = meRes?.data ?? meRes;
        
        if (me && typeof me === "object") {
          setUser(prev => ({
            ...prev,
            name: me.name || me.fullName || prev.name,
            email: me.email || prev.email,
            balance: Number(me.balance ?? me.wallet ?? prev.balance),
            createdAt: me.createdAt || me.registeredAt || prev.createdAt,
            studentId: me.user,
            phone: me.phone || prev.phone
          }));
        }
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
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

  // Add effect to handle profile picture updates
  useEffect(() => {
    const loadProfilePicture = async () => {
      try {
        const meRes = await api.get("/wallets/me");
        const data = meRes?.data ?? meRes;
        
        if (data?.profilePictureUrl) {
          // Add cache buster to force browser to reload image
          const cacheBuster = `?t=${new Date().getTime()}`;
          setProfilePicture(`${data.profilePictureUrl}${cacheBuster}`);
        }
      } catch (err) {
        console.error("Failed to load profile picture:", err);
      }
    };

    loadProfilePicture();
  }, [user?.studentId]); // Reload when user changes

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
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
        <section className="bg-white rounded-lg shadow-md p-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Avatar + meta */}
            <div className="flex md:block items-center md:items-start gap-4 md:gap-0">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-3xl font-bold overflow-hidden">
                  {profilePicture ? (
                    <img 
                      src={profilePicture}
                      alt={`${user?.name}'s profile`}
                      className="w-full h-full object-cover"
                      onError={() => setProfilePicture(null)} // Fallback to initials on error
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
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
                <p className="text-lg font-mono text-gray-900 break-words">{user?.phone || "—"}</p>
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
              to="/profile/security"
              className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              Change Password
            </Link>
          </div>
        </section>

        {/* Stats section */}
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
          <div className="rounded-2xl p-5 shadow-sm border border-gray-100 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <p className="text-sm text-gray-600">Current Balance</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {peso.format(user.balance || 0)}
            </p>
          </div>
          <div className="rounded-2xl p-5 shadow-sm border border-gray-100 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-gray-600">Total Orders</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {stats.ordersCount || 0}
            </p>
          </div>
          <div className="rounded-2xl p-5 shadow-sm border border-gray-100 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-violet-600" />
              <p className="text-sm text-gray-600">Total spent</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {peso.format(stats.totalSpent || 0)}
            </p>
          </div>
          <div className="rounded-2xl p-5 shadow-sm border border-gray-100 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-violet-600" />
              <p className="text-sm text-gray-600">Ready for pickup</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {stats.readyCount || 0}
            </p>
          </div>
        </section>

        {loading && (
          <p className="text-center text-sm text-gray-500">Refreshing your profile…</p>
        )}
      </main>
    </div>
  );
}
