import { useState, useMemo } from 'react';

export default function DataTable({
  columns = [],
  data = [],
  onRowClick,
  loading = false,
  emptyMessage = 'No records found',
  emptySubMessage = 'Get started by creating your first entry or adjust your filters.',
  className = '',
  tableClassName = '',
  rowClassName,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !Array.isArray(data)) return data;
    return [...data].sort((a, b) => {
      const aVal = a?.[sortKey] ?? '';
      const bVal = b?.[sortKey] ?? '';

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      const cmp = strA.localeCompare(strB, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-6 shadow-card ${className}`}>
        <div className="space-y-4 animate-pulse">
          <div className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded w-1/4" />
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800/60 rounded w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card p-12 text-center shadow-card ${className}`}>
        <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-800 dark:text-brand-accent flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{emptyMessage}</h4>
        {emptySubMessage && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">{emptySubMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-card shadow-card overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-left ${tableClassName}`}>
          <thead className="bg-neutral-50 dark:bg-neutral-800/60">
            <tr>
              {columns.map((col) => {
                const isNumeric = col.type === 'number' || col.type === 'currency' || col.align === 'right';
                const isCenter = col.align === 'center';
                const alignClass = isNumeric ? 'text-right justify-end' : isCenter ? 'text-center justify-center' : 'text-left justify-start';

                return (
                  <th
                    key={col.key}
                    scope="col"
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 select-none ${
                      col.sortable ? 'cursor-pointer hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors' : ''
                    } ${col.headerClassName || ''}`}
                  >
                    <div className={`flex items-center gap-1.5 ${alignClass}`}>
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span className="text-[10px] text-neutral-400">
                          {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 bg-white dark:bg-neutral-900">
            {sortedData.map((row, rowIdx) => (
              <tr
                key={row._id ?? row.id ?? rowIdx}
                onClick={() => onRowClick?.(row, rowIdx)}
                className={`transition-colors duration-150 ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-brand-50/40 dark:hover:bg-brand-900/20'
                    : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40'
                } ${typeof rowClassName === 'function' ? rowClassName(row, rowIdx) : (rowClassName || '')}`}
              >
                {columns.map((col) => {
                  const rawVal = row?.[col.key];
                  const isNumeric = col.type === 'number' || col.type === 'currency' || col.align === 'right';
                  const isCenter = col.align === 'center';

                  const alignClass = isNumeric ? 'text-right' : isCenter ? 'text-center' : 'text-left';
                  const fontClass = isNumeric ? 'font-mono' : '';

                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3.5 text-sm text-neutral-800 dark:text-neutral-200 whitespace-nowrap ${alignClass} ${fontClass} ${
                        col.className || ''
                      }`}
                    >
                      {col.render ? col.render(rawVal, row, rowIdx) : (rawVal ?? '—')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
