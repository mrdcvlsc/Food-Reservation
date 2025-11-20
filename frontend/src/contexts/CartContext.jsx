import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({}); // { [id]: qty }
  const [meta, setMeta] = useState({ syncing: false, lastSyncAt: null, lastError: null });

  // 🔥 CRITICAL FIX: Generate user-specific localStorage key
  const getStorageKey = useCallback(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      
      // Decode JWT to get userId (without verification - just for storage key)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.id || payload.sub || payload.userId;
      
      return userId ? `cart_${userId}` : null;
    } catch (e) {
      console.warn("[CART] Failed to generate storage key:", e);
      return null;
    }
  }, []);

  // persistence helper - now uses user-specific key
  const persist = useCallback((next) => {
    const key = getStorageKey();
    if (!key) return; // Not logged in, skip storage
    
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch (e) {
      console.warn("[CART] localStorage failed:", e);
    }
    
    // notify other tabs
    try {
      window.dispatchEvent(new CustomEvent("cart:updated", { detail: { userId: key } }));
    } catch {}
  }, [getStorageKey]);

  // Load from user-specific storage
  const loadFromStorage = useCallback(() => {
    const key = getStorageKey();
    if (!key) return {};
    
    try {
      const v = JSON.parse(localStorage.getItem(key) || "{}");
      return v && typeof v === "object" ? v : {};
    } catch {
      return {};
    }
  }, [getStorageKey]);

  // Clear storage on logout
  const clearStorage = useCallback(() => {
    const key = getStorageKey();
    if (key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn("[CART] Failed to clear storage:", e);
      }
    }
  }, [getStorageKey]);

  // Define sync BEFORE using it in useEffect
  const sync = useCallback(async () => {
    setMeta((m) => ({ ...m, syncing: true }));
    
    try {
      const data = await api.get('/cart');
      if (data && Array.isArray(data.items)) {
        const serverCart = {};
        for (const it of data.items) {
          if (it && it.itemId) {
            serverCart[String(it.itemId)] = Number(it.qty || 0);
          }
        }
        setCart(serverCart);
        persist(serverCart);
        setMeta({ syncing: false, lastSyncAt: Date.now(), lastError: null });
        return serverCart;
      }
      setMeta((m) => ({ ...m, syncing: false }));
      return null;
    } catch (err) {
      console.error("[CART] Sync error:", err);
      setMeta({ syncing: false, lastSyncAt: null, lastError: err?.message || String(err) });
      return null;
    }
  }, [persist]);

  // Load from storage on mount and sync with server
  useEffect(() => {
    let mounted = true;
    
    const token = localStorage.getItem("token");
    if (!token) {
      // Not logged in - clear cart
      setCart({});
      return;
    }

    // Load from user-specific localStorage
    const localSaved = loadFromStorage();

    // Sync with server
    (async () => {
      try {
        setMeta((m) => ({ ...m, syncing: true, lastError: null }));
        const res = await api.get("/cart").catch(() => null);
        if (!mounted) return;

        // Normalize server response
        let serverItems = null;
        let serverCartMap = null;
        
        if (!res) {
          serverItems = null;
        } else if (Array.isArray(res)) {
          serverItems = res;
        } else if (Array.isArray(res.items)) {
          serverItems = res.items;
        } else if (res.cart && typeof res.cart === "object") {
          serverCartMap = res.cart;
        }

        // Server has items - use server as source of truth
        if (serverItems && serverItems.length > 0) {
          const next = {};
          for (const it of serverItems) {
            if (it && (it.itemId || it.id)) {
              next[String(it.itemId || it.id)] = Number(it.qty || it.quantity || 0);
            }
          }
          setCart(next);
          persist(next);
          setMeta({ syncing: false, lastSyncAt: Date.now(), lastError: null });
          return;
        }

        if (!serverItems && serverCartMap && Object.keys(serverCartMap).length > 0) {
          const next = {};
          for (const [k, v] of Object.entries(serverCartMap)) {
            next[String(k)] = Number(v || 0);
          }
          setCart(next);
          persist(next);
          setMeta({ syncing: false, lastSyncAt: Date.now(), lastError: null });
          return;
        }

        // Both server and local are empty - just clear
        if ((!serverItems || serverItems.length === 0) && (!localSaved || Object.keys(localSaved).length === 0)) {
          setCart({});
          persist({});
          setMeta({ syncing: false, lastSyncAt: Date.now(), lastError: null });
          return;
        }

        // Server is empty but local has items -> push to server ONLY ONCE
        if ((!serverItems || serverItems.length === 0) && localSaved && Object.keys(localSaved).length > 0) {
          // Push local items to server
          for (const [id, qty] of Object.entries(localSaved)) {
            try {
              await api.post("/cart/add", { itemId: id, qty }).catch(() => null);
            } catch {}
          }
          
          // Single refresh from server to get final state
          const refreshed = await api.get("/cart").catch(() => null);
          const refreshedItems = refreshed && (Array.isArray(refreshed.items) ? refreshed.items : Array.isArray(refreshed) ? refreshed : null);
          
          if (refreshedItems && refreshedItems.length > 0) {
            const next = {};
            for (const it of refreshedItems) {
              if (it && it.itemId) {
                next[String(it.itemId)] = Number(it.qty || 0);
              }
            }
            setCart(next);
            persist(next);
          } else {
            // Keep local if sync failed
            setCart(localSaved);
            persist(localSaved);
          }
          
          setMeta({ syncing: false, lastSyncAt: Date.now(), lastError: null });
          return;
        }

        setMeta({ syncing: false, lastSyncAt: Date.now(), lastError: null });
      } catch (err) {
        console.error("[CART] Sync error:", err);
        if (mounted) {
          setMeta({ syncing: false, lastSyncAt: null, lastError: err.message || String(err) });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [persist, loadFromStorage]);

  // Reload cart on custom login event
  useEffect(() => {
    const onAuthLogin = () => {
      const stored = loadFromStorage();
      setCart(stored || {});
      sync().catch(() => {});
    };
    window.addEventListener('auth:login', onAuthLogin);
    return () => window.removeEventListener('auth:login', onAuthLogin);
  }, [loadFromStorage, sync]);

  // Multi-tab support - listen for changes from other tabs
  useEffect(() => {
    const onStorage = (e) => {
      // Only respond to changes for current user's cart
      const currentKey = getStorageKey();
      if (!currentKey) return;
      
      // CustomEvent from same tab
      if (e instanceof CustomEvent) {
        if (e.detail && e.detail.userId === currentKey) {
          const saved = loadFromStorage();
          if (saved && typeof saved === "object") {
            setCart(saved);
          }
        }
      } 
      // StorageEvent from other tabs
      else if (e.key === currentKey) {
        try {
          const saved = JSON.parse(e.newValue || "{}");
          if (saved && typeof saved === "object") {
            setCart(saved);
          }
        } catch {}
      }
    };
    
    window.addEventListener("cart:updated", onStorage);
    window.addEventListener("storage", onStorage);
    
    return () => {
      window.removeEventListener("cart:updated", onStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, [getStorageKey, loadFromStorage]);

  // Core mutators
  const add = useCallback(async (itemId, qty = 1) => {
    const key = String(itemId);
    
    // Optimistic update
    setCart((prev) => {
      const next = { ...prev, [key]: (prev[key] || 0) + qty };
      persist(next);
      return next;
    });
    
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      await api.post("/cart/add", { itemId: key, qty }).catch(() => null);
      
      // Refresh from server (source of truth)
      const data = await api.get("/cart");
      if (data && Array.isArray(data.items)) {
        const serverCart = {};
        for (const it of data.items) {
          if (it && it.itemId) {
            serverCart[String(it.itemId)] = Number(it.qty || 0);
          }
        }
        setCart(serverCart);
        persist(serverCart);
      }
    } catch (err) {
      console.error("[CART] Add error:", err);
      setMeta((m) => ({ ...m, lastError: err?.message || String(err) }));
    }
  }, [persist]);

  const setQty = useCallback(async (itemId, qty) => {
    const key = String(itemId);
    
    // Optimistic update
    setCart((prev) => {
      const next = { ...prev };
      if (!qty || qty <= 0) {
        delete next[key];
      } else {
        next[key] = qty;
      }
      persist(next);
      return next;
    });
    
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      await api.post('/cart/update', { itemId: key, qty }).catch(() => null);
      
      // Refresh from server
      const data = await api.get('/cart');
      if (data && Array.isArray(data.items)) {
        const serverCart = {};
        for (const it of data.items) {
          if (it && it.itemId) {
            serverCart[String(it.itemId)] = Number(it.qty || 0);
          }
        }
        setCart(serverCart);
        persist(serverCart);
      }
    } catch (err) {
      console.error("[CART] Update error:", err);
      setMeta((m) => ({ ...m, lastError: err?.message || String(err) }));
    }
  }, [persist]);

  const remove = useCallback(async (itemId) => {
    const key = String(itemId);
    
    // Optimistic update
    setCart((prev) => {
      const next = { ...prev };
      delete next[key];
      persist(next);
      return next;
    });
    
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      await api.post('/cart/remove', { itemId: key }).catch(() => null);
    } catch (err) {
      console.error("[CART] Remove error:", err);
      setMeta((m) => ({ ...m, lastError: err?.message || String(err) }));
    }
  }, [persist]);

  const clear = useCallback(async () => {
    setCart({});
    persist({});
    
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      await api.post('/cart/clear').catch(() => null);
    } catch (err) {
      console.error("[CART] Clear error:", err);
      setMeta((m) => ({ ...m, lastError: err?.message || String(err) }));
    }
  }, [persist]);

  // 🔥 NEW: Expose clearStorage for logout
  const logout = useCallback(() => {
    setCart({});
    clearStorage();
    setMeta({ syncing: false, lastSyncAt: null, lastError: null });
  }, [clearStorage]);

  const value = useMemo(
    () => ({ cart, meta, add, setQty, remove, clear, sync, logout }),
    [cart, meta, add, setQty, remove, clear, sync, logout]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export default CartContext;