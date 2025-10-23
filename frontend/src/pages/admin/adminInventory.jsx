import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";
import { RefreshCw, Save, AlertTriangle } from "lucide-react";

const LOW_STOCK_THRESHOLD = 5;

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
  const [stockEdits, setStockEdits] = useState({}); // { [id]: string }

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get("/menu");
      const rows = Array.isArray(data) ? data : data?.data || [];
      setItems(
        rows.map((r) => ({
          id: r.id ?? r._id,
          name: r.name,
          category: r.category || "Others",
          stock: Number(r.stock ?? 0),
        }))
      );
      setStockEdits({});
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const lowStock = useMemo(() => items.filter((i) => Number(i.stock) <= LOW_STOCK_THRESHOLD), [items]);

  const setEditStock = (id, v) => setStockEdits((s) => ({ ...s, [id]: v }));

  const saveStock = async (id) => {
    const raw = stockEdits[id];
    const val = raw === undefined ? null : Number(String(raw).replace(/[^\d\-]/g, ""));
    if (val === null || Number.isNaN(val)) return alert("Enter a valid number");
    setBusyId(id);
    try {
      await api.put(`/menu/${id}`, { stock: Number(val) });
      await load();
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to update stock");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600">View and edit stock quantities. Low-stock items are highlighted.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {lowStock.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-100 text-sm text-yellow-800 inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {lowStock.length} low-stock item{lowStock.length > 1 ? "s" : ""} (≤ {LOW_STOCK_THRESHOLD})
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">Loading…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">No items found.</td>
                </tr>
              ) : (
                items.map((it) => {
                  const isLow = Number(it.stock) <= LOW_STOCK_THRESHOLD;
                  return (
                    <tr key={it.id} className={`hover:bg-gray-50 ${isLow ? "bg-yellow-50" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{it.name}</div>
                        <div className="text-xs text-gray-500">ID: {it.id}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{it.category || "-"}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        <input
                          value={stockEdits[it.id] !== undefined ? stockEdits[it.id] : String(it.stock)}
                          onChange={(e) => setEditStock(it.id, e.target.value.replace(/[^\d\-]/g, ""))}
                          className="w-20 text-center border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => saveStock(it.id)}
                            disabled={busyId === it.id}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60"
                          >
                            {busyId === it.id ? "Saving…" : <><Save className="w-4 h-4" /> Save</>}
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
      </main>
    </div>
  );
}