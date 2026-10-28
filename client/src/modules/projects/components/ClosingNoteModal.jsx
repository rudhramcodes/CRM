import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { useSaveProjectClosingNoteMutation } from '../../../services/projectApi';

const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export default function ClosingNoteModal({ open, onClose, project }) {
  const [deliveredWhat, setDeliveredWhat] = useState('');
  const [deliveredWhen, setDeliveredWhen] = useState('');
  const [pendingItems, setPendingItems] = useState('');
  const [error, setError] = useState('');
  const [saveClosingNote, { isLoading }] = useSaveProjectClosingNoteMutation();

  useEffect(() => {
    if (!open) return;
    const note = project?.closingNote;
    setDeliveredWhat(note?.deliveredWhat || '');
    setDeliveredWhen(toLocalInput(note?.deliveredWhen) || toLocalInput(new Date()));
    setPendingItems(note?.pendingItems || '');
    setError('');
  }, [open, project?._id]);

  if (!project) return null;

  const handleSave = async () => {
    if (!deliveredWhat.trim()) {
      setError('Delivery summary is required.');
      return;
    }
    if (!deliveredWhen) {
      setError('Delivery date and time is required.');
      return;
    }
    try {
      await saveClosingNote({
        id: project._id,
        deliveredWhat: deliveredWhat.trim(),
        deliveredWhen: new Date(deliveredWhen).toISOString(),
        pendingItems: pendingItems.trim(),
      }).unwrap();
      toast.success('Closing note saved');
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save closing note');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Closing Note"
      description="Record what was delivered, when it was delivered and what is pending."
      size="md"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="delivered-what" className="block text-sm font-medium text-zinc-700">
            What was delivered? <span className="text-red-500">*</span>
          </label>
          <textarea
            id="delivered-what"
            rows={3}
            value={deliveredWhat}
            onChange={(event) => {
              setDeliveredWhat(event.target.value);
              if (error) setError('');
            }}
            placeholder="Final photos, reels, album design, raw files..."
            className="w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 text-sm transition-colors focus:border-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/10"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="delivered-when" className="block text-sm font-medium text-zinc-700">
            When was it delivered? <span className="text-red-500">*</span>
          </label>
          <input
            id="delivered-when"
            type="datetime-local"
            value={deliveredWhen}
            onChange={(event) => {
              setDeliveredWhen(event.target.value);
              if (error) setError('');
            }}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm transition-colors focus:border-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/10"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="pending-items" className="block text-sm font-medium text-zinc-700">
            Anything pending?
          </label>
          <textarea
            id="pending-items"
            rows={2}
            value={pendingItems}
            onChange={(event) => setPendingItems(event.target.value)}
            placeholder="Optional: pending handoffs, follow-ups..."
            className="w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 text-sm transition-colors focus:border-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/10"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-zinc-400">Saved note is required before delivery.</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} loading={isLoading}>
              Save Note
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
