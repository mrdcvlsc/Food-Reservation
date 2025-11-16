import { useEffect, useRef } from "react";

export default function useOrdersSSE({
  url = "/sse/admin/orders",
  enabled = true,
  onSnapshot = () => {},
  onEvent = () => {},
}) {
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastEventIdRef = useRef(null);
  const backoffRef = useRef(1000);

  useEffect(() => {
    if (!enabled) return;

    let isUnmounted = false;

    function connect() {
      let connectUrl = url;
      if (lastEventIdRef.current) {
        connectUrl += `?lastEventId=${encodeURIComponent(lastEventIdRef.current)}`;
      }

      const es = new window.EventSource(connectUrl, { withCredentials: true });
      eventSourceRef.current = es;

      es.onopen = () => {
        backoffRef.current = 1000;
        if (typeof onSnapshot === "function") onSnapshot();
      };

      es.onmessage = (e) => {
        if (e.lastEventId) lastEventIdRef.current = e.lastEventId;
        try {
          const payload = JSON.parse(e.data);
          if (typeof onEvent === "function") onEvent(payload);
        } catch {}
      };

      es.addEventListener("order", (e) => {
        if (e.lastEventId) lastEventIdRef.current = e.lastEventId;
        try {
          const payload = JSON.parse(e.data);
          if (typeof onEvent === "function") onEvent(payload);
        } catch {}
      });

      es.onerror = () => {
        es.close();
        if (isUnmounted) return;
        reconnectTimeoutRef.current = setTimeout(() => {
          backoffRef.current = Math.min(backoffRef.current * 2, 30000);
          connect();
        }, backoffRef.current);
      };
    }

    connect();

    return () => {
      isUnmounted = true;
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, url, onSnapshot, onEvent]);
}
