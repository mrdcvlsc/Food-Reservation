import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import AdminAvbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import { X } from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export default function AdminNotifications() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [preview, setPreview] = useState(null);

  // Render preview.data as readable HTML (recursive)
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

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.get("/notifications/admin");
      setNotifications(Array.isArray(d) ? d : []);
    } catch {
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
    try {
      await api.post("/notifications/admin/mark-read", { ids: Array.from(selected) });
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
      await Promise.all(Array.from(selected).map(id => api.del(`/notifications/admin/${id}`).catch(() => {})));
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
        await api.post("/notifications/admin/mark-read", { ids: [n.id] });
        setNotifications((prev) => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      } catch {}
    }
  };

  const deleteSingle = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await api.del(`/notifications/admin/${id}`);
      setNotifications((prev) => prev.filter(n => n.id !== id));
      if (preview?.id === id) setPreview(null);
    } catch {
      alert("Failed to delete notification.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminAvbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Admin Notifications</h1>
            <p className="text-sm text-gray-500">Manage system notifications — bulk mark read or delete.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="px-3 py-2 border rounded text-sm">Refresh</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-3 border-b flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={selected.size === notifications.length && notifications.length > 0} onChange={toggleAll} />
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
                    <td className="px-6 py-4"><input type="checkbox" checked={selected.has(n.id)} onChange={() => toggle(n.id)} /></td>
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
          <div className="max-w-xl w-full bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-start p-4 border-b">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <img 
                    src={preview.actor?.profilePictureUrl || "/jckl-192.png"}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <div className="text-sm text-gray-600">From {preview.actor?.name}</div>
                    <div className="text-sm text-gray-400">{new Date(preview.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <h3 className="text-lg font-medium mt-2">{preview.title}</h3>
              </div>
              <button 
                onClick={() => setPreview(null)} 
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">{preview.body}</p>

              {preview.data && (
                <div className="space-y-4">
                  {/* Reservation Details */}
                  {preview.data.reservationId && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="text-sm">
                          <span className="text-gray-500">reservationId</span>
                          <div className="font-medium">{preview.data.reservationId}</div>
                        </div>
                        {preview.data.items?.map((item, idx) => (
                          <React.Fragment key={idx}>
                            <div className="text-sm">
                              <span className="text-gray-500">id</span>
                              <div className="font-medium">{item.id}</div>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-500">name</span>
                              <div className="font-medium">{item.name}</div>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-500">price</span>
                              <div className="font-medium">{peso.format(item.price)}</div>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-500">qty</span>
                              <div className="font-medium">{item.qty || 1}</div>
                            </div>
                          </React.Fragment>
                        ))}
                        <div className="text-sm">
                          <span className="text-gray-500">total</span>
                          <div className="font-medium">{peso.format(preview.data.total || 0)}</div>
                        </div>
                      </div>

                      {/* Student Details */}
                      {(preview.data.grade || preview.data.section) && (
                        <div className="text-sm">
                          <span className="text-gray-500">Student Details</span>
                          <div className="font-medium">
                            Grade {preview.data.grade} - {preview.data.section}
                          </div>
                        </div>
                      )}

                      {/* Note / Slot */}
                      {preview.data.note && (
                        <div className="text-sm pt-2">
                          <span className="text-gray-500">Note</span>
                          <div className="font-medium text-gray-900">{preview.data.note}</div>
                        </div>
                      )}
                      {preview.data.slot && (
                        <div className="text-sm pt-2">
                          <span className="text-gray-500">Pickup</span>
                          <div className="font-medium text-gray-900">{preview.data.slot}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Top-up Details */}
                  {preview.data.amount && !preview.data.items && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="text-sm">
                        <span className="text-gray-500">Amount</span>
                        <div className="font-medium">{peso.format(preview.data.amount)}</div>
                      </div>
                      {preview.data.provider && (
                        <div className="text-sm">
                          <span className="text-gray-500">Method</span>
                          <div className="font-medium">{preview.data.provider}</div>
                        </div>
                      )}
                      {preview.data.reference && (
                        <div className="text-sm">
                          <span className="text-gray-500">Reference</span>
                          <div className="font-medium">{preview.data.reference}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => deleteSingle(preview.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}