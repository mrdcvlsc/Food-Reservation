// src/components/adminavbar.jsx
import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  LayoutDashboard,
  ShoppingBag,
  Wallet,
  ClipboardList,
  CalendarClock,
  BarChart3,
  LogOut,
  ShieldCheck,
  Box,
  FileText,
  Bell,
} from "lucide-react";
import { api } from "../lib/api";
import NotificationItem from './NotificationItem';

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED';

export default function AdminAvbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [topupsOpen, setTopupsOpen] = useState(false);
  const topupsRef = useRef(null);
  // close dropdown when clicking outside or pressing Escape
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

  // Notifications state + panel (temporarily disabled)
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [previewNotif, setPreviewNotif] = useState(null); // <-- new

  const links = [
    { name: "Dashboard",    to: "/admin",            Icon: LayoutDashboard },
    { name: "Shops",        to: "/admin/shops",      Icon: ShoppingBag },
    { name: "Inventory",    to: "/admin/inventory",  Icon: Box },
    { name: "Users",        to: "/admin/users",      Icon: FileText },
    { name: "Reports",      to: "/admin/reports",    Icon: FileText },
    { name: "Orders",       to: "/admin/orders",     Icon: ClipboardList },
    { name: "Reservations", to: "/admin/reservations", Icon: CalendarClock },
  ];

  const base =
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
  const idle = "text-gray-700 hover:text-blue-700 hover:bg-blue-50";
  const active =
    "text-blue-700 bg-blue-100 font-semibold shadow-[inset_0_-2px_0_0_theme(colors.blue.600)]";

  const logout = () => {
    const ok = window.confirm("Log out of the admin console?");
    if (!ok) return;
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch {}
    navigate("/login");
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const d = await api.get("/notifications/admin");
        if (!mounted) return;
        setNotifications(Array.isArray(d) ? d : []);
      } catch (e) {}
    };
    load();
    const id = setInterval(load, 10000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    try {
      await api.post("/notifications/admin/mark-read", { all: true });
    } catch {}
    setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
  };

  useEffect(() => {
    if (!notifOpen) return;
    const ids = notifications.filter(n => !n.read).map(n => n.id);
    if (!ids.length) return;
    (async () => {
      try {
        await api.post("/notifications/admin/mark-read", { ids });
      } catch {}
      setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
    })();
  }, [notifOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNotif = async (n) => {
    setPreviewNotif(n);
    try {
      // mark single admin notif as read (reuse existing admin mark-read endpoint)
      await api.post("/notifications/admin/mark-read", { ids: [n.id] });
      setNotifications((prev) => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)));
    } catch (e) { /* ignore */ }
  };

  const deleteNotif = async (id) => {
    try {
      // admin delete endpoint
      await api.del(`/notifications/admin/${id}`);
      setNotifications((prev) => prev.filter(n => n.id !== id));
      if (previewNotif && previewNotif.id === id) setPreviewNotif(null);
    } catch (e) {
      console.error("Delete notif failed", e);
      const msg = (e && e.message) || String(e);
      const details = e && e.data ? `\n\nDetails: ${JSON.stringify(e.data)}` : "";
      alert("Failed to delete notification: " + msg + details);
    }
  };

  useEffect(() => {
    const handleProfileUpdate = (event) => {
      const { userId, updates } = event.detail;
      
      setNotifications(prev => prev.map(notif => {
        // Update actor data if it matches the updated user
        if (notif.actor && String(notif.actor.id) === String(userId)) {
          return {
            ...notif,
            actor: {
              ...notif.actor,
              ...updates,
              profilePictureUrl: updates.profilePictureUrl || notif.actor.profilePictureUrl
            }
          };
        }
        return notif;
      }));

      // Update preview notification if open
      if (previewNotif?.actor?.id === userId) {
        setPreviewNotif(prev => ({
          ...prev,
          actor: {
            ...prev.actor,
            ...updates,
            profilePictureUrl: updates.profilePictureUrl || prev.actor.profilePictureUrl
          }
        }));
      }
    };

    window.addEventListener(USER_PROFILE_UPDATED, handleProfileUpdate);
    return () => window.removeEventListener(USER_PROFILE_UPDATED, handleProfileUpdate);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur border-b shadow-sm">
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/admin"
          className="group flex items-center gap-3 min-w-0"
          aria-label="Admin Home"
        >
          <div className="relative h-8 w-8 rounded-xl overflow-hidden ring-1 ring-gray-200 bg-white">
            <img
              src="/jckl-192.png"
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/jckl-192.png";
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span className="truncate font-semibold text-gray-900">
              Canteen Admin
            </span>
          </div>
        </Link>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ name, to, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/admin"}
              className={({ isActive }) =>
                `${base} ${isActive ? active : idle}`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{name}</span>
            </NavLink>
          ))}

          {/* Top-ups dropdown (click to open; stays open until outside click / Esc) */}
          <div className="relative" ref={topupsRef}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setTopupsOpen((s) => !s); }}
              className={`${base} ${String(location.pathname).startsWith("/admin/topup") ? active : idle}`}
              aria-haspopup="true"
              aria-expanded={topupsOpen}
            >
              <Wallet className="w-4 h-4" />
              <span>Top-ups</span>
            </button>
            {topupsOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
                <NavLink
                  to="/admin/topup"
                  className={`${base} ${idle} w-full justify-start`}
                  onClick={() => setTopupsOpen(false)}
                >
                  <Wallet className="w-4 h-4" />
                  <span>Top-Up Management</span>
                </NavLink>
                {/* Ensure this link navigates to the admin Top-Up History page */}
                <NavLink
                  to="/admin/topup/history"
                  className={`${base} ${idle} w-full justify-start`}
                  onClick={() => setTopupsOpen(false)}
                >
                  <FileText className="w-4 h-4" />
                  <span>Top-Up History</span>
                </NavLink>
              </div>
            )}
          </div>

          <div className="mx-2 h-6 w-px bg-gray-200" />

          {/* Admin notifications bell */}
          <div className="relative">
            <button onClick={() => setNotifOpen(v => !v)} className={`${base} ${idle} ml-1 relative`} aria-label="Admin notifications">
              <Bell className="w-4 h-4" />
              {unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-rose-600 text-white text-[10px] leading-[16px] text-center px-1">{unread > 99 ? "99+" : unread}</span>}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-white border rounded-lg shadow-lg z-50">
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  <button 
                    onClick={markAllRead}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
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
                          isAdminSide={true} // Add this prop
                        />
                      </div>
                    ))
                 ) }
                </div>
                {/* Footer */}
                <div className="p-2 border-t flex items-center justify-between">
                  <Link
                    to="/admin/notifications"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2"
                    onClick={() => setNotifOpen(false)}
                  >
                    See all
                  </Link>
                  <Link
                    to="/admin/notifications"
                    className="text-sm text-gray-600 hover:text-gray-800"
                    onClick={() => setNotifOpen(false)}
                  >
                    Manage
                  </Link>
                </div>
               </div>
             )}
          </div>

          <button
            onClick={logout}
            className={`${base} text-white bg-gray-900 hover:bg-black`}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t bg-white">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <p className="px-1 mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Navigation
            </p>
            <div className="flex flex-col gap-1">
              {links.map(({ name, to, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/admin"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `${base} ${isActive ? active : idle}`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{name}</span>
                </NavLink>
              ))}
              {/* Mobile Top-ups submenu */}
              <div className="border-t pt-2">
                <div className="text-[11px] font-medium uppercase text-gray-500 px-1 mb-1">Top-ups</div>
                <NavLink to="/admin/topup" onClick={() => setOpen(false)} className={`${base} ${idle}`}>
                  <Wallet className="w-4 h-4" />
                  <span>Top-Up Management</span>
                </NavLink>
                <NavLink to="/admin/topup/history" onClick={() => setOpen(false)} className={`${base} ${idle}`}>
                  <FileText className="w-4 h-4" />
                  <span>Top-Up History</span>
                </NavLink>
              </div>
            </div>

            <div className="my-3 h-px bg-gray-200" />

            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className={`${base} w-full justify-center text-white bg-gray-900 hover:bg-black`}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Notification preview modal */}
      {previewNotif && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-4 p-5 border-b">
              <div className="flex-shrink-0">
                {(() => {
                  const adminFallback = { name: "Canteen Admin", profilePictureUrl: "/jckl-192.png" };
                  const display = previewNotif.actor || adminFallback;
                  return display.profilePictureUrl ? (
                    <img
                      src={display.profilePictureUrl}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                      onError={(e) => { 
                        e.target.onerror = null; 
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(display.name || 'CA')}&background=random`; 
                      }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-lg font-medium text-blue-600">
                      {(display.name || "C").charAt(0)}
                    </div>
                  );
                })()}
              </div>

              <div className="flex-1 pr-8">
                <div className="text-xs text-gray-500">From {(previewNotif.actor && previewNotif.actor.name) || "Canteen Admin"}</div>
                <h3 className="text-xl font-semibold text-gray-900">{previewNotif.title}</h3>
                <div className="text-xs text-gray-400 mt-1">{new Date(previewNotif.createdAt).toLocaleString()}</div>
              </div>

              <button 
                onClick={() => setPreviewNotif(null)} 
                className="ml-3 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
              <p className="text-sm text-gray-700 mb-4">{previewNotif.body}</p>

              {previewNotif.data ? (
                <div className="bg-gray-50 border rounded-lg p-5 space-y-4">
                  {/* Reservation Details */}
                  {previewNotif.data.reservationId && (
                    <div className="space-y-3">
                      {/* Reservation ID */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-sm">
                          <span className="text-gray-500">reservationId</span>
                          <div className="font-medium text-gray-900">{previewNotif.data.reservationId}</div>
                        </div>
                      </div>

                      {/* Items */}
                      {Array.isArray(previewNotif.data.items) && previewNotif.data.items.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-gray-500 uppercase">Items</div>
                          <div className="rounded-md border bg-white overflow-hidden">
                            {previewNotif.data.items.map((it, i) => (
                              <div key={i} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 text-sm">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">{it.qty || 1}×</span>
                                    <span className="text-gray-700">{it.name}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">ID: {it.id}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-600">{peso.format(it.price || 0)}</div>
                                  <div className="text-xs text-gray-500">{peso.format((it.price || 0) * (it.qty || 1))}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Total */}
                          <div className="pt-2 border-t flex justify-between items-center">
                            <span className="font-semibold text-gray-900">Total</span>
                            <span className="text-lg font-bold text-blue-600">{peso.format(previewNotif.data.total ?? 0)}</span>
                          </div>
                        </div>
                      ) : null}

                      {/* Student Details */}
                      {(previewNotif.data.grade || previewNotif.data.section || previewNotif.data.student) && (
                        <div className="pt-3 border-t">
                          <div className="text-xs font-medium text-gray-500 uppercase mb-2">Student Details</div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {previewNotif.data.student && (
                              <div>
                                <span className="text-gray-500">name</span>
                                <div className="font-medium text-gray-900">
                                  {typeof previewNotif.data.student === "string" ? previewNotif.data.student : previewNotif.data.student.name || "N/A"}
                                </div>
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

            {/* Footer */}
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setPreviewNotif(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => deleteNotif(previewNotif.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
}
