import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { PAYMENT_METHODS, PAYMENT_STATUS } from '../../../constants';
import Button from '../../../components/ui/Button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';

export default function PaymentForm({ invoiceId, invoiceNumber, onSubmit, onClose, initial }) {
  const [form, setForm] = useState({
    invoice: invoiceId || initial?.invoice?._id || '',
    amount: initial?.amount || '',
    paymentMethod: initial?.paymentMethod || 'upi',
    referenceNo: initial?.referenceNo || '',
    notes: initial?.notes || '',
    paymentDate: initial?.paymentDate
      ? new Date(initial.paymentDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    status: initial?.status || 'completed',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.amount || form.amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        invoice: form.invoice,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        referenceNo: form.referenceNo,
        notes: form.notes,
        paymentDate: form.paymentDate,
        status: form.status,
      });
      onClose();
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Failed to save payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">
            {initial ? 'Edit Payment' : 'Record Payment'}
          </h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {invoiceNumber && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Invoice</label>
              <p className="text-sm text-zinc-900 font-medium">{invoiceNumber}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Payment Method</label>
            <Select value={form.paymentMethod} onValueChange={(v) => handleChange('paymentMethod', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Reference No.</label>
            <input
              type="text"
              placeholder="UTR / Cheque no. / Transaction ID"
              value={form.referenceNo}
              onChange={(e) => handleChange('referenceNo', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Payment Date</label>
            <input
              type="date"
              value={form.paymentDate}
              onChange={(e) => handleChange('paymentDate', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
            <Select value={form.status} onValueChange={(v) => handleChange('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {initial ? 'Update Payment' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
