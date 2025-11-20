import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import AdminAvbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const ITEMS_PER_PAGE = 10;

export default function AdminNotifications() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [preview, setPreview] = useState(null);

  // Pagination calculations
  const totalPages = Math.ceil(notifications.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedNotifications = notifications.slice(startIndex, endIndex);

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
      setCurrentPage(1); // Reset to first page on refresh
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
    if (selected.size === paginatedNotifications.length) setSelected(new Set());
    else setSelected(new Set(paginatedNotifications.map(n => n.id)));
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
      // Adjust page if necessary
      if (startIndex >= notifications.length - selected.size && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
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
      // Adjust page if necessary
      if (startIndex >= notifications.length - 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
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
            <button onClick={load} className="px-3 py-2 border rounded text-sm hover:bg-gray-50">Refresh</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-3 border-b flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={selected.size === paginatedNotifications.length && paginatedNotifications.length > 0} onChange={toggleAll} />
              <button onClick={markSelectedRead} disabled={selected.size === 0} className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50">Mark as read</button>
              <button onClick={deleteSelected} disabled={selected.size === 0} className="px-3 py-2 bg-red-600 text-white rounded text-sm disabled:opacity-50">Delete</button>
            </div>
            <div className="text-sm text-gray-500">{notifications.length} total</div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">Loading…</p>
            </div>
          ) : paginatedNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">No notifications.</p>
            </div>
          ) : (
            <>
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
                    {paginatedNotifications.map((n) => (
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
                            <button onClick={() => openPreview(n)} className="text-sm px-3 py-1 border rounded hover:bg-gray-50">Open</button>
                            <button onClick={() => deleteSingle(n.id)} className="text-sm px-3 py-1 border rounded text-red-600 hover:bg-red-50">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                    </span>
                    <div className="text-xs text-gray-500 hidden sm:inline">
                      ({startIndex + 1}–{Math.min(endIndex, notifications.length)} of {notifications.length})
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {preview && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-4 p-5 border-b">
              <div className="flex-shrink-0">
                {(() => {
                  const adminFallback = { name: "Canteen Admin", profilePictureUrl: "/jckl-192.png" };
                  const display = preview.actor || adminFallback;
                  return display.profilePictureUrl ? (
                    <img
                      src={display.profilePictureUrl}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                      onError={(e) => { 
                        e.target.onerror = null; 
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(display.name || 'CA')}&background=random`; 
                      }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-lg font-medium text-blue-600">
                      {(display.name || "C").charAt(0)}
                    </div>
                  );
                })()}
              </div>

              <div className="flex-1 pr-8">
                <div className="text-xs text-gray-500">From {(preview.actor && preview.actor.name) || "Canteen Admin"}</div>
                <h3 className="text-xl font-semibold text-gray-900">{preview.title}</h3>
                <div className="text-xs text-gray-400 mt-1">{new Date(preview.createdAt).toLocaleString()}</div>
              </div>

              <button 
                onClick={() => setPreview(null)} 
                className="ml-3 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
              <p className="text-sm text-gray-700 mb-4">{preview.body}</p>

              {preview.data && (
                <div className="bg-gray-50 border rounded-lg p-5 space-y-4">
                  {renderPreviewData(preview.data)}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => deleteSingle(preview.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
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