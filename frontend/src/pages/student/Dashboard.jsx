// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import Navbar from "../../components/avbar";
import { api, ApiError } from "../../lib/api";
import { refreshSessionForProtected } from "../../lib/auth";
import { getUserFromStorage, setUserToStorage, clearAllAuthStorage } from "../../lib/storage";
import {
  ShoppingBag,
  Wallet,
  ClipboardList,
  LogOut,
  ArrowRight,
  Clock,
  UtensilsCrossed,
  Cookie,
  CupSoda,
  CheckCircle2,
  X,
} from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

// Canonical status mapping for consistency
const STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  CLAIMED: 'CLAIMED',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
};

const canonicalizeStatus = (rawStatus) => {
  const normalized = String(rawStatus || '').toUpperCase().trim();
  
  // Map backend variants to canonical statuses
  if (['PENDING', 'QUEUED', 'WAITING'].includes(normalized)) return STATUS.PENDING;
  if (['APPROVED', 'CONFIRMED', 'ACCEPTED'].includes(normalized)) return STATUS.APPROVED;
  if (['PREPARING', 'COOKING', 'IN_PROGRESS'].includes(normalized)) return STATUS.PREPARING;
  if (['READY', 'READY_FOR_PICKUP', 'DONE'].includes(normalized)) return STATUS.READY;
  if (['CLAIMED', 'PICKED_UP', 'COMPLETED'].includes(normalized)) return STATUS.CLAIMED;
  if (['SUCCESS', 'SUCCESSFUL', 'PAID'].includes(normalized)) return STATUS.SUCCESS;
  if (['FAILED', 'FAILURE', 'ERROR'].includes(normalized)) return STATUS.FAILED;
  if (['REJECTED', 'DECLINED', 'CANCELLED'].includes(normalized)) return STATUS.REJECTED;
  
  return STATUS.PENDING; // default fallback
};

const getStatusConfig = (status) => {
  const configs = {
    [STATUS.PENDING]: {
      label: 'Pending',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      ariaLabel: 'Order status: Pending approval',
    },
    [STATUS.APPROVED]: {
      label: 'Approved',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
      ariaLabel: 'Order status: Approved, being prepared',
    },
    [STATUS.PREPARING]: {
      label: 'Preparing',
      className: 'bg-violet-50 text-violet-700 border-violet-200',
      ariaLabel: 'Order status: Currently being prepared',
    },
    [STATUS.READY]: {
      label: 'Ready',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ariaLabel: 'Order status: Ready for pickup',
    },
    [STATUS.CLAIMED]: {
      label: 'Claimed',
      className: 'bg-gray-100 text-gray-700 border-gray-200',
      ariaLabel: 'Order status: Claimed and completed',
    },
    [STATUS.SUCCESS]: {
      label: 'Success',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ariaLabel: 'Transaction status: Successful',
    },
    [STATUS.FAILED]: {
      label: 'Failed',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
      ariaLabel: 'Transaction status: Failed',
    },
    [STATUS.REJECTED]: {
      label: 'Rejected',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
      ariaLabel: 'Order status: Rejected',
    },
  };
  
  return configs[status] || configs[STATUS.PENDING];
};

// Format relative time with fallback for invalid dates
const formatRelativeTime = (timestamp) => {
  try {
    const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
    if (!isValid(date)) {
      return { relative: 'Recently', full: 'Invalid date' };
    }
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      full: date.toLocaleString('en-PH', { 
        dateStyle: 'full', 
        timeStyle: 'medium' 
      }),
    };
  } catch (e) {
    console.warn('Invalid timestamp:', timestamp, e);
    return { relative: 'Recently', full: String(timestamp) };
  }
};

// ActivityItem Component - Clickable and keyboard accessible
const ActivityItem = ({ activity, onClick }) => {
  const canonical = canonicalizeStatus(activity.status);
  const statusConfig = getStatusConfig(canonical);
  const timeData = formatRelativeTime(activity.time);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(activity);
    }
  };
  
  return (
    <li>
      <button
        onClick={() => onClick(activity)}
        onKeyDown={handleKeyDown}
        className="w-full py-3 flex items-center justify-between text-left hover:bg-gray-50 rounded-lg px-2 -mx-2 transition focus-ring"
        aria-label={`View details for ${activity.title}, ${statusConfig.ariaLabel}, ${timeData.relative}`}
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900 truncate">
            {activity.title}
          </div>
          <div className="mt-1 text-xs text-gray-500 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1" title={timeData.full}>
              <Clock className="w-3 h-3" />
              {timeData.relative}
            </span>
            <span 
              className={`inline-flex items-center px-2 py-0.5 rounded-full border ${statusConfig.className}`}
              aria-label={statusConfig.ariaLabel}
            >
              {statusConfig.label}
            </span>
            {activity.reference && (
              <span className="inline-flex items-center text-xs text-gray-400 font-mono" title="Transaction Reference">
                #{activity.reference}
              </span>
            )}
          </div>
        </div>
        <div className="text-sm font-semibold text-gray-900 ml-4">
          {peso.format(activity.amount || 0)}
        </div>
      </button>
    </li>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  
  // --- Ready orders notification ---
  const [dismissedReadyOrders, setDismissedReadyOrders] = useState(() => {
    // Session-based dismissal (cleared on page refresh)
    return sessionStorage.getItem('dismissedReadyOrders') === 'true';
  });

  useEffect(() => {
    (async () => {
      await refreshSessionForProtected({ navigate, requiredRole: 'student', setUser });
    })();
  }, [navigate]);

  // --- loading & error states ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- user & balance ---
  const [user, setUser] = useState(() => {
    return getUserFromStorage() || {};
  });

  const balance = useMemo(() => {
    const val = user?.balance;
    if (typeof val === "number") return val;
    if (val && !isNaN(parseFloat(val))) return parseFloat(val);
    return 0;
  }, [user]);

  // --- recent activity (orders / transactions) ---
  const [activity, setActivity] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = React.useRef(null);

  const fetchArr = async (path, signal) => {
    try {
      const { data } = await api.get(path, { signal });
      if (Array.isArray(data)) return data;
      return [];
    } catch(e) {
      // Don't process errors if request was aborted
      if (e.name === 'AbortError') {
        console.log(`Request to ${path} was aborted`);
        return [];
      }

      if (e instanceof ApiError) {
        switch (e.status) {
          case ApiError.Maintenance:  navigate("/status/maintenance");  break;
          case ApiError.NotFound:     navigate("/status/not_found");    break;
          case ApiError.ServerError:  navigate("/status/server_error"); break;
          case ApiError.Unauthorized: navigate("/status/unauthorized"); break;
          case ApiError.Forbidden:    navigate("/status/unauthorized"); break;
          default:
        }
      }

      throw e; // Re-throw for retry logic
    }
  };

  const loadActivity = async (signal) => {
    try {
      const [reservations, txs] = await Promise.all([
        fetchArr('/reservations/mine', signal), 
        fetchArr('/transactions/mine', signal)
      ]);

      const rows = [];

      if (Array.isArray(reservations) && reservations.length > 0) {
        for (const r of reservations) {
          rows.push({
            id: r.id || `R-${rows.length + 1}`,
            title: r.title || 'Reservation',
            amount: Math.abs(Number(r.total || r.amount || 0) || 0),
            time: r.createdAt || r.date || r.time || new Date().toISOString(),
            status: r.status || 'Pending',
            direction: 'debit',
            type: 'reservation',
            items: r.items || [],
            reference: r.id // Add reference for auditability
          });
        }
      }

      if (Array.isArray(txs) && txs.length > 0) {
        for (const t of txs) {
          const id = t.id || t.txId || `TX-${rows.length + 1}`;
          const direction = t.direction || 'debit';
          const ref = String(t.ref || t.reference || t.reservationId || '').toLowerCase();
          const isReservationRef = ref.includes('res') || ref.startsWith('r-');
          
          // Only include transactions that are related to orders
          if (isReservationRef || t.type === 'Reservation') {
            rows.push({
              id,
              title: t.title || t.type || 'Transaction',
              amount: Math.abs(Number(t.amount ?? t.total ?? t.value ?? 0) || 0),
              time: t.createdAt || t.time || t.date || new Date().toISOString(),
              status: t.status || t.state || 'Success',
              direction,
              type: 'transaction',
              reference: ref || id // Add reference for auditability
            });
          }
        }
      }

      // Sort by time desc
      rows.sort((a, b) => new Date(b.time) - new Date(a.time));
      
      // Only update state if not aborted
      if (!signal?.aborted) {
        setActivity(rows);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Failed to load activity:", err);
        if (!signal?.aborted) {
          setActivity([]);
        }
        throw err; // Re-throw for retry logic
      }
    }
  };

  // Keep wallet in sync with server (SERVER-TRUTH)
  const syncWallet = async (signal) => {
    try {
      // Prefer full user object from server. Some endpoints return { balance } only.
      // SERVER IS SOURCE OF TRUTH - always trust the API response
      const { data: me } = await api.get("/wallets/me", { signal });
      
      if (!signal?.aborted && me && (me.id || me.balance != null)) {
        const curLocal = getUserFromStorage() || {};
        const merged = { ...curLocal, ...(me || {}) };
        
        // Ensure balance is numeric - SERVER VALUE TAKES PRECEDENCE
        if (merged.balance && typeof merged.balance !== "number") {
          merged.balance = Number(merged.balance) || 0;
        }
        
        // Update localStorage as cache only
        setUserToStorage(merged);
        setUser(merged);
  
        // reload recent activity after wallet sync (user identity may have changed)
        await loadActivity(signal);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("Failed to sync wallet:", e);
        throw e; // Re-throw for retry logic
      }
      // Ignore abort errors, keep local cached state
    }
  };

  // Exponential backoff retry logic
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  const loadDataWithRetry = async (signal, attempt = 0) => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    
    try {
      await Promise.all([
        loadActivity(signal),
        syncWallet(signal)
      ]);
      
      // Success - reset retry count
      if (!signal?.aborted) {
        setRetryCount(0);
      }
    } catch (err) {
      if (err.name === 'AbortError' || signal?.aborted) {
        return; // Don't retry if aborted
      }

      // Check if it's a 5xx server error that should be retried
      const isServerError = err instanceof ApiError && 
                           err.status >= 500 && 
                           err.status < 600;
      
      if (isServerError && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        
        if (!signal?.aborted) {
          setRetryCount(attempt + 1);
        }
        
        await sleep(delay);
        
        if (!signal?.aborted) {
          return loadDataWithRetry(signal, attempt + 1);
        }
      } else {
        // Final failure or non-retryable error
        throw err;
      }
    }
  };

  useEffect(() => {
    // Create new AbortController for this effect
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await loadDataWithRetry(signal, 0);
      } catch (err) {
        if (err.name !== 'AbortError' && !signal.aborted) {
          console.error("Failed to load dashboard data:", err);
          
          // User-friendly error messages
          let errorMessage = "Failed to load dashboard data. Please try again.";
          if (err instanceof ApiError) {
            if (err.status >= 500) {
              errorMessage = "Server is experiencing issues. We'll keep trying automatically.";
            } else if (err.status === 401 || err.status === 403) {
              errorMessage = "Session expired. Please log in again.";
            }
          } else if (err.message) {
            errorMessage = err.message;
          }
          
          setError(errorMessage);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    const onStorage = (e) => {
      if (["transactions", "orders", "user"].includes(e.key)) {
        if (e.key === "user") {
          try { 
            const newUser = JSON.parse(e.newValue || "{}");
            // Only update if not currently loading (avoid conflicts)
            if (!loading) {
              setUser(newUser);
            }
          } catch {}
        } else {
          // Re-fetch from server to get truth
          if (!loading && abortControllerRef.current) {
            loadActivity(abortControllerRef.current.signal);
          }
        }
      }
    };
    
    window.addEventListener("storage", onStorage);
    
    // Cleanup: abort all pending requests on unmount
    return () => {
      window.removeEventListener("storage", onStorage);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  // --- derived stats (simple, school-friendly) ---
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter for current month's activity
    const thisMonth = activity.filter((a) => {
      const d = new Date(a.time);
      return !isNaN(d) && 
             d.getMonth() === currentMonth && 
             d.getFullYear() === currentYear;
    });

    // Only count orders that were Approved, Preparing, Ready, or Claimed
    const validStatuses = new Set(["Approved", "Preparing", "Ready", "Claimed"]);
    const validOrders = thisMonth.filter(a => validStatuses.has(a.status));
    const ordersCount = validOrders.length;

    // Only sum amounts for valid orders
    const totalSpent = validOrders.reduce((s, a) => s + (a.amount || 0), 0);

    // Count orders ready for pickup
    const readyCount = activity.filter((a) => canonicalizeStatus(a.status) === STATUS.READY).length;

    return { ordersCount, totalSpent, readyCount };
  }, [activity]);
  
  // Ready orders for callout
  const readyOrders = useMemo(() => {
    return activity.filter((a) => canonicalizeStatus(a.status) === STATUS.READY);
  }, [activity]);
  
  const showReadyOrdersBanner = readyOrders.length > 0 && !dismissedReadyOrders;
  
  const handleDismissReadyOrders = () => {
    setDismissedReadyOrders(true);
    sessionStorage.setItem('dismissedReadyOrders', 'true');
  };
  
  // Handle activity item click
  const handleActivityClick = (activity) => {
    if (activity.type === 'reservation') {
      navigate(`/orders/${activity.id}`);
    } else {
      // For transactions, you can navigate to transaction details or transactions page
      navigate(`/transactions#${activity.id}`);
    }
  };

  // --- greeting ---
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // --- actions ---
  const handleLogout = () => {
    clearAllAuthStorage();
    navigate("/login");
  };

  // how many recent activity items to show on dashboard
  const RECENT_LIMIT = 5;
  
  // slice for dashboard preview (show only latest RECENT_LIMIT)
  const recentPreview = activity.slice(0, RECENT_LIMIT);

  // --- Skeleton Components ---
  const SkeletonWalletButton = () => (
    <div 
      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm" 
      role="status" 
      aria-live="polite" 
      aria-label="Loading wallet"
      aria-hidden={!loading}
    >
      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
      <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
    </div>
  );

  const SkeletonStatsCard = () => (
    <div 
      className="rounded-2xl p-5 shadow-sm border border-gray-100 bg-white" 
      role="status" 
      aria-live="polite"
      aria-hidden={!loading}
    >
      <div className="w-32 h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
      <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
    </div>
  );

  const SkeletonActivityRow = () => (
    <li className="py-3 flex items-center justify-between">
      <div className="min-w-0 flex-1">
        <div className="w-48 h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
        <div className="w-32 h-3 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
    </li>
  );

  // --- Retry function ---
  const handleRetry = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new controller for retry
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    setLoading(true);
    setError(null);
    setRetryCount(0);
    
    try {
      await loadDataWithRetry(signal, 0);
    } catch (err) {
      if (err.name !== 'AbortError' && !signal.aborted) {
        console.error("Retry failed:", err);
        
        let errorMessage = "Failed to load dashboard data. Please try again.";
        if (err instanceof ApiError && err.status >= 500) {
          errorMessage = "Server is still experiencing issues. Please try again later.";
        }
        
        setError(errorMessage);
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between" role="alert">
            <div className="flex-1">
              <h3 className="font-semibold text-rose-900 mb-1">Error Loading Dashboard</h3>
              <p className="text-sm text-rose-700">{error}</p>
              {retryCount > 0 && (
                <p className="text-xs text-rose-600 mt-1">
                  Auto-retry attempt {retryCount}/3 failed
                </p>
              )}
            </div>
            <button
              onClick={handleRetry}
              className="ml-4 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition font-medium text-sm focus-ring-white"
            >
              Retry Now
            </button>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {greeting}, {user?.name || "Student"}
            </h1>
            <p className="text-gray-600">Reserve ahead and skip the line.</p>
          </div>

          {loading ? (
            <SkeletonWalletButton />
          ) : (
            <button
              onClick={() => navigate("/profile")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition font-medium text-gray-800 focus-ring"
            >
              <Wallet className="w-4 h-4 text-emerald-600" />
              Wallet: <span className="font-semibold">{peso.format(balance)}</span>
            </button>
          )}
        </header>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate("/shop")}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-left focus-ring"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Order Food</h3>
                <p className="text-sm text-gray-500">Browse menu & reserve</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/topup")}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-left focus-ring"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Top-Up</h3>
                <p className="text-sm text-gray-500">Add balance via QR</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/transactions")}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-left focus-ring"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">History</h3>
                <p className="text-sm text-gray-500">View orders & top-ups</p>
              </div>
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-left focus-ring"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <LogOut className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Logout</h3>
                <p className="text-sm text-gray-500">Sign out of your account</p>
              </div>
            </div>
          </button>
        </section>

        {/* Stats (neutral, no "member status") */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading ? (
            <>
              <SkeletonStatsCard />
              <SkeletonStatsCard />
              <SkeletonStatsCard />
            </>
          ) : (
            <>
              <div className="rounded-2xl p-5 shadow-sm border border-gray-100 bg-white">
                <p className="text-sm text-gray-600">Orders this month</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{stats.ordersCount}</p>
              </div>
              <div className="rounded-2xl p-5 shadow-sm border border-gray-100 bg-white">
                <p className="text-sm text-gray-600">Total spent this month</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {peso.format(stats.totalSpent)}
                </p>
              </div>
              <div className="rounded-2xl p-5 shadow-sm border border-gray-100 bg-white">
                <p className="text-sm text-gray-600">Ready for pickup</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{stats.readyCount}</p>
              </div>
            </>
          )}
        </section>

        {/* Ready Orders Callout Banner */}
        {showReadyOrdersBanner && (
          <section 
            className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 shadow-sm"
            role="status"
            aria-live="polite"
            aria-label={`You have ${readyOrders.length} order${readyOrders.length > 1 ? 's' : ''} ready for pickup`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-900 mb-1">
                    🎉 {readyOrders.length} Order{readyOrders.length > 1 ? 's' : ''} Ready for Pickup!
                  </h3>
                  <p className="text-sm text-emerald-700">
                    Your food is ready. Please proceed to the canteen counter to claim your order.
                  </p>
                  {readyOrders.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {readyOrders.slice(0, 3).map((order) => (
                        <li key={order.id} className="text-xs text-emerald-600">
                          • {order.title} - {peso.format(order.amount)}
                        </li>
                      ))}
                      {readyOrders.length > 3 && (
                        <li className="text-xs text-emerald-600">
                          • And {readyOrders.length - 3} more...
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
              <button
                onClick={handleDismissReadyOrders}
                className="text-emerald-700 hover:text-emerald-900 p-1 rounded focus-ring"
                aria-label="Dismiss ready orders notification"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </section>
        )}

        {/* Recent Activity */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
              {!loading && (
                <div className="text-sm text-gray-500">Showing {recentPreview.length} of {activity.length} recent items</div>
              )}
            </div>
            <button
              onClick={() => navigate("/transactions")}
              className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 focus-ring"
            >
              See all <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <ul className="divide-y divide-gray-100" role="status" aria-live="polite" aria-label="Loading recent activity" aria-hidden={!loading}>
              <SkeletonActivityRow />
              <SkeletonActivityRow />
              <SkeletonActivityRow />
              <SkeletonActivityRow />
              <SkeletonActivityRow />
            </ul>
          ) : activity.length === 0 ? (
             <div className="text-sm text-gray-500 py-8 text-center">
               No recent activity. Start by reserving from the <b>Shop</b>.
             </div>
           ) : (
             <ul className="divide-y divide-gray-100">
              {recentPreview.map((a) => (
                <ActivityItem 
                  key={a.id} 
                  activity={a} 
                  onClick={handleActivityClick}
                />
              ))}
             </ul>
           )}
        </section>

        {/* Categories quick access (neutral chips) */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <button
              onClick={() => navigate("/shop")}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-center focus-ring"
            >
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-gray-700" />
              </div>
              <div className="text-sm font-medium text-gray-900">Rice Meals</div>
            </button>
            <button
              onClick={() => navigate("/shop")}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-center focus-ring"
            >
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-gray-700" />
              </div>
              <div className="text-sm font-medium text-gray-900">Noodles</div>
            </button>
            <button
              onClick={() => navigate("/shop")}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-center focus-ring"
            >
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Cookie className="w-5 h-5 text-gray-700" />
              </div>
              <div className="text-sm font-medium text-gray-900">Snacks</div>
            </button>
            <button
              onClick={() => navigate("/shop")}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-center focus-ring"
            >
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <CupSoda className="w-5 h-5 text-gray-700" />
              </div>
              <div className="text-sm font-medium text-gray-900">Beverages</div>
            </button>
            <button
              onClick={() => navigate("/shop")}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-center focus-ring"
            >
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Cookie className="w-5 h-5 text-gray-700" />
              </div>
              <div className="text-sm font-medium text-gray-900">Desserts</div>
            </button>
            <button
              onClick={() => navigate("/shop")}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition border border-gray-100 text-center focus-ring"
            >
              <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-gray-700" />
              </div>
              <div className="text-sm font-medium text-gray-900">Breakfast</div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
