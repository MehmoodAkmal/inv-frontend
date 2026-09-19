import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isManager = user?.role === 'manager';
  const isSuperAdmin = user?.role === 'superAdmin';

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

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
      setAssignedBranchName('Assigned Branch');
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
                {user?.branchId
                  ? typeof user.branchId === 'object'
                    ? user.branchId.name
                    : `Branch: ${user.branchId}`
                  : 'All Branches'}
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
            <NotificationBell />
            {/* Interactive User Profile Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                title="User account menu"
              >
                <div className="w-8 h-8 rounded-full bg-brand-900 border border-brand-800 text-brand-accent flex items-center justify-center text-xs font-mono font-bold shadow-sm">
                  {user?.firstName?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="hidden xl:block text-left">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block truncate leading-tight max-w-[120px]">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block truncate font-mono leading-tight uppercase">
                    {user?.role}
                  </span>
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-150 ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-50">
                  <div className="px-3.5 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {user?.email}
                    </p>
                  </div>

                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/account-settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 rounded-xl transition-colors text-left"
                    >
                      <svg className="w-4 h-4 text-brand-700 dark:text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Account Settings</span>
                    </button>

                    {(user?.role === 'cashier' || user?.role === 'admin' || user?.role === 'manager') && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/pos');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 rounded-xl transition-colors text-left"
                      >
                        <svg className="w-4 h-4 text-brand-700 dark:text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>POS Register</span>
                      </button>
                    )}
                  </div>

                  <div className="p-1 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors text-left"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

