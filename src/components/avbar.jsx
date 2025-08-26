// src/components/avbar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart } from "lucide-react";

const LINKS = [
  { to: "/dashboard",    label: "Dashboard" },
  { to: "/shop",         label: "Shop" },
  { to: "/topup",        label: "Top-Up" },
  { to: "/transactions", label: "History" }, // you already have TxHistory at /transactions
  { to: "/profile",      label: "Profile" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // lightweight cart badge sourced from localStorage (compatible with any Cart.jsx)
  const [cartCount, setCartCount] = useState(0);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cart") || "[]");
      const count = Array.isArray(saved)
        ? saved.reduce((a, b) => a + (b?.qty || 0), 0)
        : Object.values(saved || {}).reduce((a, b) => a + (b || 0), 0);
      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  }, []);

  // recompute when storage changes (other tabs / pages)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "cart") {
        try {
          const saved = JSON.parse(e.newValue || "[]");
          const count = Array.isArray(saved)
            ? saved.reduce((a, b) => a + (b?.qty || 0), 0)
            : Object.values(saved || {}).reduce((a, b) => a + (b || 0), 0);
          setCartCount(count);
        } catch {
          setCartCount(0);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const base =
    "inline-flex items-center px-3 py-2 rounded-lg text-sm transition";
  const idle = "text-gray-700 hover:text-blue-600 hover:bg-blue-50";
  const active = "text-blue-700 bg-blue-100 font-semibold";

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-white/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link to="/dashboard" className="font-semibold text-gray-900">
          Canteen
        </Link>

        {/* desktop */}
        <ul className="hidden md:flex items-center gap-1">
          {LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `${base} ${isActive ? active : idle}`
                }
                end={to === "/dashboard"}
              >
                {label}
              </NavLink>
            </li>
          ))}

          <button
            onClick={() => navigate("/cart")}
            className={`${base} ${idle} ml-1 relative`}
            aria-label="Open cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] leading-[18px] text-center px-1">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>
        </ul>

        {/* mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="md:hidden border-t bg-white">
          <ul className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {LINKS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === "/dashboard"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `${base} w-full ${isActive ? active : idle}`
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
              className={`${base} ${idle} w-full justify-start`}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Cart
              {cartCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] px-1">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>
          </ul>
        </div>
      )}
    </nav>
  );
}
