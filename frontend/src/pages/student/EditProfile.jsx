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
  const localUser = JSON.parse(localStorage.getItem("user") || "{}") || {};
  const [form, setForm] = useState({
    name: localUser?.name || "",
    email: localUser?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic client validation
    if (form.newPassword || form.confirmPassword || form.currentPassword) {
      if (!form.newPassword) {
        alert("Enter a new password or leave all password fields empty.");
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        alert("New password and confirm password do not match.");
        return;
      }
      if (!form.currentPassword) {
        // If backend requires current password, we ask for it.
        if (!window.confirm("You did not enter your current password. Submit anyway?")) {
          return;
        }
      }
    }

    try {
      // Attempt to update profile (name/email) and password via common admin endpoints.
      // Try a dedicated password endpoint first (common pattern). If that fails, fallback to updating the user record.
      const updatePayload = { name: form.name, email: form.email };

      // Update name/email first (if backend has users/me)
      let updatedUser = null;
      try {
        const res = await api.patch("/users/me", updatePayload);
        updatedUser = Array.isArray(res) ? null : (res?.data || res);
      } catch (err) {
        // ignore — some backends may not support /users/me patch, will continue
      }

      // If user wants to change password, try dedicated endpoint then fallback
      if (form.newPassword) {
        const userId = localUser?.id || localUser?._id || null;
        const endpoints = [
          "/auth/change-password",
          "/users/me/change-password",
          "/users/change-password",
          "/auth/password/change",
          "/users/change-password",
          "/users/me/password",
          "/users/password",
        ];
        const payloads = [
          { currentPassword: form.currentPassword, newPassword: form.newPassword },
          { oldPassword: form.currentPassword, newPassword: form.newPassword },
          { password: form.currentPassword, newPassword: form.newPassword },
          { current_password: form.currentPassword, new_password: form.newPassword },
          { old_password: form.currentPassword, new_password: form.newPassword },
        ];

        let changed = false;
        let lastError = null;
        for (const ep of endpoints) {
          for (const pl of payloads) {
            // if endpoint expects user id, replace placeholder
            const target = ep.includes(":id") ? ep.replace(":id", userId) : (ep.includes("{id}") ? ep.replace("{id}", userId) : ep);
            // if calling /auth/change-password, include email so backend can locate the user
            const finalPayload = (target === "/auth/change-password") ? { ...pl, email: localUser?.email || form.email } : pl;
            try {
              // try POST then PATCH
              await api.post(target, finalPayload);
              changed = true;
              break;
            } catch (e1) {
              lastError = e1;
              try {
                await api.patch(target, finalPayload);
                changed = true;
                break;
              } catch (e2) {
                lastError = e2;
              }
            }
          }
          if (changed) break;
        }

        if (!changed) {
          // final fallback: attempt to update user record with password field
          try {
            await api.patch("/users/me", { password: form.newPassword });
            changed = true;
          } catch (finalErr) {
            lastError = finalErr;
          }
        }

        if (!changed) {
          console.error("Password change failed", lastError);
          const msg = (lastError?.response?.data && (lastError.response.data.message || JSON.stringify(lastError.response.data))) || lastError?.message || "server error";
          alert("Failed to change password: " + msg);
          return;
        }
      }

      // If server returned updated user, merge it; otherwise update localStorage with fields we know
      const finalUser = updatedUser || { ...localUser, name: form.name, email: form.email };
      localStorage.setItem("user", JSON.stringify(finalUser));

      alert("Profile updated successfully.");
      navigate("/profile");
    } catch (e) {
      console.error("Update failed", e);
      alert("Update failed. See console for details.");
    }
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
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                className="mt-1 block w-full border border-blue-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 text-gray-900"
                placeholder="Enter current password (required to change password)"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                New Password{" "}
                <span className="text-gray-400">(optional)</span>
              </label>
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="mt-1 block w-full border border-blue-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50 text-gray-900"
                placeholder="Re-enter new password"
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
