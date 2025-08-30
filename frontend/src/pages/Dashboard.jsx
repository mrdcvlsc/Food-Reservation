// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/avbar";
import { api } from "../lib/api";
import {
  ShoppingBag,
  Wallet,
  ClipboardList,
  LogOut,
  ArrowRight,
  Clock,
  UtensilsCrossed,
  Cookie,
  CupSoda,
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function Dashboard() {
  const navigate = useNavigate();

  // --- user & balance ---
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); }
    catch { return {}; }
  });

  const balance = useMemo(() => {
    const val = user?.balance;
    if (typeof val === "number") return val;
    if (val && !isNaN(parseFloat(val))) return parseFloat(val);
    return 0;
  }, [user]);

  // --- recent activity (orders / transactions) ---
  const [activity, setActivity] = useState([]);
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

  const loadActivity = async () => {
    try {
      // Fetch both sources in parallel and merge them. Reservations are the
      // canonical source for food orders; transactions may contain ledger
      // rows that reference reservations or standalone debit entries.
      const [reservations, txs] = await Promise.all([fetchArr('/reservations/mine'), fetchArr('/transactions/mine')]);

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
          // include if debit or references a reservation
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

      // Sort by time desc and take top 5
      rows.sort((a, b) => new Date(b.time) - new Date(a.time));
      setActivity(rows.slice(0, 5));
    } catch (e) {
      console.error('loadActivity error', e);
      setActivity([]);
    }
  };

  // Keep wallet in sync with server
  const syncWallet = async () => {
    try {
      // Prefer full user object from server. Some endpoints return { balance } only.
      const me = await api.get("/wallets/me");
      if (me && (me.id || me.balance != null)) {
        const curLocal = JSON.parse(localStorage.getItem("user") || "{}") || {};
        const merged = { ...curLocal, ...(me || {}) };
        // ensure balance is numeric
        if (merged.balance && typeof merged.balance !== "number") merged.balance = Number(merged.balance) || 0;
        localStorage.setItem("user", JSON.stringify(merged));
        setUser(merged);
  // reload recent activity after wallet sync (user identity may have changed)
  loadActivity();
      }
    } catch (e) {
      // ignore, keep local state
    }
  };

  useEffect(() => {
  loadActivity();
  syncWallet();
    const onStorage = (e) => {
      if (["transactions", "orders", "user"].includes(e.key)) {
        if (e.key === "user") {
          try { setUser(JSON.parse(e.newValue || "{}")); } catch {}
        } else {
          loadActivity();
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // --- derived stats (simple, school-friendly) ---
  const stats = useMemo(() => {
    const month = new Date().getMonth();
    // Only consider 'debit' entries (food orders) for orders/total spent
    const thisMonth = activity.filter((a) => {
      const d = new Date(a.time);
      return !isNaN(d) && d.getMonth() === month && (a.direction || "debit") === "debit";
    });
    const ordersCount = thisMonth.length;
    const totalSpent = thisMonth.reduce((s, a) => s + (a.amount || 0), 0);

    const pendingSet = new Set(["Pending", "Approved", "Preparing"]);
    const readySet   = new Set(["Ready"]);
    const pendingCount = activity.filter((a) => pendingSet.has(a.status)).length;
    const readyCount   = activity.filter((a) => readySet.has(a.status)).length;

    return { ordersCount, totalSpent, pendingCount, readyCount };
  }, [activity]);

  // --- greeting ---
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // --- actions ---
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {greeting}, {user?.name || "Student"}
            </h1>
            <p className="text-gray-600">Reserve ahead and skip the line.</p>
          </div>

          <button
            onClick={() => navigate("/profile")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition font-medium text-gray-800"
          >
            <Wallet className="w-4 h-4 text-emerald-600" />
            Wallet: <span className="font-semibold">{peso.format(balance)}</span>
          </button>
        </header>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate("/shop")}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Order Food</h3>
                <p className="text-sm text-gray-500">Browse menu & reserve</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/topup")}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Top-Up</h3>
                <p className="text-sm text-gray-500">Add balance via QR</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/transactions")}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">History</h3>
                <p className="text-sm text-gray-500">View orders & top-ups</p>
              </div>
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <LogOut className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Logout</h3>
                <p className="text-sm text-gray-500">Sign out of your account</p>
              </div>
            </div>
          </button>
        </section>

        {/* Stats (neutral, no "member status") */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl p-5 shadow-sm border border-gray-100 bg-white">
            <p className="text-sm text-gray-600">Orders this month</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.ordersCount}</p>
          </div>
          <div className="rounded-2xl p-5 shadow-sm border border-gray-100 bg-white">
            <p className="text-sm text-gray-600">Total spent this month</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {peso.format(stats.totalSpent)}
            </p>
          </div>
          <div className="rounded-2xl p-5 shadow-sm border border-gray-100 bg-white">
            <p className="text-sm text-gray-600">Ready for pickup</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.readyCount}</p>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            <button
              onClick={() => navigate("/transactions")}
              className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              See all <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {activity.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center">
              No recent activity. Start by reserving from the <b>Shop</b>.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {activity.map((a) => {
                let statusCls = "bg-gray-100 text-gray-700 border-gray-200";
                if (a.status === "Success" || a.status === "Claimed") statusCls = "bg-emerald-50 text-emerald-700 border-emerald-200";
                else if (a.status === "Pending" || a.status === "Approved" || a.status === "Preparing")
                  statusCls = "bg-amber-50 text-amber-700 border-amber-200";
                else if (a.status === "Ready")
                  statusCls = "bg-blue-50 text-blue-700 border-blue-200";
                else if (a.status === "Rejected")
                  statusCls = "bg-rose-50 text-rose-700 border-rose-200";

                return (
                  <li key={a.id} className="py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {a.title}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {a.time}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border ${statusCls}`}>
                          {a.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {peso.format(a.amount || 0)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Categories quick access (neutral chips) */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <button
              onClick={() => navigate("/shop")}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-center"
            >
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-gray-700" />
              </div>
              <div className="text-sm font-medium text-gray-900">Rice Meals</div>
            </button>
            <button
              onClick={() => navigate("/shop")}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-center"
            >
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-gray-700" />
              </div>
              <div className="text-sm font-medium text-gray-900">Noodles</div>
            </button>
            <button
              onClick={() => navigate("/shop")}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-center"
            >
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Cookie className="w-5 h-5 text-gray-700" />
              </div>
              <div className="text-sm font-medium text-gray-900">Snacks</div>
            </button>
            <button
              onClick={() => navigate("/shop")}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-center"
            >
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <CupSoda className="w-5 h-5 text-gray-700" />
              </div>
              <div className="text-sm font-medium text-gray-900">Beverages</div>
            </button>
            <button
              onClick={() => navigate("/shop")}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-center"
            >
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Cookie className="w-5 h-5 text-gray-700" />
              </div>
              <div className="text-sm font-medium text-gray-900">Desserts</div>
            </button>
            <button
              onClick={() => navigate("/shop")}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-center"
            >
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-gray-700" />
              </div>
              <div className="text-sm font-medium text-gray-900">Breakfast</div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
