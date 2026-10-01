import { useState, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Building2, User } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '../../../components/ui/Popover';
import { BRAND_METAS } from '../../../constants';
import { cn } from '../../../utils/cn';

export default function EntityCombobox({
  type = 'client', // 'client' | 'lead'
  value,
  onChange,
  items = [],
  label,
  placeholder,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedItem = useMemo(() => {
    if (!value) return null;
    return items.find((item) => item._id === value);
  }, [items, value]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => {
      if (type === 'client') {
        return (
          item.companyName?.toLowerCase().includes(q) ||
          item.contactPerson?.toLowerCase().includes(q) ||
          item.email?.toLowerCase().includes(q) ||
          item.clientId?.toLowerCase().includes(q)
        );
      } else {
        return (
          item.name?.toLowerCase().includes(q) ||
          item.company?.toLowerCase().includes(q) ||
          item.email?.toLowerCase().includes(q) ||
          item.phone?.toLowerCase().includes(q)
        );
      }
    });
  }, [items, search, type]);

  const handleSelect = (itemId) => {
    onChange(itemId || null);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  const Icon = type === 'client' ? Building2 : User;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-zinc-700 mb-1 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-zinc-400" />
          <span>{label}</span>
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full flex items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2 text-left text-xs sm:text-sm shadow-2xs transition-all cursor-pointer min-h-[42px]',
              'focus:outline-none focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900',
              error ? 'border-red-300' : 'border-zinc-200/90 hover:border-zinc-300',
              open && 'border-primary-900 ring-2 ring-primary-900/10',
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {selectedItem ? (
                <>
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs border',
                      type === 'client'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                        : 'bg-sky-50 text-sky-800 border-sky-200/70',
                    )}
                  >
                    {type === 'client'
                      ? (selectedItem.companyName?.[0] || 'C').toUpperCase()
                      : (selectedItem.name?.[0] || 'L').toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 text-xs sm:text-sm truncate leading-tight">
                      {type === 'client' ? selectedItem.companyName : selectedItem.name}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5">
                      {type === 'client'
                        ? selectedItem.contactPerson || selectedItem.email || 'No contact person'
                        : selectedItem.company || selectedItem.email || 'Lead prospect'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-zinc-400 font-normal">
                  <Icon className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="truncate">{placeholder || `Select ${type}...`}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {value && (
                <span
                  role="button"
                  onClick={handleClear}
                  className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors"
                  title="Clear selection"
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
          className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-2 shadow-xl border-zinc-200/90 rounded-2xl bg-white space-y-2 z-50"
          align="start"
        >
          {/* Search Field */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${type === 'client' ? 'clients by company, contact...' : 'leads by name, company...'}`}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-900 transition-all placeholder:text-zinc-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Unlink / None Option */}
          <button
            type="button"
            onClick={() => handleSelect('')}
            className={cn(
              'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer',
              !value
                ? 'bg-primary-900/5 text-primary-900 font-semibold'
                : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800',
            )}
          >
            <span className="truncate">None (Do not link {type})</span>
            {!value && <Check className="w-3.5 h-3.5 text-primary-900 shrink-0 stroke-[2.5]" />}
          </button>

          <div className="h-px bg-zinc-100" />

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {filteredItems.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-400">
                No {type === 'client' ? 'clients' : 'leads'} found
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = value === item._id;
                const brandKey = item.brand;
                const bMeta = brandKey ? BRAND_METAS[brandKey] : null;

                const primaryText = type === 'client' ? item.companyName : item.name;
                const secondaryText =
                  type === 'client'
                    ? item.contactPerson || item.email
                    : item.company || item.email || item.phone;

                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleSelect(item._id)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left text-xs transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-primary-900/5 border border-primary-900/20 text-primary-900 font-semibold shadow-2xs'
                        : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent',
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 border',
                          type === 'client'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                            : 'bg-sky-50 text-sky-800 border-sky-200/70',
                        )}
                      >
                        {primaryText?.[0]?.toUpperCase() || '?'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-semibold text-zinc-900">{primaryText}</p>
                          {bMeta && (
                            <span className="text-[9px] font-medium text-zinc-500 bg-zinc-100 px-1 py-0.2 rounded shrink-0">
                              {bMeta.label}
                            </span>
                          )}
                        </div>
                        {secondaryText && (
                          <p className="truncate text-[10px] text-zinc-400 mt-0.5 font-normal">
                            {secondaryText}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-primary-900 shrink-0 stroke-[2.5]" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
