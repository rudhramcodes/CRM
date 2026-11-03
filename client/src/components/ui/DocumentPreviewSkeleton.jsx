import { cn } from '../../utils/cn';
import Skeleton from './Skeleton';

export default function DocumentPreviewSkeleton({
  maxWidth = 794,
  className,
  paperClassName,
  label = 'Loading document preview...',
}) {
  const maxWidthClass =
    maxWidth === 850 || maxWidth === '850px'
      ? 'max-w-[850px]'
      : maxWidth === 794 || maxWidth === '794px'
        ? 'max-w-[794px]'
        : '';

  const customStyle =
    !maxWidthClass && maxWidth
      ? { maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth }
      : undefined;

  return (
    <div
      role="status"
      className={cn(
        'flex justify-center bg-zinc-100/50 p-3 sm:p-6 w-full print:hidden motion-reduce:[&_*]:animate-none',
        className
      )}
    >
      <span className="sr-only">{label}</span>

      {/* A4 Document Paper */}
      <div
        aria-hidden="true"
        className={cn(
          'w-full bg-white rounded-lg sm:rounded-xl border border-zinc-200/80 shadow-xs p-6 sm:p-10 lg:p-12 space-y-6 sm:space-y-8 min-h-[700px] sm:min-h-[950px] lg:min-h-[1130px] flex flex-col justify-between',
          maxWidthClass,
          paperClassName
        )}
        style={customStyle}
      >
        <div className="space-y-6 sm:space-y-8">
          {/* 1. Header: Two Logo Placeholder Areas */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28 sm:w-36 rounded-md" />
                <Skeleton className="h-3 w-20 sm:w-24 rounded-md" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Skeleton className="h-10 w-24 sm:h-12 sm:w-32 rounded-xl" />
              <Skeleton className="h-3 w-16 sm:w-20 rounded-md" />
            </div>
          </div>

          {/* 2. Thin Header Divider */}
          <div className="border-b border-zinc-200/80" />

          {/* 3. Recipient / Address Placeholder Lines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {/* Recipient Details */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-4.5 w-44 sm:w-52 rounded-md" />
              <Skeleton className="h-3.5 w-32 sm:w-40 rounded-md" />
              <Skeleton className="h-3 w-48 sm:w-60 rounded-md" />
              <Skeleton className="h-3 w-36 sm:w-44 rounded-md" />
            </div>
            {/* Document Meta (Dates, Reference) */}
            <div className="space-y-2 sm:flex sm:flex-col sm:items-end">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-5 w-32 sm:w-40 rounded-md" />
              <Skeleton className="h-3.5 w-24 sm:w-28 rounded-md" />
              <Skeleton className="h-3.5 w-28 sm:w-36 rounded-md" />
            </div>
          </div>

          {/* 4. Paragraph Placeholder Groups */}
          <div className="space-y-4 pt-1">
            {/* Group A: Salutation / Subject Intro */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-40 sm:w-56 rounded-md" />
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-11/12 rounded-md" />
              <Skeleton className="h-3.5 w-4/5 rounded-md" />
            </div>

            {/* Group B: Scope of Work / Content Details */}
            <div className="space-y-2 pt-1">
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-5/6 rounded-md" />
              <Skeleton className="h-3.5 w-3/4 rounded-md" />
            </div>
          </div>

          {/* 5. Pricing / Table Placeholder Area */}
          <div className="rounded-xl border border-zinc-200/80 overflow-hidden">
            {/* Table Header */}
            <div className="bg-zinc-50/90 px-4 py-3 flex items-center justify-between border-b border-zinc-200/80">
              <Skeleton className="h-3.5 w-28 sm:w-36 rounded-md" />
              <div className="flex items-center gap-6 sm:gap-12">
                <Skeleton className="h-3.5 w-12 rounded-md hidden sm:block" />
                <Skeleton className="h-3.5 w-16 rounded-md hidden sm:block" />
                <Skeleton className="h-3.5 w-16 rounded-md" />
              </div>
            </div>
            {/* Table Rows */}
            <div className="divide-y divide-zinc-100 bg-white">
              {[1, 2, 3].map((row) => (
                <div key={row} className="px-4 py-3 flex items-center justify-between">
                  <div className="space-y-1.5 flex-1 max-w-sm sm:max-w-md pr-4">
                    <Skeleton className="h-3.5 w-3/4 rounded-md" />
                    <Skeleton className="h-2.5 w-1/2 rounded-md" />
                  </div>
                  <div className="flex items-center gap-6 sm:gap-12 shrink-0">
                    <Skeleton className="h-3 w-8 rounded-md hidden sm:block" />
                    <Skeleton className="h-3 w-12 rounded-md hidden sm:block" />
                    <Skeleton className="h-3.5 w-16 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
            {/* Table Totals Summary */}
            <div className="bg-zinc-50/60 p-4 border-t border-zinc-200/80 flex flex-col items-end space-y-2">
              <div className="flex items-center justify-between w-48 sm:w-56">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
              <div className="flex items-center justify-between w-48 sm:w-56">
                <Skeleton className="h-3 w-14 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
              <div className="flex items-center justify-between w-48 sm:w-56 pt-1.5 border-t border-zinc-200">
                <Skeleton className="h-4 w-12 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
            </div>
          </div>
        </div>

        {/* 6. Small Footer Placeholder Area */}
        <div className="pt-6 sm:pt-8 border-t border-zinc-100 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-2.5 w-44 sm:w-56 rounded-md" />
            <Skeleton className="h-2.5 w-36 sm:w-48 rounded-md" />
          </div>
          <div className="space-y-2 flex flex-col items-start sm:items-end w-full sm:w-auto">
            <Skeleton className="h-8 w-28 sm:w-32 rounded-lg" />
            <Skeleton className="h-3 w-32 sm:w-36 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

