// src/pages/TxHistory.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/avbar";

export default function TxHistory() {
  // TODO: replace with real API call
  const [history] = useState([
    { id: 1, product: "Rice Meal 1", orderId: "#12436", date: "04/01/25", amount: 69, status: "Success" },
    { id: 2, product: "Rice Meal 1", orderId: "#153587", date: "04/21/25", amount: 69, status: "Success" },
    { id: 3, product: "Rice Meal 2", orderId: "#16879", date: "05/01/25", amount: 30, status: "Success" },
    { id: 4, product: "Yakult",      orderId: "#16879", date: "05/01/25", amount: 30, status: "Success" },
    { id: 5, product: "Nestlé Chuckie", orderId: "#16609", date: "05/09/25", amount: 25, status: "Failed"  },
    { id: 6, product: "Oishi Pillows - Chocolate", orderId: "#16609", date: "05/09/25", amount: 12, status: "Success" },
    { id: 7, product: "Rice Meal 1", orderId: "#16997", date: "05/10/25", amount: 30, status: "Pending" }
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SITE‑WIDE NAVBAR */}
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back link + Page Title */}
        <div>
          <Link to="/dashboard" className="text-gray-600 hover:underline flex items-center mb-4">
            ← Back to home
          </Link>
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
          <div className="text-sm text-gray-600">
            Page 1 of 1
          </div>
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
              {history.map((tx, idx) => (
                <tr
                  key={tx.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-3 text-sm">{tx.product}</td>
                  <td className="px-4 py-3 text-center text-sm">{tx.orderId}</td>
                  <td className="px-4 py-3 text-center text-sm">{tx.date}</td>
                  <td className="px-4 py-3 text-right text-sm">₱{tx.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center text-sm">
                    <span
                      className={
                        tx.status === "Success"
                          ? "text-green-600 font-medium"
                          : tx.status === "Failed"
                          ? "text-red-600 font-medium"
                          : "text-blue-600 font-medium"
                      }
                    >
                      {tx.status}
                    </span>
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
