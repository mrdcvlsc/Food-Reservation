// src/lib/api.js
// Real backend only. Uses CRA proxy to reach Express on :4000.
// Usage: api.get('/menu'), api.post('/auth/login', {...}), etc.

const toApi = (path) => {
  if (!path) return "/api";
  return path.startsWith("/api") ? path : "/api" + (path.startsWith("/") ? path : `/${path}`);
};

async function request(path, { method = "GET", body, headers } = {}) {
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
    throw new ApiError(msg, res.status, data, res);
  }

  return data;
}

export class ApiError extends Error {
  static Maintenance = 503;    // service unavailable / maintenance
  static NotFound = 404;
  static ServerError = 500;    // generic 5xx server error
  static Unauthorized = 401;   // not authenticated (login required)
  static Forbidden = 403;      // authenticated but lacks permission

  constructor(message, status = 0, data = null, response = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;     // HTTP status code (e.g., 401, 500)
    this.data = data;         // parsed JSON or text body if available
    this.response = response; // original fetch Response object (optional)
  }
}

export const api = {
  get: async (p, o) => await request(p, { ...(o || {}), method: "GET" }),
  post: async (p, b, o) => await request(p, { ...(o || {}), method: "POST", body: b }),
  put: async (p, b, o) => await request(p, { ...(o || {}), method: "PUT", body: b }),
  putForm: async (p, form) => await request(p, { method: "PUT", body: form }),
  del: async (p, o) => await request(p, { ...(o || {}), method: "DELETE" }),
  patch: async (p, b, o) => await request(p, { ...(o || {}), method: "PATCH", body: b }),
};