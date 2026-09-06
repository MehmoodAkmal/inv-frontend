import { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Search...',
  loading,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  const filtered = options.filter((opt) => opt.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const handler = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="input-field text-sm"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-brand-200 bg-white shadow-card-lg">
          {loading ? (
            <div className="p-3 text-sm text-brand-400 text-center">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-sm text-brand-400 text-center">No results found</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange?.(opt.value);
                  setQuery(opt.label);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  value === opt.value
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-brand-800 hover:bg-brand-50'
                }`}
              >
                <span className="truncate">{opt.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
