import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, MoreHorizontal, ArrowUpRight, Edit2 } from 'lucide-react';
import QuotationStatusBadge from './QuotationStatusBadge';
import DataTable from '../../../components/tables/DataTable';
import { BRANDS } from '../../../constants';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';

const BRAND_LABELS = BRANDS.reduce((acc, b) => {
  acc[b.value] = b.label;
  return acc;
}, {});

const STATUS_TRANSITIONS = {
  draft: [
    { value: 'sent', label: 'Send' },
    { value: 'accepted', label: 'Mark Accepted' },
    { value: 'rejected', label: 'Mark Rejected' },
  ],
  sent: [
    { value: 'accepted', label: 'Mark Accepted' },
    { value: 'rejected', label: 'Mark Rejected' },
    { value: 'expired', label: 'Mark Expired' },
  ],
  accepted: [],
  rejected: [],
  expired: [],
};

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

function QuotationActions({ quotation, onDelete, onStatusChange, compact = false }) {
  const navigate = useNavigate();
  const transitions = STATUS_TRANSITIONS[quotation.status] || [];
  const stop = (event) => event.stopPropagation();
  return (
    <div className={compact ? 'flex items-center gap-2' : 'flex items-center gap-1'} onClick={stop}>
      <button
        type="button"
        onClick={() => navigate(`/quotations/${quotation._id}`)}
        className={compact
          ? 'inline-flex items-center justify-center gap-1.5 flex-1 rounded-lg bg-primary-900 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-800 transition-colors'
          : 'p-1.5 text-zinc-400 hover:text-blue-600 transition-colors rounded'}
        aria-label={`View quotation ${quotation.quotationNumber}`}
        title="View quotation"
      >
        <Eye className="w-4 h-4" />
        {compact && 'View'}
      </button>
      {compact ? (
        <details className="relative shrink-0">
          <summary className="list-none cursor-pointer rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50" aria-label={`More actions for ${quotation.quotationNumber}`}>
            <MoreHorizontal className="w-4 h-4" />
          </summary>
          <div className="absolute right-0 bottom-full z-20 mb-2 w-48 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl">
            <button type="button" onClick={() => navigate(`/quotations/${quotation._id}`)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">
              <ArrowUpRight className="w-4 h-4" /> Open details
            </button>
            {quotation.status === 'draft' && (
              <>
                <button type="button" onClick={() => navigate(`/quotations/${quotation._id}`)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">
                  <Edit2 className="w-4 h-4" /> Edit quotation
                </button>
                <button type="button" onClick={() => onDelete?.(quotation._id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" /> Delete quotation
                </button>
              </>
            )}
            {transitions.length > 0 && (
              <label className="mt-1 flex items-center gap-2 border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
                Status
                <select
                  defaultValue=""
                  onChange={(event) => {
                    if (event.target.value) onStatusChange?.(quotation._id, event.target.value);
                  }}
                  className="min-w-0 flex-1 rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700"
                  aria-label={`Change status for ${quotation.quotationNumber}`}
                >
                  <option value="">Change</option>
                  {transitions.map((transition) => <option key={transition.value} value={transition.value}>{transition.label}</option>)}
                </select>
              </label>
            )}
          </div>
        </details>
      ) : (
        <>
          {quotation.status === 'draft' && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/quotations/${quotation._id}`)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors rounded"
                aria-label={`Edit quotation ${quotation.quotationNumber}`}
                title="Edit quotation"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete?.(quotation._id)}
                className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors rounded"
                aria-label={`Delete quotation ${quotation.quotationNumber}`}
                title="Delete quotation"
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

function QuotationMobileCard({ quotation, onDelete, onStatusChange }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary-900 truncate">{quotation.quotationNumber}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{quotation.client?.companyName || 'No client assigned'}</p>
        </div>
        <QuotationStatusBadge status={quotation.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-[#F6F0DF]/60 p-3 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Budget</p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-700">{fmt(quotation.budget)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Quotation</p>
          <p className="mt-0.5 text-sm font-semibold text-[#3A2415]">{fmt(quotation.total)}</p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-xs text-zinc-500">{quotation.subject || quotation.scopeTitle || '-'}</p>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
        <div className="text-xs text-zinc-500">
          <span>Issued </span><span className="font-medium text-zinc-700">{fmtDate(quotation.issueDate)}</span>
        </div>
        <QuotationActions quotation={quotation} onDelete={onDelete} onStatusChange={onStatusChange} compact />
      </div>
    </article>
  );
}

export default function QuotationTable({ quotations, onDelete, onStatusChange }) {
  const navigate = useNavigate();
  const columns = [
    { header: 'Quotation #', accessor: 'quotationNumber' },
    {
      header: 'Client',
      accessor: 'client',
      sortable: false,
      cell: ({ getValue }) => getValue()?.companyName || '-',
    },
    {
      header: 'Project',
      accessor: 'project',
      sortable: false,
      cell: ({ getValue }) => getValue() ? [getValue().projectCode, getValue().title].filter(Boolean).join(' — ') : '—',
    },
    { header: 'Venture', accessor: 'client', sortable: false, cell: ({ getValue }) => { const client = getValue(); return client?.brand ? (BRAND_LABELS[client.brand] || client.brand) : '—'; } },
    { header: 'Issued', accessor: 'issueDate', cell: ({ getValue }) => fmtDate(getValue()) },
    { header: 'Valid Until', accessor: 'validUntil', cell: ({ getValue }) => fmtDate(getValue()) },
    {
      header: 'Status',
      accessor: 'status',
      cell: ({ getValue, row }) => {
        const status = getValue();
        const transitions = STATUS_TRANSITIONS[status] || [];
        if (!transitions.length) return <QuotationStatusBadge status={status} />;
        return (
          <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
            <QuotationStatusBadge status={status} />
            <Select value={status} onValueChange={(newStatus) => onStatusChange?.(row._id, newStatus)}>
              <SelectTrigger className="h-8 w-8 border-0 p-0 shadow-none" aria-label={`Change status for ${row.quotationNumber}`}><SelectValue /></SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={status} disabled>{status.replace('_', ' ')}</SelectItem>
                {transitions.map((transition) => <SelectItem key={transition.value} value={transition.value}>{transition.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
      },
    },
    { header: 'Budget', accessor: 'budget', cell: ({ getValue }) => <span className="text-zinc-500">{fmt(getValue())}</span> },
    { header: 'Total', accessor: 'total', cell: ({ getValue }) => <span className="font-medium text-zinc-900">{fmt(getValue())}</span> },
    { header: 'Actions', id: 'actions', sortable: false, cell: ({ row }) => <QuotationActions quotation={row} onDelete={onDelete} onStatusChange={onStatusChange} /> },
  ];

  return (
    <>
      <div className="hidden md:block">
        <DataTable columns={columns} data={quotations || []} onRowClick={(row) => navigate(`/quotations/${row._id}`)} />
      </div>
      <div className="space-y-3 p-3 md:hidden">
        {(quotations || []).map((quotation) => <QuotationMobileCard key={quotation._id} quotation={quotation} onDelete={onDelete} onStatusChange={onStatusChange} />)}
        {!quotations?.length && <p className="py-8 text-center text-sm text-zinc-500">No quotations found.</p>}
      </div>
    </>
  );
}
