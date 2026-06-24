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

export function DatePickerSimple({ value, onChange, label, placeholder }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(undefined)

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (isValid(d)) setDate(d);
    } else {
      setDate(undefined);
    }
  }, [value]);

  const handleSelect = (selectedDate) => {
    setDate(selectedDate)
    setOpen(false)
    onChange?.(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '')
  }

  return (
    <Field>
      {label && <FieldLabel>{label}</FieldLabel>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start font-normal text-sm px-3 py-2 h-auto"
          >
            <span className="flex-1 truncate text-left">
              {date ? format(date, 'PP') : placeholder || 'Select date'}
            </span>
            <CalendarIcon className="size-4 text-zinc-400 shrink-0 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            captionLayout="dropdown"
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
    </Field>
  )
}
