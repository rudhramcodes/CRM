import { useState } from 'react';
import { ChevronDown, Check, Building2, X } from 'lucide-react';
import { LEAD_BRANDS, BRAND_METAS } from '../../../constants';
import { Popover, PopoverTrigger, PopoverContent } from '../../../components/ui/Popover';
import { cn } from '../../../utils/cn';

export default function VentureDropdown({ value, onChange, error }) {
  const [open, setOpen] = useState(false);

  const selectedBrand = value ? LEAD_BRANDS.find((b) => b.value === value) : null;
  const meta = value ? BRAND_METAS[value] : null;

  const handleSelect = (brandValue) => {
    onChange(brandValue || null);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
        Venture / Brand
      </label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full flex items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-xs sm:text-sm shadow-2xs transition-all cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900',
              error ? 'border-red-300' : 'border-zinc-200/90 hover:border-zinc-300',
              open && 'border-primary-900 ring-2 ring-primary-900/10',
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {meta ? (
                <>
                  {meta.logo ? (
                    <img
                      src={meta.logo}
                      alt={meta.label}
                      className="w-5 h-5 rounded-md object-contain border border-zinc-200/80 p-0.5 bg-white shrink-0 shadow-2xs"
                    />
                  ) : (
                    <div
                      className={cn(
                        'w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-2xs bg-gradient-to-br',
                        meta.gradient,
                      )}
                    >
                      {meta.initial || 'V'}
                    </div>
                  )}
                  <span className="font-semibold text-zinc-900 truncate">
                    {meta.label || selectedBrand?.label}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-md bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-zinc-400 shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-zinc-500 font-medium truncate">
                    No specific venture (Cross-entity)
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {value && (
                <span
                  role="button"
                  onClick={handleClear}
                  className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors"
                  title="Clear venture"
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-zinc-400 transition-transform duration-200',
                  open && 'rotate-180 text-zinc-700',
                )}
              />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-1.5 shadow-xl border-zinc-200/90 rounded-2xl bg-white space-y-1 z-50 max-h-72 overflow-y-auto"
          align="start"
        >
          {/* Neutral Cross-entity Option */}
          <button
            type="button"
            onClick={() => handleSelect('')}
            className={cn(
              'w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer',
              !value
                ? 'bg-primary-900/5 text-primary-900 font-semibold'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500 shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">No specific venture (Cross-entity)</span>
            </div>
            {!value && <Check className="w-4 h-4 text-primary-900 shrink-0 stroke-[2.5]" />}
          </button>

          <div className="h-px bg-zinc-100 my-1" />

          {/* Brand Options */}
          {LEAD_BRANDS.map((b) => {
            const isSelected = value === b.value;
            const bMeta = BRAND_METAS[b.value];

            return (
              <button
                key={b.value}
                type="button"
                onClick={() => handleSelect(b.value)}
                className={cn(
                  'w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-primary-900/5 text-primary-900 font-semibold'
                    : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {bMeta?.logo ? (
                    <img
                      src={bMeta.logo}
                      alt={b.label}
                      className="w-5 h-5 rounded-md object-contain border border-zinc-200/80 p-0.5 bg-white shrink-0 shadow-2xs"
                    />
                  ) : (
                    <div
                      className={cn(
                        'w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-2xs bg-gradient-to-br',
                        bMeta?.gradient || 'from-zinc-700 to-zinc-900',
                      )}
                    >
                      {bMeta?.initial || b.label?.[0]}
                    </div>
                  )}
                  <span className="truncate">{b.label}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-primary-900 shrink-0 stroke-[2.5]" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
