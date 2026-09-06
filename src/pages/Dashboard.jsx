import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDashboardSummary } from "../services/reportService";
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, Tooltip,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";

const C = {
  teal:     "#3D7A7A",
  tealLt:   "#7DBFB2",
  tealPale: "#C5D8D5",
  navy:     "#001B29",
  mint:     "#F0F7F6",
  amber:    "#f59e0b",
  rose:     "#f43f5e",
  emerald:  "#10b981",
};

const ROLE_LABELS = { superAdmin:"Super Admin", admin:"Admin", manager:"Manager", cashier:"Cashier" };
const fmt    = (n) => Number(n??0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtInt = (n) => Number(n??0).toLocaleString();

function pctChange(today, yesterday) {
  if (!yesterday || yesterday === 0) return null;
  return ((today - yesterday) / yesterday) * 100;
}

function TrendBadge({ today, yesterday }) {
  const pct = pctChange(today, yesterday);
  if (pct === null) return <span className="text-xs text-brand-400">No prior data</span>;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? "text-emerald-600" : "text-rose-500"}`}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d={up ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
      </svg>
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function CardSkeleton({ h = "h-32" }) {
  return (
    <div className="card p-5 animate-pulse">
      <div className="skeleton h-3 w-20 mb-3 rounded" />
      <div className={`skeleton ${h} w-full rounded-xl mb-2`} />
      <div className="skeleton h-2.5 w-24 rounded" />
    </div>
  );
}

function CompareCard({ label, today, yesterday, icon, color }) {
  const pct = pctChange(today.totalAmount, yesterday.totalAmount);
  const up  = pct === null ? true : pct >= 0;

  return (
    <div className="card p-5 relative overflow-hidden flex flex-col gap-3">
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl" style={{ background: color }} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-brand-500 uppercase tracking-wider">{label}</span>
        <div className="p-2 rounded-xl" style={{ background: color + "22" }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div>
        <p className="text-3xl font-extrabold text-brand-900 tracking-tight leading-none">
          {fmt(today.totalAmount)}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <TrendBadge today={today.totalAmount} yesterday={yesterday.totalAmount} />
          <span className="text-xs text-brand-400">vs yesterday {fmt(yesterday.totalAmount)}</span>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-brand-400 font-medium mb-1">
          <span>Cash <span className="font-bold text-brand-600">{fmt(today.cashSales)}</span></span>
          <span>Credit <span className="font-bold text-brand-600">{fmt(today.creditSales)}</span></span>
        </div>
        <div className="h-1.5 bg-brand-100 rounded-full overflow-hidden">
          {today.totalAmount > 0 && (
            <div
              className="h-full rounded-full"
              style={{
                width: `${(today.cashSales / today.totalAmount) * 100}%`,
                background: `linear-gradient(90deg, ${C.teal}, ${C.tealLt})`,
              }}
            />
          )}
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-[10px] text-brand-400">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: C.teal }} />Cash
          </span>
          <span className="flex items-center gap-1 text-[10px] text-brand-400">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: C.tealPale }} />Credit
          </span>
        </div>
      </div>
      <div className="text-xs text-brand-400">{fmtInt(today.saleCount)} sale{today.saleCount !== 1 ? "s" : ""}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-brand-900 text-white rounded-xl px-3 py-2 shadow-card-lg text-xs">
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

const SalesTrendChart = ({ data }) => (
  <div className="card p-5">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-sm font-bold text-brand-900">7-Day Sales Trend</h3>
        <p className="text-xs text-brand-400 mt-0.5">Daily revenue — cash vs credit</p>
      </div>
      <div className="flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1.5 text-brand-500">
          <span className="w-3 h-0.5 rounded inline-block" style={{ background: C.teal }} />Cash
        </span>
        <span className="flex items-center gap-1.5 text-brand-500">
          <span className="w-3 h-0.5 rounded inline-block" style={{ background: C.tealLt }} />Credit
        </span>
      </div>
    </div>
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={C.teal}   stopOpacity={0.25} />
            <stop offset="95%" stopColor={C.teal}   stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradCredit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={C.tealLt} stopOpacity={0.25} />
            <stop offset="95%" stopColor={C.tealLt} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={C.tealPale} strokeOpacity={0.5} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false}
          tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="cash"   name="Cash"   stroke={C.teal}   strokeWidth={2} fill="url(#gradCash)"   dot={{ r: 3, fill: C.teal,   strokeWidth: 0 }} activeDot={{ r: 5 }} />
        <Area type="monotone" dataKey="credit" name="Credit" stroke={C.tealLt} strokeWidth={2} fill="url(#gradCredit)" dot={{ r: 3, fill: C.tealLt, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const SalesBarChart = ({ data }) => (
  <div className="card p-5">
    <div className="mb-4">
      <h3 className="text-sm font-bold text-brand-900">Daily Revenue</h3>
      <p className="text-xs text-brand-400 mt-0.5">Total amount per day this week</p>
    </div>
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.tealPale} strokeOpacity={0.5} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false}
          tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="total" name="Revenue" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => (
            <Cell key={index} fill={index === data.length - 1 ? C.teal : C.tealPale}
              stroke={index === data.length - 1 ? C.teal : "transparent"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const r  = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x  = cx + r * Math.cos(-midAngle * RADIAN);
  const y  = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const PaymentPieChart = ({ today, yesterday }) => {
  const todayData = [
    { name: "Cash",   value: today.cashSales   },
    { name: "Credit", value: today.creditSales },
  ].filter((d) => d.value > 0);
  const yesterdayData = [
    { name: "Cash",   value: yesterday.cashSales   },
    { name: "Credit", value: yesterday.creditSales },
  ].filter((d) => d.value > 0);
  const PIE_COLORS = [C.teal, C.tealLt];

  return (
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-brand-900">Payment Mix</h3>
        <p className="text-xs text-brand-400 mt-0.5">Cash vs credit split</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col items-center">
          <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider mb-1">Today</p>
          {todayData.length > 0 ? (
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={todayData} cx="50%" cy="50%" outerRadius={55} innerRadius={28}
                  labelLine={false} label={renderCustomLabel} dataKey="value" strokeWidth={0}>
                  {todayData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % 2]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: C.navy, border: "none", borderRadius: "12px", color: "white", fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[130px] flex items-center justify-center text-xs text-brand-400">No sales yet</div>
          )}
        </div>
        <div className="flex flex-col items-center">
          <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider mb-1">Yesterday</p>
          {yesterdayData.length > 0 ? (
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={yesterdayData} cx="50%" cy="50%" outerRadius={55} innerRadius={28}
                  labelLine={false} label={renderCustomLabel} dataKey="value" strokeWidth={0}>
                  {yesterdayData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % 2]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: C.navy, border: "none", borderRadius: "12px", color: "white", fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[130px] flex items-center justify-center text-xs text-brand-400">No data</div>
          )}
        </div>
      </div>
      <div className="flex justify-center gap-4 mt-2">
        {[["Cash", C.teal], ["Credit", C.tealLt]].map(([lbl, clr]) => (
          <span key={lbl} className="flex items-center gap-1.5 text-[11px] text-brand-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: clr }} />{lbl}
          </span>
        ))}
      </div>
    </div>
  );
};

function KpiTile({ label, value, sub, icon, accent }) {
  const cfg = {
    teal:  { bar: C.teal,    bg: "#F0F7F6", ic: C.teal   },
    amber: { bar: C.amber,   bg: "#fffbeb", ic: C.amber  },
    rose:  { bar: C.rose,    bg: "#fff1f2", ic: C.rose   },
    slate: { bar: "#94a3b8", bg: "#f8fafc", ic: "#94a3b8"},
  };
  const c = cfg[accent] ?? cfg.slate;
  return (
    <div className="card p-4 relative overflow-hidden flex items-center gap-3">
      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: c.bar }} />
      <div className="p-2.5 rounded-xl shrink-0" style={{ background: c.bg }}>
        <span style={{ color: c.ic }}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-extrabold text-brand-900 tracking-tight leading-none mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-brand-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CARD_GROUPS = [
  { label:"Organisation", accent:"bg-primary-50 border-primary-200/60", iconColor:"text-primary-600", cards:[
    { title:"Branches",  desc:"Manage locations",    href:"/branches",  roles:["admin","superAdmin"], icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
    { title:"App Users", desc:"Managers & cashiers", href:"/staff",     roles:["admin"],             icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { title:"Employees", desc:"Salaried staff",       href:"/employees", roles:["admin"],             icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
  ]},
  { label:"Inventory", accent:"bg-violet-50 border-violet-100", iconColor:"text-violet-600", cards:[
    { title:"Categories", desc:"Organise by type",   href:"/categories", roles:["admin","manager"],          icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /> },
    { title:"Items",      desc:"Products & pricing", href:"/items",      roles:["admin","manager"],          icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /> },
    { title:"Stock",      desc:"Levels & history",   href:"/stock",      roles:["admin","manager","cashier"],icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
  ]},
  { label:"Sales & Credit", accent:"bg-emerald-50 border-emerald-100", iconColor:"text-emerald-600", cards:[
    { title:"Sales",     desc:"Cash & credit sales",  href:"/sales",     roles:["admin","manager","cashier"],icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    { title:"Customers", desc:"Credit accounts",      href:"/customers", roles:["admin","manager","cashier"],icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
    { title:"Payments",  desc:"Collect & ledgers",    href:"/payments",  roles:["admin","manager","cashier"],icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /> },
  ]},
  { label:"Finance", accent:"bg-amber-50 border-amber-100", iconColor:"text-amber-600", cards:[
    { title:"Expenses", desc:"Branch costs",          href:"/expenses",  roles:["admin","manager"],icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /> },
    { title:"Salary",   desc:"Monthly payments",      href:"/salary",    roles:["admin","manager"],icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { title:"Reports",  desc:"P&L & comparisons",     href:"/reports",   roles:["admin","manager"],icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /> },
  ]},
];

export default function Dashboard() {
  const { user }  = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboardSummary"],
    queryFn: () => getDashboardSummary().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const summary = data;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const today     = summary?.today     ?? { saleCount:0, totalAmount:0, cashSales:0, creditSales:0 };
  const yesterday = summary?.yesterday ?? { saleCount:0, totalAmount:0, cashSales:0, creditSales:0 };
  const month     = summary?.thisMonth ?? { saleCount:0, totalAmount:0 };
  const trend     = summary?.trend7Days ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-0.5">{greeting()}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-900 leading-none">
            {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-sm text-brand-500 mt-1.5">
            {ROLE_LABELS[user?.role] ?? user?.role}
            <span className="mx-2 text-brand-300">·</span>
            {new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700">Live</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          <CardSkeleton /><CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <CompareCard label="Today's Sales" today={today} yesterday={yesterday} color={C.teal} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
          <CompareCard label="Yesterday's Sales" today={yesterday} yesterday={{ ...yesterday, totalAmount: 0, cashSales: 0, creditSales: 0, saleCount: 0 }} color={C.tealLt} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>} />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3"><CardSkeleton h="h-48" /></div>
          <div className="lg:col-span-2"><CardSkeleton h="h-48" /></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3"><SalesTrendChart data={trend} /></div>
          <div className="lg:col-span-2"><PaymentPieChart today={today} yesterday={yesterday} /></div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3"><CardSkeleton h="h-48" /></div>
          <div className="lg:col-span-2 space-y-3">
            <CardSkeleton h="h-12" /><CardSkeleton h="h-12" /><CardSkeleton h="h-12" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3"><SalesBarChart data={trend} /></div>
          <div className="lg:col-span-2 space-y-3">
            <KpiTile label="This Month" value={fmt(month.totalAmount)} sub={`${fmtInt(month.saleCount)} sales`} accent="teal" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>} />
            <KpiTile label="Outstanding Credit" value={fmt(summary?.outstandingCreditTotal ?? 0)} sub="Current receivables" accent={summary?.outstandingCreditTotal > 0 ? "amber" : "slate"} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>} />
            <KpiTile label="Low Stock Items" value={fmtInt(summary?.lowStockItemCount ?? 0)} sub="At or below reorder level" accent={summary?.lowStockItemCount > 0 ? "rose" : "slate"} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>} />
          </div>
        </div>
      )}

      <div className="space-y-5">
        {CARD_GROUPS.map((group) => {
          const visible = group.cards.filter((c) => c.roles.includes(user?.role));
          if (!visible.length) return null;
          return (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-[10px] font-bold text-brand-500 uppercase tracking-widest whitespace-nowrap">{group.label}</h3>
                <div className="flex-1 h-px bg-brand-200" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {visible.map((card) => (
                  <Link key={card.href} to={card.href}
                    className={`group flex items-center gap-3.5 p-4 bg-white rounded-2xl border shadow-card hover:shadow-card-md hover:-translate-y-0.5 transition-all duration-200 ${group.accent}`}>
                    <div className={`p-2.5 rounded-xl bg-white/80 ${group.iconColor} shrink-0 border border-current/10`}>
                      <svg className="w-4.5 h-4.5" style={{width:"18px",height:"18px"}} fill="none" viewBox="0 0 24 24" stroke="currentColor">{card.icon}</svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brand-800 group-hover:text-primary-600 transition-colors truncate">{card.title}</p>
                      <p className="text-xs text-brand-400 truncate">{card.desc}</p>
                    </div>
                    <svg className="w-3.5 h-3.5 text-brand-300 group-hover:text-primary-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
