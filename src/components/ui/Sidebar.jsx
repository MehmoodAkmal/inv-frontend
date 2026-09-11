import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export const DEFAULT_NAV_GROUPS = [
  {
    label: 'Platform',
    items: [
      {
        to: '/superadmin',
        label: 'Overview',
        roles: ['superAdmin'],
        end: true,
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        to: '/superadmin/organizations',
        label: 'Organizations',
        roles: ['superAdmin'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      },
      {
        to: '/superadmin/users',
        label: 'Users',
        roles: ['superAdmin'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Overview & Analytics',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        roles: ['admin', 'manager', 'cashier'],
        end: true,
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        to: '/branch-comparison',
        label: 'Branch Comparison',
        roles: ['admin'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        to: '/profit-loss',
        label: 'Profit & Loss',
        roles: ['admin', 'manager'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Sales & Ledgers',
    items: [
      {
        to: '/sales',
        label: 'Sales Register',
        roles: ['admin', 'manager', 'cashier'],
        permission: ['sales', 'view'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        ),
      },
      {
        to: '/customer-ledgers',
        label: 'Customer Ledgers',
        roles: ['admin', 'manager', 'cashier'],
        permission: ['payments', 'viewLedger'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        to: '/customers',
        label: 'Customer Directory',
        roles: ['admin', 'manager', 'cashier'],
        permission: ['customers', 'view'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      },
      {
        to: '/payments',
        label: 'Payments',
        roles: ['admin', 'manager', 'cashier'],
        permission: ['payments', 'viewLedger'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Inventory & Catalog',
    items: [
      {
        to: '/items',
        label: 'Items Catalog',
        roles: ['admin', 'manager', 'cashier'],
        permission: ['items', 'view'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
        ),
      },
      {
        to: '/categories',
        label: 'Categories',
        roles: ['admin', 'manager', 'cashier'],
        permission: ['categories', 'view'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        ),
      },
      {
        to: '/stock',
        label: 'Stock & Inventory',
        roles: ['admin', 'manager', 'cashier'],
        permission: ['stock', 'view'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        to: '/purchase-entry',
        label: 'Purchase Entry',
        roles: ['admin', 'manager'],
        permission: ['stock', 'addPurchase'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Finance & Payroll',
    items: [
      {
        to: '/expenses',
        label: 'Expenses',
        roles: ['admin', 'manager'],
        permission: ['expenses', 'view'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
        ),
      },
      {
        to: '/salary',
        label: 'Salary/Payroll',
        roles: ['admin', 'manager'],
        permission: ['salary', 'view'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        to: '/employees',
        label: 'Employees',
        roles: ['admin'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        to: '/branches',
        label: 'Branches',
        roles: ['admin', 'superAdmin'],
        permission: ['branches', 'view'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      },
      {
        to: '/staff',
        label: 'App Users & Staff',
        roles: ['admin'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        to: '/permissions',
        label: 'Permissions',
        roles: ['admin'],
        icon: (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ),
      },
    ],
  },
];

const ROLE_LABELS = {
  superAdmin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Cashier',
};

export default function Sidebar({
  collapsed = false,
  onToggle,
  onClose,
  navGroups = DEFAULT_NAV_GROUPS,
  className = '',
}) {
  const { user, permissions, permissionsLoading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/login');
  };

  const widthClass = collapsed ? 'w-[68px]' : 'w-64';

  return (
    <aside
      className={`flex flex-col h-full ${widthClass} bg-brand-900 text-white select-none transition-all duration-200 ease-in-out overflow-hidden border-r border-brand-800 ${className}`}
      style={{ minWidth: collapsed ? '68px' : '256px' }}
    >
      {/* Brand Header */}
      <div className="flex items-center h-16 border-b border-brand-800 shrink-0 px-3.5 bg-brand-950/40">
        {/* Logo Mark */}
        <div className="flex items-center justify-center w-9 h-9 rounded-md bg-brand-800 text-brand-accent border border-brand-700/60 shrink-0 shadow-sm">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
        </div>

        {/* Title */}
        {!collapsed && (
          <div className="ml-3 min-w-0 flex-1">
            <span className="font-bold text-sm tracking-tight text-white block truncate">
              Inventory POS
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-brand-accent block truncate">
              {user?.role ? ROLE_LABELS[user.role] ?? user.role : 'Multi-Tenant'}
            </span>
          </div>
        )}

        {/* Mobile Close Button */}
        {onClose && !collapsed && (
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-md text-brand-400 hover:text-white hover:bg-brand-800 lg:hidden"
            aria-label="Close navigation"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Desktop Collapse Toggle */}
        {onToggle && (
          <button
            onClick={onToggle}
            className={`${collapsed ? 'mx-auto' : 'ml-auto'} p-1.5 rounded-md text-brand-400 hover:text-brand-accent hover:bg-brand-800 transition-colors hidden lg:flex`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav Items List */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-5">
        {navGroups.map((group, groupIdx) => {
          const visibleItems = group.items.filter((item) => {
            // Manager role: hide Branch Comparison, Branches, and App Users & Staff entirely
            if (user?.role === 'manager') {
              const hiddenLabels = ['Branch Comparison', 'Branches', 'App Users & Staff'];
              const hiddenPaths = ['/branch-comparison', '/branches', '/staff', '/app-users-staff'];
              if (hiddenLabels.includes(item.label) || hiddenPaths.includes(item.to)) {
                return false;
              }
            }

            if (!item.roles.includes(user?.role)) return false;
            if (!item.permission || ['admin', 'superAdmin'].includes(user?.role)) return true;
            return (
              !permissionsLoading &&
              Boolean(permissions?.[item.permission[0]]?.[item.permission[1]])
            );
          });

          if (!visibleItems.length) return null;

          return (
            <div key={groupIdx}>
              {/* Nested Section Label */}
              {collapsed ? (
                <div className="mx-2 mb-2 h-px bg-brand-800" />
              ) : (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-400/80 whitespace-nowrap">
                  {group.label}
                </p>
              )}

              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to + item.label}
                    to={item.to}
                    end={item.end ?? false}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-md text-xs font-medium transition-all duration-150
                       ${collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-2'}
                       ${
                         isActive
                           ? 'bg-brand-800/80 text-brand-accent font-semibold'
                           : 'text-neutral-300 hover:bg-brand-800/50 hover:text-white'
                       }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Mint-Green Active Left Accent Bar (Expanded mode) */}
                        {isActive && !collapsed && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-accent rounded-r-full"
                            aria-hidden="true"
                          />
                        )}

                        {/* Mint-Green Active Dot (Collapsed mode) */}
                        {isActive && collapsed && (
                          <span
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-accent"
                            aria-hidden="true"
                          />
                        )}

                        <span
                          className={`shrink-0 transition-colors ${
                            isActive ? 'text-brand-accent' : 'text-neutral-400 group-hover:text-brand-accent'
                          }`}
                        >
                          {item.icon}
                        </span>

                        {!collapsed && (
                          <span className="whitespace-nowrap overflow-hidden truncate">
                            {item.label}
                          </span>
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

      {/* User Footer Profile */}
      <div className="shrink-0 border-t border-brand-800 p-2.5 bg-brand-950/30">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-800 border border-brand-700 flex items-center justify-center text-xs font-mono font-bold text-brand-accent">
              {user?.firstName?.[0]?.toUpperCase() || 'U'}
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded text-neutral-400 hover:text-danger-400 hover:bg-brand-800 transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-brand-800/60 border border-brand-700/50">
            <div className="w-8 h-8 rounded-full bg-brand-800 border border-brand-700 flex items-center justify-center text-xs font-mono font-bold text-brand-accent shrink-0">
              {user?.firstName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <p className="text-xs font-semibold text-neutral-100 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-brand-300/80 truncate font-mono">
                {ROLE_LABELS[user?.role] ?? user?.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded text-neutral-400 hover:text-danger-400 hover:bg-brand-700 transition-colors shrink-0"
              aria-label="Sign out"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
