// src/lib/api.js
// Real backend only. Uses CRA proxy to reach Express on :4000.
// Usage: api.get('/menu'), api.post('/auth/login', {...}), etc.

const toApi = (path) => {
  if (!path) return "/api";
  return path.startsWith("/api") ? path : "/api" + (path.startsWith("/") ? path : `/${path}`);
};

async function request(path, { method = "GET", body, headers } = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(toApi(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  get: (p, o) => request(p, { ...(o || {}), method: "GET" }),
  post: (p, b, o) => request(p, { ...(o || {}), method: "POST", body: b }),
  put: (p, b, o) => request(p, { ...(o || {}), method: "PUT", body: b }),
  del: (p, o) => request(p, { ...(o || {}), method: "DELETE" }),
};
