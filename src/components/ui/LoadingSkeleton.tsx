export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-fpl-border bg-fpl-card p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-fpl-border" />
          <div className="h-8 w-16 rounded bg-fpl-border" />
        </div>
        <div className="h-12 w-12 rounded-lg bg-fpl-border" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-10 rounded bg-fpl-border" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-fpl-card" />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}
