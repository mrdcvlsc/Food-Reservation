// src/components/avbar.jsx
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart, User, Bell, LogOut } from "lucide-react";
import { api } from "../lib/api";

/**
 * Tweak these two constants if you want to change branding quickly.
 * - LOGO_SRC: primary logo; will gracefully fall back to /brand-logo.png then /logo192.png
 * - BRAND_NAME: full academy name; automatically truncates on smaller screens
 */
const LOGO_SRC =
  "jckl-192.png";

const BRAND_NAME =
  "Jesus Christ King of Kings and Lord of Lords Academy Inc.";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/shop", label: "Shop" },
  { to: "/topup", label: "Top-Up" },
  { to: "/transactions", label: "History" },
  { to: "/topup-history", label: "Top-Up History" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [previewNotif, setPreviewNotif] = useState(null); // <-- new
  const navigate = useNavigate();
 
  const doLogout = async () => {
    try {
      // try server logout if available
      await api.post("/auth/logout");
    } catch (e) {
      // ignore network errors, still clear client state
    }
    // clear token and redirect to login
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cart badge from localStorage (works with object or array carts)
  useEffect(() => {
    const compute = (raw) => {
      try {
        const saved = JSON.parse(raw ?? "{}");
        return Array.isArray(saved)
          ? saved.reduce((a, b) => a + (b?.qty || 0), 0)
          : Object.values(saved || {}).reduce((a, b) => a + (b || 0), 0);
      } catch {
        return 0;
      }
    };
    const load = () => setCartCount(compute(localStorage.getItem("cart")));
    load();
    window.addEventListener("storage", (e) => {
      if (e.key === "cart") load();
    });
    return () => {};
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const d = await api.get("/notifications");
        if (!mounted) return;
        setNotifications(Array.isArray(d) ? d : []);
      } catch (e) {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const unread = notifications.filter(n => !n.read).length;
  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map(n => (String(n.id) === String(id) ? { ...n, read: true } : n)));
    } catch {}
  };
  useEffect(() => {
    if (!notifOpen) return;
    const ids = notifications.filter(n => !n.read).map(n => n.id);
    for (const id of ids) markRead(id);
  }, [notifOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNotif = async (n) => {
    setPreviewNotif(n);
    try {
      // mark single notification read (student endpoint)
      await api.patch(`/notifications/${n.id}/read`);
      setNotifications((prev) => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)));
    } catch (e) { /* ignore */ }
  };

  const deleteNotif = async (id) => {
    try {
      await api.del(`/notifications/${id}`);
      setNotifications((prev) => prev.filter(n => n.id !== id));
      if (previewNotif && previewNotif.id === id) setPreviewNotif(null);
    } catch (e) {
      console.error("Delete notif failed", e);
      const msg = (e && e.message) || String(e);
      const details = e && e.data ? `\n\nDetails: ${JSON.stringify(e.data)}` : "";
      alert("Failed to delete notification: " + msg + details);
    }
  };

  const linkBase =
    "inline-flex items-center px-3 py-2 rounded-md text-[15px] font-medium transition-colors";
  const linkIdle =
    "text-slate-700 hover:text-blue-700 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500";
  const linkActive = "text-blue-800 bg-blue-100 shadow-[inset_0_0_0_1px_rgba(59,130,246,.15)]";

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-white/90 backdrop-blur border-b ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      {/* Top bar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Brand */}
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <img
              src={LOGO_SRC}
              alt="Academy logo"
              className="h-9 w-9 rounded-md ring-1 ring-slate-200 object-cover"
              onError={(e) => {
                // graceful fallback chain
                const el = e.currentTarget;
                if (el.dataset.fallback === "brand") {
                  el.src = "/logo192.png";
                } else {
                  el.src = "/brand-logo.png";
                  el.dataset.fallback = "brand";
                }
              }}
            />
            <div className="leading-tight">
              {/* Full name on xl; truncated on md; compact on xs */}
              <div className="hidden xl:block text-[15px] font-semibold text-slate-900">
                {BRAND_NAME}
              </div>
              <div className="hidden md:block xl:hidden max-w-[520px] truncate text-[15px] font-semibold text-slate-900">
                {BRAND_NAME}
              </div>
              <div className="md:hidden text-[15px] font-semibold text-slate-900">
                Canteen
              </div>
            </div>
          </Link>

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-1">
            {LINKS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === "/dashboard"}
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : linkIdle}`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}

            {/* Notifications (desktop) */}
            <div className="relative">
              <button onClick={() => setNotifOpen(v => !v)} className={`${linkBase} ${linkIdle} ml-1 relative`} aria-label="Notifications">
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-rose-600 text-white text-[10px] leading-[18px] text-center px-1">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50 p-2">
                  <div className="flex items-center justify-between px-2 py-1">
                    <div className="text-sm font-medium">Notifications</div>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {notifications.length === 0 && <div className="p-4 text-sm text-gray-500">No notifications</div>}
                    {notifications.slice(0,20).map(n => (
                      <button
                        key={n.id}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); openNotif(n); }}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${n.read ? "opacity-70" : ""}`}
                      >
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="text-xs text-gray-600 truncate">{n.body}</div>
                        <div className="text-[11px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cart */}
            <button
              onClick={() => navigate("/cart")}
              className={`${linkBase} ${linkIdle} ml-1 relative`}
              aria-label="Open cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] leading-[18px] text-center px-1 animate-pulse">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>

            {/* Profile */} 
            <NavLink to="/profile" className={`${linkBase} ${linkIdle} ml-1`}>
              <User className="w-5 h-5" />
              <span className="hidden sm:inline ml-1">Profile</span>
            </NavLink>
          {/* Logout (desktop) */}
          <button onClick={doLogout} className={`${linkBase} ${linkIdle} ml-1`} aria-label="Logout">
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline ml-1">Logout</span>
          </button>
          </ul>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      <div
        className={`md:hidden border-t bg-white transition-all duration-200 origin-top ${
          open ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="max-w-7xl mx-auto px-4 py-2 flex flex-col">
          {LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/dashboard"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : linkIdle} w-full`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              navigate("/cart");
            }}
            className={`${linkBase} ${linkIdle} w-full justify-start`}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Cart
            {cartCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] px-1">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>
          <NavLink
            to="/profile"
            onClick={() => setOpen(false)}
            className={`${linkBase} ${linkIdle} w-full justify-start`}
          >
            <User className="w-5 h-5 mr-2" />
            Profile
          </NavLink>
          <button
            onClick={() => {
              setOpen(false);
              doLogout();
            }}
            className={`${linkBase} ${linkIdle} w-full justify-start`}
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </button>
        </ul>
      </div>

      {/* Notification modal (student) - portal so it is clickable above header/dropdown */}
      {previewNotif &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
            <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg overflow-hidden">
              {/* header: title on left, small X in corner (absolute) */}
              <div className="p-4 border-b relative">
                <div className="pr-12">
                  <div className="text-sm text-gray-500">From: {previewNotif.from || "System"}</div>
                  <div className="text-lg font-semibold">{previewNotif.title}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(previewNotif.createdAt).toLocaleString()}</div>
                </div>
                <button
                  onClick={() => setPreviewNotif(null)}
                  aria-label="Close notification"
                  className="absolute top-3 right-3 text-gray-600 hover:bg-gray-100 rounded p-1"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 text-sm text-gray-700">
                {previewNotif.body || previewNotif.message || "No details provided."}
              </div>

              {/* footer: actions (Close + Delete) so Delete is not overlapped */}
              <div className="p-4 border-t flex justify-end gap-2">
                <button onClick={() => setPreviewNotif(null)} className="px-3 py-2 rounded border">Close</button>
                <button onClick={() => deleteNotif(previewNotif.id)} className="px-3 py-2 rounded bg-rose-600 text-white">Delete</button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
