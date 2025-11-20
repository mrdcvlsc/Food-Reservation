import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/adminavbar";
import AdminBottomNav from '../../components/mobile/AdminBottomNav';
import { refreshSessionForProtected } from "../../lib/auth";
import { RefreshCw, Save, AlertTriangle, Search, X, Plus, Minus, Package, TrendingDown, CheckCircle, XCircle } from "lucide-react";

const LOW_STOCK_THRESHOLD = 5;
const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "stock-asc", label: "Stock (Low→High)" },
  { value: "stock-desc", label: "Stock (High→Low)" },
  { value: "category-asc", label: "Category (A–Z)" },
  { value: "category-desc", label: "Category (Z–A)" },
];

export default function AdminInventory() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: "admin" });
    })();
  }, [navigate]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [stockEdits, setStockEdits] = useState({});
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("name-asc");
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get("/menu");
      const rows = Array.isArray(data) ? data : [];
      const mapped = rows.map((r) => ({
        id: r.id ?? r._id,
        name: r.name,
        category: r.category || "Others",
        stock: Number(r.stock ?? 0),
        price: Number(r.price ?? 0),
      }));
      setItems(mapped);
      const edits = {};
      for (const m of mapped) edits[m.id] = String(m.stock);
      setStockEdits(edits);
    } catch (e) {
      console.error(e);
      setItems([]);
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
      case "stock-asc":
        rows.sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
        break;
      case "stock-desc":
        rows.sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0));
        break;
      case "price-asc":
        rows.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "price-desc":
        rows.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "category-asc":
        rows.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
        break;
      case "category-desc":
        rows.sort((a, b) => (b.category || "").localeCompare(a.category || ""));
        break;
      default:
        rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return rows;
  }, [items, q, cat, status, sort]);

  const lowStock = useMemo(() => items.filter((i) => Number(i.stock) <= LOW_STOCK_THRESHOLD), [items]);
  const outOfStock = useMemo(() => items.filter((i) => Number(i.stock) === 0), [items]);
  const totalStock = useMemo(() => items.reduce((sum, i) => sum + Number(i.stock), 0), [items]);

  const setEditStock = (id, v) => setStockEdits((s) => ({ ...s, [id]: v }));

  const saveStock = async (productId, qty) => {
    const v = Number(qty);
    if (!Number.isFinite(v)) return alert("Invalid stock value");
    setBusyId(productId);

    try {
      await api.put(`/menu/${productId}`, { stock: v });
      await load();
      return;
    } catch (err) {
      console.error("SaveStock primary (PUT /menu/:id) failed:", err);
      if (err && err.status === 404) {
        try {
          await api.post(`/inventory/${productId}/stock`, { qty: v });
          await load();
          return;
        } catch (err2) {
          console.error("SaveStock fallback (POST /inventory/:id/stock) failed:", err2);
          const msg2 = (err2 && err2.message) || String(err2);
          const details2 = err2 && err2.data ? `\n\nDetails: ${JSON.stringify(err2.data)}` : "";
          alert("Failed to save stock (fallback): " + msg2 + details2);
          return;
        }
      }

      const msg = (err && err.message) || String(err);
      const details = err && err.data ? `\n\nDetails: ${JSON.stringify(err.data)}` : "";
      alert("Failed to save stock: " + msg + details);
    } finally {
      setBusyId(null);
    }
  };

  const hasUnsavedChanges = useMemo(() => {
    return items.some(it => stockEdits[it.id] !== String(it.stock));
  }, [items, stockEdits]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg border border-gray-100 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <span className="text-xs sm:text-sm text-gray-600">Total Items</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{items.length}</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-100 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <span className="text-xs sm:text-sm text-gray-600">Total Stock</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalStock}</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              <span className="text-xs sm:text-sm text-gray-600">Low Stock</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{lowStock.length}</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              <span className="text-xs sm:text-sm text-gray-600">Out of Stock</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{outOfStock.length}</div>
          </div>
        </div>

        {/* Header Section */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventory Management</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">View and edit stock quantities</p>
            </div>
            <button 
              onClick={load} 
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 border border-gray-300 px-3 sm:px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60 w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Low Stock Alert */}
          {lowStock.length > 0 && (
            <div className="p-3 sm:p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-yellow-900">Low Stock Alert</div>
                  <div className="text-xs sm:text-sm text-yellow-800 mt-1">
                    {lowStock.length} item{lowStock.length > 1 ? 's' : ''} running low (≤ {LOW_STOCK_THRESHOLD} units)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unsaved Changes Alert */}
          {hasUnsavedChanges && (
            <div className="p-3 sm:p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-blue-900">Unsaved Changes</div>
                  <div className="text-xs sm:text-sm text-blue-800 mt-1">
                    You have unsaved stock changes. Remember to save!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Search */}
          <div className="relative md:hidden">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search items..."
              className="w-full border border-gray-300 rounded-lg pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>

          {/* Mobile Filters (Collapsible) */}
          {showFilters && (
            <div className="md:hidden space-y-3 p-4 bg-white border border-gray-200 rounded-lg">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Category</label>
                <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                  {categories.map(c => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                  <option value="all">All status</option>
                  <option value="available">Available</option>
                  <option value="out">Out of stock</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Sort</label>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                  {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Desktop Filters */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or category…"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {categories.map(c => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">All status</option>
              <option value="available">Available</option>
              <option value="out">Out of stock</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">Loading…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">No items found.</td>
                </tr>
              ) : (
                filtered.map((it) => {
                  const isLow = Number(it.stock) <= LOW_STOCK_THRESHOLD;
                  const hasChanged = stockEdits[it.id] !== String(it.stock);
                  return (
                    <tr key={it.id} className={`hover:bg-gray-50 transition ${isLow ? "bg-yellow-50" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{it.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{it.category || "-"}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        <div className="inline-flex items-center border rounded overflow-hidden">
                          <button
                            onClick={() => {
                              const cur = Number(stockEdits[it.id] ?? it.stock) || 0;
                              setEditStock(it.id, String(Math.max(0, cur - 1)));
                            }}
                            className="px-3 py-2 hover:bg-gray-100 transition"
                            type="button"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            value={stockEdits[it.id] !== undefined ? stockEdits[it.id] : String(it.stock)}
                            onChange={(e) => setEditStock(it.id, e.target.value.replace(/[^\d]/g, ""))}
                            className={`w-20 text-center border-l border-r border-gray-300 px-2 py-2 text-sm font-medium ${hasChanged ? 'bg-blue-50 text-blue-900' : ''}`}
                          />
                          <button
                            onClick={() => {
                              const cur = Number(stockEdits[it.id] ?? it.stock) || 0;
                              setEditStock(it.id, String(cur + 1));
                            }}
                            className="px-3 py-2 hover:bg-gray-100 transition"
                            type="button"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs font-semibold inline-block py-1 px-3 rounded-full ${it.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {it.stock > 0 ? "In Stock" : "Out of Stock"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => saveStock(it.id, stockEdits[it.id] ?? it.stock)}
                          disabled={busyId === it.id || !hasChanged}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60 disabled:cursor-not-allowed transition"
                        >
                          {busyId === it.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-lg border border-gray-100 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <div className="h-3 w-20 bg-gray-200 rounded" />
                  </div>
                  <div className="h-6 w-16 bg-gray-200 rounded-full" />
                </div>
                <div className="h-10 w-full bg-gray-200 rounded" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-100 p-8 text-center text-sm text-gray-500">
              No items found.
            </div>
          ) : (
            filtered.map((it) => {
              const isLow = Number(it.stock) <= LOW_STOCK_THRESHOLD;
              const hasChanged = stockEdits[it.id] !== String(it.stock);
              return (
                <div 
                  key={it.id} 
                  className={`bg-white rounded-lg border p-4 shadow-sm ${isLow ? "border-yellow-300 bg-yellow-50" : "border-gray-100"}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="text-sm font-semibold text-gray-900 break-words">{it.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{it.category || "-"}</div>
                      {isLow && (
                        <div className="inline-flex items-center gap-1 mt-2 text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          Low Stock
                        </div>
                      )}
                    </div>
                    <span className={`flex-shrink-0 text-xs font-semibold py-1 px-2 rounded-full ${it.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {it.stock > 0 ? "In Stock" : "Out"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-600 font-medium">Stock Quantity</span>
                      <div className="inline-flex items-center border rounded-lg overflow-hidden">
                        <button
                          onClick={() => {
                            const cur = Number(stockEdits[it.id] ?? it.stock) || 0;
                            setEditStock(it.id, String(Math.max(0, cur - 1)));
                          }}
                          className="px-3 py-2 hover:bg-gray-100 active:bg-gray-200 transition"
                          type="button"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          value={stockEdits[it.id] !== undefined ? stockEdits[it.id] : String(it.stock)}
                          onChange={(e) => setEditStock(it.id, e.target.value.replace(/[^\d]/g, ""))}
                          className={`w-16 text-center border-l border-r border-gray-300 px-2 py-2 text-sm font-semibold ${hasChanged ? 'bg-blue-50 text-blue-900' : ''}`}
                        />
                        <button
                          onClick={() => {
                            const cur = Number(stockEdits[it.id] ?? it.stock) || 0;
                            setEditStock(it.id, String(cur + 1));
                          }}
                          className="px-3 py-2 hover:bg-gray-100 active:bg-gray-200 transition"
                          type="button"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => saveStock(it.id, stockEdits[it.id] ?? it.stock)}
                      disabled={busyId === it.id || !hasChanged}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition"
                    >
                      {busyId === it.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {hasChanged ? "Save Changes" : "No Changes"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <AdminBottomNav />
    </div>
  );
}