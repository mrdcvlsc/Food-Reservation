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
  Wallet,
  X,
  ChevronUp,
} from "lucide-react";

const Badge = ({ count, color = "bg-rose-500" }) => {
  if (!count || Number(count) <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className={`absolute -top-1 -right-1.5 min-w-[16px] h-[16px] rounded-full ${color} text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm ring-2 ring-white`}
    >
      {label}
    </span>
  );
};

function TopupsDropdown({ badgeCount, isActive }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleNavigation = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <button
        className={`w-full flex flex-col items-center justify-center gap-1 py-2 transition-all duration-200 ${
          open || isActive
            ? "text-blue-600"
            : "text-gray-600 active:scale-95"
        }`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Top-ups menu"
        aria-expanded={open}
      >
        <div className="relative">
          <Wallet className="w-5 h-5" />
          <Badge count={badgeCount} color="bg-emerald-500" />
        </div>
        <span className="text-[10px] font-medium">Top-ups</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setOpen(false)}
          />

          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
            <div className="p-2">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-900 hover:bg-blue-50 rounded-xl transition-colors text-left"
                onClick={() => handleNavigation("/admin/topup")}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-medium">Top-Up Management</span>
              </button>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-900 hover:bg-blue-50 rounded-xl transition-colors text-left"
                onClick={() => handleNavigation("/admin/topup/history")}
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-medium">Top-Up History</span>
              </button>
            </div>
            <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminBottomNav({ badgeCounts = {} }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const sheetRef = useRef(null);

  const navItems = [
    { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, key: "dashboard" },
    { to: "/admin/orders", label: "Orders", Icon: ShoppingBag, key: "orders" },
    { label: "Top-ups", Icon: Wallet, key: "topups" },
    { to: "/admin/inventory", label: "Inventory", Icon: Box, key: "inventory" },
  ];

  const moreItems = [
    { to: "/admin/shops", label: "Shops", Icon: FileText },
    { to: "/admin/reservations", label: "Reservations", Icon: CalendarClock },
    { to: "/admin/reports", label: "Reports", Icon: BarChart3 },
    { to: "/admin/users", label: "Users", Icon: User },
    { to: "/admin/notifications", label: "Notifications", Icon: Bell },
    { to: "/admin/stats", label: "Stats", Icon: ClipboardList },
  ];

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    
    const handleEscape = (e) => {
      if (e.key === "Escape") setMoreOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  const handleLogout = () => {
    if (!window.confirm("Sign out of admin account?")) return;
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch {}
    navigate("/login");
  };

  const isTopupsActive = location.pathname.includes("/admin/topup");

  return (
    <>
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-[100] flex items-end bg-black/40"
          onClick={() => setMoreOpen(false)}
        >
          <div
            ref={sheetRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Menu className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">More Options</h3>
                    <p className="text-xs text-gray-500">Admin tools & settings</p>
                  </div>
                </div>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <nav className="overflow-y-auto max-h-[calc(85vh-80px)] p-3">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {moreItems.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                        isActive
                          ? "bg-blue-50 text-blue-600 shadow-sm"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100 active:scale-95"
                      }`
                    }
                  >
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium text-center">{label}</span>
                  </NavLink>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors active:scale-95"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold">Logout</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-[99]"
        style={{
          paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map(({ to, label, Icon, key }) => {
            if (key === "topups") {
              return (
                <TopupsDropdown
                  key="topups"
                  badgeCount={badgeCounts.topups}
                  isActive={isTopupsActive}
                />
              );
            }

            return (
              <NavLink
                key={to}
                to={to}
                end={to === "/admin"}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "text-blue-600"
                      : "text-gray-600 active:scale-95"
                  }`
                }
                aria-label={label}
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <div
                        className={`transition-all duration-200 ${
                          isActive ? "scale-110" : ""
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      {key === "orders" && (
                        <Badge count={badgeCounts.orders} color="bg-rose-500" />
                      )}
                      {key === "inventory" && (
                        <Badge count={badgeCounts.lowStock} color="bg-amber-500" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] transition-all duration-200 ${
                        isActive ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {label}
                    </span>
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-t-full" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          <button
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all duration-200 ${
              moreOpen
                ? "text-blue-600"
                : "text-gray-600 active:scale-95"
            }`}
            onClick={() => setMoreOpen((s) => !s)}
            aria-label="More options"
            aria-expanded={moreOpen}
          >
            <div
              className={`transition-all duration-200 ${
                moreOpen ? "scale-110 rotate-180" : ""
              }`}
            >
              <ChevronUp className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] transition-all duration-200 ${
                moreOpen ? "font-semibold" : "font-medium"
              }`}
            >
              More
            </span>
            {moreOpen && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-t-full" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}