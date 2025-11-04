import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({}); // { [id]: qty }
  const [meta, setMeta] = useState({ syncing: false, lastSyncAt: null, lastError: null });

  // persistence helper
  const persist = useCallback((next) => {
    try {
      localStorage.setItem("cart", JSON.stringify(next));
    } catch (e) {
      // ignore storage errors
    }
    // notify other tabs
    try {
      window.dispatchEvent(new Event("cart:updated"));
    } catch {}
  }, []);

  // load from storage on mount and try to sync with server
  useEffect(() => {
    let mounted = true;
    const localSaved = (() => {
      try {
        const v = JSON.parse(localStorage.getItem("cart") || "{}");
        return v && typeof v === "object" ? v : {};
      } catch {
        return {};
      }
    })();
    if (mounted) setCart(localSaved);

    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        setMeta((m) => ({ ...m, syncing: true, lastError: null }));
        const res = await api.get("/cart").catch(() => null);
        if (!mounted) return;

        // normalize server response
        let serverItems = null;
        let serverCartMap = null;
        if (!res) {
          serverItems = null;
        } else if (Array.isArray(res)) {
          serverItems = res;
        } else if (Array.isArray(res.items)) {
          serverItems = res.items;
        } else if (res.data && Array.isArray(res.data.items)) {
          serverItems = res.data.items;
        } else if (res.cart && typeof res.cart === "object") {
          serverCartMap = res.cart;
        } else if (res.data && res.data.cart && typeof res.data.cart === "object") {
          serverCartMap = res.data.cart;
        }

        if (serverItems && serverItems.length > 0) {
          const next = {};
          for (const it of serverItems) if (it && (it.itemId || it.id)) next[String(it.itemId || it.id)] = Number(it.qty || it.quantity || 0);
          setCart(next);
          persist(next);
          setMeta({ syncing: false, lastSyncAt: Date.now(), lastError: null });
          return;
        }

        if (!serverItems && serverCartMap && Object.keys(serverCartMap).length > 0) {
          const next = {};
          for (const [k, v] of Object.entries(serverCartMap)) next[String(k)] = Number(v || 0);
          setCart(next);
          persist(next);
          setMeta({ syncing: false, lastSyncAt: Date.now(), lastError: null });
          return;
        }

        // if server empty but local has items -> push local
        if ((!serverItems || serverItems.length === 0) && localSaved && Object.keys(localSaved).length > 0) {
          for (const [id, qty] of Object.entries(localSaved)) {
            try {
              await api.post("/cart/add", { itemId: id, qty }).catch(() => null);
            } catch {}
          }
          const refreshed = await api.get("/cart").catch(() => null);
          const refreshedItems = refreshed && (Array.isArray(refreshed.items) ? refreshed.items : Array.isArray(refreshed) ? refreshed : (refreshed.data && Array.isArray(refreshed.data.items) ? refreshed.data.items : null));
          if (refreshedItems && refreshedItems.length > 0) {
            const next = {};
            for (const it of refreshedItems) if (it && it.itemId) next[String(it.itemId)] = Number(it.qty || 0);
            setCart(next);
            persist(next);
            setMeta({ syncing: false, lastSyncAt: Date.now(), lastError: null });
            return;
          }
          // keep local
          setCart(localSaved);
          persist(localSaved);
          setMeta({ syncing: false, lastSyncAt: Date.now(), lastError: null });
          return;
        }

        setMeta((m) => ({ ...m, syncing: false }));
      } catch (err) {
        setMeta({ syncing: false, lastSyncAt: null, lastError: err.message || String(err) });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [persist]);

  // multi-tab support: when other tab writes localStorage
  useEffect(() => {
    const onStorage = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("cart") || "{}");
        if (saved && typeof saved === "object") setCart(saved);
      } catch {}
    };
    window.addEventListener("cart:updated", onStorage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("cart:updated", onStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // core mutators
  const add = useCallback(async (itemId, qty = 1) => {
    const key = String(itemId);
    setCart((prev) => {
      const next = { ...prev, [key]: (prev[key] || 0) + qty };
      persist(next);
      return next;
    });
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await api.post("/cart/add", { itemId: key, qty }).catch(() => null);
      // refresh authoritative cart
      const data = await api.get("/cart");
      if (data && Array.isArray(data.items)) {
        const serverCart = {};
        for (const it of data.items) if (it && it.itemId) serverCart[String(it.itemId)] = Number(it.qty || 0);
        setCart(serverCart);
        persist(serverCart);
      }
    } catch (err) {
      // ignore server errors for now; UI will use optimistic state
      setMeta((m) => ({ ...m, lastError: err?.message || String(err) }));
    }
  }, [persist]);

  const setQty = useCallback(async (itemId, qty) => {
    const key = String(itemId);
    setCart((prev) => {
      const next = { ...prev };
      if (!qty || qty <= 0) delete next[key];
      else next[key] = qty;
      persist(next);
      return next;
    });
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await api.post('/cart/update', { itemId: key, qty }).catch(() => null);
      const data = await api.get('/cart');
      if (data && Array.isArray(data.items)) {
        const serverCart = {};
        for (const it of data.items) if (it && it.itemId) serverCart[String(it.itemId)] = Number(it.qty || 0);
        setCart(serverCart);
        persist(serverCart);
      }
    } catch (err) {
      setMeta((m) => ({ ...m, lastError: err?.message || String(err) }));
    }
  }, [persist]);

  const remove = useCallback(async (itemId) => {
    const key = String(itemId);
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
      setMeta((m) => ({ ...m, lastError: err?.message || String(err) }));
    }
  }, [persist]);

  const sync = useCallback(async () => {
    setMeta((m) => ({ ...m, syncing: true }));
    try {
      const data = await api.get('/cart');
      if (data && Array.isArray(data.items)) {
        const serverCart = {};
        for (const it of data.items) if (it && it.itemId) serverCart[String(it.itemId)] = Number(it.qty || 0);
        setCart(serverCart);
        persist(serverCart);
        setMeta({ syncing: false, lastSyncAt: Date.now(), lastError: null });
        return serverCart;
      }
      setMeta((m) => ({ ...m, syncing: false }));
      return null;
    } catch (err) {
      setMeta({ syncing: false, lastSyncAt: null, lastError: err?.message || String(err) });
      return null;
    }
  }, [persist]);

  const value = useMemo(() => ({ cart, meta, add, setQty, remove, clear, sync }), [cart, meta, add, setQty, remove, clear, sync]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export default CartContext;
