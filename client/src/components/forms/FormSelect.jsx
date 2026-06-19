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
          <Select onValueChange={field.onChange} value={field.value || ''}>
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
