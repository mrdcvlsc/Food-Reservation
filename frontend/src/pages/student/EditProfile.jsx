// src/pages/EditProfile.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/avbar";
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";

export default function EditProfile() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'student' });
    })();
  }, [navigate]);

  // Load current user info from localStorage
  const [form, setForm] = useState({
    name: JSON.parse(localStorage.getItem("user") || "{}")?.name,
    email: JSON.parse(localStorage.getItem("user") || "{}")?.email,
    password: ""
  });

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Update user info in localStorage
    const updatedUser = {
      ...JSON.parse(localStorage.getItem("user") || "{}"),
      name: form.name,
      email: form.email,
      // Only update password if provided
      ...(form.password ? { password: form.password } : {})
    };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    navigate("/profile");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-10">
          <h2 className="text-3xl font-bold mb-8 text-center text-blue-700">
            Edit Profile
          </h2>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Full Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-blue-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 text-gray-900"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email Address
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-blue-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 text-gray-900"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                New Password{" "}
                <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="mt-1 block w-full border border-blue-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 text-gray-900"
                placeholder="Enter new password"
                autoComplete="new-password"
              />
            </div>

            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
