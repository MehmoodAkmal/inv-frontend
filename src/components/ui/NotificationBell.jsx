import { useState } from 'react';
import toast from 'react-hot-toast';

export default function NotificationBell({ count = 0 }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-brand-600 hover:bg-brand-100 transition-colors"
        aria-label="Notifications"
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
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-card-lg border border-brand-200/70 z-50">
          <div className="p-3 border-b border-brand-100">
            <p className="text-sm font-semibold text-brand-900">Notifications</p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {count === 0 ? (
              <div className="p-4 text-center text-sm text-brand-400">No notifications</div>
            ) : (
              <>
                <button className="w-full text-left px-4 py-3 hover:bg-brand-50 border-b border-brand-50 transition-colors">
                  <p className="text-sm text-brand-800">Low stock alert: Item XYZ</p>
                  <p className="text-xs text-brand-400 mt-0.5">2 minutes ago</p>
                </button>
                <button className="w-full text-left px-4 py-3 hover:bg-brand-50 border-b border-brand-50 transition-colors">
                  <p className="text-sm text-brand-800">Sale recorded: $1,250</p>
                  <p className="text-xs text-brand-400 mt-0.5">15 minutes ago</p>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
