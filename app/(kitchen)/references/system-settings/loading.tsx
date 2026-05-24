export default function SystemSettingsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((k) => (
          <div key={k} className="h-16 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}
