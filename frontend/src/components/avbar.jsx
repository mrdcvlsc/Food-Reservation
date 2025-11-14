// src/components/avbar.jsx
import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ShoppingCart, User, Bell, LogOut, Wallet, FileText, Home } from "lucide-react";
import { api } from "../lib/api";
import NotificationItem from './NotificationItem';
import { useCart } from "../contexts/CartContext";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

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
  { to: "/transactions", label: "History" }
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cart } = useCart();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [previewNotif, setPreviewNotif] = useState(null); // <-- new
  const [topupsOpen, setTopupsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const topupsRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Calculate cart count from CartContext
  const cartCount = Object.values(cart || {}).reduce((sum, qty) => sum + (qty || 0), 0);
 
  const doLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      // try server logout if available
      await api.post("/auth/logout");
    } catch (e) {
      // ignore network errors, still clear client state
    }
    // clear token and redirect to login
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
  // mark all unread notifications as read (user-side)
  const markAllRead = async () => {
    const ids = notifications.filter(n => !n.read).map(n => n.id);
    if (!ids.length) return;
    const ok = window.confirm("Mark all notifications as read?");
    if (!ok) return;
    try {
      await Promise.all(ids.map(id => api.patch(`/notifications/${id}/read`).catch(() => {})));
      setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      /* ignore individual failures */
    }
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

  // close topups dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const onDocClick = (e) => {
      if (!topupsOpen) return;
      if (topupsRef.current && !topupsRef.current.contains(e.target)) {
        setTopupsOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setTopupsOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [topupsOpen]);

  const linkBase =
    "inline-flex items-center px-3 py-2 rounded-md text-[15px] font-medium transition-colors";
  const linkIdle =
    "text-slate-700 hover:text-blue-700 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500";
  const linkActive = "text-blue-800 bg-blue-100 shadow-[inset_0_0_0_1px_rgba(59,130,246,.15)]";

  const iconFor = (to) => {
    switch (to) {
      case "/dashboard":
        return <Home className="w-5 h-5 mr-2" />;
      case "/shop":
        return <ShoppingCart className="w-5 h-5 mr-2" />;
      case "/transactions":
        return <FileText className="w-5 h-5 mr-2" />;
      default:
        return <ShoppingCart className="w-5 h-5 mr-2" />;
    }
  };

  // helper: render structured preview data in notifications dropdown/modal
  const renderPreviewData = (data) => {
    if (data == null) return <div className="text-sm text-gray-500">No additional details.</div>;
    if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
      return <div className="text-sm text-gray-700">{String(data)}</div>;
    }
    if (Array.isArray(data)) {
      return (
        <div className="space-y-2">
          {data.map((it, i) => (
            <div key={i} className="border rounded p-2 bg-white text-sm text-gray-700">
              {typeof it === "object" ? renderPreviewData(it) : String(it)}
            </div>
          ))}
        </div>
      );
    }
    // object
    return (
      <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex items-start gap-4">
            <div className="w-36 text-xs text-gray-500">{k}</div>
            <div className="flex-1">{renderPreviewData(v)}</div>
          </div>
        ))}
      </div>
    );
  };

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
                  {iconFor(to)}
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}

            {/* Top-ups dropdown (desktop) */}
            <div className="relative" ref={topupsRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTopupsOpen((s) => !s);
                }}
                className={`${linkBase} ${String(location.pathname).startsWith("/topup") ? linkActive : linkIdle} ml-1 relative`}
                aria-haspopup="true"
                aria-expanded={topupsOpen}
              >
                <Wallet className="w-5 h-5 mr-2" />
                <span className="hidden md:inline ml-1">Top-ups</span>
              </button>
              {topupsOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
                  <NavLink to="/topup" className={`${linkBase} ${linkIdle} w-full justify-start`} onClick={() => setTopupsOpen(false)}>
                    <Wallet className="w-4 h-4 mr-2" />
                    <span>Top-Up</span>
                  </NavLink>
                  <NavLink to="/topup-history" className={`${linkBase} ${linkIdle} w-full justify-start`} onClick={() => setTopupsOpen(false)}>
                    <FileText className="w-4 h-4 mr-2" />
                    <span>Top-Up History</span>
                  </NavLink>
                </div>
              )}
            </div>

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
                <div className="absolute right-0 mt-2 w-96 bg-white border rounded-lg shadow-lg z-50">
                  <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  </div>
                  
                  <div className="max-h-[calc(100vh-200px)] overflow-y-auto divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 text-center">
                        No notifications
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div 
                          key={notification.id}
                          className="cursor-pointer"
                        >
                          <NotificationItem 
                            notification={notification} 
                            onClick={() => openNotif(notification)}
                            isAdminSide={false} // Add this prop
                          />
                        </div>
                      ))
                   ) }
                  </div>
                  {/* Footer: See all / Mark all read */}
                  <div className="p-2 border-t flex items-center justify-between">
                    <Link
                      to="/notifications"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2"
                      onClick={() => setNotifOpen(false)}
                    >
                      See all
                    </Link>
                    <button
                      onClick={markAllRead}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Mark all read
                    </button>
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
              <User className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline ml-1">Profile</span>
            </NavLink>
          {/* Logout (desktop) */}
          <button onClick={doLogout} className={`${linkBase} ${linkIdle} ml-1`} aria-label="Logout">
            <LogOut className="w-5 h-5 mr-2" />
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
                {iconFor(to)}
                <span>{label}</span>
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

        {/* Mobile sheet: add Top-ups submenu */}
        <div className="border-t pt-2">
          <div className="text-[11px] font-medium uppercase text-gray-500 px-1 mb-1">Top-ups</div>
          <NavLink to="/topup" onClick={() => setOpen(false)} className={`${linkBase} ${linkIdle} w-full`}>
            <Wallet className="w-4 h-4 mr-2" />
            <span>Top-Up</span>
          </NavLink>
          <NavLink to="/topup-history" onClick={() => setOpen(false)} className={`${linkBase} ${linkIdle} w-full`}>
            <FileText className="w-4 h-4 mr-2" />
            <span>Top-Up History</span>
          </NavLink>
        </div>
      </div>

      {/* Notification modal (student) - portal so it is clickable above header/dropdown */}
      {previewNotif &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
            <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Header with Profile Picture */}
              <div className="p-4 border-b relative flex items-start">
                {/* Profile Picture */}
                <div className="flex-shrink-0 w-12 h-12 mr-4">
                {(() => {
                  const adminFallback = { name: "Canteen Admin", profilePictureUrl: "/jckl-192.png" };
                  const display = previewNotif.actor || adminFallback;
                  return display.profilePictureUrl ? (
                    <img
                      src={display.profilePictureUrl}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(display.name || 'C')}&background=random`;
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm border-2 border-white">
                      <span className="text-blue-600 font-medium text-lg">{(display.name || "C").charAt(0)}</span>
                    </div>
                  );
                })()}
                </div>

                {/* Header Content */}
                <div className="flex-1 pr-8">
                  <div className="text-sm text-gray-500">Notification from {(previewNotif.actor && previewNotif.actor.name) || "Canteen Admin"}</div>
                  <h3 className="text-lg font-semibold text-gray-900">{previewNotif.title}</h3>
                  <div className="text-sm text-gray-400 mt-1">{new Date(previewNotif.createdAt).toLocaleString()}</div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setPreviewNotif(null)}
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <p className="text-sm text-gray-600 mb-4">{previewNotif.body}</p>

                {/* Notification Details */}
                {previewNotif.data ? (
                  <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-4">
                    {/* Reservation */}
                    {previewNotif.data.reservationId && (
                      <div className="space-y-3">
                        {/* Reservation ID */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-sm">
                            <span className="text-gray-500">reservationId</span>
                            <div className="font-medium text-gray-900">{previewNotif.data.reservationId}</div>
                          </div>
                        </div>

                        {/* Items Table */}
                        {previewNotif.data.items?.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-gray-500 uppercase">Items</div>
                            <div className="rounded-md border bg-white overflow-hidden">
                              {previewNotif.data.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 text-sm">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-900">{item.qty || 1}×</span>
                                      <span className="text-gray-700">{item.name}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">ID: {item.id}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm text-gray-600">{peso.format(item.price || 0)}</div>
                                    <div className="text-xs text-gray-500">{peso.format((item.price || 0) * (item.qty || 1))}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Total */}
                            <div className="pt-2 border-t flex justify-between items-center">
                              <span className="font-semibold text-gray-900">Total</span>
                              <span className="text-lg font-bold text-blue-600">{peso.format(previewNotif.data.total || 0)}</span>
                            </div>
                          </div>
                        )}

                        {/* Student Details */}
                        {(previewNotif.data.grade || previewNotif.data.section || previewNotif.data.student) && (
                          <div className="pt-3 border-t">
                            <div className="text-xs font-medium text-gray-500 uppercase mb-2">Student Details</div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {previewNotif.data.student && (
                                <div>
                                  <span className="text-gray-500">name</span>
                                  <div className="font-medium text-gray-900">{previewNotif.data.student}</div>
                                </div>
                              )}
                              {previewNotif.data.grade && (
                                <div>
                                  <span className="text-gray-500">grade</span>
                                  <div className="font-medium text-gray-900">{previewNotif.data.grade}</div>
                                </div>
                              )}
                              {previewNotif.data.section && (
                                <div>
                                  <span className="text-gray-500">section</span>
                                  <div className="font-medium text-gray-900">{previewNotif.data.section}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Note */}
                        {previewNotif.data.note && (
                          <div className="pt-3 border-t">
                            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Note</div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm text-gray-900">{previewNotif.data.note}</div>
                          </div>
                        )}

                        {/* Pickup Slot */}
                        {previewNotif.data.slot && (
                          <div className="pt-2">
                            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Pickup</div>
                            <div className="font-medium text-gray-900">{previewNotif.data.slot}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Top-up Details */}
                    {previewNotif.data.amount && !previewNotif.data.items && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Amount</span>
                          <span className="font-medium text-gray-900">{peso.format(previewNotif.data.amount)}</span>
                        </div>
                        {previewNotif.data.provider && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Method</span>
                            <span className="font-medium capitalize text-gray-900">{previewNotif.data.provider}</span>
                          </div>
                        )}
                        {(previewNotif.data.reference || previewNotif.data.txId) && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Reference</span>
                            <span className="font-mono font-medium text-gray-900">{previewNotif.data.reference || previewNotif.data.txId}</span>
                          </div>
                        )}
                        {previewNotif.data.status && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Status</span>
                            <span className={`font-medium ${
                              String(previewNotif.data.status).toLowerCase() === "approved" ? "text-green-600" :
                              String(previewNotif.data.status).toLowerCase() === "pending" ? "text-yellow-600" :
                              String(previewNotif.data.status).toLowerCase() === "rejected" ? "text-red-600" :
                              "text-gray-900"
                            }`}>{previewNotif.data.status}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No extra details.</div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t flex justify-end gap-2">
                <button 
                  onClick={() => setPreviewNotif(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => deleteNotif(previewNotif.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md mx-4 w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Log Out?
              </h3>
              <p className="text-gray-600 mb-8">
                You'll need to sign in again to continue using the app.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-5 py-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-5 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-semibold shadow-lg"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
