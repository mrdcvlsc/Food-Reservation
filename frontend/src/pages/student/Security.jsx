// ...new file...
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/avbar";
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";

export default function Security() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'student' });
    })();
  }, [navigate]);

  const localUser = JSON.parse(localStorage.getItem("user") || "{}") || {};
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword) {
      alert("Please fill both current password and new password");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      alert("New passwords don't match");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        email: localUser.email,
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      };
      const res = await api.post("/auth/change-password", payload);

      // Accept several possible response shapes (axios response or direct data)
      const ok =
        (res && (
          (res.data && res.data.ok) ||
          res.ok ||
          res === true ||
          res.status === 200
        ));

      if (ok) {
        alert("Password changed successfully.");
        navigate("/profile");
      } else {
        const msg = (res && (res.data?.error || res.error)) || "Failed to change password.";
        alert(msg);
      }
    } catch (err) {
      console.error("Change password failed", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to change password.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4 text-center text-blue-700">Change Password</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                className="mt-1 block w-full border border-blue-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 text-gray-900"
                placeholder="Enter current password"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                className="mt-1 block w-full border border-blue-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 text-gray-900"
                placeholder="Enter new password"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="mt-1 block w-full border border-blue-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 text-gray-900"
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>

            <div className="flex justify-between mt-4">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {loading ? "Saving…" : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
// ...new file...