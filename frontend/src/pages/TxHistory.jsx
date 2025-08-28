// src/pages/TxHistory.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/avbar";
import { api } from "../lib/api";
import { Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function Pill({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
        tones[tone] || tones.gray
      }`}
    >
      {children}
    </span>
  );
}

function fmtDateTime(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v || "");
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/**
 * Map any backend shape into a uniform row for the table.
 * Accepts either a transaction doc or a reservation doc.
 */
function mapToRow(t) {
  const raw = t || {};

  const id =
    raw.id ||
    raw.txId ||
    raw.orderId ||
    raw.ref ||
    raw.reference ||
    raw._id ||
    Math.random().toString(36).slice(2);

  // Prefer explicit reservation/order titles, fallback to Transaction
  const title =
    raw.title ||
    (raw.type === "reservation" ? "Reservation" : null) ||
    raw.product ||
    raw.description ||
    raw.note ||
    raw.kind ||
    raw.type ||
    "Transaction";

  const createdAt = raw.createdAt || raw.time || raw.date || raw.when || null;

  const rawAmount = Number(raw.amount ?? raw.value ?? raw.total ?? 0);
  const safeAmount = Number.isFinite(rawAmount) ? rawAmount : 0;

  const rawStatus = String(raw.status || raw.result || raw.state || "Success");
  const statusLC = rawStatus ? rawStatus.toLowerCase() : "success";

  let direction = (raw.direction || "").toString().toLowerCase();
  const lowerKind = (raw.kind || raw.type || "").toString().toLowerCase();

  // Direction inference rules
  if (!direction) {
    if (
      lowerKind.includes("order") ||
      lowerKind.includes("reservation") ||
      lowerKind.includes("purchase")
    ) {
      direction = "debit";
    } else if (
      lowerKind.includes("top") ||
      lowerKind.includes("top-up") ||
      lowerKind.includes("topup") ||
      lowerKind.includes("refund") ||
      statusLC === "approved" ||
      statusLC === "refunded"
    ) {
      direction = "credit";
    } else {
      // fallback: sign of amount
      direction = safeAmount < 0 ? "debit" : "credit";
    }
  }

  const absAmount = Math.abs(safeAmount);
  const sign = direction === "credit" ? +1 : -1;

  return {
    id,
    title,
    createdAt,
    status: rawStatus,
    statusLC,
    direction, // credit | debit
    sign, // +1 | -1
    amount: absAmount, // positive; sign is separate
    raw,
  };
}

export default function TxHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // controls
  const [q, setQ] = useState("");
  const [dir, setDir] = useState("all"); // all | credit | debit
  const [status, setStatus] = useState("all"); // all | success | pending | failed | approved | rejected | refunded
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("date-desc"); // date-desc | date-asc | amount-desc | amount-asc
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  /**
   * Load transactions with a graceful fallback:
   * 1) /api/transactions/mine (new unified endpoint)
   * 2) /api/reservations/mine (older projects)
   */
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      let list = [];

      // Try the new route first
      try {
        const d = await api.get("/transactions/mine");
        list = Array.isArray(d) ? d : d?.data || [];
      } catch (e1) {
        // Only fall back if it's clearly a missing route / 404
        const msg = (e1?.message || "").toLowerCase();
        if (msg.includes("404") || msg.includes("not found")) {
          try {
            const d2 = await api.get("/reservations/mine");
            const rawList = Array.isArray(d2) ? d2 : d2?.data || [];
            // Convert reservation docs to the transaction row shape
            list = rawList.map((r) =>
              mapToRow({
                id: r.id,
                type: "reservation",
                title: "Reservation",
                amount: r.total,
                createdAt: r.createdAt,
                status: r.status,
              })
            );
          } catch (e2) {
            throw e2;
          }
        } else {
          // Not a 404 – bubble up (auth, network, etc.)
          throw e1;
        }
      }

      // Normalize whatever we got
      const mapped = list.map(mapToRow);
      setRows(mapped);
    } catch (e) {
      console.error("[TxHistory] load failed:", e);
      setRows([]);
      const msg = String(e?.message || e || "");
      const lower = msg.toLowerCase();
      if (lower.includes("401") || lower.includes("unauthorized")) {
        setError("You are not logged in. Please login, then refresh.");
      } else if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed")) {
        setError("Network error. Make sure the API (port 4000) is running, then refresh.");
      } else {
        setError("Could not load your transactions. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filters + sorting
  const filteredSorted = useMemo(() => {
    const s = (q || "").toLowerCase().trim();
    let list = rows.slice(0);

    if (s) {
      list = list.filter(
        (r) =>
          String(r.id).toLowerCase().includes(s) ||
          String(r.title).toLowerCase().includes(s) ||
          String(r.status).toLowerCase().includes(s) ||
          String(r.direction).toLowerCase().includes(s)
      );
    }

    if (dir !== "all") list = list.filter((r) => r.direction === dir);

    if (status !== "all") {
      const want = (status || "").toLowerCase();
      list = list.filter((r) => r.statusLC === want);
    }

    const fromD = from ? new Date(from) : null;
    const toD = to ? new Date(to) : null;
    if (fromD) fromD.setHours(0, 0, 0, 0);
    if (toD) toD.setHours(23, 59, 59, 999);
    if (fromD || toD) {
      list = list.filter((r) => {
        const d = new Date(r.createdAt);
        if (Number.isNaN(d.getTime())) return false;
        if (fromD && d < fromD) return false;
        if (toD && d > toD) return false;
        return true;
      });
    }

    switch (sort) {
      case "date-asc":
        list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case "amount-desc":
        list.sort((a, b) => b.amount * b.sign - a.amount * a.sign);
        break;
      case "amount-asc":
        list.sort((a, b) => a.amount * a.sign - b.amount * b.sign);
        break;
      default:
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return list;
  }, [rows, q, dir, status, from, to, sort]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / perPage));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * perPage;
    return filteredSorted.slice(start, start + perPage);
  }, [filteredSorted, pageSafe, perPage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Back + title + refresh */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link to="/dashboard" className="text-gray-600 hover:underline flex items-center mb-1">
              ← Back to home
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Transaction History</h1>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by ID, title, status…"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <select
              value={dir}
              onChange={(e) => {
                setDir(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All types</option>
              <option value="credit">Credits (money in)</option>
              <option value="debit">Debits (money out)</option>
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="success">Success</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
              <option value="refunded">Refunded</option>
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
              />
              <span className="text-gray-400">–</span>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="amount-desc">Amount (high → low)</option>
              <option value="amount-asc">Amount (low → high)</option>
            </select>
          </div>

          <div className="mt-3 flex items-center justify-end gap-3">
            <label className="text-sm text-gray-600 flex items-center gap-2">
              Per page:
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value) || 10);
                  setPage(1);
                }}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
              >
                <option value={7}>7</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
        </section>

        {/* Error banner */}
        {!loading && error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left  text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left  text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Ref
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 w-40 bg-gray-200 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="h-4 w-16 bg-gray-200 rounded inline-block" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="h-4 w-28 bg-gray-200 rounded inline-block" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="h-4 w-20 bg-gray-200 rounded inline-block" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="h-5 w-20 bg-gray-200 rounded inline-block" />
                    </td>
                  </tr>
                ))}

              {!loading && !error && filteredSorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-sm text-gray-600">
                    No transactions found.
                    <div className="text-xs text-gray-400 mt-1">
                      Tip: create a reservation in the Shop, then check back here.
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                filteredSorted.length > 0 &&
                pageRows.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{t.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{t.id}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      {t.direction === "credit" ? (
                        <Pill tone="green">Credit</Pill>
                      ) : (
                        <Pill tone="red">Debit</Pill>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center">
                      {fmtDateTime(t.createdAt)}
                    </td>
                    <td
                      className={`px-6 py-4 text-sm text-right font-semibold ${
                        t.sign > 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {t.sign > 0 ? "+" : "−"}
                      {peso.format(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      {(() => {
                        const s = t.statusLC;
                        if (s === "success" || s === "approved")
                          return <Pill tone="green">{t.status}</Pill>;
                        if (s === "pending") return <Pill tone="yellow">{t.status}</Pill>;
                        if (s === "failed" || s === "rejected") return <Pill tone="red">{t.status}</Pill>;
                        if (s === "refunded") return <Pill tone="blue">{t.status}</Pill>;
                        return <Pill>{t.status}</Pill>;
                      })()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && !error && filteredSorted.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {pageSafe} of {totalPages} • {filteredSorted.length} record
              {filteredSorted.length !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pageSafe <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={pageSafe >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
