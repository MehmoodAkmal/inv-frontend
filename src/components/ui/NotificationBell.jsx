import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStock } from '../../services/stockService';
import { getLowStock } from '../../services/reportService';

export default function NotificationBell({ count: propCount, items: propItems }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const containerRef = useRef(null);

  const isCashier = user?.role === 'cashier';
  const stockPath = isCashier ? '/pos/stock' : '/stock';

  // Fetch low stock items across organization or assigned branch
  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. First attempt to use the dedicated low-stock report endpoint
      let list = [];
      try {
        const res = await getLowStock();
        if (res.data?.success && Array.isArray(res.data.data)) {
          list = res.data.data.map((item) => ({
            id: item.itemId || item._id,
            name: item.itemName || 'Stock Item',
            sku: item.sku || '',
            unit: item.unit || 'units',
            branchName: item.branchName || '',
            quantity: item.currentQuantity ?? 0,
            reorderLevel: item.reorderLevel ?? 0,
            isCritical: (item.currentQuantity ?? 0) <= 0,
          }));
        }
      } catch {
        // 2. If getLowStock is restricted (e.g. cashier role), fallback to getStock
        const res = await getStock();
        if (res.data?.success && Array.isArray(res.data.data)) {
          list = res.data.data
            .filter((s) => s.isLowStock || (s.itemId?.reorderLevel != null && s.quantity <= s.itemId.reorderLevel))
            .map((s) => ({
              id: s.itemId?._id || s._id,
              name: s.itemId?.name || 'Stock Item',
              sku: s.itemId?.sku || '',
              unit: s.itemId?.unit || 'units',
              branchName: s.branchId?.name || '',
              quantity: s.quantity ?? 0,
              reorderLevel: s.itemId?.reorderLevel ?? 0,
              isCritical: (s.quantity ?? 0) <= 0,
            }));
        }
      }

      setNotifications(list);
    } catch (err) {
      console.error('Failed to fetch stock notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch and 60-second polling interval
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Close popover on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const displayedItems = propItems ?? notifications;
  const count = propCount ?? displayedItems.length;

  const handleToggle = () => {
    setOpen((prev) => {
      if (!prev) setHasViewed(true);
      return !prev;
    });
  };

  const handleNavigate = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        aria-label={`Notifications${count > 0 ? `, ${count} low stock alerts` : ''}`}
        aria-expanded={open}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Dynamic Notification Badge */}
        {count > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none tabular-nums flex items-center justify-center text-center text-white ring-2 ring-white dark:ring-neutral-900 shadow-xs pointer-events-none select-none transition-colors ${
              hasViewed
                ? 'bg-amber-500'
                : 'bg-rose-500 animate-pulse'
            }`}
          >
            <span className="inline-flex items-center justify-center leading-none -translate-y-px">
              {count > 99 ? '99+' : count}
            </span>
          </span>
        )}
      </button>

      {/* Notifications Popover Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200/90 dark:border-neutral-800 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Popover Header */}
          <div className="p-3.5 px-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Notifications
              </span>
              {count > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                  {count} {count === 1 ? 'Alert' : 'Alerts'}
                </span>
              )}
            </div>

            <button
              onClick={fetchAlerts}
              title="Refresh alerts"
              disabled={loading}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-600' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Popover Body List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {loading && displayedItems.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-brand-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Checking stock levels...</p>
              </div>
            ) : displayedItems.length === 0 ? (
              <div className="p-6 text-center flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">All Stock Levels Healthy</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-[220px]">
                  No items are currently running below their reorder levels.
                </p>
              </div>
            ) : (
              displayedItems.map((item) => (
                <button
                  key={`${item.id}-${item.branchName}`}
                  onClick={() => handleNavigate(stockPath)}
                  className="w-full text-left p-3.5 px-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors flex items-start gap-3 group"
                >
                  {/* Warning / Critical Icon */}
                  <span
                    className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 ${
                      item.isCritical
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </span>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-neutral-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {item.name}
                      </p>
                      <span
                        className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          item.isCritical
                            ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {item.isCritical ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                      <span>
                        Qty: <strong className="font-semibold text-neutral-700 dark:text-neutral-300">{item.quantity} {item.unit}</strong>
                      </span>
                      <span>•</span>
                      <span>Reorder: {item.reorderLevel}</span>
                    </div>

                    {item.branchName && (
                      <div className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
                        📍 {item.branchName}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Popover Footer: Link to Stock page */}
          <div className="p-2.5 px-4 bg-neutral-50 dark:bg-neutral-900/80 border-t border-neutral-100 dark:border-neutral-800 text-center">
            <button
              onClick={() => handleNavigate(stockPath)}
              className="w-full py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-accent hover:text-brand-800 dark:hover:text-brand-300 flex items-center justify-center gap-1.5 rounded-lg hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 transition-colors"
            >
              <span>View All in Stock Inventory</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

