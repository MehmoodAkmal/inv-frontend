import { createContext, useContext, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ui/ThemeToggle';

const MinimalLayoutContext = createContext(false);

export const CASHIER_NAV_ITEMS = [
  {
    name: 'New Sale',
    path: '/pos',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    name: 'Sales History',
    path: '/pos/sales',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    name: 'Stock Lookup',
    path: '/pos/stock',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
];

export default function MinimalLayout({ children }) {
  const isNested = useContext(MinimalLayoutContext);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = () => navigate('/login');
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [navigate]);

  const handleLogout = async () => {
    if (logout) {
      await logout();
    }
    navigate('/login');
  };

  if (isNested) {
    return <>{children || <Outlet />}</>;
  }

  // Branch Name helper
  const branchName =
    typeof user?.branchId === 'object' && user?.branchId?.name
      ? user.branchId.name
      : user?.branchName || 'Assigned Branch';

  const userInitials =
    (user?.firstName ? user.firstName[0] : 'C') +
    (user?.lastName ? user.lastName[0] : 'S');

  return (
    <MinimalLayoutContext.Provider value={true}>
      <div className="flex flex-col min-h-screen bg-neutral-100/70 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 antialiased font-sans">
        {/* ── Top Header Bar ───────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="max-w-[1700px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            {/* Left: Brand / Terminal Station */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-brand-800 text-brand-accent flex items-center justify-center font-bold text-lg shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-neutral-900 dark:text-white">
                    Retail<span className="text-brand-700 dark:text-brand-accent">POS</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-800 border border-brand-200 dark:bg-brand-900/50 dark:text-brand-accent dark:border-brand-700/60 uppercase tracking-wide">
                    Cashier Station
                  </span>
                </div>
                {/* Branch Location Badge */}
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  <svg className="w-3.5 h-3.5 text-brand-600 dark:text-brand-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium truncate max-w-[160px] sm:max-w-xs">{branchName}</span>
                </div>
              </div>
            </div>

            {/* Center: EXACT 3 Navigation Items (Desktop & Tablet) */}
            <nav className="hidden md:flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60" aria-label="Cashier Navigation">
              {CASHIER_NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path || (item.path === '/pos/sales' && location.pathname.startsWith('/pos/history'));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-white dark:bg-neutral-900 text-brand-800 dark:text-brand-accent shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/40'
                    }`}
                  >
                    <span className={isActive ? 'text-brand-700 dark:text-brand-accent' : 'text-neutral-400 dark:text-neutral-500'}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Right: Cashier User Chip, ThemeToggle, Logout */}
            <div className="flex items-center gap-2.5 shrink-0">
              <ThemeToggle />

              {/* Cashier profile info */}
              <div className="hidden sm:flex items-center gap-2.5 pl-2.5 border-l border-neutral-200 dark:border-neutral-800">
                <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300 flex items-center justify-center font-bold text-xs shadow-xs">
                  {userInitials}
                </div>
                <div className="text-left leading-tight hidden lg:block">
                  <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-[120px]">
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Cashier'}
                  </div>
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400">
                    Active Shift
                  </div>
                </div>
              </div>

              {/* Logout button */}
              <button
                type="button"
                onClick={handleLogout}
                title="End Shift & Sign Out"
                aria-label="End Shift & Sign Out"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors shadow-xs"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Mobile sub-bar: 3 Nav buttons (visible only on small screens < md) */}
          <div className="flex md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/90 px-2 py-1.5 justify-around">
            {CASHIER_NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path || (item.path === '/pos/sales' && location.pathname.startsWith('/pos/history'));
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white dark:bg-neutral-800 text-brand-800 dark:text-brand-accent shadow-xs font-bold'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  <span className={isActive ? 'text-brand-700 dark:text-brand-accent' : 'text-neutral-400'}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </header>

        {/* ── Main View Area ───────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col w-full max-w-[1700px] mx-auto overflow-hidden">
          {children || <Outlet />}
        </main>
      </div>
    </MinimalLayoutContext.Provider>
  );
}
