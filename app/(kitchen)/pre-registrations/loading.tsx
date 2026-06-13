export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      {[1, 2, 3, 4, 5].map((k) => (
        <div key={k} className="h-16 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
