import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Eye, CreditCard, MoreHorizontal, ArrowUpRight } from 'lucide-react';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import DataTable from '../../../components/tables/DataTable';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';

// Only non-financial status transitions here.
// "Mark as Paid" / "Collect Remaining" are payment actions done via POST /api/payments.
const STATUS_TRANSITIONS = {
  draft: [{ value: 'sent', label: 'Send' }, { value: 'cancelled', label: 'Cancel' }],
  sent: [{ value: 'cancelled', label: 'Cancel' }],
  partially_paid: [{ value: 'cancelled', label: 'Cancel' }],
  overdue: [{ value: 'cancelled', label: 'Cancel' }],
  paid: [],
  cancelled: [],
};

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function InvoiceActions({ invoice, onDelete, compact = false }) {
  const navigate = useNavigate();
  const canRecordPayment = ['draft', 'sent', 'overdue', 'partially_paid'].includes(invoice.status);
  const transitions = STATUS_TRANSITIONS[invoice.status] || [];
  const paymentLabel = invoice.status === 'draft' ? 'Record Advance' : 'Record Payment';

  const stop = (event) => event.stopPropagation();

  return (
    <div className={compact ? 'flex items-center gap-2' : 'flex items-center gap-1'} onClick={stop}>
      <button
        type="button"
        onClick={() => navigate(`/invoices/${invoice._id}`)}
        className={compact
          ? 'inline-flex items-center justify-center gap-1.5 flex-1 rounded-lg bg-primary-900 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-800 transition-colors'
          : 'p-1.5 text-zinc-400 hover:text-blue-600 transition-colors rounded'}
        aria-label={`View invoice ${invoice.invoiceNumber}`}
        title="View invoice"
      >
        <Eye className="w-4 h-4" />
        {compact && 'View'}
      </button>
      {canRecordPayment && (
        <button
          type="button"
          onClick={() => navigate(`/invoices/${invoice._id}?recordPayment=1`)}
          className={compact
            ? 'inline-flex items-center justify-center gap-1.5 flex-1 rounded-lg border border-[#DCC19D] bg-[#F6F0DF] px-3 py-2 text-xs font-semibold text-[#3A2415] hover:bg-[#DCC19D]/50 transition-colors'
            : 'p-1.5 text-zinc-400 hover:text-green-600 transition-colors rounded'}
          aria-label={`${paymentLabel} for ${invoice.invoiceNumber}`}
          title={paymentLabel}
        >
          <CreditCard className="w-4 h-4" />
          {compact && paymentLabel}
        </button>
      )}
      {compact ? (
        <details className="relative shrink-0">
          <summary className="list-none cursor-pointer rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50" aria-label={`More actions for ${invoice.invoiceNumber}`}>
            <MoreHorizontal className="w-4 h-4" />
          </summary>
          <div className="absolute right-0 bottom-full z-20 mb-2 w-48 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl">
            <button type="button" onClick={() => navigate(`/invoices/${invoice._id}`)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">
              <ArrowUpRight className="w-4 h-4" /> Open details
            </button>
            {invoice.status === 'draft' && (
              <>
                <button type="button" onClick={() => navigate(`/invoices/${invoice._id}`)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">
                  <Edit2 className="w-4 h-4" /> Edit invoice
                </button>
                <button type="button" onClick={() => onDelete?.(invoice._id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" /> Delete invoice
                </button>
              </>
            )}
            {transitions.length > 0 && (
              <label className="mt-1 flex items-center gap-2 border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
                Status
                <select
                  value={invoice.status}
                  onChange={(event) => invoice.onStatusChange?.(invoice._id, event.target.value)}
                  className="min-w-0 flex-1 rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700"
                  aria-label={`Change status for ${invoice.invoiceNumber}`}
                >
                  <option value={invoice.status}>{invoice.status.replace('_', ' ')}</option>
                  {transitions.map((transition) => <option key={transition.value} value={transition.value}>{transition.label}</option>)}
                </select>
              </label>
            )}
          </div>
        </details>
      ) : (
        <>
          {invoice.status === 'draft' && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/invoices/${invoice._id}`)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors rounded"
                aria-label={`Edit invoice ${invoice.invoiceNumber}`}
                title="Edit invoice"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete?.(invoice._id)}
                className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors rounded"
                aria-label={`Delete invoice ${invoice.invoiceNumber}`}
                title="Delete invoice"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

function InvoiceMobileCard({ invoice, onDelete, onStatusChange }) {
  const balance = Number(invoice.balanceDue || 0);
  const paid = Number(invoice.paidAmount || 0);
  const total = Number(invoice.total || 0);
  const percentage = total > 0 ? Math.min(Math.round((paid / total) * 100), 100) : 0;
  const invoiceWithStatusHandler = { ...invoice, onStatusChange };

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary-900 truncate">{invoice.invoiceNumber}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{invoice.client?.companyName || 'No client assigned'}</p>
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-[#F6F0DF]/60 p-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Total</p>
          <p className="mt-0.5 text-sm font-semibold text-[#3A2415]">{fmt(total)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Paid</p>
          <p className="mt-0.5 text-sm font-semibold text-green-700">{fmt(paid)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Balance</p>
          <p className={`mt-0.5 text-sm font-semibold ${balance > 0 ? 'text-orange-700' : 'text-green-700'}`}>
            {balance > 0 ? fmt(balance) : 'Settled'}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Collection progress</span><span>{percentage}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-[#B3712D] transition-all" style={{ width: `${percentage}%` }} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
        <div className="text-xs text-zinc-500">
          <span>Due </span><span className="font-medium text-zinc-700">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '-'}</span>
        </div>
        <InvoiceActions invoice={invoiceWithStatusHandler} onDelete={onDelete} compact />
      </div>
    </article>
  );
}

export default function InvoiceTable({ invoices, onDelete, onStatusChange }) {
  const columns = [
    { header: 'Invoice #', accessor: 'invoiceNumber' },
    { header: 'Client', accessor: 'client', sortable: false, cell: ({ getValue }) => getValue() ? getValue().companyName : '-' },
    { header: 'Issue Date', accessor: 'issueDate', cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString('en-IN') : '-' },
    { header: 'Due Date', accessor: 'dueDate', cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString('en-IN') : '-' },
    {
      header: 'Status', accessor: 'status', cell: ({ getValue, row }) => {
        const status = getValue();
        const transitions = STATUS_TRANSITIONS[status] || [];
        if (!transitions.length) return <InvoiceStatusBadge status={status} />;
        return (
          <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
            <InvoiceStatusBadge status={status} />
            <Select value={status} onValueChange={(newStatus) => onStatusChange?.(row._id, newStatus)}>
              <SelectTrigger className="h-8 w-8 border-0 p-0 shadow-none" aria-label={`Change status for ${row.invoiceNumber}`}><SelectValue /></SelectTrigger>
              <SelectContent align="end">{transitions.map((transition) => <SelectItem key={transition.value} value={transition.value}>{transition.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        );
      },
    },
    { header: 'Total', accessor: 'total', cell: ({ getValue }) => fmt(getValue()) },
    { header: 'Paid', accessor: 'paidAmount', cell: ({ getValue, row }) => { const paid = getValue() || 0; const total = row.total || 0; const pct = total > 0 ? Math.round((paid / total) * 100) : 0; return <div className="flex items-center gap-2"><span className="font-medium text-green-600">{fmt(paid)}</span>{paid > 0 && paid < total && <span className="text-xs text-zinc-400">({pct}%)</span>}</div>; } },
    { header: 'Balance', accessor: 'balanceDue', cell: ({ getValue, row }) => { const bal = getValue() || 0; if (bal === 0) return <span className="font-medium text-green-600">Fully Paid</span>; const color = row.status === 'overdue' ? 'text-red-600' : row.status === 'partially_paid' ? 'text-orange-600' : 'text-zinc-700'; return <span className={`${color} font-medium`}>{fmt(bal)}</span>; } },
    { header: 'Actions', id: 'actions', sortable: false, cell: ({ row }) => <InvoiceActions invoice={row} onDelete={onDelete} /> },
  ];

  return (
    <>
      <div className="hidden md:block">
        <DataTable columns={columns} data={invoices || []} onRowClick={(row) => window.location.assign(`/invoices/${row._id}`)} />
      </div>
      <div className="space-y-3 p-3 md:hidden">
        {(invoices || []).map((invoice) => <InvoiceMobileCard key={invoice._id} invoice={invoice} onDelete={onDelete} onStatusChange={onStatusChange} />)}
        {!invoices?.length && <p className="py-8 text-center text-sm text-zinc-500">No invoices found.</p>}
      </div>
    </>
  );
}
