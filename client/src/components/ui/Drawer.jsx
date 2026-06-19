import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  size = 'md',
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
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
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  };

  const sideClasses = {
    right: 'right-0',
    left: 'left-0',
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          'fixed top-0 h-full bg-white shadow-xl flex flex-col',
          sideClasses[side],
          sizeClasses[size],
          'animate-in slide-in-from-right',
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
