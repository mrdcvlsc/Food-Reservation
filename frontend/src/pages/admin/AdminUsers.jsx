import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import { 
  Pencil, X, Trash, Search, ArrowUpDown, ArrowUp, ArrowDown,
  Users, Filter, Loader2, Upload, Camera, UserCircle2
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED';

// Avatar Component
const Avatar = ({ user, size = "md" }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-16 h-16 text-xl",
  };

  const fallbackInitial = (user?.name || "U").charAt(0).toUpperCase();

  if (user?.profilePictureUrl) {
    return (
      <img
        src={user.profilePictureUrl}
        alt={user.name || "User"}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white shadow-sm`}
        onError={(e) => {
          e.target.onerror = null;
          e.target.style.display = "none";
          const fallback = document.createElement("div");
          fallback.className = `${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center font-semibold text-blue-600`;
          fallback.textContent = fallbackInitial;
          e.target.parentElement.appendChild(fallback);
        }}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center font-semibold text-blue-600`}>
      {fallbackInitial}
    </div>
  );
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    studentId: '',
    phone: '',
    note: ''
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterZeroBalance, setFilterZeroBalance] = useState(false);
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get("/admin/users");
      const usersArr = Array.isArray(data) ? data : [];

      const balances = await Promise.all(
        usersArr.map(async (u) => {
          try {
            if (u.balance !== undefined) {
              return Number(u.balance);
            }
            
            const walletRes = await api.get(`/admin/users/${u.id}/wallet`);
            const wallet = walletRes;
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

  const filteredUsers = useMemo(() => {
    let result = users;

    if (filterZeroBalance) {
      result = result.filter(u => Number(u.balance || 0) === 0);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(u => {
        const matchId = u.id?.toLowerCase().includes(query);
        const matchStudentId = u.studentId?.toLowerCase().includes(query);
        const matchName = u.name?.toLowerCase().includes(query);
        const matchEmail = u.email?.toLowerCase().includes(query);
        const matchPhone = u.phone?.toLowerCase().includes(query);
        const matchBalance = peso.format(Number(u.balance || 0)).toLowerCase().includes(query);
        
        return matchId || matchStudentId || matchName || matchEmail || matchPhone || matchBalance;
      });
    }

    result = [...result].sort((a, b) => {
      let aVal, bVal;

      switch(sortField) {
        case "name":
          aVal = a.name?.toLowerCase() || "";
          bVal = b.name?.toLowerCase() || "";
          break;
        case "email":
          aVal = a.email?.toLowerCase() || "";
          bVal = b.email?.toLowerCase() || "";
          break;
        case "studentId":
          aVal = a.studentId?.toLowerCase() || "";
          bVal = b.studentId?.toLowerCase() || "";
          break;
        case "phone":
          aVal = a.phone?.toLowerCase() || "";
          bVal = b.phone?.toLowerCase() || "";
          break;
        case "balance":
          aVal = Number(a.balance || 0);
          bVal = Number(b.balance || 0);
          break;
        case "createdAt":
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
          break;
        default:
          return 0;
      }

      if (typeof aVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
    });

    return result;
  }, [users, searchQuery, filterZeroBalance, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === "asc" 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  useEffect(() => { load(); }, []);

  const handleEdit = (user) => {
    setEditUser(user);
    setEditForm({
      name: user.name,
      studentId: user.studentId,
      phone: user.phone || '',
      note: ''
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
      setSubmitting(true);
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('studentId', editForm.studentId);
      formData.append('phone', editForm.phone);
      formData.append('removePhoto', removePhoto);
      formData.append('note', editForm.note || "");
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await api.patch(`/admin/users/${editUser.id}`, formData);
      
      if (res && (res.ok || res.user)) {
        const updated = res.user || res;
        setUsers(users.map(u => 
          u.id === editUser.id ? { ...u, ...updated } : u
        ));
        
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
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (id) => {
    const u = users.find(x => String(x.id) === String(id));
    if (!u) return;

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
      setUsers(prev => prev.filter(x => String(x.id) !== String(id)));
    } catch (err) {
      console.error("delete user failed", err);
      alert(err.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (u) => {
    return (
      Number(u.balance || 0) === 0 &&
      String(u.role || '').toLowerCase() !== 'admin' &&
      !u.isAdmin
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <Navbar />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  {filteredUsers.length} of {users.length} account{users.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by ID, name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            
            <button
              onClick={() => setFilterZeroBalance(!filterZeroBalance)}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                filterZeroBalance
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Zero Balance</span>
              <span className="sm:hidden">₱0</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-white">
                <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="px-6 py-4">Profile</th>
                  <th 
                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 select-none transition"
                    onClick={() => handleSort("studentId")}
                  >
                    <div className="flex items-center gap-2">
                      ID Number
                      <SortIcon field="studentId" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 select-none transition"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-2">
                      Full name
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 select-none transition"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      <SortIcon field="email" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 select-none transition"
                    onClick={() => handleSort("phone")}
                  >
                    <div className="flex items-center gap-2">
                      Phone
                      <SortIcon field="phone" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 select-none transition"
                    onClick={() => handleSort("balance")}
                  >
                    <div className="flex items-center gap-2">
                      Balance
                      <SortIcon field="balance" />
                    </div>
                  </th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-10 w-10 bg-gray-200 rounded-full" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-48" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-56" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-36" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <UserCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900">No users found</p>
                      <p className="text-xs text-gray-500 mt-1">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <Avatar user={u} size="md" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-medium text-gray-700">{u.studentId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{u.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 text-sm">{u.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600">{u.phone || "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-emerald-600">
                          {peso.format(Number(u.balance || 0))}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          String(u.role || '').toLowerCase() === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>

                          <button
                            onClick={() => deleteUser(u.id)}
                            disabled={deletingId === u.id || !canDelete(u)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              canDelete(u)
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                            title={
                              String(u.role || '').toLowerCase() === 'admin' || u.isAdmin
                                ? "Cannot delete administrator"
                                : Number(u.balance || 0) !== 0
                                ? "User must have zero balance"
                                : "Delete user"
                            }
                          >
                            {deletingId === u.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash className="w-3.5 h-3.5" />
                                Delete
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 animate-pulse">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-24" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200">
              <UserCircle2 className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-base font-medium text-gray-900">No users found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <Avatar user={u} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{u.name}</h3>
                    <p className="text-xs font-mono text-gray-500">ID: {u.studentId}</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                      String(u.role || '').toLowerCase() === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600">
                      {peso.format(Number(u.balance || 0))}
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="text-gray-900 text-right truncate ml-2 max-w-[200px]">{u.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="text-gray-900">{u.phone || "—"}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button 
                    onClick={() => handleEdit(u)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition active:scale-95"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>

                  <button
                    onClick={() => deleteUser(u.id)}
                    disabled={deletingId === u.id || !canDelete(u)}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition active:scale-95 ${
                      canDelete(u)
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {deletingId === u.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit Modal */}
        {editUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-2xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Edit User Profile</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Update user information</p>
                  </div>
                  <button 
                    onClick={() => setEditUser(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                {/* Profile Picture */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="relative">
                    {!removePhoto && (editUser.profilePictureUrl || photoFile) ? (
                      <img 
                        src={photoFile ? URL.createObjectURL(photoFile) : editUser.profilePictureUrl}
                        alt=""
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-2xl font-bold text-blue-600">
                        {editUser.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload"
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <label 
                        htmlFor="photo-upload"
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-700 transition"
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </label>
                      {(editUser.profilePictureUrl || photoFile) && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null);
                            setRemovePhoto(true);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-red-600 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition"
                        >
                          <X className="w-4 h-4" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Enter full name"
                  />
                </div>

                {/* Student ID */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.studentId}
                    onChange={e => setEditForm({...editForm, studentId: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
                    placeholder="e.g., 2024-001234"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={e => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="09•• ••• ••••"
                  />
                </div>

                {/* Admin Note */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Optional Note to User
                  </label>
                  <textarea
                    value={editForm.note}
                    onChange={e => setEditForm({...editForm, note: e.target.value})}
                    placeholder="Write a message to the user about this update (optional)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The user will be notified of changes and see this message
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setEditUser(null)}
                    disabled={submitting}
                    className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
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