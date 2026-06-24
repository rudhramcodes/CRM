import { cn } from '../../utils/cn';

export function Field({ className, children, ...props }) {
  return (
    <div className={cn('space-y-1.5', className)} {...props}>
      {children}
    </div>
  );
}

export function FieldLabel({ className, children, htmlFor, ...props }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('block text-xs font-medium text-zinc-500', className)}
      {...props}
    >
      {children}
    </label>
  );
}
