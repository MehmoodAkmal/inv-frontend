import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../ui/Sidebar';
import TopBar from '../ui/TopBar';

const DashboardLayoutContext = createContext(false);

export default function DashboardLayout({
  children,
  branchSelector,
  searchSlot,
  actionSlot,
  userProfile,
  navGroups,
}) {
  const isNested = useContext(DashboardLayoutContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const navigate = useNavigate();

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

  // If already rendered inside an outer DashboardLayout (e.g. from App.jsx route),
  // simply pass through children to prevent duplicate sidebars/headers.
  if (isNested) {
    return <>{children || <Outlet />}</>;
  }

  return (
    <DashboardLayoutContext.Provider value={true}>
      <div className="flex h-screen overflow-hidden bg-neutral-50/60 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 antialiased font-sans">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:shrink-0">
          <Sidebar collapsed={sidebarCollapsed} onToggle={toggleCollapse} navGroups={navGroups} />
        </div>

        {/* Mobile Sidebar Overlay Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-brand-950/70 backdrop-blur-sm transition-opacity"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="relative z-50 flex flex-col max-w-xs w-full shadow-2xl">
              <Sidebar collapsed={false} onClose={() => setSidebarOpen(false)} navGroups={navGroups} />
            </div>
          </div>
        )}

        {/* Right Column: TopBar + Main Scroll Area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar
            onMenuClick={() => setSidebarOpen(true)}
            branchSelector={branchSelector}
            searchSlot={searchSlot}
            actionSlot={actionSlot}
            userProfile={userProfile}
          />

          {/* Main scrollable content area with consistent padding */}
          <main className="flex-1 overflow-y-auto">
            <div className="px-6 py-6 w-full max-w-[1600px] mx-auto">
              {children || <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </DashboardLayoutContext.Provider>
  );
}
