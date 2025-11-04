// src/pages/Cart.jsx
import { api } from "../../lib/api";
import React, { useEffect, useMemo, useState } from "react";
import { useCart } from "../../contexts/CartContext";
import { useLocation, useNavigate } from "react-router-dom";
import { refreshSessionForProtected } from "../../lib/auth";
import Navbar from "../../components/avbar";
import {
  Plus,
  Minus,
  ArrowLeft,
  Clock,
  X,
  CheckCircle2,
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

// menu will be fetched from backend (/api/menu)

const SLOTS = [
  { id: "recess", label: "Recess • 9:45–10:00 AM" },
  { id: "lunch",  label: "Lunch • 12:00–12:30 PM" },
  { id: "after",  label: "After Class • 4:00–4:15 PM" },
];

export default function Cart() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'student' });
    })();
  }, [navigate]);
  const { state } = useLocation();

  const { cart, add, setQty, remove, clear, meta } = useCart(); // { [id]: qty }
  const [open, setOpen] = useState(false);
  const [reserve, setReserve] = useState({
    grade: "",
    section: "",
    slot: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const [products, setProducts] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);

  useEffect(() => {
    let m = true;
    setMenuLoading(true);
    api.get('/menu')
      .then(d => { if (!m) return; setProducts(d || []); })
      .catch(() => { if (!m) return; setProducts([]); })
      .finally(() => { if (!m) return; setMenuLoading(false); });
    return () => (m = false);
  }, []);

  // Cart persistence and server sync handled by CartContext

  // CartContext handles multi-tab sync

  // support navigation from Shop with { state: { itemId } }
  useEffect(() => {
    const id = state?.itemId;
    if (!id) return;
    // reuse CartContext add to simulate single click add
    add(String(id), 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.itemId]);

  // CartContext persists cart

  const list = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const p = products.find((x) => String(x.id) === String(id));
          return p ? { ...p, qty } : null;
        })
        .filter(Boolean),
    [cart, products]
  );

  const total = useMemo(
    () => list.reduce((sum, it) => sum + it.qty * it.price, 0),
    [list]
  );

  // helper: is user logged in (quick)
  const isAuth = () => !!localStorage.getItem("token");

  // Centralized add handler (calls backend when authenticated)
  async function handleAdd(itemId, qty = 1) {
    const key = String(itemId);
    const prod = products.find((x) => String(x.id) === String(itemId));
    if (!prod) return;
    // client-side stock check for UX only
    const currentQty = cart[String(key)] || 0;
    if (prod.stock > 0 && currentQty + qty > prod.stock) {
      alert(`Sorry, only ${prod.stock} items available in stock.`);
      return;
    }
    // delegate to context
    try {
      await add(key, qty);
    } catch (e) {
      console.error("Add failed", e);
    }
  }

  const inc = (id) => {
    handleAdd(id, 1);
  };

  // Add these helper functions at the top of the component
  const validateCartItem = (item, qty) => {
    if (!item) return false;
    if (item.stock >= 0 && qty > item.stock) return false;
    return true;
  };

  // Update handleSetQty function
  const handleSetQty = async (itemId, qty) => {
    const item = products.find(x => String(x.id) === String(itemId));
    if (!item) return;

    if (item.stock >= 0 && qty > item.stock) {
      alert(`Sorry, only ${item.stock} items available in stock.`);
      return;
    }

    try {
      await setQty(String(itemId), qty);
    } catch (err) {
      console.error("Failed to set qty:", err);
      alert("Failed to update quantity. Please try again.");
    }
  };

  const dec = (id) => {
    const current = cart[String(id)] || 0;
    const newQty = Math.max(current - 1, 0);
    handleSetQty(id, newQty);
  };

  const removeLine = (id) => {
    remove(id);
  };

  const clearCart = () => {
    clear();
  };

  // Compatibility aliases used by the JSX (sync* names expected by UI)
  const syncAdd = (itemId, qty = 1) => handleAdd(itemId, qty);
  const syncSet = (itemId, qty) => handleSetQty(itemId, qty);
  const syncRemove = (itemId) => removeLine(itemId);
  const syncClear = () => clearCart();

  const openReserve = () => setOpen(true);
  const closeReserve = () => setOpen(false);

  const submitReservation = async () => {
    if (!list.length) return alert("Your cart is empty.");
    if (!reserve.grade) return alert("Select grade level.");
    if (!reserve.section.trim()) return alert("Enter section.");
    if (!reserve.slot) return alert("Choose a pickup window.");

    // require login so the reservation is associated with a user
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in first.");
      return navigate("/login");
    }

    setSubmitting(true);
    try {
      const user = (() => {
        try {
          return JSON.parse(localStorage.getItem("user") || "{}") || {};
        } catch {
          return {};
        }
      })();

      const payload = {
        items: list.map(({ id, qty }) => ({ id: String(id), qty })),
        grade: reserve.grade,
        section: reserve.section,
        slot: reserve.slot,
        note: reserve.note,
        // include student display name so backend can resolve user if needed
        student: user.name || "",
      };

      await api.post('/reservations', payload);
      alert("Reservation submitted! Track status in History.");
      clearCart();
      setReserve({ grade: "", section: "", slot: "", note: "" });
      closeReserve();
      navigate("/transactions");
    } catch (e) {
      console.error(e);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (menuLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto p-6">Loading cart…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Cart</h1>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lines */}
          <section className="lg:col-span-2 bg-white rounded-lg p-4 border">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-600">
                  <th className="py-2">ITEM</th>
                  <th className="py-2">PRICE</th>
                  <th className="py-2">QTY</th>
                  <th className="py-2">SUBTOTAL</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500">
                      Your cart is empty.
                    </td>
                  </tr>
                ) : (
                  list.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="py-3">
                        <div>
                          <div>{it.name}</div>
                          <div className="text-xs text-gray-500">
                            {it.stock >= 0 && (
                              <span className={it.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                                {it.stock > 0 ? `${it.stock} in stock` : 'Out of stock'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3">{peso.format(Number(it.price) || 0)}</td>
                      <td className="py-3">
                        <div className="inline-flex items-center border rounded">
                          <button
                            onClick={() => dec(it.id)}
                            className="px-2 py-1 hover:bg-gray-50"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-3">{cart[it.id] || 0}</span>
                          <button
                            onClick={() => inc(it.id)}
                            className="px-2 py-1 hover:bg-gray-50"
                            disabled={it.stock >= 0 && cart[it.id] >= it.stock}
                            title={it.stock >= 0 && cart[it.id] >= it.stock ? 'Maximum stock reached' : undefined}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3">
                        {peso.format((Number(it.price) || 0) * (it.qty || 0))}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => removeLine(it.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          {/* Summary */}
          <aside className="bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">Items</div>
              <div className="font-medium">{list.reduce((a, b) => a + b.qty, 0)}</div>
            </div>
            <div className="flex items-center justify-between text-lg font-semibold mb-4">
              <div>Total</div>
              <div>{peso.format(total)}</div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => navigate("/shop")}
                className="w-full border rounded px-4 py-2 text-sm"
              >
                Continue Shopping
              </button>
              <button
                onClick={openReserve}
                disabled={!list.length}
                className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm"
              >
                Reserve for Pickup
              </button>
              {list.length > 0 && (
                <button
                  onClick={syncClear}
                  className="w-full text-sm text-gray-600 hover:underline"
                >
                  Clear cart
                </button>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Reservation modal (same UX as Shop.jsx) */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={closeReserve} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-gray-100">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">Confirm Reservation</h3>
                </div>
                <button onClick={closeReserve} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Student & slot info */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grade Level
                      </label>
                      <select
                        value={reserve.grade}
                        onChange={(e) =>
                          setReserve((r) => ({ ...r, grade: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select grade</option>
                        <option>G7</option>
                        <option>G8</option>
                        <option>G9</option>
                        <option>G10</option>
                        <option>G11</option>
                        <option>G12</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Section
                      </label>
                      <input
                        value={reserve.section}
                        onChange={(e) =>
                          setReserve((r) => ({ ...r, section: e.target.value }))
                        }
                        placeholder="e.g., A / Rizal"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Window
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {SLOTS.map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-3 p-2 rounded-lg border hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="pickup-slot"
                            checked={reserve.slot === s.id}
                            onChange={() =>
                              setReserve((r) => ({ ...r, slot: s.id }))
                            }
                          />
                          <span className="text-sm">{s.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={reserve.note}
                      onChange={(e) =>
                        setReserve((r) => ({ ...r, note: e.target.value }))
                      }
                      placeholder="e.g., Less sauce"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Order Summary</h4>
                  <div className="border rounded-lg divide-y">
                    {list.map((it) => (
                      <div
                        key={it.id}
                        className="p-3 flex items-center justify-between text-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {it.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {peso.format(it.price)}
                          </div>
                        </div>
                        <div className="font-medium">
                          {it.qty} × {peso.format(it.price)}
                        </div>
                      </div>
                    ))}
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total</span>
                      <span className="text-lg font-semibold">
                        {peso.format(total)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={submitReservation}
                    disabled={submitting || !list.length}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-60"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-pulse" />
                        Submitting…
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Submit Reservation
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-4 border-t text-right">
                <button
                  onClick={closeReserve}
                  className="text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
