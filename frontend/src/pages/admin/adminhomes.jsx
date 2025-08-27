// src/pages/admin/adminhomes.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// keep your admin navbar filename/path as you wrote it
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

// PHP formatter
const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export default function AdminHome() {
  const navigate = useNavigate();

  // quick nav (paths match your page names)
  const [directories] = useState([
    { name: "Dashboard", to: "/admin", icon: <TrendingUp /> },
    { name: "Shops", to: "/admin/shops", icon: <ShoppingBag /> }, // adminShops.jsx
    { name: "Top-Up Verify", to: "/admin/topup", icon: <Wallet /> }, // adminTopUp.jsx
    { name: "Orders", to: "/admin/orders", icon: <Clock /> },
    { name: "Reservations", to: "/admin/reservations", icon: <Clock /> },
    { name: "Stats", to: "/admin/stats", icon: <TrendingUp /> },
  ]);

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

  const [currentProducts] = useState([
    { id: 1, name: "Rice Meal 1", price: 69, available: true, stock: 25, category: "Meals" },
    { id: 2, name: "Nestlé Chuckie", price: 25, available: true, stock: 50, category: "Beverages" },
    { id: 3, name: "Oishi Pillows", price: 12, available: false, stock: 0, category: "Snacks" },
    { id: 4, name: "Chicken Adobo", price: 85, available: true, stock: 18, category: "Meals" },
    { id: 5, name: "Yakult", price: 30, available: true, stock: 35, category: "Beverages" },
  ]);

  const [recentOrders] = useState([
    { id: "#12436", product: "Rice Meal 1", customer: "Juan D.", date: "08/04/25", time: "2:30 PM", amount: 69, status: "Success" },
    { id: "#12437", product: "Yakult", customer: "Maria S.", date: "08/04/25", time: "2:15 PM", amount: 30, status: "Success" },
    { id: "#12438", product: "Snickers", customer: "Pedro R.", date: "08/04/25", time: "1:45 PM", amount: 35, status: "Pending" },
    { id: "#12439", product: "Chicken Adobo", customer: "Ana L.", date: "08/04/25", time: "1:30 PM", amount: 85, status: "Processing" },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Good afternoon, Admin</h1>
          <p className="text-gray-600">Here&apos;s what&apos;s happening with your canteen today.</p>
        </header>

        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {directories.map(({ name, to, icon }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 text-center group hover:scale-105"
              >
                <div className="text-2xl mb-2 text-gray-700">{icon}</div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Today’s Overview */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Today&apos;s Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {todaySales.map(({ label, value, icon, change }) => (
              <div
                key={label}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-4">
                  {icon}
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      change.startsWith("+") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
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
              <h2 className="text-xl font-semibold text-gray-900">Current Products</h2>
              <button
                onClick={() => navigate("/admin/shops/add")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
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
                  {currentProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.category}</div>
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
                            p.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {p.available ? "Available" : "Out of Stock"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => navigate(`/admin/shops/view/${p.id}`)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition"
                            aria-label="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/admin/shops/edit/${p.id}`)}
                            className="p-1 text-gray-400 hover:text-yellow-600 transition"
                            aria-label="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => console.log("delete", p.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Orders */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
              <Link
                to="/admin/orders"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                See all
              </Link>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="space-y-4">
                {recentOrders.slice(0, 5).map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{o.id}</span>
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
              </div>
            </div>
          </div>
        </div>

        {/* NOTE: No QR here. Top-Up QR is on /admin/topup page */}
      </main>
    </div>
  );
}
