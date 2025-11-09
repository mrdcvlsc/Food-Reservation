import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { X } from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [preview, setPreview] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.get("/notifications");
      setNotifications(Array.isArray(d) ? d : []);
    } catch (e) {
      setNotifications([]);
    } finally {
      setLoading(false);
      setSelected(new Set());
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (id) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleAll = () => {
    if (selected.size === notifications.length) setSelected(new Set());
    else setSelected(new Set(notifications.map(n => n.id)));
  };

  const markSelectedRead = async () => {
    if (!selected.size) return alert("No notifications selected.");
    if (!window.confirm("Mark selected notifications as read?")) return;
    try {
      await Promise.all(Array.from(selected).map(id => api.patch(`/notifications/${id}/read`).catch(() => {})));
      setNotifications((prev) => prev.map(n => selected.has(n.id) ? { ...n, read: true } : n));
      setSelected(new Set());
    } catch {
      alert("Failed to mark selected as read.");
    }
  };

  const deleteSelected = async () => {
    if (!selected.size) return alert("No notifications selected.");
    if (!window.confirm("Delete selected notifications?")) return;
    try {
      await Promise.all(Array.from(selected).map(id => api.del(`/notifications/${id}`).catch(() => {})));
      setNotifications((prev) => prev.filter(n => !selected.has(n.id)));
      setSelected(new Set());
    } catch {
      alert("Failed to delete selected notifications.");
    }
  };

  const openPreview = async (n) => {
    setPreview(n);
    if (!n.read) {
      try {
        await api.patch(`/notifications/${n.id}/read`);
        setNotifications((prev) => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      } catch {}
    }
  };

  const deleteSingle = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await api.del(`/notifications/${id}`);
      setNotifications((prev) => prev.filter(n => n.id !== id));
      if (preview?.id === id) setPreview(null);
    } catch {
      alert("Failed to delete notification.");
    }
  };

  // Render preview.data as user-friendly HTML instead of raw JSON
  const renderPreviewData = (data) => {
    if (data == null) return <div className="text-sm text-gray-500">No additional details.</div>;
    if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
      return <div className="text-sm text-gray-700">{String(data)}</div>;
    }
    if (Array.isArray(data)) {
      return (
        <div className="space-y-3">
          {data.map((item, i) => (
            <div key={i} className="border rounded-md p-3 bg-white shadow-sm">
              {typeof item === "object" ? renderPreviewData(item) : <div className="text-sm text-gray-700">{String(item)}</div>}
            </div>
          ))}
        </div>
      );
    }
    // object
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex items-start gap-4">
            <div className="w-36 text-xs text-gray-500">{k}</div>
            <div className="flex-1">
              {Array.isArray(v) ? (
                <div className="space-y-2">
                  {v.map((it, idx) => (
                    <div key={idx} className="border rounded px-3 py-2 bg-white text-sm text-gray-700">
                      {typeof it === "object" ? (
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(it).map(([ik, iv]) => (
                            <div key={ik} className="flex">
                              <div className="w-24 text-xs text-gray-500">{ik}</div>
                              <div className="flex-1">{String(iv)}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        String(it)
                      )}
                    </div>
                  ))}
                </div>
              ) : typeof v === "object" ? (
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                  {Object.entries(v).map(([vk, vv]) => (
                    <div key={vk} className="flex">
                      <div className="w-24 text-xs text-gray-500">{vk}</div>
                      <div className="flex-1">{String(vv)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-700">{String(v)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">Manage your notifications — mark read or delete.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">Back</Link>
            <button onClick={load} className="px-3 py-2 border rounded text-sm">Refresh</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-3 border-b flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" className="form-checkbox" checked={selected.size === notifications.length && notifications.length > 0} onChange={toggleAll} />
              <button onClick={markSelectedRead} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Mark as read</button>
              <button onClick={deleteSelected} className="px-3 py-2 bg-red-600 text-white rounded text-sm">Delete</button>
            </div>
            <div className="text-sm text-gray-500">{notifications.length} notifications</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"> </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">From</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Sent</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">Loading…</td></tr>
                ) : notifications.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">No notifications.</td></tr>
                ) : notifications.map((n) => (
                  <tr key={n.id} className={`${n.read ? "" : "bg-blue-50"} hover:bg-gray-50`}>
                    <td className="px-6 py-4">
                      <input type="checkbox" checked={selected.has(n.id)} onChange={() => toggle(n.id)} />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{n.actor?.name || "System"}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 cursor-pointer" onClick={() => openPreview(n)}>
                      <div className="font-medium text-sm">{n.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">{n.body}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button onClick={() => openPreview(n)} className="text-sm px-3 py-1 border rounded">Open</button>
                        <button onClick={() => deleteSingle(n.id)} className="text-sm px-3 py-1 border rounded text-red-600">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {preview && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-3xl w-full bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="flex items-start gap-4 p-5 border-b">
              <div className="flex-shrink-0">
                {(() => {
                  const adminFallback = { name: "Canteen Admin", profilePictureUrl: "/jckl-192.png" };
                  const display = preview.actor || adminFallback;
                  return display.profilePictureUrl ? (
                    <img
                      src={display.profilePictureUrl}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(display.name)}&background=random`; }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-lg text-gray-600">
                      {(display.name || "C").charAt(0)}
                    </div>
                  );
                })()}
              </div>

              <div className="flex-1">
                <div className="text-xs text-gray-500">From {(preview.actor && preview.actor.name) || "Canteen Admin"}</div>
                <h3 className="text-xl font-semibold text-gray-900">{preview.title}</h3>
                <div className="text-xs text-gray-400 mt-1">{new Date(preview.createdAt).toLocaleString()}</div>
              </div>

              <button onClick={() => setPreview(null)} className="ml-3 p-2 rounded-full text-gray-400 hover:text-gray-600">
                <X />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-700 mb-4">{preview.body}</p>

              {preview.data ? (
                <div className="bg-gray-50 border rounded-lg p-5 space-y-4">
                  {/* Reservation details (concise list format) */}
                  {preview.data.reservationId && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">Reservation ID</div>
                        <div className="text-sm font-medium text-gray-900">{preview.data.reservationId}</div>
                      </div>

                      {Array.isArray(preview.data.items) && preview.data.items.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-gray-500 uppercase">Items</div>
                          <div className="rounded-md border bg-white">
                            {preview.data.items.map((it, i) => (
                              <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                                <div className="text-gray-700">
                                  <span className="font-medium">{it.qty || 1}×</span>
                                  <span className="ml-2 truncate">{it.name}</span>
                                </div>
                                <div className="text-gray-900 font-medium">{peso.format(it.price || 0)}</div>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div className="text-sm font-medium text-gray-700">Total</div>
                            <div className="text-lg font-semibold text-gray-900">{peso.format(preview.data.total ?? preview.data.amount ?? 0)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Top-up details */}
                  {preview.data.amount && !preview.data.items && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="text-sm text-gray-500">Amount</div>
                        <div className="text-sm font-medium text-gray-900">{peso.format(preview.data.amount)}</div>
                      </div>
                      {preview.data.provider && (
                        <div className="flex justify-between">
                          <div className="text-sm text-gray-500">Method</div>
                          <div className="text-sm text-gray-900">{preview.data.provider}</div>
                        </div>
                      )}
                      {(preview.data.reference || preview.data.txId) && (
                        <div className="flex justify-between">
                          <div className="text-sm text-gray-500">Reference</div>
                          <div className="text-sm font-mono text-gray-900">{preview.data.reference || preview.data.txId}</div>
                        </div>
                      )}
                      {preview.data.status && (
                        <div className="flex justify-between">
                          <div className="text-sm text-gray-500">Status</div>
                          <div className={`text-sm font-medium ${
                            String(preview.data.status).toLowerCase() === "approved" ? "text-green-600" :
                            String(preview.data.status).toLowerCase() === "pending" ? "text-yellow-600" : "text-gray-900"
                          }`}>{preview.data.status}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fallback / additional structured data */}
                  {!preview.data.reservationId && !preview.data.amount && (
                    <div className="text-sm text-gray-700">
                      {renderPreviewData(preview.data)}
                    </div>
                  )}

                  {/* Metadata */}
                  {preview.data.metadata && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="text-xs font-medium text-gray-500 uppercase mb-2">Additional Details</div>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-white p-2 rounded border">{JSON.stringify(preview.data.metadata, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No extra details.</div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setPreview(null)} className="px-4 py-2 bg-white border rounded-md">Close</button>
              <button onClick={() => deleteSingle(preview.id)} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}