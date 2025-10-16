// src/pages/admin/adminShops.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/adminavbar";
import { Edit, Trash2, PlusCircle, Search, Filter, RefreshCw } from "lucide-react";
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

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

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get("/menu");
      setItems(Array.isArray(data) ? data : []);
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

    switch (sort) {
      case "price-asc":  rows.sort((a,b) => a.price - b.price); break;
      case "price-desc": rows.sort((a,b) => b.price - a.price); break;
      case "name-desc":  rows.sort((a,b) => a.name.localeCompare(b.name) * -1); break;
      default:           rows.sort((a,b) => a.name.localeCompare(b.name));
    }
    return rows;
  }, [items, q, cat, status, sort]);

  const markOutOfStock = async (id) => {
    if (!window.confirm("Mark this item as out of stock?")) return;
    setBusyId(id);
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

  const goEdit = (id) => {
    // Send the id to the edit page (your edit page can read search param)
    navigate(`/admin/shop/edit-items?id=${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Products</h1>
            <p className="text-gray-600">Add, edit, filter and manage canteen items.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/shop/add-rice"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Add Rice Meal
            </Link>
            <Link
              to="/admin/shop/add-snacks"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Add Snack
            </Link>
            <Link
              to="/admin/shop/add-drinks"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Add Drink
            </Link>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or category…"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>
                ))}
              </select>
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All status</option>
              <option value="available">Available</option>
              <option value="out">Out of stock</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="name-asc">Name (A–Z)</option>
              <option value="name-desc">Name (Z–A)</option>
              <option value="price-asc">Price (Low→High)</option>
              <option value="price-desc">Price (High→Low)</option>
            </select>
          </div>
        </section>

        {/* Table */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                      Loading…
                    </td>
                  </tr>
                )}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                      No products found.
                    </td>
                  </tr>
                )}

                {!loading && filtered.map((p) => {
                  const available = (p.stock ?? 0) > 0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{p.name}</div>
                        {p.img ? <div className="text-xs text-gray-500 truncate max-w-xs">{p.img}</div> : null}
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
                            onClick={() => goEdit(p.id)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                            title="Edit item"
                          >
                            <Edit className="w-4 h-4" />
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
        </section>
      </main>
    </div>
  );
}
