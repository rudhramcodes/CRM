import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Eye } from 'lucide-react';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import DataTable from '../../../components/tables/DataTable';

export default function InvoiceTable({ invoices, onDelete, userRole }) {
  const navigate = useNavigate();

  const columns = [
    {
      header: 'Invoice #',
      accessorKey: 'invoiceNumber',
    },
    {
      header: 'Client',
      accessorKey: 'client',
      cell: ({ getValue }) => {
        const client = getValue();
        return client ? client.companyName : '-';
      },
    },
    {
      header: 'Issue Date',
      accessorKey: 'issueDate',
      cell: ({ getValue }) => {
        const date = getValue();
        return date ? new Date(date).toLocaleDateString() : '-';
      },
    },
    {
      header: 'Due Date',
      accessorKey: 'dueDate',
      cell: ({ getValue }) => {
        const date = getValue();
        return date ? new Date(date).toLocaleDateString() : '-';
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => <InvoiceStatusBadge status={getValue()} />,
    },
    {
      header: 'Total',
      accessorKey: 'total',
      cell: ({ getValue }) => {
        const val = getValue();
        return `₹${(val || 0).toFixed(2)}`;
      },
    },
    {
      header: 'Balance',
      accessorKey: 'balanceDue',
      cell: ({ getValue }) => {
        const val = getValue();
        return `₹${(val || 0).toFixed(2)}`;
      },
    },
    {
      header: 'Actions',
      id: 'actions',
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
