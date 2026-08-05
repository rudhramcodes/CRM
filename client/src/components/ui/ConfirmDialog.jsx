import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', variant = 'danger', children }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {message && <p className="text-sm text-zinc-600 mb-4">{message}</p>}
      {children}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        {onConfirm && (
          <Button variant={variant} size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        )}
      </div>
    </Modal>
  );
}
