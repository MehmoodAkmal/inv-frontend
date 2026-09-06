import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Sidebar from './Sidebar';
import ThemeToggle from '../ui/ThemeToggle';
import NotificationBell from '../ui/NotificationBell';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => Promise.resolve({ data: { count: 0 } }),
    refetchInterval: 30000,
    staleTime: 30000,
  });
  const notifCount = notifData?.data?.count ?? 0;

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored !== null) setSidebarCollapsed(stored === 'true');
  }, []);

  useEffect(() => {
    const handler = () => navigate('/login');
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [navigate]);

  const toggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev));
      return !prev;
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-brand-50 dark:bg-dark-900 transition-colors duration-200">
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleCollapse} />
      </div>

      {/* ── Mobile sidebar overlay ──────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-brand-900/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50">
            <Sidebar collapsed={false} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Desktop topbar */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-white dark:bg-dark-800 border-b border-brand-200/50 dark:border-dark-600/30 shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
                />
              </svg>
            </div>
            <span className="font-bold text-sm text-brand-900 dark:text-white">
              Inventory Manager
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell count={notifCount} />
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white">
              A
            </div>
          </div>
        </header>

        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-dark-800 border-b border-brand-200 shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-brand-600 hover:bg-brand-100 transition-colors"
              aria-label="Open menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
                  />
                </svg>
              </div>
              <span className="font-bold text-sm text-brand-900 dark:text-white">
                Inventory Manager
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell count={notifCount} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
