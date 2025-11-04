// src/pages/Cart.jsx
import { api } from "../../lib/api";
import React, { useEffect, useMemo, useState } from "react";
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

  const [cart, setCart] = useState({}); // { [id]: qty }
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

  // On mount: hydrate from localStorage immediately, then try to sync with server
  useEffect(() => {
    let mounted = true;

    // read local storage immediately so UI is never empty
    const localSaved = (() => {
      try {
        const v = JSON.parse(localStorage.getItem("cart") || "{}");
        return v && typeof v === "object" ? v : {};
      } catch {
        return {};
      }
    })();
    if (mounted) {
      setCart(localSaved);
    }

    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          // not logged in — nothing to sync
          console.debug("[CART] no token; using local cart", localSaved);
          return;
        }

        // Try fetch server cart
        console.debug("[CART] fetching server cart");
        const res = await api.get("/cart").catch((err) => {
          console.warn("[CART] GET /cart failed", err && err.message);
          return null;
        });

        if (!mounted) return;

        // Normalize possible server shapes:
        // - array ([])
        // - { items: [...] }
        // - { cart: { itemId: qty, ... } }
        // - { data: { items: [...] } } (axios-like)
        let serverItems = null;
        let serverCartMap = null;
        if (!res) {
          serverItems = null;
        } else if (Array.isArray(res)) {
          serverItems = res;
        } else if (Array.isArray(res.items)) {
          serverItems = res.items;
        } else if (res.data && Array.isArray(res.data.items)) {
          serverItems = res.data.items;
        } else if (res.cart && typeof res.cart === "object") {
          serverCartMap = res.cart;
        } else if (res.data && res.data.cart && typeof res.data.cart === "object") {
          serverCartMap = res.data.cart;
        }

        // If server returned items -> use server authoritative view (but merge missing local keys)
        if (serverItems && serverItems.length > 0) {
          const next = {};
          for (const it of serverItems) if (it && (it.itemId || it.id)) next[String(it.itemId || it.id)] = Number(it.qty || it.quantity || 0);
          console.debug("[CART] server has items, using server cart", next);
          setCart(next);
          localStorage.setItem("cart", JSON.stringify(next));
          return;
        }
        
        // support server-side cart mapping shapes
        if (!serverItems && serverCartMap && Object.keys(serverCartMap).length > 0) {
          const next = {};
          for (const [k, v] of Object.entries(serverCartMap)) next[String(k)] = Number(v || 0);
          console.debug("[CART] server returned cart map, using it", next);
          setCart(next);
          localStorage.setItem("cart", JSON.stringify(next));
          return;
        }

        // If server empty but we have local items -> push local items to server
        if ((!serverItems || serverItems.length === 0) && localSaved && Object.keys(localSaved).length > 0) {
          console.debug("[CART] server empty, syncing local -> server", localSaved);
          // push each local entry
          for (const [id, qty] of Object.entries(localSaved)) {
            try {
              await api.post("/cart/add", { itemId: id, qty }).catch(() => null);
            } catch (e) {
              /* ignore per-item failure */
            }
          }
          // refresh server cart after sync
          const refreshed = await api.get("/cart").catch(() => null);
          const refreshedItems = refreshed && (Array.isArray(refreshed.items) ? refreshed.items : Array.isArray(refreshed) ? refreshed : (refreshed.data && Array.isArray(refreshed.data.items) ? refreshed.data.items : null));
          if (refreshedItems && refreshedItems.length > 0) {
            const next = {};
            for (const it of refreshedItems) if (it && it.itemId) next[String(it.itemId)] = Number(it.qty || 0);
            setCart(next);
            localStorage.setItem("cart", JSON.stringify(next));
            console.debug("[CART] sync complete, server now has:", next);
            return;
          }
          // server still empty -> keep local view
          console.debug("[CART] sync finished but server still empty; keeping local cart");
          setCart(localSaved);
          return;
        }

        // No server data; keep localSaved (already applied)
        console.debug("[CART] no server data; using local cart");
      } catch (err) {
        console.error("[CART] sync error", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // support navigation from Shop with { state: { itemId } }
  useEffect(() => {
    const id = state?.itemId;
    if (!id) return;
    // reuse add logic below — simulate single click add
    handleAdd(String(id), 1);
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
    const nextLocal = (c) => {
      const nextQty = (c[key] || 0) + qty;
      if (prod.stock > 0 && nextQty > prod.stock) return c; // clamp
      return { ...c, [key]: nextQty };
    };

    // optimistic update locally first
    setCart((c) => {
      const next = nextLocal(c);
      localStorage.setItem("cart", JSON.stringify(next));
      return next;
    });

    if (!isAuth()) return;

    try {
      await api.post('/cart/add', { itemId: key, qty, name: prod.name, price: prod.price });
      // refresh server cart to be safe
      const data = await api.get('/cart');
      if (data && Array.isArray(data.items)) {
        const next = {};
        for (const it of data.items) {
          if (it && it.itemId) next[String(it.itemId)] = Number(it.qty || 0);
        }
        setCart(next);
        localStorage.setItem("cart", JSON.stringify(next));
      }
    } catch (e) {
      console.error("Cart add failed", e);
      // keep optimistic local state; optionally show user message
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

    // Validate stock
    if (item.stock >= 0 && qty > item.stock) {
      alert(`Sorry, only ${item.stock} items available in stock.`);
      return;
    }

    // Optimistic update
    try {
      const key = String(itemId);
      const nextCart = { ...cart };
      
      if (qty <= 0) {
        delete nextCart[key];
      } else {
        nextCart[key] = qty;
      }

      setCart(nextCart);
      localStorage.setItem("cart", JSON.stringify(nextCart));

      // Sync with server
      if (isAuth()) {
        await api.post('/cart/update', { itemId: key, qty });
        
        // Refresh cart from server
        const data = await api.get('/cart');
        if (data?.items) {
          const serverCart = {};
          data.items.forEach(item => {
            serverCart[String(item.itemId)] = Number(item.qty);
          });
          setCart(serverCart);
          localStorage.setItem("cart", JSON.stringify(serverCart));
        }
      }
    } catch (err) {
      console.error("Failed to update quantity:", err);
      alert("Failed to update quantity. Please try again.");
      // Revert optimistic update
      setCart(cart);
    }
  };

  const dec = (id) => {
    const current = cart[String(id)] || 0;
    const newQty = Math.max(current - 1, 0);
    handleSetQty(id, newQty);
  };

  const removeLine = (id) => {
    const key = String(id);
    // local update
    setCart((c) => {
      const next = { ...c };
      delete next[key];
      localStorage.setItem("cart", JSON.stringify(next));
      return next;
    });
    if (!isAuth()) return;
    api.post('/cart/remove', { itemId: key }).catch((e) => console.error("Cart remove failed", e));
  };

  const clearCart = () => {
    setCart({});
    localStorage.setItem("cart", "{}");
    if (!isAuth()) return;
    api.post('/cart/clear').catch((e) => console.error("Cart clear failed", e));
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
