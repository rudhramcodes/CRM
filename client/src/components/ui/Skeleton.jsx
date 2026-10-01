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

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* 1. Welcome Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 sm:w-64 rounded-xl" />
          <Skeleton className="h-4 w-60 sm:w-96 rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* 2. KPI Cards Grid Skeleton (6 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-4.5 space-y-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-16 sm:w-20 rounded-md" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 sm:h-8 w-16 sm:w-20 rounded-xl" />
            <Skeleton className="h-2.5 w-12 rounded-md" />
          </div>
        ))}
      </div>

      {/* 3. Ventures & Brands Skeleton */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded-md" />
            <Skeleton className="h-5 w-36 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48 rounded-md hidden sm:block" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 p-3 sm:p-3.5 rounded-2xl border border-zinc-100 bg-white"
            >
              <Skeleton className="w-12 h-12 rounded-2xl" />
              <Skeleton className="h-3.5 w-16 rounded-md" />
              <Skeleton className="h-3 w-12 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Charts Row 1: Revenue Trend + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Skeleton — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-32 rounded-lg" />
              <Skeleton className="h-3.5 w-48 rounded-md" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
          </div>
          <div className="h-[280px] w-full rounded-xl bg-zinc-50/70 border border-zinc-100 flex flex-col justify-end p-4 gap-2">
            <div className="w-full flex items-end justify-between gap-2 h-44">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 rounded-t-lg"
                  style={{ height: `${20 + ((i * 17) % 65)}%` }}
                />
              ))}
            </div>
            <Skeleton className="h-3 w-full rounded-md" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
        </div>

        {/* Lead Pipeline Skeleton — 1 col */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-28 rounded-lg" />
            <Skeleton className="h-3.5 w-40 rounded-md" />
          </div>
          <div className="h-[280px] w-full rounded-xl bg-zinc-50/70 border border-zinc-100 p-4 flex flex-col justify-around">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16 rounded-md" />
                  <Skeleton className="h-3 w-6 rounded-md" />
                </div>
                <Skeleton
                  className="h-3 rounded-full"
                  style={{ width: `${30 + ((i * 23) % 65)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Charts Row 2: Clients Donut + Invoice Aging + Task Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clients by Venture Skeleton */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <Skeleton className="h-3.5 w-44 rounded-md" />
          </div>
          <div className="h-[220px] flex flex-col items-center justify-center gap-4">
            <div className="w-28 h-28 rounded-full border-8 border-zinc-200/70 border-t-zinc-300" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-16 rounded-full" />
              <Skeleton className="h-3 w-16 rounded-full" />
              <Skeleton className="h-3 w-16 rounded-full" />
            </div>
          </div>
        </div>

        {/* Invoice Aging Skeleton */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-28 rounded-lg" />
            <Skeleton className="h-3.5 w-48 rounded-md" />
          </div>
          <div className="h-[220px] flex items-end justify-between gap-3 p-4 bg-zinc-50/70 rounded-xl border border-zinc-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t-lg"
                style={{ height: `${30 + ((i * 25) % 60)}%` }}
              />
            ))}
          </div>
        </div>

        {/* Task Completion Skeleton */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-3.5 w-36 rounded-md" />
          </div>
          <div className="h-[220px] flex flex-col items-center justify-center gap-4">
            <div className="w-24 h-24 rounded-full border-8 border-zinc-200/70 border-t-zinc-300" />
            <div className="grid grid-cols-2 gap-2 w-full px-4">
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* 6. Workspace Activity Log Skeleton */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-4.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/40">
          <Skeleton className="h-5 w-48 rounded-lg" />
          <Skeleton className="h-3.5 w-24 rounded-md" />
        </div>
        <div className="divide-y divide-zinc-100/80">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3.5 px-6 py-3.5">
              <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-44 sm:w-60 rounded-md" />
                <Skeleton className="h-3 w-64 sm:w-80 rounded-md" />
              </div>
              <Skeleton className="h-3 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function VentureDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Venture Banner Skeleton */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-xl" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      {/* KPI Cards Skeleton (4 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-zinc-200/80 p-5 space-y-3 shadow-sm">
            <Skeleton className="h-3.5 w-20 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-xl" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
        ))}
      </div>

      {/* Grid: Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-sm space-y-4">
          <Skeleton className="h-5 w-36 rounded-lg" />
          <Skeleton className="h-[250px] w-full rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 shadow-sm space-y-4">
          <Skeleton className="h-5 w-36 rounded-lg" />
          <Skeleton className="h-[250px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

