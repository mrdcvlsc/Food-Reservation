import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  ShoppingBag,
  Receipt,
  User,
  Menu,
  Wallet,
  LogOut,
  Shield,
  X,
  ChevronUp,
  History,
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

export default function BottomNav({ badgeCounts = {} }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const sheetRef = useRef(null);

  const navItems = [
    { to: "/dashboard", label: "Home", Icon: Home, key: "home" },
    { to: "/shop", label: "Shop", Icon: ShoppingBag, key: "shop" },
    { to: "/transactions", label: "Orders", Icon: Receipt, key: "orders" },
    { to: "/profile", label: "Profile", Icon: User, key: "profile" },
  ];

  const moreItems = [
    { to: "/topup", label: "Top-Up", Icon: Wallet },
    { to: "/topup-history", label: "Top-Up History", Icon: History },
    { to: "/security", label: "Security", Icon: Shield },
  ];

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
    const idle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(() => {
            prefetch("/shop");
            prefetch("/dashboard");
            prefetch("/transactions");
          })
        : setTimeout(() => {
            prefetch("/shop");
            prefetch("/dashboard");
            prefetch("/transactions");
          }, 1500);

    return () => {
      if (typeof idle === "number") {
        typeof cancelIdleCallback === "function"
          ? cancelIdleCallback(idle)
          : clearTimeout(idle);
      }
    };
  }, []);

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
    if (!window.confirm("Are you sure you want to logout?")) return;
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch {}
    navigate("/login");
  };

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
                    <p className="text-xs text-gray-500">Additional features</p>
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
              <div className="space-y-2 mb-3">
                {moreItems.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    onMouseEnter={() => prefetch(to)}
                    onFocus={() => prefetch(to)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 p-4 rounded-2xl transition-all ${
                        isActive
                          ? "bg-blue-50 text-blue-600 shadow-sm"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100 active:scale-95"
                      }`
                    }
                  >
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">{label}</span>
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
          {navItems.map(({ to, label, Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/dashboard"}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all duration-200 ${
                  isActive ? "text-blue-600" : "text-gray-600 active:scale-95"
                }`
              }
              aria-label={label}
              onMouseEnter={() => prefetch(to)}
              onFocus={() => prefetch(to)}
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
                    {key === "shop" && (
                      <Badge count={badgeCounts.cart} color="bg-blue-500" />
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
          ))}

          <button
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all duration-200 ${
              moreOpen ? "text-blue-600" : "text-gray-600 active:scale-95"
            }`}
            onClick={() => setMoreOpen((s) => !s)}
            aria-label="More options"
            aria-expanded={moreOpen}
            onMouseEnter={() => prefetch("/topup")}
            onFocus={() => prefetch("/topup")}
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