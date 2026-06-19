import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import COUNTRIES from '../../data/countries';

const PHONE_MAX_LENGTH = 10;
const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.cca2 === 'IN') || COUNTRIES[0];

function getFlagEmoji(cca2) {
  if (!cca2 || cca2.length !== 2) return '';
  const codePoints = cca2
    .toUpperCase()
    .split('')
    .map((ch) => 127397 + ch.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default function PhoneInput({ value, onChange, error, label, placeholder, ...props }) {
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  const parseValue = useCallback(
    (val) => {
      if (!val) {
        setPhoneNumber('');
        setSelectedCountry(DEFAULT_COUNTRY);
        return;
      }
      const strVal = String(val).trim();
      const match = strVal.match(/^(\+\d{1,5})?\s*(.*)$/);
      const cc = match?.[1] || '';
      const num = match?.[2] || '';
      setPhoneNumber(num);
      if (cc) {
        const found = COUNTRIES.find((c) => c.code === cc);
        if (found) setSelectedCountry(found);
      }
    },
    [],
  );

  useEffect(() => {
    parseValue(value);
  }, [value, parseValue]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleNumberChange = (e) => {
    const raw = e.target.value;
    const num = raw.replace(/[^\d]/g, '').slice(0, PHONE_MAX_LENGTH);
    setPhoneNumber(num);
    const combined = num ? `${selectedCountry.code} ${num}` : '';
    onChange?.(num ? combined : undefined);
  };

  const selectCountry = (country) => {
    setSelectedCountry(country);
    setOpen(false);
    setSearch('');
    const combined = phoneNumber ? `${country.code} ${phoneNumber}` : '';
    onChange?.(phoneNumber ? combined : undefined);
  };

  const filtered = search
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.includes(search),
      )
    : COUNTRIES;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-zinc-700">{label}</label>
      )}
      <div className="flex" ref={dropdownRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-2.5 border rounded-l-lg text-sm bg-zinc-50',
              'hover:bg-zinc-100 transition-colors min-w-[80px]',
              error ? 'border-red-300' : 'border-zinc-200',
            )}
          >
            <span className="text-base leading-none">{getFlagEmoji(selectedCountry.cca2)}</span>
            <span className="text-zinc-700 text-xs font-medium">{selectedCountry.code}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
          </button>

          {open && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="p-2 border-b border-zinc-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search country or code..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-900"
                    autoFocus
                  />
                </div>
              </div>
              <div className="overflow-y-auto max-h-56">
                {filtered.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-6">No countries found</p>
                ) : (
                  filtered.map((c) => (
                    <button
                      key={c.cca2}
                      type="button"
                      onClick={() => selectCountry(c)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-50 transition-colors',
                        selectedCountry.cca2 === c.cca2 && 'bg-primary-50 text-primary-900 font-medium',
                      )}
                    >
                      <span className="text-base leading-none w-6 shrink-0">{getFlagEmoji(c.cca2)}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-zinc-400 text-xs shrink-0">{c.code}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={phoneNumber}
          onChange={handleNumberChange}
          placeholder={placeholder || '98765 43210'}
          maxLength={PHONE_MAX_LENGTH}
          className={cn(
            'flex-1 px-3 py-2.5 border border-l-0 rounded-r-lg text-sm transition-colors bg-zinc-50',
            'focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900',
            'placeholder:text-zinc-400 text-primary-900',
            error ? 'border-red-300' : 'border-zinc-200',
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
