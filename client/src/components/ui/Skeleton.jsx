import { cn } from '../../utils/cn';

export default function Skeleton({ className }) {
  return <div className={cn('animate-pulse bg-zinc-200 rounded', className)} />;
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-7 w-12" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-zinc-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4">
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <Skeleton className="h-[600px] w-full rounded-lg" />
    </div>
  );
}
