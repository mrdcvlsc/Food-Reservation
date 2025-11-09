import React, { useEffect, useState } from "react";
import Navbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import { Pencil, X } from 'lucide-react';

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
      
      if (res.ok) {
        // Update local state
        setUsers(users.map(u => 
          u.id === editUser.id ? { ...u, ...res.user } : u
        ));
        
        // Emit custom event for profile update
        const event = new CustomEvent(USER_PROFILE_UPDATED, {
          detail: {
            userId: editUser.id,
            updates: res.user
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
                                // Fallback to initials if image fails to load
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
                      <td className="px-4 py-3">{u.role}</td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => handleEdit(u)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
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