import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Eye, CreditCard } from 'lucide-react';
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

export default function InvoiceTable({ invoices, onDelete, onStatusChange, userRole }) {
  const navigate = useNavigate();

  const columns = [
    {
      header: 'Invoice #',
      accessor: 'invoiceNumber',
    },
    {
      header: 'Client',
      accessor: 'client',
      sortable: false,
      cell: ({ getValue }) => {
        const client = getValue();
        return client ? client.companyName : '-';
      },
    },
    {
      header: 'Issue Date',
      accessor: 'issueDate',
      cell: ({ getValue }) => {
        const date = getValue();
        return date ? new Date(date).toLocaleDateString('en-IN') : '-';
      },
    },
    {
      header: 'Due Date',
      accessor: 'dueDate',
      cell: ({ getValue }) => {
        const date = getValue();
        return date ? new Date(date).toLocaleDateString('en-IN') : '-';
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: ({ getValue, row }) => {
        const status = getValue();
        const transitions = STATUS_TRANSITIONS[status] || [];

        if (transitions.length === 0) {
          return <InvoiceStatusBadge status={status} />;
        }

        return (
          <div className="flex items-center gap-1.5">
            <InvoiceStatusBadge status={status} />
            <Select
              value={status}
              onValueChange={(newStatus) => onStatusChange?.(row._id, newStatus)}
            >
              <SelectTrigger className="w-8 h-8 p-0 border-0 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {transitions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      },
    },
    {
      header: 'Total',
      accessor: 'total',
      cell: ({ getValue }) => fmt(getValue()),
    },
    {
      header: 'Paid',
      accessor: 'paidAmount',
      cell: ({ getValue, row }) => {
        const paid = getValue() || 0;
        const total = row.total || 0;
        const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-medium">{fmt(paid)}</span>
            {paid > 0 && paid < total && (
              <span className="text-xs text-zinc-400">({pct}%)</span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Balance',
      accessor: 'balanceDue',
      cell: ({ getValue, row }) => {
        const bal = getValue() || 0;
        const status = row.status;
        if (bal === 0) {
          return <span className="text-green-600 font-medium">Fully Paid</span>;
        }
        const color = status === 'overdue'
          ? 'text-red-600'
          : status === 'partially_paid'
            ? 'text-orange-600'
            : 'text-zinc-700';
        return <span className={`${color} font-medium`}>{fmt(bal)}</span>;
      },
    },
    {
      header: 'Actions',
      id: 'actions',
      sortable: false,
      cell: ({ row }) => {
        const invoice = row;
        const canRecordPayment = ['sent', 'overdue', 'partially_paid'].includes(invoice.status);
        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/invoices/${invoice._id}`);
              }}
              className="p-1.5 text-zinc-400 hover:text-blue-600 transition-colors rounded"
              title="View"
            >
              <Eye className="w-4 h-4" />
            </button>
            {canRecordPayment && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/invoices/${invoice._id}?recordPayment=1`);
                }}
                className="p-1.5 text-zinc-400 hover:text-green-600 transition-colors rounded"
                title="Record Payment"
              >
                <CreditCard className="w-4 h-4" />
              </button>
            )}
            {invoice.status === 'draft' && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/invoices/${invoice._id}`);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors rounded"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(invoice._id);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={invoices || []}
      onRowClick={(row) => navigate(`/invoices/${row._id}`)}
    />
  );
}
