import { useState, useEffect } from "react"
import { format, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import Button from "./Button"
import Calendar from "./Calendar"
import { Field, FieldLabel } from "./Field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./Popover"
import { cn } from "../../utils/cn"

export function DatePickerSimple({
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  minDate,
  maxDate,
  error,
  className,
}) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(undefined)

  useEffect(() => {
    if (value) {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        setDate(new Date(y, m - 1, d));
      } else {
        const d = new Date(value);
        if (isValid(d)) setDate(d);
      }
    } else {
      setDate(undefined);
    }
  }, [value]);

  const handleSelect = (selectedDate) => {
    setDate(selectedDate)
    setOpen(false)
    onChange?.(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '')
  }

  const disabledDays = [];
  if (minDate) {
    const minD = new Date(minDate);
    minD.setHours(0, 0, 0, 0);
    disabledDays.push({ before: minD });
  }
  if (maxDate) {
    const maxD = new Date(maxDate);
    maxD.setHours(23, 59, 59, 999);
    disabledDays.push({ after: maxD });
  }

  return (
    <Field className="w-full">
      {label && <FieldLabel>{label}</FieldLabel>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start font-normal text-sm px-3 py-2 h-auto text-left transition-colors",
              !date && "text-zinc-400",
              error
                ? "border-red-300 hover:border-red-400 bg-red-50/20 text-red-900"
                : "border-zinc-200 hover:border-zinc-300",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
          >
            <span className="flex-1 truncate text-left">
              {date ? format(date, 'dd MMM yyyy') : (placeholder || 'Select date')}
            </span>
            <CalendarIcon className={cn("size-4 shrink-0 ml-1.5", error ? "text-red-400" : "text-zinc-400")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0 z-[60]" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date || (minDate ? new Date(minDate) : new Date())}
            captionLayout="dropdown"
            disabled={disabledDays.length > 0 ? disabledDays : undefined}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
    </Field>
  )
}

