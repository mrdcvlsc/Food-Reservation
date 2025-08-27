// src/pages/admin/adminhomes.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/adminavbar";
import {
  ShoppingBag,
  TrendingUp,
  Users,
  Clock,
  Edit,
  Trash2,
  Eye,
  Wallet,
} from "lucide-react";
import { api } from "../../lib/api";

// ---- currency (PHP)
const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

// ---- single source of truth for admin routes
const ADMIN_ROUTES = {
  home: "/admin",
  shop: "/admin/shop",               // file: adminShop.jsx
  topup: "/admin/topup",             // file: adminTopUp.jsx
  orders: "/admin/orders",           // file: adminOrders.jsx
  reservations: "/admin/reservations", // file: adminReservations.jsx
  stats: "/admin/stats",             // file: adminStats.jsx (or your existing stats page)
  itemEdit: (id) => `/admin/items/edit/${id}`, // file: adminEditItems.jsx
  // if you have a "view" page later: itemView: (id) => `/admin/items/view/${id}`,
};

export default function AdminHome() {
  const navigate = useNavigate();

  // Quick links
  const [directories] = useState([
    { name: "Dashboard", to: ADMIN_ROUTES.home, icon: <TrendingUp /> },
    { name: "Shop", to: ADMIN_ROUTES.shop, icon: <ShoppingBag /> },
    { name: "Top-Up Verify", to: ADMIN_ROUTES.topup, icon: <Wallet /> },
    { name: "Orders", to: ADMIN_ROUTES.orders, icon: <Clock /> },
    { name: "Reservations", to: ADMIN_ROUTES.reservations, icon: <Clock /> },
    { name: "Stats", to: ADMIN_ROUTES.stats, icon: <TrendingUp /> },
  ]);

  // Fallback demo stats while real dashboard loads
  const [todaySales] = useState([
    {
      label: "Total Sales",
      value: 4250,
      icon: <TrendingUp className="w-6 h-6 text-green-600" />,
      change: "+12.5%",
    },
    {
      label: "Orders Today",
      value: 72,
      icon: <ShoppingBag className="w-6 h-6 text-blue-600" />,
      change: "+8.2%",
    },
    {
      label: "New Users",
      value: 15,
      icon: <Users className="w-6 h-6 text-purple-600" />,
      change: "+5.1%",
    },
    {
      label: "Pending",
      value: 4,
      icon: <Clock className="w-6 h-6 text-orange-600" />,
      change: "-2.3%",
    },
  ]);

  // Dashboard stats
  const [dashboard, setDashboard] = useState({
    totalSales: 0,
    ordersToday: 0,
    newUsers: 0,
    pending: 0,
    recentOrders: [],
  });
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  useEffect(() => {
    let m = true;
    setLoadingDashboard(true);
    api
      .get("/admin/dashboard")
      .then((d) => {
        if (!m) return;
        setDashboard(
          d && typeof d === "object"
            ? d
            : { totalSales: 0, ordersToday: 0, newUsers: 0, pending: 0, recentOrders: [] }
        );
      })
      .catch(() =>
        setDashboard({
          totalSales: 0,
          ordersToday: 0,
          newUsers: 0,
          pending: 0,
          recentOrders: [],
        })
      )
      .finally(() => m && setLoadingDashboard(false));
    return () => {
      m = false;
    };
  }, []);

  // Current products
  const [currentProducts, setCurrentProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoadingProducts(true);
    api
      .get("/menu")
      .then((data) => {
        if (!mounted) return;
        const rows = Array.isArray(data) ? data : data?.data || [];
        const mapped = rows.map((r) => {
          const id = r._id || r.id || r.productId || String(Math.random());
          return {
            id,
            name: r.name || r.title || "Unnamed",
            price: Number(r.price) || 0,
            stock: Number(r.stock ?? r.quantity ?? 0),
            category: r.category || r.type || "",
            isActive:
              r.isActive !== undefined
                ? !!r.isActive
                : (r.stock ?? 0) > 0,
          };
        });
        setCurrentProducts(mapped);
      })
      .catch(() => setCurrentProducts([]))
      .finally(() => mounted && setLoadingProducts(false));
    return () => {
      mounted = false;
    };
  }, []);

  // Demo recent orders if backend not ready
  const [recentOrders] = useState([
    {
      id: "#12436",
      product: "Rice Meal 1",
      customer: "Juan D.",
      time: "2:30 PM",
      amount: 69,
      status: "Success",
    },
    {
      id: "#12437",
      product: "Yakult",
      customer: "Maria S.",
      time: "2:15 PM",
      amount: 30,
      status: "Success",
    },
    {
      id: "#12438",
      product: "Snickers",
      customer: "Pedro R.",
      time: "1:45 PM",
      amount: 35,
      status: "Pending",
    },
    {
      id: "#12439",
      product: "Chicken Adobo",
      customer: "Ana L.",
      time: "1:30 PM",
      amount: 85,
      status: "Processing",
    },
  ]);

  // Helpers to keep buttons from bubbling / submitting
  const safeNav = (to) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(to);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Good afternoon, Admin
          </h1>
          <p className="text-gray-600">
            Here&apos;s what&apos;s happening with your canteen today.
          </p>
        </header>

        {/* Quick Actions */}
        <section aria-labelledby="quick-actions">
          <h2
            id="quick-actions"
            className="text-xl font-semibold text-gray-900 mb-4"
          >
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {directories.map(({ name, to, icon }) => (
              <button
                type="button"
                key={to}
                onClick={safeNav(to)}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 text-center group hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={name}
              >
                <div className="text-2xl mb-2 text-gray-700">{icon}</div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Today’s Overview */}
        <section aria-labelledby="overview">
          <h2 id="overview" className="text-xl font-semibold text-gray-900 mb-4">
            Today&apos;s Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(loadingDashboard
              ? todaySales
              : [
                  {
                    label: "Total Sales",
                    value: dashboard.totalSales,
                    icon: (
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    ),
                    change: "+0%",
                  },
                  {
                    label: "Orders Today",
                    value: dashboard.ordersToday,
                    icon: (
                      <ShoppingBag className="w-6 h-6 text-blue-600" />
                    ),
                    change: "+0%",
                  },
                  {
                    label: "New Users",
                    value: dashboard.newUsers,
                    icon: (
                      <Users className="w-6 h-6 text-purple-600" />
                    ),
                    change: "+0%",
                  },
                  {
                    label: "Pending",
                    value: dashboard.pending,
                    icon: (
                      <Clock className="w-6 h-6 text-orange-600" />
                    ),
                    change: "-0%",
                  },
                ]
            ).map(({ label, value, icon, change }) => (
              <div
                key={label}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-4">
                  {icon}
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      String(change).startsWith("+")
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {change}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {label === "Total Sales" ? peso.format(value) : value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Products */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Current Products
              </h2>
              <button
                type="button"
                onClick={safeNav(ADMIN_ROUTES.shop)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Product
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {loadingProducts ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-gray-500"
                      >
                        Loading products…
                      </td>
                    </tr>
                  ) : currentProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-sm text-gray-500"
                      >
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    currentProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {p.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {p.category}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                          {peso.format(p.price)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">
                          {p.stock} units
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              p.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {p.isActive ? "Available" : "Out of Stock"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* VIEW (route optional; keep in shop for now) */}
                            <button
                              type="button"
                              onClick={safeNav(ADMIN_ROUTES.shop + `?product=${encodeURIComponent(p.id)}`)}
                              className="p-2 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label={`View ${p.name}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* EDIT */}
                            <button
                              type="button"
                              onClick={safeNav(ADMIN_ROUTES.itemEdit(p.id))}
                              className="p-2 rounded-md text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                              aria-label={`Edit ${p.name}`}
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* DELETE (wire up later) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // TODO: open confirm modal then call your delete API
                                console.log("delete", p.id);
                              }}
                              className="p-2 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                              aria-label={`Delete ${p.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Orders */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Orders
              </h2>
              <Link
                to={ADMIN_ROUTES.orders}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                See all
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="space-y-4">
                {(loadingDashboard
                  ? recentOrders.slice(0, 5)
                  : dashboard.recentOrders || []
                ).map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {o.id}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            o.status === "Success"
                              ? "bg-green-100 text-green-700"
                              : o.status === "Pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {o.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        {o.product} • {o.customer}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{o.time}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {peso.format(o.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!loadingDashboard && (dashboard.recentOrders || []).length === 0) && (
                  <div className="text-sm text-gray-500">No recent orders.</div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* NOTE: QR verification lives in /admin/topup */}
      </main>
    </div>
  );
}
