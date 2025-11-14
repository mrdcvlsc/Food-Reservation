// src/pages/admin/adminhomes.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/adminavbar";
import {
  ShoppingBag,
  TrendingUp,
  Users,
  Clock,
  Edit,
  Trash2,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";

// ---- currency (PHP)
const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

// ---- single source of truth for admin routes
const ADMIN_ROUTES = {
  home: "/admin",
  shop: "/admin/shops", // file: adminShop.jsx
  topup: "/admin/topup", // file: adminTopUp.jsx
  orders: "/admin/orders", // file: adminOrders.jsx
  reservations: "/admin/reservations", // file: adminReservations.jsx
  stats: "/admin/stats", // file: adminStats.jsx
  itemEdit: (id) => `/admin/shops/edit/${id}`, // ensure this matches the route that renders EditItem
};

export default function AdminHome() {
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);
  // modal edit states
  const [editingItem, setEditingItem] = useState(null); // full item object being edited
  const [editingFields, setEditingFields] = useState(null); // { name, category, stock, price }
  const [editingImagePreview, setEditingImagePreview] = useState(null);
  const [editingImageFile, setEditingImageFile] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'admin' });
    })();
  }, [navigate]);

  // Quick links
  const [directories] = useState([
    { name: "Dashboard", to: ADMIN_ROUTES.home, icon: <TrendingUp /> },
    { name: "Shop", to: ADMIN_ROUTES.shop, icon: <ShoppingBag /> },
    { name: "Top-Up Verify", to: ADMIN_ROUTES.topup, icon: <Wallet /> },
    { name: "Orders", to: ADMIN_ROUTES.orders, icon: <Clock /> },
    { name: "Reservations", to: ADMIN_ROUTES.reservations, icon: <Clock /> },
    { name: "Stats", to: ADMIN_ROUTES.stats, icon: <TrendingUp /> },
  ]);

  // Fallback demo stats while real dashboard loads
  const [todaySales] = useState([
    {
      label: "Total Sales",
      value: 4250,
      icon: <TrendingUp className="w-6 h-6 text-green-600" />,
      change: "+12.5%",
    },
    {
      label: "Orders Today",
      value: 72,
      icon: <ShoppingBag className="w-6 h-6 text-blue-600" />,
      change: "+8.2%",
    },
    {
      label: "New Users",
      value: 15,
      icon: <Users className="w-6 h-6 text-purple-600" />,
      change: "+5.1%",
    },
    {
      label: "Pending",
      value: 4,
      icon: <Clock className="w-6 h-6 text-orange-600" />,
      change: "-2.3%",
    },
  ]);

  // Dashboard stats
  const [dashboard, setDashboard] = useState({
    totalSales: 0,
    ordersToday: 0,
    newUsers: 0,
    pending: 0,
    recentOrders: [],
  });
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  useEffect(() => {
    let m = true;
    setLoadingDashboard(true);
    api
      .get("/admin/dashboard")
      .then((d) => {
        if (!m) return;
        setDashboard(
          d && typeof d === "object"
            ? d
            : { totalSales: 0, ordersToday: 0, newUsers: 0, pending: 0, recentOrders: [] }
        );
      })
      .catch(() =>
        setDashboard({
          totalSales: 0,
          ordersToday: 0,
          newUsers: 0,
          pending: 0,
          recentOrders: [],
        })
      )
      .finally(() => m && setLoadingDashboard(false));
    return () => {
      m = false;
    };
  }, []);

  // Current products (single source of truth = /menu)
  const [currentProducts, setCurrentProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const mapMenuToRow = (r) => {
    const id = r._id || r.id || r.productId || String(Math.random());
    const name = r.name || r.title || "Unnamed";
    const price = Number(r.price) || 0;
    const stock = Number(r.stock ?? r.quantity ?? 0);
    const category = r.category || r.type || "";
    // Treat visibility independently from stock.
    // activeFlag = whether item is shown on the menu; available = stock > 0 (visibility does NOT affect availability)
    const activeFlag =
      r.visible !== undefined ? !!r.visible :
      r.active !== undefined ? !!r.active :
      r.isActive !== undefined ? !!r.isActive : true;
    const available = stock > 0;
    // include image/url so adminhomes edit modal can show the uploaded image
    const imageUrl = r.image || r.img || r.imageUrl || null;

    return { id, name, price, stock, category, available, activeFlag, imageUrl };
  };

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const { data } = await api.get("/menu");
      const rows = Array.isArray(data) ? data : [];
      const mapped = rows.map(mapMenuToRow);
      // Optional: sort by name asc
      mapped.sort((a, b) => a.name.localeCompare(b.name));
      setCurrentProducts(mapped);
    } catch {
      setCurrentProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadProducts();
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, [loadProducts]);

  // categories for edit modal dropdown (keeps UI consistent with adminShop edit-items)
  const categories = Array.from(
    new Set(currentProducts.map((p) => p.category).filter(Boolean))
  );

  // Demo recent orders if backend not ready
  const [recentOrders] = useState([
    {
      id: "#12436",
      product: "Rice Meal 1",
      customer: "Juan D.",
      time: "2:30 PM",
      amount: 69,
      status: "Success",
    },
    {
      id: "#12437",
      product: "Yakult",
      customer: "Maria S.",
      time: "2:15 PM",
      amount: 30,
      status: "Success",
    },
    {
      id: "#12438",
      product: "Snickers",
      customer: "Pedro R.",
      time: "1:45 PM",
      amount: 35,
      status: "Pending",
    },
    {
      id: "#12439",
      product: "Chicken Adobo",
      customer: "Ana L.",
      time: "1:30 PM",
      amount: 85,
      status: "Processing",
    },
  ]);

  // Helpers to keep buttons from bubbling / submitting
  const safeNav = (to) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(to);
  };

  // toggle visibility (eye) same behavior as admin shop
  const toggleVisibility = async (id, currentFlag) => {
    if (!window.confirm(`Set visibility to ${currentFlag ? "hidden" : "visible"} for this item?`)) return;
    setBusyId(id);
    try {
      // backend accepts "visible"
      await api.put(`/menu/${id}`, { visible: !currentFlag });
      // only flip visibility flag locally — do NOT change stock/availability
      setCurrentProducts((prev) =>
        prev.map((p) => (String(p.id) === String(id) ? { ...p, activeFlag: !currentFlag } : p))
      );
      try { window.dispatchEvent(new Event("menu:updated")); } catch {}
    } catch (err) {
      console.error("toggle visibility failed", err);
      alert("Failed to update visibility.");
    } finally {
      setBusyId(null);
    }
  };

  // delete product (try DELETE, fallback to hide)
  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product? It will be removed from the menu but preserved in reports.")) return;
    
    setBusyId(id);
    try {
      await api.delete(`/menu/${id}`);
      // Remove from local state to hide from UI
      setCurrentProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
      try { window.dispatchEvent(new Event("menu:updated")); } catch {}
    } catch (err) {
      console.error("Delete failed", err);
      alert("Failed to delete product.");
    } finally {
      setBusyId(null);
    }
  };

  // open edit modal for product id
  const openEditModal = async (id) => {
    setBusyId(id);
    try {
      // try get full product from backend, fallback to local list
      let item = null;
      try {
        item = await api.get(`/menu/${id}`);
      } catch {
        item = currentProducts.find((p) => String(p.id) === String(id)) || null;
      }

      if (!item) {
        alert("Failed to load item for editing.");
        return;
      }

      // normalize fields similar to mapMenuToRow but keep raw image if present
      const normalized = {
        id: item._id || item.id || item.productId || id,
        name: item.name || item.title || "",
        price: Number(item.price) || 0,
        stock: Number(item.stock ?? item.quantity ?? 0),
        category: item.category || item.type || "",
        activeFlag:
          item.visible !== undefined ? !!item.visible :
          item.active !== undefined ? !!item.active :
          item.isActive !== undefined ? !!item.isActive : true,
        imageUrl: item.image || item.img || item.imageUrl || null,
      };

      setEditingItem(normalized);
      setEditingFields({
        name: normalized.name,
        category: normalized.category,
        stock: normalized.stock,
        price: normalized.price,
      });
      setEditingImagePreview(normalized.imageUrl);
      setEditingImageFile(null);
    } finally {
      setBusyId(null);
    }
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditingFields(null);
    setEditingImagePreview(null);
    setEditingImageFile(null);
    setSavingEdit(false);
  };

  const onEditFieldChange = (key, value) => {
    setEditingFields((prev) => ({ ...prev, [key]: value }));
  };

  const onReplaceImage = (file) => {
    if (!file) return;
    setEditingImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setEditingImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setEditingImageFile(null);
    setEditingImagePreview(null);
  };

  const saveEdit = async () => {
    if (!editingItem || !editingFields) return;
    if (!window.confirm("Save changes to this product?")) return;
    setSavingEdit(true);
    try {
      // update basic fields
      await api.put(`/menu/${editingItem.id}`, {
        name: editingFields.name,
        price: Number(editingFields.price) || 0,
        stock: Number(editingFields.stock) || 0,
        category: editingFields.category,
      });

      // if image file selected, try upload to common endpoint; if missing, ignore
      if (editingImageFile) {
        try {
          const fd = new FormData();
          fd.append("image", editingImageFile);
          // backend endpoint may differ; try common pattern
          await api.post(`/menu/${editingItem.id}/image`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (e) {
          // non-blocking; still continue saving other fields
          console.warn("Image upload failed (non-blocking).", e);
        }
      }

      // update locally
      setCurrentProducts((prev) =>
        prev.map((p) =>
          String(p.id) === String(editingItem.id)
            ? {
                ...p,
                name: editingFields.name,
                price: Number(editingFields.price) || 0,
                stock: Number(editingFields.stock) || 0,
                category: editingFields.category,
              }
            : p
        )
      );
      try { window.dispatchEvent(new Event("menu:updated")); } catch {}
      closeEditModal();
    } catch (err) {
      console.error("Save edit failed", err);
      alert("Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Good afternoon, Admin
          </h1>
          <p className="text-gray-600">
            Here&apos;s what&apos;s happening with your canteen today.
          </p>
        </header>

        {/* Quick Actions */}
        <section aria-labelledby="quick-actions">
          <h2
            id="quick-actions"
            className="text-xl font-semibold text-gray-900 mb-4"
          >
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {directories.map(({ name, to, icon }) => (
              <button
                type="button"
                key={to}
                onClick={safeNav(to)}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 text-center group hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={name}
              >
                <div className="text-2xl mb-2 text-gray-700">{icon}</div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Today’s Overview */}
        <section aria-labelledby="overview">
          <h2 id="overview" className="text-xl font-semibold text-gray-900 mb-4">
            Today&apos;s Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(loadingDashboard
              ? todaySales
              : [
                  {
                    label: "Total Sales",
                    value: dashboard.totalSales,
                    icon: (
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    ),
                    change: "+0%",
                  },
                  {
                    label: "Orders Today",
                    value: dashboard.ordersToday,
                    icon: (
                      <ShoppingBag className="w-6 h-6 text-blue-600" />
                    ),
                    change: "+0%",
                  },
                  {
                    label: "New Users",
                    value: dashboard.newUsers,
                    icon: (
                      <Users className="w-6 h-6 text-purple-600" />
                    ),
                    change: "+0%",
                  },
                  {
                    label: "Pending",
                    value: dashboard.pending,
                    icon: (
                      <Clock className="w-6 h-6 text-orange-600" />
                    ),
                    change: "-0%",
                  },
                ]
            ).map(({ label, value, icon, change }) => (
              <div
                key={label}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-4">
                  {icon}
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      String(change).startsWith("+")
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {change}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {label === "Total Sales" ? peso.format(value) : value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Products */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Current Products
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadProducts}
                  className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                  title="Refresh products"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={safeNav(ADMIN_ROUTES.shop)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Product
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {loadingProducts ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-gray-500"
                      >
                        Loading products…
                      </td>
                    </tr>
                  ) : currentProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-sm text-gray-500"
                      >
                        No products found.
                      </td>
                    </tr>
                  ) : (
                    currentProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {p.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {p.category}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                          {peso.format(p.price)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">
                          {p.stock} {p.stock === 1 ? "unit" : "units"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              p.available
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {p.available ? "Available" : "Out of stock"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* visibility slider toggle */}
                            <button
                              type="button"
                              onClick={() => toggleVisibility(p.id, p.activeFlag)}
                              className="inline-flex items-center gap-3 px-2 py-1 rounded-md focus:outline-none"
                              aria-pressed={p.activeFlag ? "true" : "false"}
                              aria-label={`Toggle visibility for ${p.name}`}
                              disabled={busyId === p.id}
                            >
                              <span className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors ${p.activeFlag ? "bg-emerald-500" : "bg-gray-300"}`}>
                                <span className={`absolute left-0 top-0.5 inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${p.activeFlag ? "translate-x-5" : "translate-x-0"}`} />
                              </span>
                              <span className="text-sm text-gray-700">{p.activeFlag ? "Visible" : "Hidden"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(p.id)}
                              className="p-2 rounded-md text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                              aria-label={`Edit ${p.name}`}
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteProduct(p.id);
                              }}
                              className="p-2 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                              aria-label={`Delete ${p.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* Recent Orders */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Orders
              </h2>
              <Link
                to={ADMIN_ROUTES.orders}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                See all
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="space-y-4">
                {(loadingDashboard
                  ? recentOrders.slice(0, 5)
                  : dashboard.recentOrders || []
                ).map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {o.id}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            o.status === "Success"
                              ? "bg-green-100 text-green-700"
                              : o.status === "Pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {o.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        {o.product} • {o.customer}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{o.time}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {peso.format(o.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!loadingDashboard && (dashboard.recentOrders || []).length === 0) && (
                  <div className="text-sm text-gray-500">No recent orders.</div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* NOTE: QR verification lives in /admin/topup */}
      </main>

      {/* Edit Item Modal (matches adminShop/edit-items style) */}
      {editingItem && editingFields && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={closeEditModal}
            aria-hidden="true"
          />
          <div className="relative max-w-4xl w-full bg-white rounded-lg shadow-lg overflow-hidden z-10">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Edit Item</h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-gray-600 hover:text-gray-900 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <label className="block">
                  <div className="text-sm font-medium text-gray-700">Name</div>
                  <input
                    value={editingFields.name}
                    onChange={(e) => onEditFieldChange("name", e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <div className="text-sm font-medium text-gray-700">Category</div>
                    <select
                      value={editingFields.category || ""}
                      onChange={(e) => onEditFieldChange("category", e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      {/* allow free text */}
                      <option value={editingFields.category} hidden>
                        {editingFields.category}
                      </option>
                    </select>
                  </label>

                  <label className="block">
                    <div className="text-sm font-medium text-gray-700">Stock</div>
                    <input
                      type="number"
                      value={editingFields.stock}
                      onChange={(e) => onEditFieldChange("stock", e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </label>
                </div>

                <label className="block">
                  <div className="text-sm font-medium text-gray-700">Price (PHP)</div>
                  <input
                    type="number"
                    value={editingFields.price}
                    onChange={(e) => onEditFieldChange("price", e.target.value)}
                    className="mt-1 block w-48 border border-gray-300 rounded-md px-3 py-2"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Preview: {peso.format(Number(editingFields.price) || 0)}
                  </div>
                </label>
              </div>

              <div className="space-y-4 flex flex-col items-center">
                <div className="w-full border-2 border-dashed rounded-lg p-4">
                  <div className="w-40 h-40 mx-auto rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
                    {editingImagePreview ? (
                      <img
                        src={editingImagePreview}
                        alt="preview"
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="text-sm text-gray-400">No image</div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <label className="inline-flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded cursor-pointer">
                      <span aria-hidden>⤴️</span>
                      <span className="text-sm">Replace</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onReplaceImage(e.target.files?.[0])}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="bg-red-600 text-white px-3 py-2 rounded text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-4 py-2 bg-white border rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md"
              >
                <span aria-hidden>💾</span>
                <span>{savingEdit ? "Saving…" : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
