import React, { useEffect, useState } from "react";
import Navbar from "../../components/adminavbar";
import { api } from "../../lib/api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get("/admin/users");
      setUsers(data || []);
    } catch (e) {
      console.error("load users failed", e);
      setUsers([]);
      alert("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const genReset = async (id) => {
    if (!window.confirm("Generate a password reset token for this user?")) return;
    try {
      const res = await api.post(`/admin/users/${id}/reset-token`);
      alert("Reset token:\n" + (res.token || JSON.stringify(res)));
    } catch (e) {
      console.error(e);
      alert("Failed to generate token");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">User Accounts</h1>
          <div className="text-sm text-gray-600">{users.length} accounts</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">ID Number</th>
                  <th className="px-4 py-3">Full name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th> {/* added */}
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Pwd set</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                      <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-48" /></td>
                      <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-56" /></td>
                      <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-36" /></td> {/* placeholder */}
                      <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                      <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                      <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    </tr>
                  ))
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 border-t">
                      <td className="px-4 py-3 font-mono text-sm text-gray-700">{u.studentId || u.id}</td>
                      <td className="px-4 py-3">{u.name}</td>
                      <td className="px-4 py-3 break-words">{u.email}</td>
                      <td className="px-4 py-3">{u.phone || "—"}</td> {/* added */}
                      <td className="px-4 py-3">{u.role}</td>
                      <td className="px-4 py-3">{u.passwordSet ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => genReset(u.id)} className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">Generate Reset</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}