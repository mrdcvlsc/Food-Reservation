// src/pages/Shop.jsx - FIXED VERSION
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { refreshSessionForProtected } from "../../lib/auth";
import Navbar from "../../components/avbar";
import BottomNav from "../../components/mobile/BottomNav";
import FullScreenLoader from "../../components/FullScreenLoader";
import { api } from "../../lib/api";
import { useCart } from "../../contexts/CartContext";
import { getUserFromStorage, setUserToStorage } from "../../lib/storage";
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
  Eye,
  ChevronDown,
  TrendingUp,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const SLOTS = [
  { id: "recess", label: "Recess • 9:45–10:00 AM" },
  { id: "lunch", label: "Lunch • 12:00–12:30 PM" },
  { id: "after", label: "After Class • 4:00–4:15 PM" },
];

const CATEGORY_EMOJI = {
  "Rice Meals": "🍚",
  "Noodles": "🍜",
  "Snacks": "🍪",
  "Beverages": "🥤",
  "Desserts": "🍰",
  "Breakfast": "☕",
  "Others": "🍽️",
};

function GuestHeader() {
  return (
    <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="h-14 sm:h-16 flex items-center justify-between gap-2">
          <a href="/" className="inline-flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <img src="/jckl-192.png" alt="JCKL" className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex-shrink-0" />
            <div className="min-w-0">
              <span className="hidden xl:inline text-[15px] font-semibold text-gray-900">Jesus Christ King of Kings and Lord of Lords Academy Inc.</span>
              <span className="hidden md:inline xl:hidden text-[15px] font-semibold text-gray-900 truncate max-w-[520px]">Jesus Christ King of Kings and Lord of Lords Academy Inc.</span>
              <span className="md:hidden text-xs sm:text-sm font-semibold text-gray-900">JCKL Academy</span>
            </div>
          </a>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <a href="/login" className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium">Student Login</a>
            <a href="/register" className="hidden sm:inline text-xs sm:text-sm text-gray-600 hover:text-gray-900">Create Account</a>
          </div>
        </div>
      </div>
    </header>
  );
}

function Toast({ message, visible, onClose }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
      <div className="bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5" />
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}

function EmptyCartSuggestions({ items, onAdd }) {
  const popularItems = useMemo(() => {
    return items
      .filter(i => i.stock > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, 3);
  }, [items]);

  if (popularItems.length === 0) return null;

  return (
    <div className="py-4 space-y-3">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Popular items
      </div>
      {popularItems.map(item => (
        <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition">
          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
            {item.img ? (
              <img src={item.img} alt={item.name} className="w-full h-full object-cover rounded" />
            ) : (
              <span className="text-xl">{CATEGORY_EMOJI[item.category] || "🍽️"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
            <div className="text-xs text-gray-500">{peso.format(item.price)}</div>
          </div>
          <button
            onClick={() => onAdd(item.id)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Shop({ publicView = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    if (publicView) return;
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: "student" });
    })();
  }, [navigate, publicView]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const [wallet, setWallet] = useState({ balance: 0 });
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [walletError, setWalletError] = useState("");

  const urlCategory = searchParams.get('category');
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [category, setCategory] = useState(urlCategory || "all");
  const [sort, setSort] = useState("featured");

  const [scrolled, setScrolled] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const { cart, add, setQty, remove, clear } = useCart();

  const [open, setOpen] = useState(false);
  const [reserve, setReserve] = useState({ grade: "", section: "", slot: "", note: "" });
  const [submitting, setSubmitting] = useState(false);

  const [preview, setPreview] = useState(null);

  const filterBarRef = useRef(null);
  const menuGridRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    setRecentlyViewed(viewed);
    
    const handleLogout = () => {
      localStorage.removeItem('recentlyViewed');
      setRecentlyViewed([]);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const addToRecentlyViewed = (itemId) => {
    const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    const filtered = viewed.filter(id => id !== itemId);
    const updated = [itemId, ...filtered].slice(0, 5);
    localStorage.setItem('recentlyViewed', JSON.stringify(updated));
    setRecentlyViewed(updated);
  };

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const data = await api.get("/menu");
      const rows = Array.isArray(data) ? data : [];
      const visibleRows = rows.filter((r) => r.visible !== false);
      setItems(
        visibleRows.map((r) => ({
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
      setInitialLoad(false);
    }
  };

  const fetchWallet = async () => {
    setLoadingWallet(true);
    setWalletError("");
    try {
      if (publicView) {
        setWallet({ balance: 0 });
        setWalletError("Public view – log in to see wallet and place orders.");
        return;
      }
      const w = await api.get("/wallets/me");
      const val = w || {};
      const bal = Number(val.balance) || 0;
      setWallet({ balance: bal });
      const u = getUserFromStorage();
      if (u && u.id) {
        u.balance = bal;
        setUserToStorage(u);
      }
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
    const onMenuUpdated = () => fetchMenu();
    window.addEventListener("menu:updated", onMenuUpdated);
    return () => window.removeEventListener("menu:updated", onMenuUpdated);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const u = getUserFromStorage() || {};
    setReserve((r) => ({
      ...r,
      grade: r.grade || u.grade || "",
      section: r.section || u.section || "",
    }));
  }, [open]);

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

  const recentlyViewedItems = useMemo(() => {
    return recentlyViewed
      .map(id => items.find(i => String(i.id) === String(id)))
      .filter(Boolean);
  }, [recentlyViewed, items]);

  const showToast = (message) => {
    setToast({ visible: true, message });
  };

  const inc = (id) => {
    const item = items.find((x) => String(x.id) === String(id));
    if (!item) return;
    const currentQty = cart[String(id)] || 0;
    if (item.stock >= 0 && currentQty >= item.stock) {
      alert(`Sorry, only ${item.stock} items available in stock.`);
      return;
    }

    add(item.id, 1);
    showToast(`Added ${item.name} to cart`);
    
    const cartIcon = document.getElementById('cart-icon');
    if (cartIcon) {
      cartIcon.classList.add('animate-bounce');
      setTimeout(() => cartIcon.classList.remove('animate-bounce'), 500);
    }
  };

  const dec = (id) =>
    setQty(id, Math.max((cart[String(id)] || 0) - 1, 0));
  
  const removeFromCart = (id) => {
    remove(id);
    showToast("Item removed from cart");
  };
  
  const clearCart = () => {
    if (window.confirm("Clear all items from cart?")) {
      clear();
      showToast("Cart cleared");
      setMobileCartOpen(false);
    }
  };

  const goCart = () => navigate("/cart");
  const openReserve = () => setOpen(true);
  const closeReserve = () => setOpen(false);

  const openPreviewModal = (item) => {
    setPreview(item);
    addToRecentlyViewed(item.id);
  };

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
        items: list.map(({ id, qty }) => ({ id, qty })),
        grade: reserve.grade,
        section: reserve.section.trim(),
        slot: reserve.slot,
        note: reserve.note || "",
      };

      let r;
      try {
        r = await api.post("/reservations/checkout", payload);
      } catch {
        const created = await api.post("/reservations", payload);
        const createdId = created?.id || created?.data?.id;
        const amount = created?.total ?? created?.data?.total ?? total;

        if (!createdId) throw new Error("Reservation created without an id.");
        await api.post("/wallets/charge", {
          amount: Number(amount),
          refType: "reservation",
          refId: createdId,
        });

        r = created;
      }

      alert("Reservation submitted and wallet charged.");
      clear();
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

  if (loading && initialLoad) {
    return <FullScreenLoader message="Loading menu..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {publicView ? <GuestHeader /> : <Navbar />}

      <Toast 
        message={toast.message} 
        visible={toast.visible} 
        onClose={() => setToast({ visible: false, message: "" })}
      />

      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-6 space-y-3 sm:space-y-6">
        {!publicView && items.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col text-white space-y-3 sm:space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Today's Special</span>
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">Pre-order now and skip the lunch rush!</h2>
                <p className="text-sm sm:text-base text-blue-100">Order your favorite meals ahead of time and enjoy more break time.</p>
                <button
                  onClick={() => {
                    menuGridRef.current?.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'start' 
                    });
                  }}
                  className="inline-flex items-center gap-2 bg-white text-blue-600 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-blue-50 transition w-fit text-sm sm:text-base shadow-md"
                >
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  Start Ordering
                </button>
              </div>
            </div>
          </div>
        )}

        <div 
          ref={filterBarRef}
          className={`sticky top-14 sm:top-16 z-30 transition-all duration-300 ${
            scrolled ? 'bg-white shadow-md -mx-2 sm:-mx-4 px-2 sm:px-4 py-3' : 'bg-white border border-gray-100 rounded-lg sm:rounded-xl px-2 sm:px-4 py-3'
          }`}
        >
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="inline-flex items-center gap-1 sm:gap-2 mr-1 text-gray-600">
                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wide">Categories</span>
              </div>
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium transition ${
                      category === c
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    {c !== "all" && <span className="mr-1">{CATEGORY_EMOJI[c] || "🍽️"}</span>}
                    {c === "all" ? "All Items" : c}
                    {c !== "all" && (
                      <span className="ml-1.5 text-[10px] opacity-70">
                        ({catCounts.get(c) || 0})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] sm:text-xs text-gray-600 font-medium uppercase tracking-wide">Sort by</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="featured">Featured</option>
                <option value="name-asc">Name (A–Z)</option>
                <option value="name-desc">Name (Z–A)</option>
                <option value="price-asc">Price (Low to High)</option>
                <option value="price-desc">Price (High to Low)</option>
                <option value="stock-desc">Stock (High to Low)</option>
              </select>
              {(debouncedQ || category !== "all" || sort !== "featured") && (
                <button
                  onClick={() => {
                    setQ("");
                    setCategory("all");
                    setSort("featured");
                  }}
                  className="ml-auto inline-flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear filters</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 flex-col sm:flex-row">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Canteen Menu</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'} available
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search menu…"
                className="w-full sm:w-72 border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              onClick={() => {
                fetchMenu();
                fetchWallet();
              }}
              className="inline-flex items-center gap-2 border border-gray-200 px-3 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 space-y-6">
            <div ref={menuGridRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="bg-white rounded-lg shadow-sm border border-gray-100 p-4"
                  >
                    <div className="h-36 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer mb-4" />
                    <div className="h-4 w-1/2 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded mb-2" />
                    <div className="h-3 w-1/3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded mb-4" />
                    <div className="flex items-center justify-between">
                      <div className="h-8 w-24 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded" />
                      <div className="h-8 w-20 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded" />
                    </div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg border border-gray-100 p-10 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No items found.</p>
                </div>
              ) : (
                filtered.map((it) => {
                  const soldOut = Number(it.stock) <= 0;
                  const lowStock = Number(it.stock) > 0 && Number(it.stock) <= 5;

                  return (
                    <div 
                      key={it.id} 
                      className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="relative h-36 mb-4 rounded-lg overflow-hidden bg-gray-100">
                        {it.img ? (
                          <img
                            src={it.img}
                            alt={it.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400">
                            <span className="text-5xl">{CATEGORY_EMOJI[it.category] || "🍽️"}</span>
                          </div>
                        )}
                        <button
                          onClick={() => openPreviewModal(it)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                        >
                          <div className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium inline-flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Quick View
                          </div>
                        </button>
                      </div>
                      
                      <div className="font-medium text-gray-900 truncate">{it.name}</div>
                      <div className="text-sm text-gray-600">{peso.format(it.price)}</div>
                      
                      <div className="mt-2">
                        {soldOut ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                            Out of stock
                          </span>
                        ) : lowStock ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium animate-pulse">
                            ⚠️ Only {it.stock} left!
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                            ✓ {it.stock} in stock
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-3 flex items-center gap-3">
                        {publicView ? (
                          <button
                            onClick={() => openPreviewModal(it)}
                            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                          >
                            Preview <ChevronRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <>
                            <div className="inline-flex items-center border rounded-lg">
                              <button 
                                onClick={() => inc(it.id)} 
                                className="px-2 py-1.5 hover:bg-gray-50 transition disabled:opacity-50" 
                                disabled={soldOut}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <button
                              onClick={() => inc(it.id)}
                              disabled={soldOut}
                              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60 transition-all duration-200 transform hover:scale-105"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              Add
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!publicView && recentlyViewedItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-5 h-5 text-gray-700" />
                  <h3 className="font-semibold text-gray-900">Recently Viewed</h3>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {recentlyViewedItems.map(it => (
                    <div 
                      key={it.id} 
                      className="flex-shrink-0 w-32 cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => openPreviewModal(it)}
                    >
                      <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 mb-2">
                        {it.img ? (
                          <img src={it.img} alt={it.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            {CATEGORY_EMOJI[it.category] || "🍽️"}
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-medium text-gray-900 truncate">{it.name}</div>
                      <div className="text-xs text-gray-600">{peso.format(it.price)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {!publicView && (
            <aside className="hidden lg:flex bg-white rounded-lg shadow-sm border border-gray-100 p-4 h-[72vh] sticky top-24 flex-col">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Your Cart</h2>
                <span id="cart-icon" className="text-xs text-gray-600 inline-flex items-center gap-1">
                  <ShoppingCart className="w-3.5 h-3.5" />
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
                  Insufficient balance. Please top-up.
                </div>
              )}

              <div className="mt-3 divide-y overflow-auto flex-1 min-h-0">
                {list.length === 0 ? (
                  <div className="py-6 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
                      <ShoppingCart className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="text-sm text-gray-500">Your cart is empty.</div>
                    <EmptyCartSuggestions items={items} onAdd={(id) => inc(id)} />
                  </div>
                ) : (
                  list.map((it) => (
                    <div key={it.id} className="py-3 flex items-start gap-3">
                      <div className="w-12 h-12 rounded bg-gray-100 flex-shrink-0">
                        {it.img ? (
                          <img src={it.img} alt={it.name} className="w-full h-full object-cover rounded" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">
                            {CATEGORY_EMOJI[it.category] || "🍽️"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{it.name}</div>
                        <div className="text-xs text-gray-500">
                          {peso.format(Number(it.price) || 0)}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="inline-flex items-center border rounded">
                            <button 
                              onClick={() => dec(it.id)} 
                              className="px-1.5 py-1 hover:bg-gray-50"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs">{it.qty}</span>
                            <button
                              onClick={() => inc(it.id)}
                              className="px-1.5 py-1 hover:bg-gray-50 disabled:opacity-50"
                              disabled={it.qty >= it.stock}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-sm font-medium">
                            {peso.format((Number(it.price) || 0) * it.qty)}
                          </div>
                          <button
                            onClick={() => removeFromCart(it.id)}
                            className="ml-auto text-xs text-gray-500 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-lg font-semibold">{peso.format(total)}</span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                <button
                  onClick={goCart}
                  disabled={!list.length}
                  className="w-full inline-flex items-center justify-center gap-2 border px-4 py-3 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60 transition"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Go to Cart
                </button>
                <button
                  onClick={openReserve}
                  disabled={!list.length}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-lg hover:bg-black text-sm disabled:opacity-60 transition"
                >
                  <Clock className="w-4 h-4" />
                  Reserve for Pickup
                </button>
                {list.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="w-full text-sm text-gray-600 hover:underline"
                  >
                    Clear cart
                  </button>
                )}
              </div>
            </aside>
          )}
        </div>
      </main>

      {!publicView && (
        <>
          {list.length > 0 && (
            <button
              onClick={() => setMobileCartOpen(!mobileCartOpen)}
              className="lg:hidden fixed bottom-20 right-4 z-40 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
            >
              <div className="relative">
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {list.reduce((a, b) => a + b.qty, 0)}
                </span>
              </div>
            </button>
          )}

          {mobileCartOpen && (
            <div className="lg:hidden fixed inset-0 z-[60]">
              <div 
                className="absolute inset-0 bg-black/40" 
                onClick={() => setMobileCartOpen(false)}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col pb-20">
                <div className="flex items-center justify-center py-3 border-b">
                  <div className="w-12 h-1 bg-gray-300 rounded-full" />
                </div>

                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold text-gray-900">Your Cart</h3>
                  <button 
                    onClick={() => setMobileCartOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {list.map((it) => (
                    <div key={it.id} className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                      <div className="w-16 h-16 rounded bg-gray-200 flex-shrink-0">
                        {it.img ? (
                          <img src={it.img} alt={it.name} className="w-full h-full object-cover rounded" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            {CATEGORY_EMOJI[it.category] || "🍽️"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{it.name}</div>
                        <div className="text-sm text-gray-600">{peso.format(it.price)}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="inline-flex items-center border rounded">
                            <button onClick={() => dec(it.id)} className="px-2 py-1">
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-3 text-sm">{it.qty}</span>
                            <button 
                              onClick={() => inc(it.id)} 
                              className="px-2 py-1"
                              disabled={it.qty >= it.stock}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="font-medium">{peso.format(it.price * it.qty)}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(it.id)}
                        className="p-2 hover:bg-white rounded"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t space-y-3">
                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{peso.format(total)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setMobileCartOpen(false);
                        goCart();
                      }}
                      className="inline-flex items-center justify-center gap-2 border px-4 py-3 rounded-lg font-medium"
                    >
                      View Cart
                    </button>
                    <button
                      onClick={() => {
                        setMobileCartOpen(false);
                        openReserve();
                      }}
                      disabled={insufficient}
                      className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-60"
                    >
                      <Clock className="w-4 h-4" />
                      Reserve
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!publicView && open && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center flex items-center justify-center">
            <div className="fixed inset-0 bg-black/30" onClick={closeReserve} />
            
            <div className="relative inline-block w-full max-w-2xl bg-white rounded-xl shadow-xl border border-gray-100 text-left">
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-white rounded-t-xl">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">Confirm Reservation</h3>
                </div>
                <button onClick={closeReserve} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-[80vh] flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                          <select
                            value={reserve.grade}
                            onChange={(e) => setReserve((r) => ({ ...r, grade: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select grade</option>
                            <option>Kindergarten</option>
                            {[...Array(12)].map((_, i) => (
                              <option key={i}>G{i + 1}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                          <input
                            value={reserve.section}
                            onChange={(e) => setReserve((r) => ({ ...r, section: e.target.value }))}
                            placeholder="e.g., A"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Window</label>
                        <div className="grid gap-2">
                          {SLOTS.map((s) => (
                            <label
                              key={s.id}
                              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name="slot"
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
                          placeholder="Special requests..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Order Summary</h4>
                      <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                        {list.map((it) => (
                          <div key={it.id} className="p-3 flex justify-between text-sm">
                            <div>
                              <div className="font-medium">{it.name}</div>
                              <div className="text-xs text-gray-500">{it.qty} × {peso.format(it.price)}</div>
                            </div>
                            <div className="font-medium">{peso.format(it.qty * it.price)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t p-4 rounded-b-xl">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total</span>
                      <span className="text-lg font-semibold">{peso.format(total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Wallet Balance</span>
                      <span className="font-semibold">{peso.format(wallet.balance)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Remaining</span>
                      <span className={`font-semibold ${insufficient ? 'text-red-600' : 'text-emerald-600'}`}>
                        {peso.format(Math.max(0, wallet.balance - total))}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={closeReserve}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitReservation}
                      disabled={submitting || insufficient}
                      className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
                    >
                      {submitting ? "Submitting..." : "Submit Reservation"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPreview(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white rounded-xl shadow-xl overflow-hidden">
              <div className="relative h-56 bg-gray-100">
                {preview.img ? (
                  <img src={preview.img} alt={preview.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-6xl">
                    {CATEGORY_EMOJI[preview.category] || "🍽️"}
                  </div>
                )}
                <button
                  onClick={() => setPreview(null)}
                  className="absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{preview.name}</h3>
                    <div className="text-sm text-gray-500">{preview.category}</div>
                  </div>
                  <div className="text-xl font-bold">{peso.format(preview.price)}</div>
                </div>
                {preview.desc && <p className="text-sm text-gray-600">{preview.desc}</p>}
                <div className="flex items-center justify-between pt-2">
                  {preview.stock <= 0 ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Out of stock</span>
                  ) : preview.stock <= 5 ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 animate-pulse">
                      ⚠️ Only {preview.stock} left!
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      ✓ {preview.stock} in stock
                    </span>
                  )}
                  {!publicView && (
                    <button
                      onClick={() => {
                        inc(preview.id);
                        setPreview(null);
                      }}
                      disabled={preview.stock <= 0}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
      
      {!publicView && <BottomNav />}
    </div>
  );
}