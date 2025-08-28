// src/components/adminavbar.jsx
import React, { useState } from "react";
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
} from "lucide-react";

export default function AdminAvbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { name: "Dashboard",    to: "/admin",            Icon: LayoutDashboard },
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
      localStorage.removeItem("token");
    } catch {}
    navigate("/login");
  };

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
              src="/logo192.png"
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/logo192.png";
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
    </nav>
  );
}
