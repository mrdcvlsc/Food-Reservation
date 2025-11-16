// src/components/mobile/AdminBottomNav.jsx
import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Box,
  FileText,
  ClipboardList,
  CalendarClock,
  Menu,
  LogOut,
  BarChart3,
  User,
  Bell,
  DollarSign,
} from "lucide-react";

export default function AdminBottomNav({ badgeCounts = {} }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const sheetRef = useRef(null);
  const firstSheetItemRef = useRef(null);

  const navItems = [
    { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, key: "dashboard" },
    { to: "/admin/orders", label: "Orders", Icon: ShoppingBag, key: "orders" },
    { label: "Top-ups", Icon: DollarSign, key: "topups" },
    { to: "/admin/inventory", label: "Inventory", Icon: Box, key: "inventory" },
  ];

  const moreItems = [
    { to: "/admin/shops", label: "Shops", Icon: FileText, key: "shops" },
    { to: "/admin/reservations", label: "Reservations", Icon: CalendarClock, key: "reservations" },
    { to: "/admin/reports", label: "Reports", Icon: BarChart3, key: "reports" },
    { to: "/admin/users", label: "Users", Icon: User, key: "users" },
    { to: "/admin/notifications", label: "Notifications", Icon: Bell, key: "notifications" },
    { to: "/admin/stats", label: "Stats", Icon: ClipboardList, key: "stats" },
    { to: "/admin/settings", label: "Settings", Icon: FileText, key: "settings" },
  ];

  const baseClasses = "flex flex-col items-center justify-center gap-0.5 py-1 transition-colors min-h-[48px]";
  const activeClasses = "text-blue-600 font-medium";
  const inactiveClasses = "text-gray-600 hover:text-blue-600";

  const prefetch = (url) => {
    try {
      if (!url || typeof document === "undefined") return;
      if (document.querySelector(`link[data-prefetch][href="${url}"]`)) return;
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url;
      link.as = "document";
      link.setAttribute("data-prefetch", "true");
      document.head.appendChild(link);
    } catch (e) {}
  };

  useEffect(() => {
    const idle = typeof requestIdleCallback === "function"
      ? requestIdleCallback(() => {
          prefetch("/admin");
          prefetch("/admin/orders");
          prefetch("/admin/topups");
        })
      : setTimeout(() => {
          prefetch("/admin");
          prefetch("/admin/orders");
          prefetch("/admin/topups");
        }, 1200);
    return () => {
      if (typeof idle === "number") cancelIdleCallback?.(idle) ?? clearTimeout(idle);
    };
  }, []);

  useEffect(() => setMoreOpen(false), [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function onKey(e) {
      if (e.key === "Escape") setMoreOpen(false);
      if (e.key === "Tab") {
        const sheet = sheetRef.current;
        if (!sheet) return;
        const focusable = sheet.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey, { capture: true });
    setTimeout(() => firstSheetItemRef.current?.focus?.(), 0);
    return () => document.removeEventListener("keydown", onKey, { capture: true });
  }, [moreOpen]);

  const handleLogout = () => {
    if (!window.confirm("Sign out of admin account?")) return;
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch {}
    navigate("/login");
  };

  const Badge = ({ count, color = "bg-rose-600" }) => {
    if (!count || Number(count) <= 0) return null;
    const label = count > 99 ? "99+" : String(count);
    return (
      <span className={`absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full ${color} text-white text-[9px] font-bold flex items-center justify-center px-1`}>
        {label}
      </span>
    );
  };

  return (
    <>
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 flex items-end"
          onClick={() => setMoreOpen(false)}
          aria-hidden={!moreOpen}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin more options"
            ref={sheetRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-t-xl shadow-lg border-t border-gray-200 animate-slide-up"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="p-3 border-b bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">More</h3>
            </div>
            <nav className="divide-y divide-gray-100" aria-label="More options navigation">
              {moreItems.map(({ to, label, Icon }, idx) => (
                <NavLink
                  key={to}
                  to={to}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-sm text-gray-900"
                  onClick={() => setMoreOpen(false)}
                  onMouseEnter={() => prefetch(to)}
                  onFocus={() => prefetch(to)}
                  ref={idx === 0 ? firstSheetItemRef : undefined}
                >
                  <Icon className="w-5 h-5 text-gray-600" />
                  <span>{label}</span>
                </NavLink>
              ))}
              <div className="px-4 py-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-red-600 text-left rounded"
                >
                  <LogOut className="w-5 h-5 text-red-600" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-200 shadow-lg z-[9999]"
        aria-label="Admin mobile primary"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))", zIndex: 9999 }}
      >
        <div className="flex items-center justify-between w-full px-0">
          {navItems.map(({ to, label, Icon, key }) =>
            key === "topups" ? (
              <TopupsDropdown key="topups" badgeCount={badgeCounts.topups} />
            ) : (
              <NavLink
                key={to}
                to={to}
                end={to === "/admin"}
                className={({ isActive }) => `w-1/5 ${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                aria-label={label}
                onMouseEnter={() => prefetch(to)}
                onFocus={() => prefetch(to)}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  {key === "orders" && <Badge count={badgeCounts.orders} color="bg-rose-600" />}
                  {key === "inventory" && <Badge count={badgeCounts.lowStock} color="bg-amber-600" />}
                </div>
                <span className="text-[10px] mt-0.5">{label}</span>
              </NavLink>
            )
          )}
          <button
            className={`w-1/5 ${baseClasses} ${moreOpen ? activeClasses : inactiveClasses}`}
            onClick={() => setMoreOpen((s) => !s)}
            aria-label="More options"
            aria-expanded={moreOpen}
            onMouseEnter={() => prefetch("/admin/shops")}
            onFocus={() => prefetch("/admin/shops")}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function TopupsDropdown({ badgeCount }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div className="relative w-1/5">
      <button
        ref={ref}
        className={`w-full flex flex-col items-center justify-center gap-0.5 py-2 transition-colors min-h-[56px] ${open ? "text-blue-600 font-medium" : "text-gray-600 hover:text-blue-600"}`}
        aria-label="Top-ups"
        aria-expanded={open}
        style={{ zIndex: 10001 }}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="relative">
          <DollarSign className="w-6 h-6" aria-hidden="true" />
          {badgeCount > 0 && (
            <span className="absolute -top-2 -right-3 min-w-[20px] h-[20px] rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </div>
        <span className="text-[12px] mt-1">Top-ups</span>
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-4 w-52 bg-white rounded-xl shadow-2xl border border-gray-200 z-[10002] py-2 flex flex-col">
          <button
            className="w-full flex items-center gap-3 px-5 py-4 text-base text-gray-900 hover:bg-gray-50 focus:bg-blue-50 focus:outline-none"
            style={{ minHeight: 48 }}
            onClick={() => { setOpen(false); navigate("/admin/topup"); }}
          >
            <DollarSign className="w-5 h-5" />
            <span>Top-Up Management</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-5 py-4 text-base text-gray-900 hover:bg-gray-50 focus:bg-blue-50 focus:outline-none"
            style={{ minHeight: 48 }}
            onClick={() => { setOpen(false); navigate("/admin/topup/history"); }}
          >
            <FileText className="w-5 h-5" />
            <span>Top-Up History</span>
          </button>
        </div>
      )}
    </div>
  );
}
