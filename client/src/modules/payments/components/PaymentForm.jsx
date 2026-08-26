import { useState } from 'react';
import { X, Loader2, ArrowRightToLine, Wallet } from 'lucide-react';
import { PAYMENT_METHODS, PAYMENT_STATUS, PAYMENT_TYPES } from '../../../constants';
import Button from '../../../components/ui/Button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';
import DatePicker from '../../../components/forms/DatePicker';

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const methodIcons = {
  upi: 'UPI',
  bank_transfer: 'BANK',
  razorpay: 'RZPY',
  stripe: 'STRP',
  paypal: 'PYPL',
  cash: 'CASH',
};

export default function PaymentForm({ invoiceId, invoiceNumber, balanceDue, total, onSubmit, onClose, initial }) {
  const [form, setForm] = useState({
    invoice: invoiceId || initial?.invoice?._id || '',
    amount: initial?.amount || (balanceDue ? String(balanceDue) : ''),
    paymentType: initial?.paymentType || (balanceDue === total ? 'advance' : 'partial'),
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

  const amountNum = Number(form.amount) || 0;
  const amountOverLimit = balanceDue > 0 && amountNum > balanceDue;
  const newPaid = Math.min((total || 0) > 0 ? (amountNum + ((initial?.amount ? 0 : 0))) : amountNum, total || 0);
  const newPaidTotal = initial
    ? (total || 0) - (balanceDue || 0) + amountNum
    : (total || 0) - (balanceDue || 0) + amountNum;
  const newBalance = Math.max(0, (total || 0) - newPaidTotal);
  const newStatus = newBalance <= 0 ? 'paid' : (newPaidTotal > 0 ? 'partially_paid' : 'sent');

  const handleChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.amount || amountNum <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (amountOverLimit) {
      setError(`Amount exceeds balance due of ${fmt(balanceDue)}. Enter ${fmt(balanceDue)} or less.`);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        invoice: form.invoice,
        amount: amountNum,
        paymentType: form.paymentType,
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
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-zinc-900">
              {initial ? 'Edit Payment' : form.paymentType === 'advance' ? 'Record Advance Payment' : 'Record Payment'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {invoiceNumber && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Invoice</label>
              <p className="text-sm text-zinc-900 font-medium bg-zinc-50 px-3 py-2 rounded-lg border border-zinc-100">
                {invoiceNumber}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Payment Purpose</label>
            <Select value={form.paymentType} onValueChange={(v) => handleChange('paymentType', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500 mt-1">Use Advance Payment for an initial collection before the invoice is fully settled.</p>
          </div>

          {/* Balance Due indicator */}
          {balanceDue > 0 && !initial && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <span className="text-xs text-orange-500 font-medium">BALANCE DUE</span>
                  <p className="text-lg font-bold text-orange-700">{fmt(balanceDue)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('amount', String(balanceDue))}
                  className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded transition-colors"
                >
                  <ArrowRightToLine className="w-3.5 h-3.5" />
                  Full Amount
                </button>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="payment-amount" className="block text-sm font-medium text-zinc-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium text-sm">₹</span>
              <input
                id="payment-amount"
                aria-describedby="payment-amount-help payment-amount-error"
                type="number"
                step="0.01"
                min="0"
                max={balanceDue}
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                className={`w-full pl-7 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 transition-colors ${
                  amountOverLimit
                    ? 'border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400'
                    : 'border-zinc-200 focus:ring-indigo-500 focus:border-indigo-500'
                } border`}
                required
              />
            </div>
            {amountOverLimit && (
              <p id="payment-amount-error" role="alert" className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <span aria-hidden="true">!</span>
                Exceeds balance due of {fmt(balanceDue)}
              </p>
            )}
            {!amountOverLimit && (
              <p id="payment-amount-help" className="text-xs text-zinc-500 mt-1">
                Maximum collectible amount: {fmt(balanceDue)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Payment Method</label>
              <Select value={form.paymentMethod} onValueChange={(v) => handleChange('paymentMethod', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="inline-flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {methodIcons[m.value]}
                        </span>
                        {m.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      <span className={`inline-flex items-center gap-1.5`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          s.value === 'completed' ? 'bg-green-500' :
                          s.value === 'pending' ? 'bg-yellow-400' :
                          s.value === 'failed' ? 'bg-red-500' : 'bg-purple-500'
                        }`} />
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label htmlFor="payment-reference" className="block text-sm font-medium text-zinc-700 mb-1">Reference No.</label>
            <input
              id="payment-reference"
              type="text"
              placeholder="UTR / Cheque no. / Transaction ID"
              value={form.referenceNo}
              onChange={(e) => handleChange('referenceNo', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <DatePicker
              label="Payment Date"
              value={form.paymentDate}
              onChange={(v) => handleChange('paymentDate', v)}
              placeholder="Select payment date"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Payment Impact Preview */}
          {amountNum > 0 && !initial && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">After this payment</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-indigo-500 text-[11px]">Paid Amount</span>
                  <p className="font-semibold text-indigo-700">{fmt(newPaidTotal)}</p>
                </div>
                <div>
                  <span className="text-indigo-500 text-[11px]">Balance Due</span>
                  <p className={`font-semibold ${newBalance <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {newBalance <= 0 ? 'Fully Paid ✓' : fmt(newBalance)}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-indigo-500 text-[11px]">New Status</span>
                  <p className="font-semibold text-indigo-700 capitalize">
                    {newStatus === 'paid' ? 'Paid' : newStatus === 'partially_paid' ? 'Partially Paid' : 'Sent'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || amountOverLimit || amountNum <= 0}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {initial ? 'Update Payment' : amountNum === balanceDue ? 'Pay Full Amount' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
