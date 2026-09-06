export default function LoadingSkeleton({
  h = 'h-32',
  w = 'w-full',
  rounded = 'rounded-xl',
  count = 1,
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${rounded} p-5 animate-pulse`}>
          <div className={`skeleton h-3 w-20 mb-3 ${rounded}`} />
          <div className={`skeleton ${h} w-full ${rounded} mb-2`} />
          <div className="skeleton h-2.5 w-24 rounded" />
        </div>
      ))}
    </>
  );
}
