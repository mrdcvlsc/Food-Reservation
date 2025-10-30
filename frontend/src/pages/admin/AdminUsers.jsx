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
    <div>
      <Navbar />
      <main className="max-w-6xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-4">User Accounts (admin)</h1>
        {loading ? <div>Loading…</div> : (
          <table className="w-full table-auto">
            <thead><tr>
              <th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Pwd set</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="p-2">{u.id}</td>
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.role}</td>
                  <td className="p-2">{u.passwordSet ? "Yes" : "No"}</td>
                  <td className="p-2">
                    <button onClick={() => genReset(u.id)} className="px-2 py-1 bg-yellow-500 text-white rounded">Generate Reset Token</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}