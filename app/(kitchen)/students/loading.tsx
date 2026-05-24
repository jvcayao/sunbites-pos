export default function Loading() {
  return (
    <div className="p-6 space-y-4">
      {[1, 2, 3].map((k) => (
        <div key={k} className="h-48 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
