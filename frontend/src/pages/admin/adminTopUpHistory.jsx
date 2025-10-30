// ...new file...
import React, { useEffect, useState, useMemo } from "react";
import Navbar from "../../components/adminavbar";
import { api, ApiError } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import { Search, Filter } from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function AdminTopUpHistory() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");

  const [selected, setSelected] = useState(null); // selected top-up for modal/view
  const [actionBusy, setActionBusy] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== "all") params.set("status", status);
      if (provider !== "all") params.set("provider", provider);
      const query = params.toString() ? `?${params.toString()}` : "";
      // primary endpoint
      const primary = `/topups${query}`;
      console.debug("[TopUpHistory] requesting", primary);
      let data = null;
      try {
        data = await api.get(primary);
      } catch (err) {
        console.warn("[TopUpHistory] primary request failed:", err);
      }

      // fallback: admin-specific endpoint(s)
      if (!data || (Array.isArray(data) && data.length === 0)) {
        const fallbacks = [
          `/admin/topups${query}`,
          `/topups/all${query}`,
          `/topups?all=1&${params.toString()}`,
        ];
        for (const fb of fallbacks) {
          try {
            console.debug("[TopUpHistory] trying fallback", fb);
            const res = await api.get(fb);
            if (res && (Array.isArray(res) ? res.length > 0 : (res.data && res.data.length > 0))) {
              data = res;
              break;
            }
            // accept non-empty even if object
            if (res && !Array.isArray(res) && res.data && res.data.length >= 0) {
              data = res;
              break;
            }
          } catch (e) {
            console.warn("[TopUpHistory] fallback failed", fb, e);
          }
        }
      }

      if (!data) {
        console.info("[TopUpHistory] no data returned from topup endpoints");
      }

      // original normalization continues below
      const raw = Array.isArray(data) ? data : data?.data || [];
      const mapped = raw.map((t) => ({
        id: t.id || t._id,
        createdAt: t.createdAt || t.date || t.submittedAt || new Date().toISOString(),
        name: t.student || t.name || t.userName || t.email || t.user?.name || "—",
        studentId: t.studentId || t.sid || t.student || t.user?.studentId || "—",
        contact: t.contact || t.phone || t.mobile || t.user?.phone || "—",
        provider: (t.provider || "").toLowerCase(),
        amount: Number(t.amount) || 0,
        status: t.status || "pending",
        reference: t.reference || t.ref || t.referenceNumber || "—",
        proofUrl: t.proofUrl || t.proof || t.image || "",
        note: t.note || t.notes || "",
        raw: t,
      }));
      // sort newest -> oldest
      mapped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setList(mapped);
    } catch (e) {
      console.error(e);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // initial load

  useEffect(() => {
    const id = setTimeout(() => load(), 300);
    return () => clearTimeout(id);
  }, [q, status, provider]);

  const totals = useMemo(() => {
    const count = list.length;
    const sum = list.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return { count, sum };
  }, [list]);

  const viewTopUp = (t) => setSelected(t);

  const closeModal = () => setSelected(null);

  const doAction = async (id, action) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to ${action} this top-up?`)) return;
    setActionBusy(id);
    try {
      // backend admin endpoints — adjust if your API uses different paths
      const verb = action === "approve" ? "approve" : "reject";
      await api.post(`/topups/${id}/${verb}`);
      // optimistic update: update status locally
      setList((prev) => prev.map((r) => (String(r.id || r._id) === String(id) ? { ...r, status: action === "approve" ? "approved" : "rejected" } : r)));
    } catch (e) {
      console.error(e);
      alert("Action failed: " + (e?.message || "server error"));
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Top-Up History</h1>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-gray-400 absolute left-3" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by user name, student id or reference"
                  className="pl-10 pr-3 py-2 border rounded-lg w-full sm:w-[360px] text-sm"
                />
              </div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="py-2 px-3 border rounded-lg text-sm">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="py-2 px-3 border rounded-lg text-sm">
                <option value="all">All providers</option>
                <option value="gcash">GCash</option>
                <option value="maya">Maya</option>
              </select>
              <button onClick={() => load()} className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm">Filter</button>
            </div>

            <div className="text-sm text-gray-600">
              <div>Total records: <strong>{totals.count}</strong></div>
              <div>Total amount: <strong>{peso.format(totals.sum)}</strong></div>
            </div>
          </div>

          <div className="mt-4 overflow-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-500">Loading…</div>
            ) : list.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">No top-ups found.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">User</th>
                    <th className="py-2">Student ID</th>
                    <th className="py-2">Contact</th>
                    <th className="py-2">Provider</th>
                    <th className="py-2">Reference</th>
                    <th className="py-2 text-right">Amount</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((t) => (
                    <tr key={t.id || t._id}>
                      <td className="py-2">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="py-2">{t.name}</td>
                      <td className="py-2">{t.studentId}</td>
                      <td className="py-2">{t.contact}</td>
                      <td className="py-2">{(t.provider || "").toUpperCase()}</td>
                      <td className="py-2">{t.reference}</td>
                      <td className="py-2 text-right font-semibold">{peso.format(Number(t.amount) || 0)}</td>
                      <td className="py-2">{String(t.status || "pending")}</td>
                       <td className="py-2">
                         <div className="flex gap-2">
                           <button onClick={() => viewTopUp(t)} className="text-xs px-2 py-1 border rounded">View</button>
                           {String(t.status || "").toLowerCase() === "pending" && (
                             <>
                               <button
                                 disabled={actionBusy === (t.id || t._id)}
                                 onClick={() => doAction(t.id || t._id, "approve")}
                                 className="text-xs px-2 py-1 bg-emerald-600 text-white rounded"
                               >
                                 Approve
                               </button>
                               <button
                                 disabled={actionBusy === (t.id || t._id)}
                                 onClick={() => doAction(t.id || t._id, "reject")}
                                 className="text-xs px-2 py-1 bg-rose-600 text-white rounded"
                               >
                                 Reject
                               </button>
                             </>
                           )}
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Proof / details modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-3xl w-full bg-white rounded-lg overflow-hidden">
            <div className="p-4 border-b flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-gray-500">Top-up by</div>
                <div className="text-lg font-semibold">{selected.name || selected.userName || "—"}</div>
                <div className="text-xs text-gray-400">{selected.studentId || selected.sid || "—"}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Amount</div>
                <div className="text-lg font-bold">{peso.format(Number(selected.amount) || 0)}</div>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Reference</div>
                <div className="p-3 border rounded">{selected.reference || selected.ref || "—"}</div>
                <div className="text-sm text-gray-600 mt-3 mb-2">Contact</div>
                <div className="p-3 border rounded">{selected.contact || "—"}</div>
                <div className="text-sm text-gray-600 mt-3 mb-2">Notes</div>
                <div className="p-3 border rounded">{selected.note || selected.notes || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Proof</div>
                {selected.proofUrl || selected.proof || selected.image ? (
                  <img src={selected.proofUrl || selected.proof || selected.image} alt="proof" className="w-full h-56 object-contain rounded border" />
                ) : (
                  <div className="p-6 border rounded text-sm text-gray-500">No proof image available.</div>
                )}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              {String(selected.status || "").toLowerCase() === "pending" && (
                <>
                  <button onClick={() => doAction(selected.id || selected._id, "approve")} className="px-3 py-2 bg-emerald-600 text-white rounded">Approve</button>
                  <button onClick={() => doAction(selected.id || selected._id, "reject")} className="px-3 py-2 bg-rose-600 text-white rounded">Reject</button>
                </>
              )}
              <button onClick={closeModal} className="px-3 py-2 border rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ...end file...