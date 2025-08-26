// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/avbar";

export default function Profile() {
  const [user, setUser] = useState({
    name: "Guest User",
    email: "guest@example.com",
    balance: 150.0,
  });

  useEffect(() => {
    // Try to get user info from localStorage (from registration or login)
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    setUser({
      name: stored.name || "Guest User",
      email: stored.email || "guest@example.com",
      balance:
        typeof stored.balance === "number"
          ? stored.balance
          : stored.balance
          ? parseFloat(stored.balance)
          : 150.0,
    });
  }, []);

  // derive initials for avatar
  const initials = user.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SITE‑WIDE NAVBAR */}
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>

        <div className="bg-white rounded-xl shadow p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Avatar + Edit */}
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-3xl font-bold text-blue-600 mb-4">
              {initials}
            </div>
            <p className="text-gray-600 text-sm">Member since Jan 2024</p>
            <Link
              to="/profile/edit"
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Profile
            </Link>
          </div>

          {/* Details & Balance */}
          <div className="md:col-span-2 space-y-6">
            {/* User Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="text-lg font-medium text-gray-900">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="text-lg font-medium text-gray-900">{user.email}</p>
              </div>
            </div>

            {/* Balance Card */}
            <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center border border-gray-200">
              <div>
                <p className="text-sm text-gray-500">Current Balance</p>
                <p className="text-2xl font-bold text-green-600">
                  ₱{Number(user.balance).toFixed(2)}
                </p>
              </div>
              <Link
                to="/topup"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Top Up
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
