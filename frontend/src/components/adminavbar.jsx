import React, { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  Menu,
  LayoutDashboard,
  ShoppingBag,
  Wallet,
  ClipboardList,
  CalendarClock,
  BarChart3,
  LogOut
} from "lucide-react";

export default function AdminAvbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { name: "Dashboard", to: "/admin", Icon: LayoutDashboard },
    { name: "Shops", to: "/admin/shops", Icon: ShoppingBag },
    { name: "Top-Up Verify", to: "/admin/topup", Icon: Wallet },
    { name: "Orders", to: "/admin/orders", Icon: ClipboardList },
    { name: "Reservations", to: "/admin/reservations", Icon: CalendarClock },
    { name: "Stats", to: "/admin/stats", Icon: BarChart3 },
  ];

  const base =
    "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition text-sm";
  const active = "text-blue-600 bg-blue-50";
  const idle = "text-gray-700";

  const handleLogout = () => {
    // TODO: call your auth logout / clear token
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-white/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Link to="/admin" className="font-semibold text-gray-900">
            Canteen Admin
          </Link>
        </div>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-2">
          {links.map(({ name, to, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${base} ${isActive ? active : idle}`
              }
              end={to === "/admin"}
            >
              <Icon className="w-4 h-4" />
              <span>{name}</span>
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="ml-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-900 text-white hover:bg-black"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t bg-white">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {links.map(({ name, to, Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `${base} ${isActive ? active : idle}`
                }
                end={to === "/admin"}
              >
                <Icon className="w-4 h-4" />
                <span>{name}</span>
              </NavLink>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                handleLogout();
              }}
              className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-900 text-white hover:bg-black"
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
