import CustomSelect from "../components/ui/CustomSelect";
import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  getProfitLoss,
  getBranchComparison,
  getLowStock,
} from "../services/reportService";
import { getBranches } from "../services/branchService";
import Spinner from "../components/ui/Spinner";
import { useEffect } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────
const fmt  = (n) => Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

// ── P&L metric card ───────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color = "gray" }) {
  const colors = {
    gray:   "bg-gray-50  border-gray-200  text-gray-900",
    green:  "bg-green-50 border-green-200 text-green-800",
    red:    "bg-red-50   border-red-200   text-red-800",
    amber:  "bg-amber-50 border-amber-200 text-amber-800",
    blue:   "bg-blue-50  border-blue-200  text-blue-800",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

// ── P&L Tab ───────────────────────────────────────────────────────────────
function ProfitLossTab({ isAdmin, branches }) {
  const { user } = useAuth();
  const [filterBranch, setFilterBranch] = useState("");
  const [startDate,    setStartDate]    = useState(monthStart());
  const [endDate,      setEndDate]      = useState(today());
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(false);

  const run = async () => {
    if (!startDate || !endDate) { toast.error("Select a date range"); return; }
    setLoading(true);
    try {
      const params = { startDate, endDate };
      if (isAdmin && filterBranch) params.branchId = filterBranch;
      const res = await getProfitLoss(params);
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate report");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        {isAdmin && (
          <div>
            <label className="label text-xs">Branch</label>
            <CustomSelect value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}
              className="input-field w-auto text-sm py-2">
              <option value="">All branches</option>
              {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </CustomSelect>
          </div>
        )}
        <div>
          <label className="label text-xs">From</label>
          <input type="date" value={startDate} max={endDate}
            onChange={(e) => setStartDate(e.target.value)} className="input-field text-sm py-2" />
        </div>
        <div>
          <label className="label text-xs">To</label>
          <input type="date" value={endDate} min={startDate} max={today()}
            onChange={(e) => setEndDate(e.target.value)} className="input-field text-sm py-2" />
        </div>
        <button className="btn-primary" onClick={run} disabled={loading}>
          {loading && <Spinner size="sm" className="mr-2" />}
          Generate
        </button>
      </div>

      {loading && <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-600" /></div>}

      {!loading && data && (
        <>
          {/* Revenue section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Revenue</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard label="Total Revenue"   value={fmt(data.totalRevenue)}   color="blue" />
              <MetricCard label="Cash Sales"      value={fmt(data.totalCashSales)}   sub={`${data.saleCount} sale${data.saleCount !== 1 ? "s" : ""}`} />
              <MetricCard label="Credit Sales"    value={fmt(data.totalCreditSales)} />
              <MetricCard label="COGS"            value={fmt(data.totalCOGS)}       color="amber" />
            </div>
          </div>

          {/* Profit section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Profit</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard label="Gross Profit"   value={fmt(data.grossProfit)}   color={data.grossProfit >= 0 ? "green" : "red"} />
              <MetricCard label="Expenses"       value={fmt(data.totalExpenses)} color="amber" />
              <MetricCard label="Salaries"       value={fmt(data.totalSalaries)} color="amber" />
              <MetricCard label="Net Profit"     value={fmt(data.netProfit)}     color={data.netProfit >= 0 ? "green" : "red"} />
            </div>
          </div>

          {/* Snapshot */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Current Snapshot</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MetricCard label="Outstanding Credit (now)" value={fmt(data.totalOutstandingCredit)}
                sub="Not period-filtered — current balance snapshot" color={data.totalOutstandingCredit > 0 ? "amber" : "gray"} />
            </div>
          </div>
        </>
      )}

      {!loading && !data && (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">Set a date range and click Generate to see the P&amp;L report.</p>
        </div>
      )}
    </div>
  );
}

// ── Branch Comparison Tab ─────────────────────────────────────────────────
function BranchComparisonTab() {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate,   setEndDate]   = useState(today());
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);

  const run = async () => {
    if (!startDate || !endDate) { toast.error("Select a date range"); return; }
    setLoading(true);
    try {
      const res = await getBranchComparison({ startDate, endDate });
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate report");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label text-xs">From</label>
          <input type="date" value={startDate} max={endDate}
            onChange={(e) => setStartDate(e.target.value)} className="input-field text-sm py-2" />
        </div>
        <div>
          <label className="label text-xs">To</label>
          <input type="date" value={endDate} min={startDate} max={today()}
            onChange={(e) => setEndDate(e.target.value)} className="input-field text-sm py-2" />
        </div>
        <button className="btn-primary" onClick={run} disabled={loading}>
          {loading && <Spinner size="sm" className="mr-2" />}
          Compare branches
        </button>
      </div>

      {loading && <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-600" /></div>}

      {!loading && data && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Branch","Revenue","COGS","Gross Profit","Expenses","Salaries","Net Profit","Sales"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {data.branches.map((b) => (
                  <tr key={b.branchId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{b.branchName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{fmt(b.totalRevenue)}</td>
                    <td className="px-4 py-3 text-sm text-amber-700">{fmt(b.totalCOGS)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{fmt(b.grossProfit)}</td>
                    <td className="px-4 py-3 text-sm text-amber-700">{fmt(b.totalExpenses)}</td>
                    <td className="px-4 py-3 text-sm text-amber-700">{fmt(b.totalSalaries)}</td>
                    <td className="px-4 py-3 text-sm font-bold">
                      <span className={b.netProfit >= 0 ? "text-green-700" : "text-red-600"}>
                        {fmt(b.netProfit)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{b.saleCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !data && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Select a date range and click Compare branches.</p>
        </div>
      )}
    </div>
  );
}

// ── Low Stock Tab ─────────────────────────────────────────────────────────
function LowStockTab({ isAdmin, branches }) {
  const [filterBranch, setFilterBranch] = useState("");
  const [alerts,       setAlerts]       = useState(null);
  const [loading,      setLoading]      = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (isAdmin && filterBranch) params.branchId = filterBranch;
      const res = await getLowStock(params);
      setAlerts(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch low stock alerts");
    } finally { setLoading(false); }
  }, [isAdmin, filterBranch]);

  // Auto-load on mount
  useEffect(() => { run(); }, [run]);

  return (
    <div className="space-y-5">
      {isAdmin && (
        <div className="card p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="label text-xs">Branch</label>
            <CustomSelect value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}
              className="input-field w-auto text-sm py-2">
              <option value="">All branches</option>
              {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </CustomSelect>
          </div>
          <button className="btn-primary" onClick={run} disabled={loading}>
            {loading && <Spinner size="sm" className="mr-2" />}
            Refresh
          </button>
        </div>
      )}

      {loading && <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-600" /></div>}

      {!loading && alerts !== null && alerts.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">All items are above their reorder levels.</p>
        </div>
      )}

      {!loading && alerts && alerts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-amber-800">{alerts.length} item{alerts.length !== 1 ? "s" : ""} at or below reorder level</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Item","SKU","Branch","Unit","Current Qty","Reorder Level","Deficit"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {alerts.map((a, i) => {
                  const deficit = a.reorderLevel - a.currentQuantity;
                  return (
                    <tr key={i} className={`${a.currentQuantity === 0 ? "bg-red-50" : "hover:bg-gray-50"} transition-colors`}>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{a.itemName}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 font-mono">{a.sku || "—"}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{a.branchName}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{a.unit}</td>
                      <td className="px-5 py-3">
                        <span className={`text-sm font-bold ${a.currentQuantity === 0 ? "text-red-700" : "text-amber-700"}`}>
                          {a.currentQuantity}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{a.reorderLevel}</td>
                      <td className="px-5 py-3 text-sm text-red-600 font-medium">{deficit > 0 ? deficit : 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Reports page ─────────────────────────────────────────────────────
export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [tab,      setTab]      = useState("pnl");
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (isAdmin) getBranches().then((r) => setBranches(r.data.data)).catch(() => {});
  }, [isAdmin]);

  const TABS = [
    { key: "pnl",        label: "Profit & Loss",      roles: ["admin","manager"] },
    { key: "comparison", label: "Branch Comparison",  roles: ["admin"] },
    { key: "lowstock",   label: "Low Stock Alerts",   roles: ["admin","manager"] },
  ].filter((t) => t.roles.includes(user?.role));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Financial summaries and inventory alerts</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "pnl"        && <ProfitLossTab        isAdmin={isAdmin} branches={branches} />}
      {tab === "comparison" && <BranchComparisonTab />}
      {tab === "lowstock"   && <LowStockTab          isAdmin={isAdmin} branches={branches} />}
    </div>
  );
}
