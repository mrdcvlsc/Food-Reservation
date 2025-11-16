// src/components/mobile/BottomNav.jsx
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
} from "lucide-react";

/**
 * Mobile Bottom Navigation
 *
 * - Safe-area aware
 * - Touch targets >= 56px
 * - Prefetch on hover/focus (adds <link rel="prefetch">)
 * - "More" sheet overlay with keyboard (Escape) + outside click + route-close
 * - Accessible: aria-current, aria-expanded, role dialog for sheet, focus management
 * - Accepts badgeCounts prop for dynamic badges (e.g. { orders: 3 })
 */
export default function BottomNav({ badgeCounts = {} }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const sheetRef = useRef(null);
  const firstSheetItemRef = useRef(null);

  const navItems = [
    { to: "/dashboard", label: "Home", Icon: Home, key: "home" },
    { to: "/shop", label: "Shop", Icon: ShoppingBag, key: "shop" },
    { to: "/transactions", label: "Orders", Icon: Receipt, key: "orders" },
    { to: "/profile", label: "Profile", Icon: User, key: "profile" },
  ];

  const moreItems = [
    { to: "/topup", label: "Top-Up", Icon: Wallet, key: "topup" },
    { to: "/topup-history", label: "Top-Up History", Icon: Receipt, key: "topup-history" },
    { to: "/security", label: "Security", Icon: Shield, key: "security" },
  ];

  // CSS helpers: ensure minimum touch size and consistent style
  const baseClasses =
    "flex flex-col items-center justify-center gap-1 px-3 transition-colors min-w-[64px] min-h-[56px]"; // min-h for touch target
  const activeClasses = "text-blue-600 font-medium";
  const inactiveClasses = "text-gray-600 hover:text-blue-600";

  // --- Prefetch helper (idempotent) ---
  const prefetch = (url) => {
    try {
      if (!url || typeof document === "undefined") return;
      // avoid duplicate prefetch tags
      if (document.querySelector(`link[data-prefetch][href="${url}"]`)) return;
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url;
      link.as = "document";
      link.setAttribute("data-prefetch", "true");
      document.head.appendChild(link);
    } catch (e) {
      // silent fail
    }
  };

  // Prefetch common routes on mount idle (non-blocking)
  useEffect(() => {
    const idle = requestIdleCallback
      ? requestIdleCallback(() => {
          prefetch("/shop");
          prefetch("/register");
          prefetch("/dashboard");
        })
      : setTimeout(() => {
          prefetch("/shop");
          prefetch("/register");
          prefetch("/dashboard");
        }, 1500);

    return () => {
      if (typeof idle === "number") cancelIdleCallback?.(idle) ?? clearTimeout(idle);
    };
  }, []);

  // Close sheet on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Close sheet on Escape and trap focus to first element when opened
  useEffect(() => {
    if (!moreOpen) return;

    function onKey(e) {
      if (e.key === "Escape") {
        setMoreOpen(false);
      }
      // basic focus trap: Tab from last -> first
      if (e.key === "Tab") {
        const sheet = sheetRef.current;
        if (!sheet) return;
        const focusable = sheet.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
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
    // move focus to first actionable element
    setTimeout(() => firstSheetItemRef.current?.focus?.(), 0);

    return () => document.removeEventListener("keydown", onKey, { capture: true });
  }, [moreOpen]);

  const handleLogout = () => {
    // confirm + clean local state + navigate
    if (!window.confirm("Are you sure you want to logout?")) return;
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch {}
    navigate("/login");
  };

  return (
    <>
      {/* More Menu Overlay (sheet) */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 flex items-end"
          onClick={() => setMoreOpen(false)}
          aria-hidden={!moreOpen}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More options"
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

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-sm text-red-600 text-left"
              >
                <LogOut className="w-5 h-5 text-red-600" />
                <span className="font-medium">Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40"
        aria-label="Mobile primary"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-around max-w-7xl mx-auto">
          {navItems.map(({ to, label, Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/dashboard"}
              className={({ isActive }) => `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
              aria-label={label}
              aria-current={({ isActive }) => (isActive ? "page" : undefined)}
              onMouseEnter={() => prefetch(to)}
              onFocus={() => prefetch(to)}
            >
              <div className="relative">
                <Icon className="w-5 h-5" aria-hidden="true" />
                {/* optional badge: pass badgeCounts.orders etc */}
                {key === "orders" && badgeCounts?.orders > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center px-1">
                    {badgeCounts.orders > 99 ? "99+" : badgeCounts.orders}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5">{label}</span>
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setMoreOpen((s) => !s)}
            className={`${baseClasses} ${moreOpen ? activeClasses : inactiveClasses}`}
            aria-label="More options"
            aria-expanded={moreOpen}
            onMouseEnter={() => prefetch("/topup")}
            onFocus={() => prefetch("/topup")}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
            <span className="text-[11px] mt-0.5">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
