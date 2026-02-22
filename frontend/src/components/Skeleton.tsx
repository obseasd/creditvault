"use client";

// ─── Base pulse bar ───────────────────────────────────────────────
export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-800 ${className}`}
      style={style}
    />
  );
}

// ─── Stat card skeleton ───────────────────────────────────────────
export function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-7 w-32" />
    </div>
  );
}

// ─── Chart skeleton ───────────────────────────────────────────────
export function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <Skeleton className="h-3 w-48 mb-2" />
      <Skeleton className="h-3 w-32 mb-6" />
      <div className="flex items-end gap-1 h-[260px]">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{
              height: `${30 + Math.sin(i * 0.5) * 40 + Math.random() * 20}%`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Card skeleton ────────────────────────────────────────────────
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <Skeleton className="h-4 w-24 mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 mb-2 ${i === 0 ? "w-full" : i === 1 ? "w-3/4" : "w-1/2"}`}
        />
      ))}
    </div>
  );
}

// ─── Table row skeleton ───────────────────────────────────────────
export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-gray-800/50 px-6 py-4">
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-32 hidden md:block" />
      <div className="ml-auto">
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}
