// src/pages/TopUpHistory.jsx
import React, { useMemo, useState } from "react";
import Navbar from "../components/avbar";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function Pill({ status }) {
  const map = {
    Pending: "bg-yellow-100 text-yellow-700",
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

export default function TopUpHistory() {
  // mock data — replace with API
  const [rows] = useState([
    { id: "TU-001", date: "2025-08-04", provider: "GCash", amount: 150, status: "Approved" },
    { id: "TU-002", date: "2025-08-04", provider: "Maya", amount: 50, status: "Pending" },
    { id: "TU-003", date: "2025-08-03", provider: "GCash", amount: 200, status: "Rejected" },
  ]);

  const totalApproved = useMemo(
    () => rows.filter((r) => r.status === "Approved").reduce((a, b) => a + b.amount, 0),
    [rows]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Top-Up History</h1>
          <p className="text-gray-600">Track all your submissions and their status.</p>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Provider</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">{r.provider}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-center">{peso.format(r.amount)}</td>
                  <td className="px-6 py-4 text-sm text-center"><Pill status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-gray-600">
          Approved total added to wallet: <span className="font-semibold">{peso.format(totalApproved)}</span>
        </p>
      </main>
    </div>
  );
}
