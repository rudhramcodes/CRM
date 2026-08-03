import { Controller } from 'react-hook-form';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../ui/Select';

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
              // dispatches a synthetic `change` with '' — wiping the form value.
              // Radix Select has no user path to '' (no clear affordance), so drop it.
              if (v !== '') field.onChange(v);
            }}
            value={field.value || ''}
          >
            <SelectTrigger className={error ? 'border-red-300 focus:ring-red-500' : ''}>
              <SelectValue placeholder={placeholder || `Select ${label?.toLowerCase() || '...'}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
};

export default FormSelect;
