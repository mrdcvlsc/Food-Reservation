// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* ---------- Public ---------- */
import Landing      from "./pages/Landing";
import Register     from "./pages/Register";
import Login        from "./pages/Login";

/* ---------- student-facing ---------- */
import Dashboard    from "./pages/student/Dashboard";
import Shop         from "./pages/student/Shop";
import TopUp        from "./pages/student/TopUp";
import Cart         from "./pages/student/Cart";
import Profile      from "./pages/student/Profile";
import EditProfile  from "./pages/student/EditProfile";
import TxHistory    from "./pages/student/TxHistory";
import TopUpHistory from "./pages/student/TopUpHistory";

/* --------------- Admin screens --------------- */
import AdminHome           from "./pages/admin/adminhomes";
import AdminShop           from "./pages/admin/adminShop";
import AdminAddRice        from "./pages/admin/adminAddRice";
import AdminAddSnacks      from "./pages/admin/adminAddSnacks";
import AdminAddDrinks      from "./pages/admin/adminAddDrinks";
import AdminEditCategories from "./pages/admin/adminEditCategories";
import AdminEditItems      from "./pages/admin/adminEditItems";
import AdminTopUp          from "./pages/admin/adminTopUp";
import AdminOrders         from "./pages/admin/adminOrders";
import AdminSummary        from "./pages/admin/adminSummary";
import AdminReservations   from "./pages/admin/adminReservations";
import AdminApproved       from "./pages/admin/adminApproved";
import AdminStats          from "./pages/admin/adminStats";
import AdminInventory      from "./pages/admin/adminInventory";
import AdminReports        from "./pages/admin/adminReports";
import AdminUsers          from "./pages/admin/AdminUsers";

/* --------------- status pages --------------- */
import { 
  Forbidden,
  Maintenance,
  NotFound,
  ServerError,
  SomethingWentWrong,
  Unauthorized
} from "./pages/StatusPages";

/* --------------- Components --------------- */
import Loading      from "./components/Loading";
import BackButton from "./components/BackButton";

function App() {
  return (
    <BrowserRouter>
  <BackButton />
      <Routes>
        {/* ---------- Public routes ---------- */}
        <Route path="/"               element={<Landing />} />
        <Route path="/loading"        element={<Loading />} />
        <Route path="/register"       element={<Register />} />
        <Route path="/login"          element={<Login />} />

        {/* ---------- student routes ---------- */}
        <Route path="/cart"           element={<Cart />} />
        <Route path="/dashboard"      element={<Dashboard />} />
        <Route path="/profile/edit"   element={<EditProfile />} />
        <Route path="/profile"        element={<Profile />} />
        <Route path="/shop"           element={<Shop />} />
        <Route path="/topup"          element={<TopUp />} />
        <Route path="/topup-history"  element={<TopUpHistory />} />
        <Route path="/transactions"   element={<TxHistory />} />
        {/* alias for older links */}
        <Route path="/topup/history"  element={<TopUpHistory />} />

        {/* ----------------- Admin routes ----------------- */}
        <Route path="/admin"                          element={<AdminHome />} />

        {/* Inventory list (support both /shop and /shops for compatibility) */}
        {/* <Route path="/admin/shop"                     element={<AdminShop />} /> */}
        <Route path="/admin/shops"                    element={<AdminShop />} />

        {/* Add forms */}
        <Route path="/admin/shop/add-rice"            element={<AdminAddRice />} />
        <Route path="/admin/shop/add-drinks"          element={<AdminAddDrinks />} />
        <Route path="/admin/shop/add-snacks"          element={<AdminAddSnacks />} />
        {/* aliases for earlier links used in some pages */}
        <Route path="/admin/shops/add"                element={<AdminAddRice />} />
        <Route path="/admin/shops/add-drink"          element={<AdminAddDrinks />} />
        <Route path="/admin/shops/add-snack"          element={<AdminAddSnacks />} />

        {/* Edit screens */}
        <Route path="/admin/shop/edit-categories"     element={<AdminEditCategories />} />
        <Route path="/admin/shop/edit-items"          element={<AdminEditItems />} />

        {/* Wallet top-ups & orders */}
        <Route path="/admin/topup"                    element={<AdminTopUp />} />
        <Route path="/admin/orders"                   element={<AdminOrders />} />
        <Route path="/admin/orders/summary"           element={<AdminSummary />} />

        {/* Reservations */}
        <Route path="/admin/reservations"             element={<AdminReservations />} />
        <Route path="/admin/reservations/approved"    element={<AdminApproved />} />

        {/* Stats */}
        <Route path="/admin/stats"                    element={<AdminStats />} />
        <Route path="/admin/inventory"                element={<AdminInventory />} />

        {/* Reports */}
        <Route path="/admin/reports"                element={<AdminReports />} />
        <Route path="/admin/users"                element={<AdminUsers />} />

        {/* ---------- status pages ---------- */}
        <Route path="/status/maintenance"          element={<Maintenance />} />
        <Route path="/status/not_found"            element={<NotFound />} />
        <Route path="/status/server_error"         element={<ServerError />} />
        <Route path="/status/unauthorized"         element={<Unauthorized />} />
        <Route path="/status/forbidden"            element={<Forbidden />} />
        <Route path="/status/something_went_wrong" element={<SomethingWentWrong />} />

        {/* Public read-only menu alias */}
        <Route path="/menu" element={<Shop publicView={true} />} />

        {/* ------------- Fallback / 404 redirect ------------- */}
        <Route path="*" element={<Navigate to="/status/not_found" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
