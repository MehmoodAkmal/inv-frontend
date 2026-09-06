import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const NAV_GROUPS = [
  {
    label: "Platform",
    items: [
      { to: "/superadmin", label: "Overview", roles: ["superAdmin"], end: true,
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
      { to: "/superadmin/organizations", label: "Organizations", roles: ["superAdmin"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
      { to: "/superadmin/users", label: "Users", roles: ["superAdmin"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    ],
  },
  {
    label: "Organisation",
    items: [
      { to: "/dashboard", label: "Dashboard", roles: ["admin","manager","cashier"], end: true,
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
      { to: "/branches", label: "Branches", roles: ["admin","manager","cashier","superAdmin"], permission: ["branches", "view"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
      { to: "/staff", label: "App Users", roles: ["admin"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
      { to: "/permissions", label: "Permissions", roles: ["admin"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
      { to: "/employees", label: "Employees", roles: ["admin"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/categories", label: "Categories", roles: ["admin","manager","cashier"], permission: ["categories", "view"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg> },
      { to: "/items", label: "Items", roles: ["admin","manager","cashier"], permission: ["items", "view"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg> },
      { to: "/stock", label: "Stock", roles: ["admin","manager","cashier"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    ],
  },
  {
    label: "Sales & Credit",
    items: [
      { to: "/sales", label: "Sales", roles: ["admin","manager","cashier"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
      { to: "/customers", label: "Customers", roles: ["admin","manager","cashier"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
      { to: "/payments", label: "Payments", roles: ["admin","manager","cashier"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/expenses", label: "Expenses", roles: ["admin","manager"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg> },
      { to: "/salary", label: "Salary", roles: ["admin","manager"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
      { to: "/reports", label: "Reports", roles: ["admin","manager"],
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg> },
    ],
  },
];

const ROLE_LABELS = { superAdmin: "Super Admin", admin: "Admin", manager: "Manager", cashier: "Cashier" };

// Collapse icon
const CollapseIcon = ({ collapsed }) => (
  <svg className="w-4 h-4 transition-transform duration-300" style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
  </svg>
);

export default function Sidebar({ collapsed, onToggle, onClose }) {
  const { user, permissions, permissionsLoading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); toast.success("Signed out"); navigate("/login"); };

  const w = collapsed ? "w-[68px]" : "w-64";

  return (
    <aside
      className={`flex flex-col h-full ${w} bg-brand-900 text-white select-none transition-all duration-300 ease-in-out overflow-hidden`}
      style={{ minWidth: collapsed ? "68px" : "256px" }}
    >
      {/* ── Brand header ─────────────────────────────────────────────── */}
      <div className="flex items-center h-16 border-b border-brand-800 shrink-0 px-3.5">
        {/* Logo mark — always visible */}
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-600 shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
        </div>

        {/* Title — hidden when collapsed */}
        {!collapsed && (
          <span className="ml-3 font-bold text-sm tracking-tight text-white whitespace-nowrap overflow-hidden">
            Inventory Manager
          </span>
        )}

        {/* Mobile close */}
        {onClose && !collapsed && (
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-brand-800 lg:hidden" aria-label="Close">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}

        {/* Desktop collapse toggle */}
        {onToggle && (
          <button
            onClick={onToggle}
            className={`${collapsed ? "mx-auto" : "ml-auto"} p-1.5 rounded-lg text-brand-400 hover:text-brand-200 hover:bg-brand-800 transition-colors hidden lg:flex`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        )}
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
        {NAV_GROUPS.map((group, gi) => {
          const visible = group.items.filter((item) => {
            if (!item.roles.includes(user?.role)) return false;
            if (!item.permission || ["admin", "superAdmin"].includes(user?.role)) return true;
            return !permissionsLoading && Boolean(permissions?.[item.permission[0]]?.[item.permission[1]]);
          });
          if (!visible.length) return null;

          return (
            <div key={gi} className={gi > 0 ? "mt-5" : ""}>
              {/* Group label — hidden when collapsed, shows divider instead */}
              {collapsed ? (
                <div className="mx-2 mb-2 h-px bg-brand-800" />
              ) : (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-600 whitespace-nowrap">
                  {group.label}
                </p>
              )}

              <div className="space-y-0.5">
                {visible.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end ?? false}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 relative
                       ${collapsed ? "justify-center px-0 py-2.5 mx-1" : "px-3 py-2"}
                       ${isActive
                          ? "bg-primary-600/20 text-primary-400"
                          : "text-brand-400 hover:bg-brand-800 hover:text-brand-100"
                       }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active left bar — only in expanded mode */}
                        {isActive && !collapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-400 rounded-r-full" />
                        )}

                        {/* Active dot — collapsed mode */}
                        {isActive && collapsed && (
                          <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary-400" />
                        )}

                        <span className={`shrink-0 ${isActive ? "text-primary-400" : "text-brand-500 group-hover:text-brand-300"} transition-colors`}>
                          {item.icon}
                        </span>

                        {/* Label — hidden when collapsed */}
                        {!collapsed && (
                          <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── User footer ──────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-brand-800 p-2.5">
        {collapsed ? (
          /* Collapsed: just avatar + sign-out stacked */
          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.firstName?.[0]?.toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-brand-500 hover:text-brand-200 hover:bg-brand-800 transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        ) : (
          /* Expanded: full profile row */
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-brand-800/70">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold shrink-0 text-white">
              {user?.firstName?.[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-100 truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-brand-500 truncate">{ROLE_LABELS[user?.role] ?? user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-brand-500 hover:text-brand-200 hover:bg-brand-700 transition-colors shrink-0"
              aria-label="Sign out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
