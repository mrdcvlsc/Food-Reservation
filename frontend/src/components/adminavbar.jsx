// src/components/adminavbar.jsx
import React, { useEffect, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
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

export default function AdminAvbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  // Notifications state + panel (temporarily disabled)
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const links = [
    { name: "Dashboard",    to: "/admin",            Icon: LayoutDashboard },
    { name: "Inventory",    to: "/admin/inventory",  Icon: Box },
    { name: "Reports",      to: "/admin/reports",    Icon: FileText },
    { name: "Shops",        to: "/admin/shops",      Icon: ShoppingBag },
    { name: "Top-Up Verify",to: "/admin/topup",      Icon: Wallet },
    { name: "Orders",       to: "/admin/orders",     Icon: ClipboardList },
    { name: "Reservations", to: "/admin/reservations", Icon: CalendarClock },
    { name: "Stats",        to: "/admin/stats",      Icon: BarChart3 },
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

          <div className="mx-2 h-6 w-px bg-gray-200" />

          {/* Admin notifications bell */}
          <div className="relative">
            <button onClick={() => setNotifOpen(v => !v)} className={`${base} ${idle} ml-1 relative`} aria-label="Admin notifications">
              <Bell className="w-4 h-4" />
              {unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-rose-600 text-white text-[10px] leading-[16px] text-center px-1">{unread > 99 ? "99+" : unread}</span>}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-white border rounded-lg shadow-lg z-50 p-2">
                <div className="flex items-center justify-between p-2">
                  <div className="text-sm font-medium">Notifications</div>
                  <button onClick={markAllRead} className="text-xs text-gray-500">Mark all read</button>
                </div>
                <div className="max-h-64 overflow-auto">
                  {notifications.length === 0 && <div className="p-4 text-sm text-gray-500">No notifications</div>}
                  {notifications.map(n => (
                    <div key={n.id} className={`p-3 border-b hover:bg-gray-50 ${n.read ? "opacity-70" : ""}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{n.body}</div>
                    </div>
                  ))}
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

      {/*
      <div className="relative">
        <button onClick={() => setNotifOpen(v => !v)} className="p-2 rounded hover:bg-gray-100" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {unread > 0 && <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-medium">{unread}</span>}
        </button>
        {notifOpen && (
          <div className="absolute right-0 mt-2 w-96 bg-white border rounded-lg shadow-lg z-50 p-2">
            <div className="flex items-center justify-between p-2">
              <div className="text-sm font-medium">Notifications</div>
              <button onClick={markAllRead} className="text-xs text-gray-500">Mark all read</button>
            </div>
            <div className="max-h-64 overflow-auto">
              {notifications.length === 0 && <div className="p-4 text-sm text-gray-500">No notifications</div>}
              {notifications.map(n => (
                <div key={n.id} className={`p-3 border-b hover:bg-gray-50 ${n.read ? "opacity-70" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{n.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      */}
    </nav>
  );
}
