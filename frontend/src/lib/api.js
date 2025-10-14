// src/lib/api.js
// Real backend only. Uses CRA proxy to reach Express on :4000.
// Usage: api.get('/menu'), api.post('/auth/login', {...}), etc.

// Request deduplication cache
const pendingRequests = new Map();

const toApi = (path) => {
  if (!path) return "/api";
  return path.startsWith("/api") ? path : "/api" + (path.startsWith("/") ? path : `/${path}`);
};

async function request(path, { method = "GET", body, headers } = {}) {
  // Create a unique key for this request
  const requestKey = `${method}:${path}:${JSON.stringify(body || {})}`;
  
  // If the same request is already pending, return the existing promise
  if (pendingRequests.has(requestKey)) {
    console.log(`[API] Deduplicating request: ${requestKey}`);
    return pendingRequests.get(requestKey);
  }
  
  // Create the request promise
  const requestPromise = makeRequest(path, { method, body, headers });
  
  // Store the promise in the cache
  pendingRequests.set(requestKey, requestPromise);
  
  // Clean up when the request completes
  requestPromise.finally(() => {
    pendingRequests.delete(requestKey);
  });
  
  return requestPromise;
}

async function makeRequest(path, { method = "GET", body, headers } = {}) {
  const token = localStorage.getItem("token");

  // Detect FormData
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  // Build headers without forcing JSON when sending FormData
  const h = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers || {}),
  };
  if (!isFormData) {
    h["Content-Type"] = h["Content-Type"] || "application/json";
  }

  const res = await fetch(toApi(path), {
    method,
    headers: h,
    body: isFormData ? body : (body != null ? JSON.stringify(body) : undefined),
  });

  // Try to parse JSON only when content-type indicates JSON
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  let data = null;
  try {
    if (res.status !== 204) {
      data = isJson ? await res.json() : await res.text();
    }
  } catch {
    // if parse fails, leave data as text or null
  }

  if (!res.ok) {
    const msg =
      (isJson && data && (data.error || data.message)) ||
      (typeof data === "string" && data) ||
      `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  get: (p, o) => request(p, { ...(o || {}), method: "GET" }),
  post: (p, b, o) => request(p, { ...(o || {}), method: "POST", body: b }),
  put: (p, b, o) => request(p, { ...(o || {}), method: "PUT", body: b }),
  putForm: (p, form) => request(p, { method: "PUT", body: form }),
  del: (p, o) => request(p, { ...(o || {}), method: "DELETE" }),
  patch: (p, b, o) => request(p, { ...(o || {}), method: "PATCH", body: b }),
};
