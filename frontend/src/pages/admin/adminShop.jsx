// src/pages/admin/adminShops.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/adminavbar";
import { 
  Edit, 
  Trash2, 
  PlusCircle, 
  Search, 
  Filter, 
  RefreshCw,
  ChevronDown,
  Eye,
  EyeOff,
  MoreVertical,
  X
} from "lucide-react";
import AdminBottomNav from '../../components/mobile/AdminBottomNav';
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A–Z)", icon: "↑" },
  { value: "name-desc", label: "Name (Z–A)", icon: "↓" },
  { value: "price-asc", label: "Price (Low→High)", icon: "↑" },
  { value: "price-desc", label: "Price (High→Low)", icon: "↓" },
  { value: "stock-asc", label: "Stock (Low→High)", icon: "↑" },
  { value: "stock-desc", label: "Stock (High→Low)", icon: "↓" },
  { value: "category-asc", label: "Category (A–Z)", icon: "↑" },
  { value: "category-desc", label: "Category (Z–A)", icon: "↓" },
  { value: "newest", label: "Newest First", icon: "🕐" },
  { value: "oldest", label: "Oldest First", icon: "🕐" },
];

export default function AdminShop() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'admin' });
    })();
  }, [navigate]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  // controls
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("name-asc");
  
  // mobile UI states
  const [showFilters, setShowFilters] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // for mobile action menu

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getMenu(false);
      setItems(Array.isArray(data) ? data : []);
      try { window.dispatchEvent(new Event("menu:updated")); } catch {}
    } catch (e) {
      console.error(e);
      alert("Failed to load menu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const categories = useMemo(() => {
    const set = new Set(items.map(i => i.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    let rows = items.map((i) => ({ ...i, available: (i.stock ?? 0) > 0 }));
    const s = q.toLowerCase().trim();

    if (s) rows = rows.filter(r =>
      r.name?.toLowerCase().includes(s) ||
      r.category?.toLowerCase().includes(s)
    );
    if (cat !== "all") rows = rows.filter(r => r.category === cat);
    if (status !== "all") {
      const need = status === "available";
      rows = rows.filter(r => r.available === need);
    }

    // Enhanced sorting logic
    switch (sort) {
      case "name-asc":
        rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "name-desc":
        rows.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "price-asc":
        rows.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "price-desc":
        rows.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "stock-asc":
        rows.sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
        break;
      case "stock-desc":
        rows.sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0));
        break;
      case "category-asc":
        rows.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
        break;
      case "category-desc":
        rows.sort((a, b) => (b.category || "").localeCompare(a.category || ""));
        break;
      case "newest":
        rows.sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));
        break;
      case "oldest":
        rows.sort((a, b) => new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0));
        break;
      default:
        rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return rows;
  }, [items, q, cat, status, sort]);

  const markOutOfStock = async (id) => {
    if (!window.confirm("Mark this item as out of stock?")) return;
    setBusyId(id);
    setActiveMenu(null);
    try {
      await api.put(`/menu/${id}`, { stock: 0 });
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to update item.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleVisibility = async (id, nextVisible) => {
    setBusyId(id);
    setActiveMenu(null);
    try {
      await api.put(`/menu/${id}`, { visible: !!nextVisible });
      setItems((prev) => prev.map((it) => (String(it.id) === String(id) ? { ...it, visible: !!nextVisible } : it)));
      try { window.dispatchEvent(new Event("menu:updated")); } catch {}
    } catch (e) {
      console.error("toggle visibility failed", e);
      alert("Failed to update visibility.");
    } finally {
      setBusyId(null);
    }
  };

  // Stats summary
  const stats = useMemo(() => {
    const total = items.length;
    const available = items.filter(i => (i.stock ?? 0) > 0).length;
    const outOfStock = total - available;
    const lowStock = items.filter(i => {
      const stock = i.stock ?? 0;
      return stock > 0 && stock < 5;
    }).length;
    return { total, available, outOfStock, lowStock };
  }, [items]);

  // Badge counts for bottom nav
  const badgeCounts = {
    orders: 0,
    topups: 0,
    lowStock: stats.lowStock,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Products</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Add, edit, filter and manage canteen items
              </p>
            </div>

            {/* Desktop: Refresh button */}
            <button
              onClick={load}
              disabled={loading}
              className="hidden md:inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Stats Cards - Mobile optimized */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="text-xs text-gray-500">Total Items</div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="text-xs text-gray-500">Available</div>
              <div className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{stats.available}</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="text-xs text-gray-500">Out of Stock</div>
              <div className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{stats.outOfStock}</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="text-xs text-gray-500">Low Stock</div>
              <div className="text-xl sm:text-2xl font-bold text-orange-600 mt-1">{stats.lowStock}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Mobile: Dropdown menu for adding items */}
            <div className="relative md:hidden flex-1">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                Add Product
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showAddMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                    <Link
                      to="/admin/shop/add-rice"
                      className="block px-4 py-3 text-sm hover:bg-gray-50 border-b"
                      onClick={() => setShowAddMenu(false)}
                    >
                      Add Rice Meal
                    </Link>
                    <Link
                      to="/admin/shop/add-snacks"
                      className="block px-4 py-3 text-sm hover:bg-gray-50 border-b"
                      onClick={() => setShowAddMenu(false)}
                    >
                      Add Snack
                    </Link>
                    <Link
                      to="/admin/shop/add-drinks"
                      className="block px-4 py-3 text-sm hover:bg-gray-50"
                      onClick={() => setShowAddMenu(false)}
                    >
                      Add Drink
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Desktop: Individual buttons */}
            <Link
              to="/admin/shop/add-rice"
              className="hidden md:inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Add Rice Meal
            </Link>
            <Link
              to="/admin/shop/add-snacks"
              className="hidden md:inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Add Snack
            </Link>
            <Link
              to="/admin/shop/add-drinks"
              className="hidden md:inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Add Drink
            </Link>

            {/* Edit Items button (all screens) */}
            <Link
              to="/admin/shop/edit-items"
              className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm font-medium flex-1 md:flex-none"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Edit Items</span>
              <span className="sm:hidden">Edit</span>
            </Link>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 space-y-3">
          {/* Search bar - always visible */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Mobile: Filter toggle button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden inline-flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? <X className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Desktop: Refresh */}
            <button
              onClick={load}
              disabled={loading}
              className="hidden sm:inline-flex md:hidden items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filter controls - collapsible on mobile */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${showFilters ? 'block' : 'hidden'} md:grid`}>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>
                ))}
              </select>
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All status</option>
              <option value="available">Available</option>
              <option value="out">Out of stock</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Active filters indicator */}
          {(q || cat !== "all" || status !== "all" || sort !== "name-asc") && (
            <div className="flex items-center gap-2 text-xs text-gray-600 pt-2 border-t">
              <span className="font-medium">Showing {filtered.length} of {items.length} items</span>
              <button
                onClick={() => {
                  setQ("");
                  setCat("all");
                  setStatus("all");
                  setSort("name-asc");
                }}
                className="text-blue-600 hover:text-blue-700 ml-auto"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        {/* Products List */}
        <section className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 sm:p-10 text-center text-sm text-gray-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading products…
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 sm:p-10 text-center">
              <div className="text-sm text-gray-500">
                {q || cat !== "all" || status !== "all" 
                  ? "No products match your filters."
                  : "No products found. Add your first product!"}
              </div>
            </div>
          ) : (
            <>
              {/* Mobile: Card view */}
              <div className="md:hidden space-y-3">
                {filtered.map((p) => {
                  const available = (p.stock ?? 0) > 0;
                  const isLowStock = p.stock > 0 && p.stock < 5;
                  
                  return (
                    <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                      <div className="flex items-start gap-3">
                        {/* Product info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-900 truncate">{p.name}</h3>
                              <div className="text-xs text-gray-500 mt-0.5">{p.category || "Uncategorized"}</div>
                            </div>
                            
                            {/* Mobile menu */}
                            <div className="relative flex-shrink-0">
                              <button
                                onClick={() => setActiveMenu(activeMenu === p.id ? null : p.id)}
                                className="p-1 rounded hover:bg-gray-100"
                                disabled={busyId === p.id}
                              >
                                <MoreVertical className="w-4 h-4 text-gray-500" />
                              </button>

                              {activeMenu === p.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-48 overflow-hidden">
                                    <button
                                      onClick={() => toggleVisibility(p.id, !p.visible)}
                                      className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50 border-b"
                                    >
                                      {p.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                      {p.visible ? "Hide from menu" : "Show on menu"}
                                    </button>
                                    <button
                                      onClick={() => markOutOfStock(p.id)}
                                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Mark out of stock
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}
                            >
                              {available ? "Available" : "Out of stock"}
                            </span>
                            
                            {!p.visible && (
                              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                                Hidden
                              </span>
                            )}

                            {isLowStock && (
                              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                                Low Stock
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-600">
                              Stock: <span className="font-medium">{p.stock ?? 0}</span>
                            </div>
                            <div className="text-base font-semibold text-gray-900">
                              {typeof p.price === "number" ? peso.format(p.price) : "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: Table view */}
              <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {filtered.map((p) => {
                        const available = (p.stock ?? 0) > 0;
                        const isLowStock = p.stock > 0 && p.stock < 5;
                        
                        return (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{p.name}</div>
                              {p.img && <div className="text-xs text-gray-500 truncate max-w-xs">{p.img}</div>}
                              {isLowStock && (
                                <span className="inline-flex mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-orange-100 text-orange-700">
                                  Low Stock
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">{p.category || "-"}</td>
                            <td className="px-6 py-4 text-center text-sm text-gray-700">{p.stock ?? 0}</td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                }`}
                              >
                                {available ? "Available" : "Out of stock"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                              {typeof p.price === "number" ? peso.format(p.price) : "-"}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => toggleVisibility(p.id, !p.visible)}
                                  disabled={busyId === p.id}
                                  className="inline-flex items-center gap-3 px-2 py-1 rounded-md focus:outline-none"
                                  title={p.visible ? "Hide from menu" : "Show on menu"}
                                >
                                  <span className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors ${p.visible ? "bg-emerald-500" : "bg-gray-300"}`}>
                                    <span className={`absolute left-0 top-0.5 inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${p.visible ? "translate-x-5" : "translate-x-0"}`} />
                                  </span>
                                  <span className="text-sm text-gray-700">{p.visible ? "Visible" : "Hidden"}</span>
                                </button>

                                <button
                                  onClick={() => markOutOfStock(p.id)}
                                  disabled={busyId === p.id}
                                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-60"
                                  title="Mark as out of stock"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Bottom Navigation - Mobile only */}
      <AdminBottomNav badgeCounts={badgeCounts} />
    </div>
  );
}