import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          'relative bg-white rounded-xl shadow-xl w-full animate-in fade-in zoom-in-95',
          sizeClasses[size],
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <h3 className="font-heading text-base font-semibold text-primary-900">{title}</h3>
            {showClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
