// src/pages/TxHistory.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/avbar";
import { api } from "../lib/api";

export default function TxHistory() {
  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get('/transactions/mine')
      .then(d => { if (!mounted) return; setTx(d || []); })
      .catch(() => { if (!mounted) return; setTx([]); })
      .finally(() => { if (!mounted) return; setLoading(false); });
    return () => (mounted = false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SITE‑WIDE NAVBAR */}
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back link + Page Title */}
        <div>
          <Link to="/dashboard" className="text-gray-600 hover:underline flex items-center mb-4">← Back to home</Link>
          <h1 className="text-3xl font-bold">Transaction History</h1>
        </div>

        {/* Filters & Pagination Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <label>
              <span className="text-sm">Per page:</span>
              <select className="ml-2 border rounded px-2 py-1">
                <option>7</option>
                <option>10</option>
                <option>25</option>
              </select>
            </label>
            <label className="flex items-center space-x-1">
              <span className="text-sm">Date filter:</span>
              <input type="date" className="border rounded px-2 py-1" />
              <span>–</span>
              <input type="date" className="border rounded px-2 py-1" />
            </label>
          </div>
          <div className="text-sm text-gray-600">Page 1 of 1</div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Product</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Order ID</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Date</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-600">Loading…</td></tr>
              )}
              {!loading && tx.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-600">No transactions found.</td></tr>
              )}
              {!loading && tx.map((t, idx) => (
                <tr key={t.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3 text-sm">{t.product || t.description || "—"}</td>
                  <td className="px-4 py-3 text-center text-sm">{t.orderId || t.ref || "—"}</td>
                  <td className="px-4 py-3 text-center text-sm">{t.date || (t.createdAt ? new Date(t.createdAt).toLocaleString() : "—")}</td>
                  <td className="px-4 py-3 text-right text-sm">₱{(Number(t.amount) || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center text-sm">
                    <span className={
                      t.status === "Success" ? "text-green-600 font-medium" : t.status === "Failed" ? "text-red-600 font-medium" : "text-blue-600 font-medium"
                    }>{t.status || t.type || "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
