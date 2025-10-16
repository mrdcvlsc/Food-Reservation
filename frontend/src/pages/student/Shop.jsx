// src/pages/Shop.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { refreshSessionForProtected } from "../../lib/auth";
import Navbar from "../../components/avbar";
import { api } from "../../lib/api";
import {
  Plus,
  Minus,
  ShoppingCart,
  Search,
  Clock,
  X,
  CheckCircle2,
  RefreshCw,
  Filter,
  Wallet,
  AlertTriangle,
  Image as ImageIcon,
  ChevronRight,
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const SLOTS = [
  { id: "recess", label: "Recess • 9:45–10:00 AM" },
  { id: "lunch", label: "Lunch • 12:00–12:30 PM" },
  { id: "after", label: "After Class • 4:00–4:15 PM" },
];

export default function Shop() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'student' });
    })();
  }, [navigate]);

  // data
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // wallet
  const [wallet, setWallet] = useState({ balance: 0 });
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [walletError, setWalletError] = useState("");

  // search + filters
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("featured");

  // cart
  const [cart, setCart] = useState({});

  // reservation modal
  const [open, setOpen] = useState(false);
  const [reserve, setReserve] = useState({ grade: "", section: "", slot: "", note: "" });
  const [submitting, setSubmitting] = useState(false);

  // item preview modal
  const [preview, setPreview] = useState(null); // item or null

  // ==== DATA LOADERS =========================================================
  const fetchMenu = async () => {
    setLoading(true);
    try {
      const data = await api.get("/menu");
      const rows = Array.isArray(data) ? data : data?.data || [];
      setItems(
        rows.map((r) => ({
          id: r.id ?? r._id,
          name: r.name,
          category: r.category || "Others",
          price: Number(r.price) || 0,
          stock: Number(r.stock ?? 0),
          img: r.img || r.image || "",
          desc: r.desc || r.description || "",
        }))
      );
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallet = async () => {
    setLoadingWallet(true);
    setWalletError("");
    try {
      const w = await api.get("/wallets/me");
      const val = (w && (w.data || w)) || {};
      const bal = Number(val.balance) || 0;
      setWallet({ balance: bal });
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        if (u && u.id) {
          u.balance = bal;
          localStorage.setItem("user", JSON.stringify(u));
        }
      } catch {}
    } catch (e) {
      setWallet({ balance: 0 });
      setWalletError("Unable to load wallet. You might not be logged in.");
    } finally {
      setLoadingWallet(false);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchWallet();
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

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [q]);

  // prefill grade/section from saved user when opening reserve
  useEffect(() => {
    if (!open) return;
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      setReserve((r) => ({
        ...r,
        grade: r.grade || u.grade || "",
        section: r.section || u.section || "",
      }));
    } catch {}
  }, [open]);

  // ==== DERIVED ==============================================================

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [items]);

  const catCounts = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      map.set(it.category || "Others", (map.get(it.category || "Others") || 0) + 1);
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    let rows = items.slice(0);

    if (debouncedQ) {
      rows = rows.filter(
        (i) =>
          String(i.name || "").toLowerCase().includes(debouncedQ) ||
          String(i.category || "").toLowerCase().includes(debouncedQ)
      );
    }
    if (category !== "all") rows = rows.filter((i) => i.category === category);

    switch (sort) {
      case "name-asc":
        rows.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        rows.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        rows.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        rows.sort((a, b) => b.price - a.price);
        break;
      case "stock-desc":
        rows.sort((a, b) => b.stock - a.stock);
        break;
      default:
        rows.sort((a, b) => {
          const av = Number(b.stock > 0) - Number(a.stock > 0);
          return av !== 0 ? av : a.name.localeCompare(b.name);
        });
    }
    return rows;
  }, [items, debouncedQ, category, sort]);

  const list = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const p = items.find((x) => String(x.id) === String(id));
          return p ? { ...p, qty } : null;
        })
        .filter(Boolean),
    [cart, items]
  );

  const total = useMemo(
    () => list.reduce((a, b) => a + b.qty * (Number(b.price) || 0), 0),
    [list]
  );

  const insufficient = total > (Number(wallet.balance) || 0);

  // ==== CART OPS =============================================================
  const inc = (id) => {
    const prod = items.find((x) => String(x.id) === String(id));
    if (!prod) return;
    setCart((c) => {
      const key = String(id);
      const next = (c[key] || 0) + 1;
      if (prod.stock >= 0 && next > Number(prod.stock)) return c; // cap at stock
      return { ...c, [key]: next };
    });
  };
  const dec = (id) =>
    setCart((c) => {
      const key = String(id);
      const next = Math.max((c[key] || 0) - 1, 0);
      const copy = { ...c, [key]: next };
      if (next === 0) delete copy[key];
      return copy;
    });
  const removeFromCart = (id) =>
    setCart((c) => {
      const copy = { ...c };
      delete copy[String(id)];
      return copy;
    });
  const clearCart = () => setCart({});

  // ==== NAV / MODAL ==========================================================
  const goCart = () => navigate("/cart");
  const openReserve = () => setOpen(true);
  const closeReserve = () => setOpen(false);

  // ==== SUBMIT ===============================================================
  const submitReservation = async () => {
    if (!list.length) return alert("Your cart is empty.");
    if (!reserve.grade) return alert("Select grade level.");
    if (!reserve.section.trim()) return alert("Enter section.");
    if (!reserve.slot) return alert("Choose a pickup window.");

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in first.");
      return navigate("/login");
    }

    if (insufficient) {
      return alert("Insufficient wallet balance. Please top-up first.");
    }

    setSubmitting(true);
    try {
      const payload = {
        items: list.map(({ id, qty }) => ({ id, qty })), // server validates price/stock
        grade: reserve.grade,
        section: reserve.section.trim(),
        slot: reserve.slot,
        note: reserve.note || "",
      };

      // Prefer atomic endpoint
      let r;
      try {
        r = await api.post("/reservations/checkout", payload);
      } catch {
        // Fallback 2-step
        const created = await api.post("/reservations", payload);
        const createdId = created?.id || created?.data?.id;
        const amount = created?.total ?? created?.data?.total ?? total;

        if (!createdId) throw new Error("Reservation created without an id. Please check backend response.");
        await api.post("/wallets/charge", {
          amount: Number(amount),
          refType: "reservation",
          refId: createdId,
        });

        r = created;
      }

      alert("Reservation submitted and wallet charged.");
      setCart({});
      localStorage.removeItem("cart");
      setReserve({ grade: "", section: "", slot: "", note: "" });
      closeReserve();

      await Promise.all([fetchMenu(), fetchWallet()]);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.error || e?.message || "Failed to reserve. Try again.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ==== RENDER ===============================================================
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Canteen Menu</h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search menu…"
                className="w-full sm:w-64 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Search menu"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              onClick={() => {
                fetchMenu();
                fetchWallet();
              }}
              className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* filters */}
        <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-3 sticky top-16 z-10">
          <div className="inline-flex items-center gap-2 mr-2 text-gray-700">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filter</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full border text-sm transition ${
                  category === c
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                aria-pressed={category === c}
              >
                {c === "all" ? "All" : c}{" "}
                {c !== "all" && (
                  <span className="ml-1 text-[10px] opacity-70">
                    {catCounts.get(c) || 0}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-gray-600">Sort</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              aria-label="Sort menu"
            >
              <option value="featured">Featured</option>
              <option value="name-asc">Name (A–Z)</option>
              <option value="name-desc">Name (Z–A)</option>
              <option value="price-asc">Price (Low→High)</option>
              <option value="price-desc">Price (High→Low)</option>
              <option value="stock-desc">Stock (High→Low)</option>
            </select>
            {(debouncedQ || category !== "all" || sort !== "featured") && (
              <button
                onClick={() => {
                  setQ("");
                  setCategory("all");
                  setSort("featured");
                }}
                className="text-sm text-gray-600 hover:text-gray-900 underline decoration-dotted"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* menu grid */}
          <section className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 animate-pulse"
                  >
                    <div className="h-36 rounded bg-gray-200 mb-4" />
                    <div className="h-4 w-1/2 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-1/3 bg-gray-200 rounded mb-4" />
                    <div className="flex items-center justify-between">
                      <div className="h-8 w-24 bg-gray-200 rounded" />
                      <div className="h-8 w-20 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg border border-gray-100 p-10 text-center text-sm text-gray-500">
                  No items found.
                </div>
              ) : (
                filtered.map((it) => {
                  const inCart = cart[String(it.id)] || 0;
                  const soldOut = Number(it.stock) <= 0;
                  const hasImg = Boolean(it.img);
                  return (
                    <div
                      key={it.id}
                      className="relative bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col"
                    >
                      {/* removed redundant top-left "Sold out" badge to avoid visual artifact; keep the price pill */}
                      {inCart > 0 && (
                        <span className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          In cart: {inCart}
                        </span>
                      )}

                      {/* image / placeholder (clickable) */}
                      <button
                        type="button"
                        onClick={() => setPreview(it)}
                        className="group mb-4 h-36 w-full rounded-lg bg-gray-100 overflow-hidden relative"
                        title="View"
                      >
                        {hasImg ? (
                          <img
                            src={it.img}
                            alt={it.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 text-left">
                          <span className="text-white text-xs inline-flex items-center gap-1">
                            Preview <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </button>

                      <h3 className="font-medium text-lg text-gray-900">{it.name}</h3>
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-gray-800 font-semibold">
                          {peso.format(Number(it.price) || 0)}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            Number(it.stock) > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {Number(it.stock) > 0 ? `${it.stock} in stock` : "Out of stock"}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="inline-flex items-center border rounded-lg">
                          <button
                            className="px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
                            onClick={() => dec(it.id)}
                            disabled={!cart[String(it.id)]}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-4 text-sm min-w-[2.5rem] text-center">
                            {cart[String(it.id)] || 0}
                          </span>
                          <button
                            className="px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
                            onClick={() => inc(it.id)}
                            disabled={soldOut || (cart[String(it.id)] || 0) >= Number(it.stock)}
                            title={
                              soldOut
                                ? "Out of stock"
                                : (cart[String(it.id)] || 0) >= Number(it.stock)
                                ? "Max stock reached"
                                : "Increase quantity"
                            }
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => inc(it.id)}
                          disabled={soldOut}
                          className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Add
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* cart sidebar */}
          <aside className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 h-fit sticky top-24">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Your Cart</h2>
              <span className="text-xs text-gray-600">
                {list.reduce((a, b) => a + b.qty, 0)} items
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-sm">
              <div className="inline-flex items-center gap-2 text-gray-700">
                <Wallet className="w-4 h-4" />
                <span>Wallet:</span>
              </div>
              <div className="font-semibold">
                {loadingWallet ? "…" : peso.format(Number(wallet.balance) || 0)}
              </div>
            </div>

            {insufficient && list.length > 0 && (
              <div className="mt-2 text-xs inline-flex items-center gap-2 text-red-700 bg-red-50 border border-red-100 px-2 py-1 rounded">
                <AlertTriangle className="w-3.5 h-3.5" />
                Insufficient balance. Please top-up before reserving.
              </div>
            )}

            <div className="mt-3 divide-y">
              {list.map((it) => (
                <div key={it.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{it.name}</div>
                    <div className="text-xs text-gray-500">
                      {peso.format(Number(it.price) || 0)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center border rounded-lg">
                      <button onClick={() => dec(it.id)} className="px-2 py-1.5 hover:bg-gray-50">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-3 text-sm">{it.qty}</span>
                      <button
                        onClick={() => inc(it.id)}
                        className="px-2 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                        disabled={it.qty >= it.stock}
                        title={it.qty >= it.stock ? "Max stock reached" : undefined}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-sm font-medium">
                      {peso.format((Number(it.price) || 0) * it.qty)}
                    </div>
                    <button
                      onClick={() => removeFromCart(it.id)}
                      className="text-xs text-gray-500 hover:text-red-600"
                      title="Remove"
                    >
                      Remove
                    </button>
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
              {list.length > 0 && (
                <button
                  onClick={clearCart}
                  className="w-full inline-flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear cart
                </button>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* mobile sticky checkout bar */}
      {list.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
          <div className="mx-3 mb-3 rounded-xl shadow-lg bg-white border border-gray-200 p-3 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-semibold">{peso.format(total)}</div>
              <div className="text-xs text-gray-500">{list.reduce((a, b) => a + b.qty, 0)} items</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={goCart}
                className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                Cart
              </button>
              <button
                onClick={openReserve}
                disabled={insufficient}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-60"
              >
                <Clock className="w-4 h-4" />
                Reserve
              </button>
            </div>
          </div>
        </div>
      )}

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
                <button onClick={closeReserve} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close">
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
                        <option>G7</option>
                        <option>G8</option>
                        <option>G9</option>
                        <option>G10</option>
                        <option>G11</option>
                        <option>G12</option>
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
                        <label
                          key={s.id}
                          className="flex items-center gap-3 p-2 rounded-lg border hover:bg-gray-50 cursor-pointer"
                        >
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
                          <div className="text-xs text-gray-500">
                            {peso.format(Number(it.price) || 0)}
                          </div>
                        </div>
                        <div className="font-medium">
                          {it.qty} × {peso.format(Number(it.price) || 0)}
                        </div>
                      </div>
                    ))}
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total</span>
                      <span className="text-lg font-semibold">{peso.format(total)}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between text-sm">
                      <div className="inline-flex items-center gap-2 text-gray-700">
                        <Wallet className="w-4 h-4" />
                        <span>Wallet Balance</span>
                      </div>
                      <div className="font-semibold">
                        {loadingWallet ? "…" : peso.format(Number(wallet.balance) || 0)}
                      </div>
                    </div>
                    <div className="p-3 flex items-center justify-between text-sm">
                      <span className="text-gray-600">Remaining</span>
                      <span className={`font-semibold ${insufficient ? "text-red-700" : "text-emerald-700"}`}>
                        {loadingWallet
                          ? "…"
                          : peso.format(Math.max(0, (Number(wallet.balance) || 0) - total))}
                      </span>
                    </div>
                  </div>

                  {walletError && (
                    <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 px-2 py-1 rounded">
                      {walletError}
                    </div>
                  )}

                  <button
                    onClick={submitReservation}
                    disabled={submitting || !list.length || insufficient}
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
                <button onClick={closeReserve} className="text-sm px-3 py-2 rounded-lg border hover:bg-gray-50">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* item preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPreview(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="relative h-56 bg-gray-100">
                {preview.img ? (
                  <img
                    src={preview.img}
                    alt={preview.name}
                    className="h-full w-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <button
                  onClick={() => setPreview(null)}
                  className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow hover:bg-white"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{preview.name}</h3>
                    <div className="text-sm text-gray-500">{preview.category}</div>
                  </div>
                  <div className="text-lg font-semibold">{peso.format(preview.price || 0)}</div>
                </div>
                {preview.desc && (
                  <p className="text-sm text-gray-600 leading-relaxed">{preview.desc}</p>
                )}
                <div className="flex items-center justify-between pt-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      Number(preview.stock) > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {Number(preview.stock) > 0 ? `${preview.stock} in stock` : "Out of stock"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => dec(preview.id)}
                      className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => inc(preview.id)}
                      disabled={Number(preview.stock) <= 0}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
