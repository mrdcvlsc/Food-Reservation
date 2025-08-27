// src/pages/Shop.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/avbar";
import { api } from "../lib/api";
import { Plus, Minus, ShoppingCart, Search, Clock, X, CheckCircle2 } from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const SLOTS = [
  { id: "recess", label: "Recess • 9:45–10:00 AM" },
  { id: "lunch",  label: "Lunch • 12:00–12:30 PM" },
  { id: "after",  label: "After Class • 4:00–4:15 PM" },
];

export default function Shop() {
  const navigate = useNavigate();

  // data
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // search + cart
  const [q, setQ] = useState("");
  const [cart, setCart] = useState({}); // { [id]: qty }

  // reservation modal
  const [open, setOpen] = useState(false);
  const [reserve, setReserve] = useState({ grade: "", section: "", slot: "", note: "" });
  const [submitting, setSubmitting] = useState(false);

  // fetch menu (live)
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get("/menu")
      .then((data) => {
        if (!mounted) return;
        // api.get returns parsed JSON (array); fall back safe
        const rows = Array.isArray(data) ? data : (data?.data || []);
        setItems(rows);
      })
      .catch(() => mounted && setItems([]))
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, []);

  // restore cart
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cart") || "{}");
      if (saved && typeof saved === "object") setCart(saved);
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // computed views
  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return items;
    return items.filter(
      (i) =>
        i.name?.toLowerCase().includes(s) ||
        i.category?.toLowerCase().includes(s)
    );
  }, [q, items]);

  const list = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          // Compare IDs as strings to avoid Number(null) -> 0 or NaN mismatches
          const p = items.find((x) => String(x.id) === String(id));
          return p ? { ...p, qty } : null;
        })
        .filter(Boolean),
    [cart, items]
  );

  const total = useMemo(() => list.reduce((a, b) => a + b.qty * (Number(b.price) || 0), 0), [list]);

  // cart ops
  const inc = (id) => {
    const prod = items.find((x) => String(x.id) === String(id));
    if (!prod) return;
    setCart((c) => {
      const key = String(id);
      const next = (c[key] || 0) + 1;
      if (prod.stock >= 0 && next > Number(prod.stock)) return c; // cap at stock if tracked
      return { ...c, [key]: next };
    });
  };
  const dec = (id) =>
    setCart((c) => {
      const key = String(id);
      const next = Math.max((c[key] || 0) - 1, 0);
      const copy = { ...c, [key]: next };
      if (next === 0) delete copy[id];
      return copy;
    });

  // nav shortcuts
  const goCart = () => navigate("/cart");
  const openReserve = () => setOpen(true);
  const closeReserve = () => setOpen(false);

  // submit reservation (server computes price/stock/balance)
  const submitReservation = async () => {
    if (!list.length) return alert("Your cart is empty.");
    if (!reserve.grade) return alert("Select grade level.");
    if (!reserve.section.trim()) return alert("Enter section.");
    if (!reserve.slot) return alert("Choose a pickup window.");

    // must be logged in (token is added by api helper)
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in first.");
      return navigate("/login");
    }

    setSubmitting(true);
    try {
      const payload = {
        items: list.map(({ id, qty }) => ({ id, qty })), // ONLY id & qty; server looks up price & checks stock
        grade: reserve.grade,
        section: reserve.section.trim(),
        slot: reserve.slot, // "recess" | "lunch" | "after"
        note: reserve.note || "",
      };

      await api.post("/reservations", payload);

      alert("Reservation submitted! You can track it in History.");
      setCart({});
      localStorage.removeItem("cart");
      setReserve({ grade: "", section: "", slot: "", note: "" });
      closeReserve();
      // Optionally refresh menu to reflect reduced stock
      setLoading(true);
      const data = await api.get("/menu");
      setItems(Array.isArray(data) ? data : (data?.data || []));
      setLoading(false);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to reserve. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* header + search */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Canteen Menu</h1>
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search menu…"
              className="w-64 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* menu grid */}
          <section className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full text-center text-gray-500 py-10">Loading menu…</div>
              ) : filtered.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg border border-gray-100 p-10 text-center text-sm text-gray-500">
                  No items found.
                </div>
              ) : (
                filtered.map((it) => (
                  <div key={it.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col">
                    <div className="mb-4 h-32 w-full rounded bg-gray-100 overflow-hidden">
                      <img
                        src={it.img || "/logo192.png"}
                        alt={it.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/logo192.png";
                        }}
                      />
                    </div>

                    <h3 className="font-medium text-lg text-gray-900">{it.name}</h3>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-gray-700 font-semibold">{peso.format(Number(it.price) || 0)}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          Number(it.stock) > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {Number(it.stock) > 0 ? `${it.stock} in stock` : "Out of stock"}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="inline-flex items-center border rounded-lg">
                        <button
                          className="px-3 py-2 hover:bg-gray-50"
                          onClick={() => dec(it.id)}
                          disabled={!cart[it.id]}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-4 text-sm min-w-[2.5rem] text-center">
                          {cart[it.id] || 0}
                        </span>
                        <button
                          className="px-3 py-2 hover:bg-gray-50"
                          onClick={() => inc(it.id)}
                          disabled={Number(it.stock) === 0}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => inc(it.id)}
                        disabled={Number(it.stock) === 0}
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

            {/* cart sidebar */}
          <aside className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 h-fit sticky top-20">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Your Cart</h2>
              <span className="text-xs text-gray-600">{list.length} items</span>
            </div>

            <div className="mt-3 divide-y">
              {list.map((it) => (
                <div key={it.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{it.name}</div>
                    <div className="text-xs text-gray-500">{peso.format(Number(it.price) || 0)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center border rounded-lg">
                      <button onClick={() => dec(it.id)} className="px-2 py-1.5 hover:bg-gray-50">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-3 text-sm">{it.qty}</span>
                      <button onClick={() => inc(it.id)} className="px-2 py-1.5 hover:bg-gray-50">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-sm font-medium">{peso.format((Number(it.price) || 0) * it.qty)}</div>
                  </div>
                </div>
              ))}
              {list.length === 0 && (
                <div className="py-6 text-sm text-gray-500 text-center">Your cart is empty.</div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-lg font-semibold">{peso.format(total)}</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                onClick={goCart}
                disabled={!list.length}
                className="w-full inline-flex items-center justify-center gap-2 border px-4 py-3 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                <ShoppingCart className="w-4 h-4" />
                Go to Cart
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

      {/* reservation modal */}
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
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                      <select
                        value={reserve.grade}
                        onChange={(e) => setReserve((r) => ({ ...r, grade: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select grade</option>
                        <option>G7</option><option>G8</option><option>G9</option>
                        <option>G10</option><option>G11</option><option>G12</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                      <input
                        value={reserve.section}
                        onChange={(e) => setReserve((r) => ({ ...r, section: e.target.value }))}
                        placeholder="e.g., A / Rizal"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Window</label>
                    <div className="grid grid-cols-1 gap-2">
                      {SLOTS.map((s) => (
                        <label key={s.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="pickup-slot"
                            checked={reserve.slot === s.id}
                            onChange={() => setReserve((r) => ({ ...r, slot: s.id }))}
                          />
                          <span className="text-sm">{s.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                    <textarea
                      rows={3}
                      value={reserve.note}
                      onChange={(e) => setReserve((r) => ({ ...r, note: e.target.value }))}
                      placeholder="e.g., Less sauce"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Order Summary</h4>
                  <div className="border rounded-lg divide-y">
                    {list.map((it) => (
                      <div key={it.id} className="p-3 flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{it.name}</div>
                          <div className="text-xs text-gray-500">{peso.format(Number(it.price) || 0)}</div>
                        </div>
                        <div className="font-medium">{it.qty} × {peso.format(Number(it.price) || 0)}</div>
                      </div>
                    ))}
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total</span>
                      <span className="text-lg font-semibold">{peso.format(total)}</span>
                    </div>
                  </div>

                  <button
                    onClick={submitReservation}
                    disabled={submitting || !list.length}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-60"
                  >
                    {submitting
                      ? <span className="inline-flex items-center gap-2"><Clock className="w-4 h-4 animate-pulse" />Submitting…</span>
                      : <span className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Submit Reservation</span>}
                  </button>
                </div>
              </div>

              <div className="p-4 border-t text-right">
                <button onClick={closeReserve} className="text-sm px-3 py-2 rounded-lg border hover:bg-gray-50">
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
