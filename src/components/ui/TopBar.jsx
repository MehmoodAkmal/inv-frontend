import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getBranchById, getBranches } from '../../services/branchService';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

export default function TopBar({
  branchSelector,
  searchSlot,
  actionSlot,
  userProfile,
  onMenuClick,
  className = '',
}) {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  const isSuperAdmin = user?.role === 'superAdmin';

  const [assignedBranchName, setAssignedBranchName] = useState(() => {
    if (typeof user?.branchId === 'object' && user?.branchId?.name) {
      return user.branchId.name;
    }
    return user?.branchName || '';
  });

  useEffect(() => {
    if (!isManager) return;
    if (assignedBranchName) return;

    const bid = typeof user?.branchId === 'string' ? user.branchId : user?.branchId?._id;
    if (!bid) {
      setAssignedBranchName('Main Branch');
      return;
    }

    let isMounted = true;
    getBranchById(bid)
      .then((res) => {
        if (!isMounted) return;
        if (res?.data?.data?.name) {
          setAssignedBranchName(res.data.data.name);
        } else {
          setAssignedBranchName(`Branch #${bid.slice(-4).toUpperCase()}`);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        getBranches()
          .then((bRes) => {
            if (!isMounted) return;
            const match = (bRes?.data?.data || []).find((b) => String(b._id) === String(bid));
            setAssignedBranchName(match?.name || `Branch #${bid.slice(-4).toUpperCase()}`);
          })
          .catch(() => {
            if (isMounted) setAssignedBranchName('Assigned Branch');
          });
      });

    return () => {
      isMounted = false;
    };
  }, [isManager, user?.branchId, assignedBranchName]);

  const displayBranchLabel =
    assignedBranchName ||
    (typeof user?.branchId === 'object' && user?.branchId?.name) ||
    user?.branchName ||
    'Assigned Branch';

  return (
    <header
      className={`h-16 px-4 lg:px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between gap-3 shrink-0 select-none ${className}`}
    >
      {/* Left Section: Mobile Menu Toggle + Branch Selector */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Toggle */}
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="p-2 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden transition-colors"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Branch Selector Slot -> Replaced with Organization Search for superAdmin */}
        <div className="min-w-0">
          {isManager ? (
            <div
              data-testid="manager-branch-label"
              className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 select-none cursor-default"
              title="Assigned Branch"
            >
              <span className="w-2 h-2 rounded-full bg-brand-accent shrink-0" />
              <span className="truncate max-w-[200px]">{displayBranchLabel}</span>
            </div>
          ) : branchSelector !== undefined ? (
            branchSelector
          ) : isSuperAdmin ? (
            <div className="relative w-48 sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-neutral-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                data-testid="org-search-topbar"
                placeholder="Search organizations..."
                aria-label="Search organizations"
                className="w-full pl-8 pr-3 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-accent"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
              <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                {user?.branchId ? `Branch: ${user.branchId}` : 'Main Branch'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Middle Section: Search Input Slot */}
      <div className="flex-1 max-w-md hidden md:block mx-4">
        {searchSlot !== undefined ? (
          searchSlot
        ) : isSuperAdmin ? null : (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              readOnly
              placeholder="Quick search... (Press ⌘K)"
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-800 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Right Section: Primary Action Slot + User Profile Slot */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Primary Action Button Slot */}
        {actionSlot && <div className="shrink-0">{actionSlot}</div>}

        {/* User Profile / Notifications Slot */}
        {userProfile !== undefined ? (
          userProfile
        ) : (
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-neutral-200 dark:border-neutral-800">
            <ThemeToggle />
            <NotificationBell count={0} />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-900 border border-brand-800 text-brand-accent flex items-center justify-center text-xs font-mono font-bold shadow-sm">
                {user?.firstName?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="hidden xl:block text-left">
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block truncate leading-tight">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block truncate font-mono leading-tight">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

