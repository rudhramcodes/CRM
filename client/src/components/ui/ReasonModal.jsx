import { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';

export default function ReasonModal({
  open,
  onClose,
  onConfirm,
  title = 'Reason required',
  description,
  confirmLabel = 'Confirm',
  placeholder = 'Explain why this change is needed...',
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please enter a reason before continuing.');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
    } catch {} finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="change-reason" className="block text-sm font-medium text-zinc-700">
            Reason
          </label>
          <textarea
            id="change-reason"
            rows={4}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (error) setError('');
            }}
            placeholder={placeholder}
            className={`w-full resize-y rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : 'border-zinc-200 focus:border-primary-900 focus:ring-primary-900/10'
            }`}
            autoFocus
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} loading={submitting}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
