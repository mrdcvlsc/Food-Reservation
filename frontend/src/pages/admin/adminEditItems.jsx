// src/pages/admin/adminEditItems.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { refreshSessionForProtected } from '../../lib/auth';
import Navbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import {
  Edit,
  Trash2,
  RefreshCw,
  Search,
  X,
  Save,
  Upload,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const CATEGORIES = ["Meals", "Snacks", "Beverages"];

export default function AdminEditItems() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'admin' });
    })();
  }, [navigate]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const [editing, setEditing] = useState(null); // {id, name, category, price, stock, img?}
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedOk, setSavedOk] = useState(false);

  const fileRef = useRef(null);
  const [imgPreview, setImgPreview] = useState(null); // local blob URL when picking a file
  const [imgFile, setImgFile] = useState(null);

  const [deletingId, setDeletingId] = useState(null);

  // Per-item cache-bust seeds. When we save an item (upload/remove),
  // we bump its seed so <img src="...?...&v=seed"> forces a real fetch.
  const [imgBust, setImgBust] = useState({}); // { [id]: number }

  /* ---------------- Utils ---------------- */
  const bust = (src, id) => {
    if (!src) return null;
    const v = imgBust[id] || 0;
    return `${src}${src.includes("?") ? "&" : "?"}v=${v}`;
  };

  const findItemById = (id, arr) => (arr || items).find((x) => String(x.id) === String(id));

  /* ---------------- Load list ---------------- */
  const load = async () => {
    setLoading(true);
    setListError("");
    try {
      const { data } = await api.get("/menu");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setListError(e?.message || "Failed to load menu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ---------------- Filters ---------------- */
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      const okCat = cat === "All" || it.category === cat;
      const okQ =
        !needle ||
        String(it.name || "").toLowerCase().includes(needle) ||
        String(it.category || "").toLowerCase().includes(needle);
      return okCat && okQ;
    });
  }, [items, q, cat]);

  /* ---------------- Edit modal helpers ---------------- */
  const openEdit = (it) => {
    setEditing({
      id: it.id,
      name: it.name || "",
      category: it.category || "Meals",
      price: it.price ?? 0,
      stock: it.stock ?? 0,
      img: it.img || "",
    });
    setSaveError("");
    setImgPreview(typeof it.img === "string" && it.img.startsWith("data:") ? it.img : null);
    setImgFile(null);
  };

  const closeEdit = () => {
    setEditing(null);
    setSaveError("");
    setImgPreview(null);
    setImgFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const setEditField = (k, v) =>
    setEditing((e) => (e ? { ...e, [k]: v } : e));

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSaveError("Max image size is 2MB.");
      return;
    }
    setSaveError("");
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
    // Ensure we don't accidentally keep "remove image" flag
    setEditField("img", editing?.img ?? "");
  };

  const removePickedImage = () => {
    setImgFile(null);
    setImgPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    // Mark removal so backend clears it on save
    setEditField("img", "");
  };

  /* ---------------- Save ---------------- */
  const saveEdit = async () => {
    if (!editing) return;
    setSaveError("");

    // basic front-end validation
    if (!String(editing.name || "").trim()) {
      setSaveError("Name is required.");
      return;
    }
    if (!CATEGORIES.includes(editing.category)) {
      setSaveError("Category must be Meals, Snacks, or Beverages.");
      return;
    }
    if (isNaN(Number(editing.price)) || Number(editing.price) <= 0) {
      setSaveError("Price must be greater than 0.");
      return;
    }
    if (isNaN(Number(editing.stock)) || Number(editing.stock) < 0) {
      setSaveError("Stock must be 0 or more.");
      return;
    }

    // include img ONLY when user explicitly removed it
    const payload = {
      name: String(editing.name).trim(),
      category: editing.category,
      price: Number(editing.price),
      stock: Number(editing.stock),
      ...(editing.img === "" ? { img: "" } : {}),
    };

    try {
      setSaving(true);

      let updated;

      if (imgFile) {
        const fd = new FormData();
        fd.append("image", imgFile, imgFile.name);
        fd.append("name", payload.name);
        fd.append("category", payload.category);
        fd.append("price", String(payload.price));
        fd.append("stock", String(payload.stock));
        // fd.append("replace", "1"); // uncomment if your backend needs an explicit replace flag

        updated = await api.putForm(`/admin/menu/${editing.id}`, fd);
      } else {
        updated = await api.put(`/admin/menu/${editing.id}`, payload);
      }

      // Merge once
      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));

      // Bump this item's bust seed so every <img> refetches
      setImgBust((m) => ({ ...m, [updated.id]: Date.now() }));

      // Refetch full list from server to ensure we have the latest stored path
      await load();

      // Re-open the just-saved item from the freshly-loaded list
      const fresh = findItemById(updated.id);
      if (fresh) {
        setEditing({
          id: fresh.id,
          name: fresh.name || "",
          category: fresh.category || "Meals",
          price: fresh.price ?? 0,
          stock: fresh.stock ?? 0,
          img: fresh.img || "",
        });
        setImgPreview(null); // modal should show stored path, not local blob
      }

      // Clear file input after successful save
      setImgFile(null);
      if (fileRef.current) fileRef.current.value = "";

      // success flash
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    } catch (e) {
      setSaveError(e?.message || "Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  // Update the deleteItem function
  const deleteItem = async (id) => {
    if (!window.confirm("Delete this product? It will be removed from the menu but preserved in reports.")) return;
    
    setDeletingId(id);
    try {
      await api.delete(`/menu/${id}`);
      // Remove from local state
      setItems((prev) => prev.filter((it) => it.id !== id));
      try { window.dispatchEvent(new Event("menu:updated")); } catch {}
    } catch (e) {
      alert(e?.message || "Failed to delete item.");
    } finally {
      setDeletingId(null);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Items</h1>
            <p className="text-gray-600">Update prices, stocks, and details. Delete items you no longer sell.</p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Toolbar: search & filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or category…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>All</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-500">
              {filtered.length} of {items.length} items
            </div>
          </div>
        </div>

        {/* Errors */}
        {listError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {listError}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No items found.
                  </td>
                </tr>
              ) : (
                filtered.map((it) => {
                  const imgSrc = bust(it.img, it.id);
                  return (
                    <tr key={it.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                            {imgSrc ? (
                              <img
                                key={imgSrc} // force remount when src changes
                                src={imgSrc}
                                alt={it.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{it.name}</div>
                            <div className="text-xs text-gray-500">ID: {it.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{it.category}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {peso.format(Number(it.price || 0))}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">{Number(it.stock || 0)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            Number(it.stock || 0) > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {Number(it.stock || 0) > 0 ? "In Stock" : "Out of Stock"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(it)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" /> Edit
                          </button>
                          <button
                            disabled={deletingId === it.id}
                            onClick={() => {
                              if (window.confirm(`Delete "${it.name}"? This cannot be undone.`)) {
                                deleteItem(it.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            {deletingId === it.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={closeEdit}
            />
            <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Item</h3>
                <button
                  onClick={closeEdit}
                  className="p-2 rounded-lg hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {saveError && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {/* Left form */}
                <div className="sm:col-span-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      value={editing.name}
                      onChange={(e) => setEditField("name", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={editing.category}
                        onChange={(e) => setEditField("category", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                      <input
                        value={editing.stock}
                        onChange={(e) => setEditField("stock", e.target.value.replace(/[^\d]/g, ""))}
                        inputMode="numeric"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (PHP)</label>
                    <input
                      value={editing.price}
                      onChange={(e) => setEditField("price", e.target.value.replace(/[^\d.]/g, ""))}
                      inputMode="decimal"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Preview: {editing.price ? peso.format(Number(editing.price)) : "—"}
                    </p>
                  </div>
                </div>

                {/* Image picker */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                  <div className="border border-dashed border-gray-300 rounded-xl p-4 min-h-[190px] flex flex-col items-center justify-center text-center">
                    {imgPreview || editing.img ? (
                      <>
                        <img
                          key={imgPreview || bust(editing.img, editing.id) || "no-preview"}
                          src={imgPreview || bust(editing.img, editing.id)}
                          alt="preview"
                          className="w-40 h-40 object-contain rounded"
                          onError={(e)=>{e.currentTarget.style.display="none"}}
                        />
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-black text-sm"
                          >
                            <Upload className="w-4 h-4" />
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={removePickedImage}
                            className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-9 h-9 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">No image selected.</p>
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="mt-3 inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
                        >
                          <Upload className="w-4 h-4" />
                          Upload (≤ 2MB)
                        </button>
                      </>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onPickImage}
                    />
                  </div>
                </div>
              </div>

              {/* Modal actions */}
              <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  onClick={closeEdit}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>

              {savedOk && (
                <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                  Saved!
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
