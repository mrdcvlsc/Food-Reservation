import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  Trash2,
} from "lucide-react";
import { api } from "../lib/api";
import NotificationItem from './NotificationItem';

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED';

// Custom hook for outside click detection
const useOutsideClick = (ref, callback) => {
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        callback();
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") callback();
    };
    
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [ref, callback]);
};

// Custom hook for notifications
const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get("/notifications/admin");
      setNotifications(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 10000);
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (ids) => {
    try {
      await api.post("/notifications/admin/mark-read", { ids });
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.post("/notifications/admin/mark-read", { all: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      await (api.del?.(`/notifications/admin/${id}`) || api.delete?.(`/notifications/admin/${id}`));
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      return true;
    } catch (err) {
      console.error("Failed to delete notification:", err);
      throw err;
    }
  }, []);

  const updateNotificationActor = useCallback((userId, updates) => {
    setNotifications((prev) =>
      prev.map((notif) => {
        if (notif.actor && String(notif.actor.id) === String(userId)) {
          return {
            ...notif,
            actor: {
              ...notif.actor,
              ...updates,
              profilePictureUrl: updates?.profilePictureUrl || notif.actor.profilePictureUrl,
            },
          };
        }
        return notif;
      })
    );
  }, []);

  return {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateNotificationActor,
  };
};

// Avatar Component
const Avatar = ({ user, size = "md" }) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-14 h-14",
    lg: "w-20 h-20",
  };

  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.name || "CA"
  )}&background=random`;

  if (user?.profilePictureUrl) {
    return (
      <img
        src={user.profilePictureUrl}
        alt={user.name || "User"}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white shadow-sm`}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = fallbackUrl;
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-lg font-medium text-blue-600`}
    >
      {(user?.name || "C").charAt(0).toUpperCase()}
    </div>
  );
};

// Notification Preview Modal Component
const NotificationPreviewModal = ({ notification, onClose, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(notification.id);
      onClose();
    } catch (err) {
      alert("Failed to delete notification. Please try again.");
      setIsDeleting(false);
    }
  };

  const adminFallback = { name: "Canteen Admin", profilePictureUrl: "/jckl-192.png" };
  const displayUser = notification.actor || adminFallback;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start gap-4 p-5 border-b bg-gradient-to-r from-blue-50 to-white">
          <div className="flex-shrink-0">
            <Avatar user={displayUser} size="md" />
          </div>

          <div className="flex-1 pr-8">
            <div className="text-xs text-gray-500 font-medium">
              From {displayUser.name}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mt-1">
              {notification.title}
            </h3>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(notification.createdAt).toLocaleString()}
            </div>
          </div>

          <button
            onClick={onClose}
            className="ml-3 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
          <p className="text-sm text-gray-700 mb-4 leading-relaxed">
            {notification.body}
          </p>

          {notification.data ? (
            <div className="bg-gray-50 border rounded-lg p-5 space-y-4">
              {/* Student Registration Details */}
              {notification.data.userId && notification.data.studentName && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Student Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-gray-500 uppercase font-semibold">
                          Student ID
                        </span>
                        <div className="font-mono font-medium text-gray-900 mt-1">
                          {notification.data.studentId}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <span className="text-xs text-gray-500 uppercase font-semibold">
                          Email
                        </span>
                        <div className="font-medium text-gray-900 mt-1 break-all">
                          {notification.data.email}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <span className="text-xs text-gray-500 uppercase font-semibold">
                          Phone
                        </span>
                        <div className="font-medium text-gray-900 mt-1">
                          {notification.data.phone}
                        </div>
                      </div>

                      {(notification.data.grade || notification.data.section) && (
                        <>
                          {notification.data.grade && (
                            <div>
                              <span className="text-xs text-gray-500 uppercase font-semibold">
                                Grade
                              </span>
                              <div className="font-medium text-gray-900 mt-1">
                                {notification.data.grade}
                              </div>
                            </div>
                          )}
                          {notification.data.section && (
                            <div>
                              <span className="text-xs text-gray-500 uppercase font-semibold">
                                Section
                              </span>
                              <div className="font-medium text-gray-900 mt-1">
                                {notification.data.section}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Reservation Details */}
              {notification.data.reservationId && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Reservation Details
                    </h4>
                    <span className="text-xs font-mono text-gray-500">
                      #{notification.data.reservationId}
                    </span>
                  </div>

                  {Array.isArray(notification.data.items) &&
                  notification.data.items.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        Items
                      </div>
                      <div className="rounded-md border bg-white overflow-hidden">
                        {notification.data.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 text-sm hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">
                                  {item.qty || 1}×
                                </span>
                                <span className="text-gray-700">{item.name}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                ID: {item.id}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-sm text-gray-600">
                                {peso.format(item.price || 0)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {peso.format((item.price || 0) * (item.qty || 1))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-blue-600">
                          {peso.format(notification.data.total ?? 0)}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {(notification.data.grade ||
                    notification.data.section ||
                    notification.data.student) && (
                    <div className="pt-3 border-t">
                      <div className="text-xs font-medium text-gray-500 uppercase mb-2">
                        Student Details
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {notification.data.student && (
                          <div>
                            <span className="text-gray-500">Name</span>
                            <div className="font-medium text-gray-900">
                              {typeof notification.data.student === "string"
                                ? notification.data.student
                                : notification.data.student.name || "N/A"}
                            </div>
                          </div>
                        )}
                        {notification.data.grade && (
                          <div>
                            <span className="text-gray-500">Grade</span>
                            <div className="font-medium text-gray-900">
                              {notification.data.grade}
                            </div>
                          </div>
                        )}
                        {notification.data.section && (
                          <div>
                            <span className="text-gray-500">Section</span>
                            <div className="font-medium text-gray-900">
                              {notification.data.section}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {notification.data.note && (
                    <div className="pt-3 border-t">
                      <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Note
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-gray-900">
                        {notification.data.note}
                      </div>
                    </div>
                  )}

                  {notification.data.slot && (
                    <div className="pt-2">
                      <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Pickup Time
                      </div>
                      <div className="font-medium text-gray-900">
                        {notification.data.slot}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Top-up Details */}
              {notification.data.amount && !notification.data.items && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Top-up Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm py-2 border-b">
                      <span className="text-gray-600">Amount</span>
                      <span className="font-semibold text-gray-900">
                        {peso.format(notification.data.amount)}
                      </span>
                    </div>
                    {notification.data.provider && (
                      <div className="flex justify-between text-sm py-2 border-b">
                        <span className="text-gray-600">Payment Method</span>
                        <span className="font-medium capitalize text-gray-900">
                          {notification.data.provider}
                        </span>
                      </div>
                    )}
                    {(notification.data.reference || notification.data.txId) && (
                      <div className="flex justify-between text-sm py-2 border-b">
                        <span className="text-gray-600">Reference</span>
                        <span className="font-mono font-medium text-gray-900 text-right break-all">
                          {notification.data.reference || notification.data.txId}
                        </span>
                      </div>
                    )}
                    {notification.data.status && (
                      <div className="flex justify-between text-sm py-2">
                        <span className="text-gray-600">Status</span>
                        <span
                          className={`font-semibold px-3 py-1 rounded-full text-xs ${
                            String(notification.data.status).toLowerCase() ===
                            "approved"
                              ? "bg-green-100 text-green-700"
                              : String(notification.data.status).toLowerCase() ===
                                "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : String(notification.data.status).toLowerCase() ===
                                "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {notification.data.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4">
              No additional details available.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Main Component
export default function AdminNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [topupsOpen, setTopupsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [previewNotif, setPreviewNotif] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const topupsRef = useRef(null);
  const notifRef = useRef(null);

  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateNotificationActor,
  } = useNotifications();

  // Close dropdowns when clicking outside
  useOutsideClick(topupsRef, () => setTopupsOpen(false));
  useOutsideClick(notifRef, () => setNotifOpen(false));

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Auto-mark notifications as read when panel opens
  useEffect(() => {
    if (!notifOpen) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  }, [notifOpen, notifications, markAsRead]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      const { userId, updates } = event?.detail || {};
      if (!userId) return;

      updateNotificationActor(userId, updates);

      if (previewNotif?.actor?.id === userId) {
        setPreviewNotif((prev) => ({
          ...prev,
          actor: {
            ...prev.actor,
            ...updates,
            profilePictureUrl:
              updates?.profilePictureUrl || prev.actor.profilePictureUrl,
          },
        }));
      }
    };

    window.addEventListener(USER_PROFILE_UPDATED, handleProfileUpdate);
    return () =>
      window.removeEventListener(USER_PROFILE_UPDATED, handleProfileUpdate);
  }, [updateNotificationActor, previewNotif]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const navLinks = [
    { name: "Dashboard", to: "/admin", Icon: LayoutDashboard },
    { name: "Shops", to: "/admin/shops", Icon: ShoppingBag },
    { name: "Inventory", to: "/admin/inventory", Icon: Box },
    { name: "Orders", to: "/admin/orders", Icon: ClipboardList },
    { name: "Reservations", to: "/admin/reservations", Icon: CalendarClock },
    { name: "Users", to: "/admin/users", Icon: ShieldCheck },
    { name: "Reports", to: "/admin/reports", Icon: BarChart3 },
  ];

  const baseClasses =
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
  const idleClasses = "text-gray-700 hover:text-blue-700 hover:bg-blue-50";
  const activeClasses =
    "text-blue-700 bg-blue-100 font-semibold shadow-[inset_0_-2px_0_0_theme(colors.blue.600)]";

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch {}
    navigate("/login");
  };

  const openNotification = async (notification) => {
    setPreviewNotif(notification);
    if (!notification.read) {
      await markAsRead([notification.id]);
    }
  };

  return (
    <>
      {/* Mobile notifications dropdown */}
      {notifOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 sm:top-16 z-50 bg-white border-b shadow-lg max-h-[60vh] overflow-y-auto animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between p-2 sm:p-3 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={() => setNotifOpen(false)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <NotificationItem
                    notification={notification}
                    onClick={() => {
                      openNotification(notification);
                      setNotifOpen(false);
                    }}
                    isAdminSide={true}
                  />
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-2 border-t flex items-center justify-between bg-gray-50 text-xs sm:text-sm">
              <Link
                to="/admin/notifications"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                onClick={() => setNotifOpen(false)}
              >
                See all notifications
              </Link>
              <button
                onClick={() => {
                  markAllAsRead();
                  setNotifOpen(false);
                }}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                Mark all read
              </button>
            </div>
          )}
        </div>
      )}

      <nav className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-7xl mx-auto h-14 sm:h-16 px-3 sm:px-4 lg:px-8 flex items-center justify-between">
          {/* Brand */}
          <Link
            to="/admin"
            className="group flex items-center gap-2 sm:gap-3 min-w-0 hover:opacity-80 transition-opacity"
            aria-label="Admin Home"
          >
            <div className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-xl overflow-hidden ring-1 ring-gray-200 bg-white">
              <img
                src="/jckl-192.png"
                alt="Canteen Logo"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/jckl-192.png";
                }}
              />
            </div>
            <div className="hidden md:flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span className="truncate font-semibold text-gray-900">
                Canteen Admin
              </span>
            </div>
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1">
              {navLinks.map(({ name, to, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/admin"}
                  className={({ isActive }) =>
                    `${baseClasses} ${isActive ? activeClasses : idleClasses}`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{name}</span>
                </NavLink>
              ))}
            </div>

            {/* Topups dropdown */}
            <div className="relative" ref={topupsRef}>
              <button
                onClick={() => setTopupsOpen((v) => !v)}
                className={`${baseClasses} ${idleClasses} ml-2`}
                aria-expanded={topupsOpen}
                aria-haspopup="menu"
              >
                <Wallet className="w-4 h-4" />
                <span>Top-ups</span>
              </button>

              {topupsOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-40 p-2 animate-in fade-in zoom-in-95 duration-200">
                  <Link
                    to="/admin/topup"
                    className={`${baseClasses} ${idleClasses} w-full justify-start`}
                    onClick={() => setTopupsOpen(false)}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Top-Up Management</span>
                  </Link>
                  <Link
                    to="/admin/topup/history"
                    className={`${baseClasses} ${idleClasses} w-full justify-start`}
                    onClick={() => setTopupsOpen(false)}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Top-Up History</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Notifications (desktop) */}
            <div className="relative ml-2" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="p-2 rounded-lg hover:bg-gray-100 relative transition-colors"
                aria-label="Admin notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-md animate-in zoom-in duration-200">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-96 max-h-[70vh] overflow-hidden bg-white border rounded-lg shadow-xl z-40 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                        onClick={markAllAsRead}
                      >
                        Mark all
                      </button>
                      <Link
                        to="/admin/notifications"
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        See all
                      </Link>
                    </div>
                  </div>
                  <div className="divide-y overflow-y-auto max-h-[calc(70vh-60px)]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-2 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <NotificationItem
                            notification={n}
                            onClick={() => openNotification(n)}
                            isAdminSide
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className={`${baseClasses} ${idleClasses} ml-3`}
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile: notification bell and hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="p-2 rounded-lg hover:bg-gray-100 relative transition-colors"
              aria-label="Admin notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-md">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white animate-in slide-in-from-top duration-200">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <p className="px-1 mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                Navigation
              </p>
              <div className="flex flex-col gap-1">
                {navLinks.map(({ name, to, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/admin"}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `${baseClasses} ${isActive ? activeClasses : idleClasses}`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{name}</span>
                  </NavLink>
                ))}
                <div className="border-t pt-2 mt-1">
                  <div className="text-[11px] font-medium uppercase text-gray-500 px-1 mb-1">
                    Top-ups
                  </div>
                  <NavLink
                    to="/admin/topup"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`${baseClasses} ${idleClasses}`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Top-Up Management</span>
                  </NavLink>
                  <NavLink
                    to="/admin/topup/history"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`${baseClasses} ${idleClasses}`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Top-Up History</span>
                  </NavLink>
                </div>
              </div>

              <div className="my-3 h-px bg-gray-200" />

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className={`${baseClasses} w-full justify-center text-white bg-gray-900 hover:bg-black`}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Notification preview modal */}
      {previewNotif && (
        <NotificationPreviewModal
          notification={previewNotif}
          onClose={() => setPreviewNotif(null)}
          onDelete={deleteNotification}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md mx-4 w-full animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
                Log Out?
              </h3>
              <p className="text-gray-600 mb-8 text-center">
                You'll need to sign in again to access the admin dashboard.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-5 py-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-5 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-semibold shadow-lg"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}