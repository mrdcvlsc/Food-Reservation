// ...new file...
import React, { useEffect, useState, useMemo } from "react";
import Navbar from "../../components/adminavbar";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function StatusBadge({ status }) {
  const s = String(status || "pending").toLowerCase();
  const label = String(status || "Pending");
  let base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ";
  if (s.includes("approve") || s.includes("approved") || s === "approved") {
    return <span className={base + "bg-emerald-100 text-emerald-800"}>{label}</span>;
  }
  if (s.includes("pending")) {
    return <span className={base + "bg-amber-100 text-amber-800"}>{label}</span>;
  }
  if (s.includes("reject") || s.includes("rejected")) {
    return <span className={base + "bg-rose-100 text-rose-800"}>{label}</span>;
  }
  return <span className={base + "bg-slate-100 text-slate-800"}>{label}</span>;
}

export default function AdminTopUpHistory() {
  const navigate = useNavigate();
  const [rawList, setRawList] = useState([]); // full data from server
  const [listLoading, setListLoading] = useState(true);

  // UI state
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");

  const [selected, setSelected] = useState(null); // selected top-up for modal/view

  // load data once (try primary and fallbacks)
  const load = async () => {
    try {
      setListLoading(true);
      const tryEndpoints = ["/topups", "/admin/topups", "/topups/all", "/topups?all=1"];
      let data = null;
      for (const ep of tryEndpoints) {
        try {
          const res = await api.get(ep);
          const arr = Array.isArray(res) ? res : res?.data || res;
          if (Array.isArray(arr) && arr.length >= 0) {
            data = arr;
            break;
          }
        } catch (e) {
          // try next
        }
      }
      const raw = Array.isArray(data) ? data : [];

      // helper normalizers: make provider/status consistent (ensure PAYMAYA and pending are present)
      const normalizeProvider = (p) => {
        if (!p) return "";
        const pp = String(p).toLowerCase();
        if (pp.includes("pay") || pp.includes("maya")) return "paymaya";
        if (pp.includes("gcash")) return "gcash";
        return pp;
      };

      const normalizeStatus = (s) => {
        if (!s) return "pending";
        const ss = String(s).toLowerCase();
        if (ss.includes("approve")) return "approved";
        if (ss.includes("reject")) return "rejected";
        if (ss.includes("pending") || ss === "") return "pending";
        return ss;
      };

      const mapped = raw.map((t) => ({
        id: t.id || t._id,
        createdAt: t.createdAt || t.date || t.submittedAt || (t.raw && t.raw.createdAt) || new Date().toISOString(),
        name: t.student || t.name || t.userName || t.email || (t.user && t.user.name) || "—",
        studentId: t.studentId || t.sid || t.student || (t.user && t.user.studentId) || "—",
        contact: t.contact || t.phone || t.mobile || (t.user && t.user.phone) || "—",
        provider: normalizeProvider(t.provider || t.raw?.provider),
        amount: Number(t.amount) || 0,
        status: normalizeStatus(t.status || t.state || t.raw?.status),
        reference: t.reference || t.ref || t.referenceNumber || "—",
        proofUrl: t.proofUrl || t.proof || t.image || "",
        note: t.note || t.notes || "",
        raw: t,
      }));
      // newest -> oldest
      mapped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRawList(mapped);
    } catch (e) {
      console.error("Failed to load topups", e);
      setRawList([]);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  // derive filter option lists from data
  const providerOptions = useMemo(() => {
    const s = new Set();
    for (const r of rawList) {
      if (r.provider) s.add(r.provider.toLowerCase());
    }
    // always include the common providers so dropdown stays accurate
    const forced = ["gcash", "paymaya"];
    for (const f of forced) s.add(f);
    return ["all", ...Array.from(s).filter(Boolean)];
  }, [rawList]);

  const statusOptions = useMemo(() => {
    const s = new Set();
    for (const r of rawList) {
      if (r.status) s.add(String(r.status).toLowerCase());
    }
    // ensure pending/approved/rejected are always present
    ["pending", "approved", "rejected"].forEach((st) => s.add(st));
    return ["all", ...Array.from(s).filter(Boolean)];
  }, [rawList]);

  // client-side accurate filtering & search
  const filtered = useMemo(() => {
    if (!rawList || rawList.length === 0) return [];

    const tokens = debouncedQ
      .split(/\s+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    return rawList.filter((r) => {
      // provider filter
      if (providerFilter !== "all" && String(r.provider || "").toLowerCase() !== String(providerFilter || "").toLowerCase()) {
        return false;
      }
      // status filter
      if (statusFilter !== "all" && String(r.status || "").toLowerCase() !== String(statusFilter || "").toLowerCase()) {
        return false;
      }
      // search tokens: require every token to match at least one of the searchable fields
      if (tokens.length === 0) return true;
      const haystack = [
        String(r.name || "").toLowerCase(),
        String(r.studentId || "").toLowerCase(),
        String(r.reference || "").toLowerCase(),
        String(r.contact || "").toLowerCase(),
        String(r.id || "").toLowerCase(),
      ].join(" ");
      return tokens.every((tok) => haystack.includes(tok));
    });
  }, [rawList, debouncedQ, providerFilter, statusFilter]);

  // totals for UI
  const totals = useMemo(() => {
    const totalCount = rawList.length;
    const filteredCount = filtered.length;
    const sum = filtered.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return { totalCount, filteredCount, sum };
  }, [rawList, filtered]);

  const viewTopUp = (t) => setSelected(t);
  const closeModal = () => setSelected(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Top-Up History</h1>
        </div>

        <div className="bg-white rounded-xl p-4 border">
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex items-center w-full md:w-auto">
                <Search className="w-4 h-4 text-gray-400 absolute left-3" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by user name, student id, reference or contact"
                  className="pl-10 pr-3 py-2 border rounded-lg w-full md:w-[420px] text-sm"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-3 border rounded-lg text-sm"
                aria-label="Filter by status"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>

              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="py-2 px-3 border rounded-lg text-sm"
                aria-label="Filter by provider"
              >
                {providerOptions.map((p) => (
                  <option key={p} value={p}>
                    {p === "all" ? "All providers" : p.toUpperCase()}
                  </option>
                ))}
              </select>

              <button onClick={() => { setQ(""); setDebouncedQ(""); setStatusFilter("all"); setProviderFilter("all"); }} className="px-3 py-2 rounded-lg bg-gray-100 text-sm">
                Reset
              </button>
            </div>

            <div className="text-sm text-gray-600">
              <div>Showing: <strong>{totals.filteredCount}</strong> / {totals.totalCount}</div>
              <div>Total amount: <strong>{peso.format(totals.sum)}</strong></div>
            </div>
          </div>

          <div className="mt-4 overflow-auto">
            {listLoading ? (
              <div className="p-6 text-center text-sm text-gray-500">Loading…</div>
            ) : filtered.length === 0 ? (
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
                  {filtered.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="py-2">{t.name}</td>
                      <td className="py-2">{t.studentId}</td>
                      <td className="py-2">{t.contact}</td>
                      <td className="py-2">{(t.provider || "").toUpperCase()}</td>
                      <td className="py-2 break-words max-w-[10rem]">{t.reference}</td>
                      <td className="py-2 text-right font-semibold">{peso.format(Number(t.amount) || 0)}</td>
                      <td className="py-2"><StatusBadge status={t.status} /></td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button onClick={() => viewTopUp(t)} className="text-xs px-2 py-1 border rounded">View</button>
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
                <div className="text-lg font-semibold">{selected.name || "—"}</div>
                <div className="text-xs text-gray-400">{selected.studentId || "—"}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Amount</div>
                <div className="text-lg font-bold">{peso.format(Number(selected.amount) || 0)}</div>
                <div className="mt-2"><StatusBadge status={selected.status} /></div>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Reference</div>
                <div className="p-3 border rounded break-words">{selected.reference || "—"}</div>
                <div className="text-sm text-gray-600 mt-3 mb-2">Contact</div>
                <div className="p-3 border rounded">{selected.contact || "—"}</div>
                <div className="text-sm text-gray-600 mt-3 mb-2">Notes</div>
                <div className="p-3 border rounded">{selected.note || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Proof</div>
                {selected.proofUrl ? (
                  <img src={selected.proofUrl} alt="proof" className="w-full h-56 object-contain rounded border" />
                ) : (
                  <div className="p-6 border rounded text-sm text-gray-500">No proof image available.</div>
                )}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={closeModal} className="px-3 py-2 border rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ...end file...