import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Eye, ChevronDown } from 'lucide-react';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import DataTable from '../../../components/tables/DataTable';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../components/ui/Select';

const STATUS_TRANSITIONS = {
  draft: [{ value: 'sent', label: 'Send' }, { value: 'cancelled', label: 'Cancel' }],
  sent: [{ value: 'paid', label: 'Mark Paid' }, { value: 'cancelled', label: 'Cancel' }],
  overdue: [{ value: 'paid', label: 'Mark Paid' }, { value: 'cancelled', label: 'Cancel' }],
  paid: [],
  cancelled: [],
};

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
        return date ? new Date(date).toLocaleDateString() : '-';
      },
    },
    {
      header: 'Due Date',
      accessor: 'dueDate',
      cell: ({ getValue }) => {
        const date = getValue();
        return date ? new Date(date).toLocaleDateString() : '-';
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
          <Select
            value={status}
            onValueChange={(newStatus) => onStatusChange?.(row._id, newStatus)}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue>
                <InvoiceStatusBadge status={status} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {transitions.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      header: 'Total',
      accessor: 'total',
      cell: ({ getValue }) => {
        const val = getValue();
        return `₹${(val || 0).toFixed(2)}`;
      },
    },
    {
      header: 'Balance',
      accessor: 'balanceDue',
      cell: ({ getValue }) => {
        const val = getValue();
        return `₹${(val || 0).toFixed(2)}`;
      },
    },
    {
      header: 'Actions',
      id: 'actions',
      sortable: false,
      cell: ({ row }) => {
        const invoice = row;
        return (
          <div className="flex items-center gap-2">
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
