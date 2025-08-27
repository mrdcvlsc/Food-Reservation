// src/pages/Cart.jsx
import { api } from "../lib/api";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/avbar";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
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
// menu will be fetched from backend (/api/menu)

const MENU = null; // placeholder to keep references

const SLOTS = [
  { id: "recess", label: "Recess • 9:45–10:00 AM" },
  { id: "lunch",  label: "Lunch • 12:00–12:30 PM" },
  { id: "after",  label: "After Class • 4:00–4:15 PM" },
];

export default function Cart() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [cart, setCart] = useState({}); // { [id]: qty }
  const [open, setOpen] = useState(false);
  const [reserve, setReserve] = useState({
    grade: "",
    section: "",
    slot: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // hydrate cart from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cart") || "{}");
      setCart(saved && typeof saved === "object" ? saved : {});
    } catch {
      setCart({});
    }
  }, []);

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

  // support navigation from Shop with { state: { itemId } }
  useEffect(() => {
    const id = state?.itemId;
    if (!id) return;
    setCart((c) => {
      const next = { ...c, [id]: (c[id] || 0) + 1 };
      localStorage.setItem("cart", JSON.stringify(next));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.itemId]);

  // persist cart & update navbar badge via storage event
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const list = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const p = products.find((x) => String(x.id) === String(id));
          return p ? { ...p, qty } : null;
            })
        .filter(Boolean),
    [cart]
  );

  const total = useMemo(
    () => list.reduce((sum, it) => sum + it.qty * it.price, 0),
    [list]
  );

  const inc = (id) => {
    const prod = products.find((x) => String(x.id) === String(id));
    if (!prod) return;
    const key = String(id);
    setCart((c) => {
      const nextQty = (c[key] || 0) + 1;
      if (prod.stock > 0 && nextQty > prod.stock) return c; // clamp to stock
      const next = { ...c, [key]: nextQty };
      localStorage.setItem("cart", JSON.stringify(next));
      return next;
    });
  };

  const dec = (id) =>
    setCart((c) => {
      const key = String(id);
      const nextQty = Math.max((c[key] || 0) - 1, 0);
      const next = { ...c, [key]: nextQty };
      if (nextQty === 0) delete next[key];
      localStorage.setItem("cart", JSON.stringify(next));
      return next;
    });

  const removeLine = (id) =>
    setCart((c) => {
      const key = String(id);
      const next = { ...c };
      delete next[key];
      localStorage.setItem("cart", JSON.stringify(next));
      return next;
    });

  const clearCart = () => {
    setCart({});
    localStorage.setItem("cart", "{}");
  };

  const openReserve = () => setOpen(true);
  const closeReserve = () => setOpen(false);

  const submitReservation = async () => {
    if (!list.length) return alert("Your cart is empty.");
    if (!reserve.grade) return alert("Select grade level.");
    if (!reserve.section.trim()) return alert("Enter section.");
    if (!reserve.slot) return alert("Choose a pickup window.");

    setSubmitting(true);
    try {
      const payload = {
        items: list.map(({ id, qty }) => ({ id: String(id), qty })),
        grade: reserve.grade,
        section: reserve.section,
        slot: reserve.slot,
        note: reserve.note,
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Cart</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/shop")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Continue Shopping
            </button>
            {list.length > 0 && (
              <button
                onClick={clearCart}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
              >
                <Trash2 className="w-4 h-4" />
                Clear Cart
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lines */}
          <section className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left  text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Subtotal
                    </th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded bg-gray-100 overflow-hidden">
                            <img
                              src={it.img}
                              alt={it.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {it.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {it.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900 font-medium">
                        {peso.format(it.price)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <div className="inline-flex items-center border rounded-lg">
                            <button
                              onClick={() => dec(it.id)}
                              className="px-2.5 py-1.5 hover:bg-gray-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-3 text-sm">{it.qty}</span>
                            <button
                              onClick={() => inc(it.id)}
                              className="px-2.5 py-1.5 hover:bg-gray-50"
                              disabled={it.stock === 0}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {peso.format(it.qty * it.price)}
                      </td>
                      <td className="px-3 py-4 text-right">
                        <button
                          onClick={() => removeLine(it.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-sm text-gray-500"
                      >
                        Your cart is empty.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Summary */}
          <aside className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-fit">
            <h2 className="font-semibold text-gray-900">Summary</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Items</span>
                <span className="font-medium">{list.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total</span>
                <span className="text-lg font-semibold">{peso.format(total)}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                onClick={() => navigate("/shop")}
                className="w-full inline-flex items-center justify-center gap-2 border px-4 py-3 rounded-lg text-sm hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Continue Shopping
              </button>
              <button
                onClick={openReserve}
                disabled={!list.length}
                className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-lg hover:bg-black text-sm disabled:opacity-60"
              >
                <Clock className="w-4 h-4" />
                Reserve for Pickup
              </button>
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
