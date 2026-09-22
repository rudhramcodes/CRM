import { cn } from '../../utils/cn';

export default function Skeleton({ className }) {
  return <div className={cn('animate-pulse bg-zinc-200/70 rounded-xl', className)} />;
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 space-y-3 shadow-2xs">
      <Skeleton className="h-4 w-24 rounded-lg" />
      <Skeleton className="h-8 w-16 rounded-xl" />
      <Skeleton className="h-3 w-32 rounded-md" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-zinc-100 bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-2xs">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-5 flex-1 rounded-lg" />
          <Skeleton className="h-5 w-28 rounded-lg" />
          <Skeleton className="h-5 w-20 rounded-lg" />
          <Skeleton className="h-5 w-20 rounded-lg" />
          <Skeleton className="h-5 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-40 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-[450px] w-full rounded-2xl" />
    </div>
  );
}
