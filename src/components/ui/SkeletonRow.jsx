export default function SkeletonRow({ cols = 6, count = 5 }) {
  return (
    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 animate-pulse">
      {Array.from({ length: count }).map((_, rowIdx) => (
        <tr key={rowIdx}>
          {Array.from({ length: cols }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3.5 whitespace-nowrap">
              <div
                className={`h-4 bg-neutral-200 dark:bg-neutral-800 rounded ${
                  colIdx === 0
                    ? 'w-24'
                    : colIdx === 1
                    ? 'w-36'
                    : colIdx === cols - 1
                    ? 'w-16 ml-auto'
                    : 'w-20'
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
