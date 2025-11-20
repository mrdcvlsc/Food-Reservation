import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const CartContext = createContext(null);

function getCartStorageKey(userId) {
  return userId ? `cart_${userId}` : "cart_guest";
}

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.id || null;
  } catch {
    return null;
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState({}); // { [id]: qty }
  const [meta, setMeta] = useState({ syncing: false, lastSyncAt: null, lastError: null });
  const [currentUserId, setCurrentUserId] = useState(() => getCurrentUserId());
  const [isInitialized, setIsInitialized] = useState(false);

  // persistence helper - now user-specific
  const persist = useCallback((next, userId) => {
    try {
      const key = getCartStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(next));
      console.log(`[Cart] Persisted to ${key}:`, next);
    } catch (e) {
      console.error("[Cart] Storage error:", e);
    }
  }, []);

  // Watch for user changes (login/logout)
  useEffect(() => {
    let mounted = true;
    
    const checkUserChange = () => {
      const newUserId = getCurrentUserId();
      
      // User actually changed
      if (newUserId !== currentUserId) {
        console.log(`[Cart] User changed: ${currentUserId} -> ${newUserId}`);
        
        // Clear old user's cart from memory
        setCart({});
        setCurrentUserId(newUserId);
        setMeta({ syncing: false, lastSyncAt: null, lastError: null });
        
        // Load new user's cart from localStorage
        if (newUserId) {
          const storageKey = getCartStorageKey(newUserId);
          try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
            if (saved && typeof saved === "object" && Object.keys(saved).length > 0) {
              if (mounted) setCart(saved);
              console.log(`[Cart] Loaded cart for user ${newUserId}:`, saved);
            } else {
              if (mounted) setCart({});
            }
          } catch (e) {
            console.error("[Cart] Error loading cart:", e);
            if (mounted) setCart({});
          }
        } else {
          // No user logged in
          if (mounted) setCart({});
        }
      }
    };

    // Check immediately
    checkUserChange();

    // Listen for storage changes from other tabs
    const handleStorageChange = (e) => {
      if (e.key === "user") {
        console.log("[Cart] User changed in another tab");
        checkUserChange();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    setIsInitialized(true);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      mounted = false;
    };
  }, [currentUserId]);

  // Sync with server after user loads their cart
  useEffect(() => {
    if (!isInitialized || !currentUserId) return;

    (async () => {
      try {
        setMeta((m) => ({ ...m, syncing: true, lastError: null }));
        
        const response = await api.get("/cart").catch((err) => {
          console.error("[Cart] Sync failed:", err);
          return null;
        });

        if (!response) {
          setMeta((m) => ({ ...m, syncing: false, lastError: "Sync failed" }));
          return;
        }

        // Parse response based on backend format
        let serverItems = [];
        if (Array.isArray(response)) {
          serverItems = response;
        } else if (response.data && Array.isArray(response.data.items)) {
          serverItems = response.data.items;
        } else if (Array.isArray(response.items)) {
          serverItems = response.items;
        }

        // Convert to cart map
        const serverCart = {};
        for (const item of serverItems) {
          if (item && item.itemId) {
            serverCart[String(item.itemId)] = Number(item.qty || 0);
          }
        }

        console.log(`[Cart] Synced from server for user ${currentUserId}:`, serverCart);
        setCart(serverCart);
        persist(serverCart, currentUserId);
        setMeta({ syncing: false, lastSyncAt: Date.now(), lastError: null });
      } catch (err) {
        console.error("[Cart] Sync error:", err);
        setMeta((m) => ({ ...m, syncing: false, lastError: err?.message }));
      }
    })();
  }, [currentUserId, isInitialized, persist]);

  // core mutators - now user-specific
  const add = useCallback(
    async (itemId, qty = 1) => {
      const key = String(itemId);
      const userId = currentUserId;

      // Update local state immediately
      setCart((prev) => {
        const next = { ...prev, [key]: (prev[key] || 0) + qty };
        persist(next, userId);
        return next;
      });

      // Sync with server if authenticated
      if (!userId) return;

      try {
        await api.post("/cart/add", { itemId: key, qty });
        // Refresh from server
        const response = await api.get("/cart");
        let serverItems = Array.isArray(response) ? response : response?.data?.items || response?.items || [];
        const serverCart = {};
        for (const item of serverItems) {
          if (item && item.itemId) serverCart[String(item.itemId)] = Number(item.qty || 0);
        }
        setCart(serverCart);
        persist(serverCart, userId);
      } catch (err) {
        console.error("[Cart] Add error:", err);
        setMeta((m) => ({ ...m, lastError: err?.message }));
      }
    },
    [currentUserId, persist]
  );

  const setQty = useCallback(
    async (itemId, qty) => {
      const key = String(itemId);
      const userId = currentUserId;

      // Update local state immediately
      setCart((prev) => {
        const next = { ...prev };
        if (!qty || qty <= 0) {
          delete next[key];
        } else {
          next[key] = qty;
        }
        persist(next, userId);
        return next;
      });

      // Sync with server if authenticated
      if (!userId) return;

      try {
        await api.post("/cart/update", { itemId: key, qty });
        // Refresh from server
        const response = await api.get("/cart");
        let serverItems = Array.isArray(response) ? response : response?.data?.items || response?.items || [];
        const serverCart = {};
        for (const item of serverItems) {
          if (item && item.itemId) serverCart[String(item.itemId)] = Number(item.qty || 0);
        }
        setCart(serverCart);
        persist(serverCart, userId);
      } catch (err) {
        console.error("[Cart] Update error:", err);
        setMeta((m) => ({ ...m, lastError: err?.message }));
      }
    },
    [currentUserId, persist]
  );

  const remove = useCallback(
    async (itemId) => {
      const key = String(itemId);
      const userId = currentUserId;

      // Update local state immediately
      setCart((prev) => {
        const next = { ...prev };
        delete next[key];
        persist(next, userId);
        return next;
      });

      // Sync with server if authenticated
      if (!userId) return;

      try {
        await api.post("/cart/remove", { itemId: key });
      } catch (err) {
        console.error("[Cart] Remove error:", err);
        setMeta((m) => ({ ...m, lastError: err?.message }));
      }
    },
    [currentUserId, persist]
  );

  const clear = useCallback(async () => {
    const userId = currentUserId;

    // Update local state immediately
    setCart({});
    persist({}, userId);

    // Sync with server if authenticated
    if (!userId) return;

    try {
      await api.post("/cart/clear");
    } catch (err) {
      console.error("[Cart] Clear error:", err);
      setMeta((m) => ({ ...m, lastError: err?.message }));
    }
  }, [currentUserId, persist]);

  const sync = useCallback(async () => {
    const userId = currentUserId;
    if (!userId) return null;

    setMeta((m) => ({ ...m, syncing: true }));
    try {
      const response = await api.get("/cart");
      let serverItems = Array.isArray(response) ? response : response?.data?.items || response?.items || [];
      const serverCart = {};
      for (const item of serverItems) {
        if (item && item.itemId) serverCart[String(item.itemId)] = Number(item.qty || 0);
      }
      setCart(serverCart);
      persist(serverCart, userId);
      setMeta({ syncing: false, lastSyncAt: Date.now(), lastError: null });
      return serverCart;
    } catch (err) {
      setMeta({ syncing: false, lastSyncAt: null, lastError: err?.message });
      return null;
    }
  }, [currentUserId, persist]);

  const value = useMemo(
    () => ({ cart, meta, add, setQty, remove, clear, sync }),
    [cart, meta, add, setQty, remove, clear, sync]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export default CartContext;
