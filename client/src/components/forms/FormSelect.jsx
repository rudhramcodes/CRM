import { Controller } from 'react-hook-form';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../ui/Select';
import { BRAND_METAS } from '../../constants';
import { cn } from '../../utils/cn';

const FormSelect = ({ name, control, label, options = [], error, placeholder }) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-zinc-700">{label}</label>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            onValueChange={(v) => {
              // ponytail: Radix renders a hidden native <select> (SelectBubbleInput)
              // inside the trigger. When a value is set programmatically (RHF setValue)
              // before the new option registers there, it syncs the native select and
              // dispatches a synthetic `change` with ''- wiping the form value.
              // Radix Select has no user path to '' (no clear affordance), so drop it.
              if (v !== '') field.onChange(v);
            }}
            value={field.value || ''}
          >
            <SelectTrigger className={error ? 'border-red-300 focus:ring-red-500' : ''}>
              <SelectValue placeholder={placeholder || `Select ${label?.toLowerCase() || '...'}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => {
                const meta = BRAND_METAS[opt.value];
                const logo = opt.logo || meta?.logo;
                const initial = opt.initial || meta?.initial || (typeof opt.label === 'string' ? opt.label[0] : '');
                const gradient = opt.gradient || meta?.gradient || 'from-zinc-700 to-zinc-900';
                const hasMeta = !!(meta || opt.logo || opt.initial);

                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2 min-w-0 cursor-pointer">
                      {hasMeta && (
                        logo ? (
                          <img
                            src={logo}
                            alt={opt.label}
                            className="w-5 h-5 object-contain"
                          />
                        ) : (
                          <div
                            className={cn(
                              'w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-2xs bg-gradient-to-br',
                              gradient,
                            )}
                          >
                            {initial}
                          </div>
                        )
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
};

export default FormSelect;
