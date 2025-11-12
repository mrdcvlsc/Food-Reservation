import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import { Pencil, X, Trash } from "lucide-react";

// Peso formatter
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    studentId: '',
    phone: '',
    note: '' // optional admin note to notify user
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Load users + their wallet balances
  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get("/admin/users");
      const usersArr = Array.isArray(data) ? data : (data?.data || []);

      // Fetch each user's wallet balance
      const balances = await Promise.all(
        usersArr.map(async (u) => {
          try {
            // Try to get balance from user object first, otherwise fetch it
            if (u.balance !== undefined) {
              return Number(u.balance);
            }
            
            const walletRes = await api.get(`/admin/users/${u.id}/wallet`);
            const wallet = walletRes?.data ?? walletRes;
            return Number(wallet?.balance ?? wallet?.wallet ?? 0);
          } catch (err) {
            console.error(`Failed to load wallet for user ${u.id}:`, err);
            return 0;
          }
        })
      );

      const merged = usersArr.map((u, i) => ({ ...u, balance: balances[i] }));
      setUsers(merged);
    } catch (e) {
      console.error("load users failed", e);
      setUsers([]);
      alert("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEdit = (user) => {
    setEditUser(user);
    setEditForm({
      name: user.name,
      studentId: user.studentId,
      phone: user.phone || '',
      note: '' // reset note when opening editor
    });
    setPhotoFile(null);
    setRemovePhoto(false);
  };

  const handlePhotoChange = (e) => {
    if (e.target.files?.[0]) {
      setPhotoFile(e.target.files[0]);
      setRemovePhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editUser) return;

    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('studentId', editForm.studentId);
      formData.append('phone', editForm.phone);
      formData.append('removePhoto', removePhoto);
      formData.append('note', editForm.note || ""); // include admin note
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await api.patch(`/admin/users/${editUser.id}`, formData);
      
      if (res && (res.ok || res.user)) {
        // Update local state with returned user object if provided
        console.log ('adminuserrequest1')
        const updated = res.user || res;
        setUsers(users.map(u => 
          u.id === editUser.id ? { ...u, ...updated } : u
        ));
        
        // Emit custom event for profile update
        const event = new CustomEvent(USER_PROFILE_UPDATED, {
          detail: {
            userId: editUser.id,
            updates: updated
          }
        });
        window.dispatchEvent(event);
        
        setEditUser(null);
      }
    } catch (err) {
      console.error('Update failed:', err);
      alert(err.response?.data?.error || 'Failed to update user');
    }
  };

  const deleteUser = async (id) => {
    const u = users.find(x => String(x.id) === String(id));
    if (!u) return;

    // Prevent deleting admin accounts
    if (String(u.role || '').toLowerCase() === 'admin' || u.isAdmin) {
      alert("Administrator accounts cannot be deleted.");
      return;
    }

    if ((u.balance || 0) !== 0) {
      alert("User must have zero balance before deletion.");
      return;
    }
    if (!window.confirm(`Delete user "${u.name}"? This will remove the account from the system but keep their historical records for reports.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/users/${id}`);
      // remove from local list
      console.log ('adminuserrequest2')
      setUsers(prev => prev.filter(x => String(x.id) !== String(id)));
    } catch (err) {
      console.error("delete user failed", err);
      alert(err.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">ID Number</th>
                  <th className="px-4 py-3">Full name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4"><div className="h-10 w-10 bg-gray-200 rounded-full" /></td>
                      <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                      <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-48" /></td>
                      <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-56" /></td>
                      <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-36" /></td>
                      <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                      <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                      <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    </tr>
                  ))
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 border-t">
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                          {u.profilePictureUrl ? (
                            <img 
                              src={u.profilePictureUrl} 
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = `
                                  <div class="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-medium">
                                    ${u.name?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                `;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-medium">
                              {u.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-700">{u.studentId}</td>
                      <td className="px-4 py-3">{u.name}</td>
                      <td className="px-4 py-3 break-words">{u.email}</td>
                      <td className="px-4 py-3">{u.phone || "—"}</td>
                      <td className="px-4 py-3">
                        {peso.format(Number(u.balance || 0))}
                      </td>
                      <td className="px-4 py-3">{u.role}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <button 
                          onClick={() => handleEdit(u)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>

                        <button
                          onClick={() => deleteUser(u.id)}
                          disabled={deletingId === u.id || (Number(u.balance || 0) !== 0) || String(u.role || '').toLowerCase() === 'admin' || u.isAdmin}
                          className={`px-3 py-1 rounded-md text-xs border flex items-center gap-1 ${
                            (Number(u.balance || 0) === 0 && String(u.role || '').toLowerCase() !== 'admin' && !u.isAdmin)
                              ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                              : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          }`}r
                          title={String(u.role || '').toLowerCase() === 'admin' || u.isAdmin ? "Cannot delete administrator" : (Number(u.balance || 0) === 0 ? "Delete user" : "Cannot delete user with non-zero balance")}
                        >
                          <Trash className="w-3 h-3" />
                          {deletingId === u.id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {editUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Edit User Profile</h3>
                <button 
                  onClick={() => setEditUser(null)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Profile Picture */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden">
                      {!removePhoto && (editUser.profilePictureUrl || photoFile) ? (
                        <img 
                          src={photoFile ? URL.createObjectURL(photoFile) : editUser.profilePictureUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-medium text-xl">
                          {editUser.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                        id="photo-upload"
                      />
                      <div className="flex gap-2">
                        <label 
                          htmlFor="photo-upload"
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm cursor-pointer hover:bg-blue-700"
                        >
                          Upload New
                        </label>
                        {(editUser.profilePictureUrl || photoFile) && (
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoFile(null);
                              setRemovePhoto(true);
                            }}
                            className="px-3 py-1 border border-red-600 text-red-600 rounded text-sm hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  {/* Student ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student ID
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.studentId}
                      onChange={e => setEditForm({...editForm, studentId: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={e => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  {/* Optional admin note (will notify user) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Optional note (notify user)
                    </label>
                    <textarea
                      value={editForm.note}
                      onChange={e => setEditForm({...editForm, note: e.target.value})}
                      placeholder="Write a short message to the user (e.g. 'Your profile picture is inappropriate, please change it')"
                      className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px]"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditUser(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}