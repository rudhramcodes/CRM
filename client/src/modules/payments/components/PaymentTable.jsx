import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, ExternalLink } from 'lucide-react';
import PaymentStatusBadge from './PaymentStatusBadge';
import { PAYMENT_METHODS } from '../../../constants';
import DataTable from '../../../components/tables/DataTable';

const methodMap = PAYMENT_METHODS.reduce((map, m) => {
  map[m.value] = m.label;
  return map;
}, {});

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function PaymentTable({ payments, onDelete, canDelete }) {
  const navigate = useNavigate();

  const columns = [
    {
      header: 'Invoice #',
      accessor: 'invoice',
      sortable: false,
      cell: ({ getValue }) => {
        const inv = getValue();
        return inv ? inv.invoiceNumber : '-';
      },
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
      header: 'Amount Paid',
      accessor: 'amount',
      cell: ({ getValue }) => {
        const val = getValue();
        return <span className="font-medium text-green-700">{fmt(val)}</span>;
      },
    },
    {
      header: 'Invoice Total',
      accessor: 'invoice',
      sortable: false,
      cell: ({ getValue }) => {
        const inv = getValue();
        return inv ? (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${inv._id}`); }}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
          >
            {fmt(inv.total)} <ExternalLink className="w-3 h-3" />
          </button>
        ) : '-';
      },
    },
    {
      header: 'Balance',
      id: 'balance',
      sortable: false,
      cell: ({ row }) => {
        const inv = row.invoice;
        if (!inv) return '-';
        const bal = inv.total - row.amount;
        const positive = bal >= 0;
        return (
          <span className={positive ? 'text-orange-600 font-medium' : 'text-green-600 font-medium'}>
            {positive ? fmt(bal) : 'Overpaid'}
          </span>
        );
      },
    },
    {
      header: 'Method',
      accessor: 'paymentMethod',
      cell: ({ getValue }) => methodMap[getValue()] || getValue(),
    },
    {
      header: 'Reference',
      accessor: 'referenceNo',
      cell: ({ getValue }) => getValue() || '-',
    },
    {
      header: 'Date',
      accessor: 'paymentDate',
      cell: ({ getValue }) => {
        const date = getValue();
        return date ? new Date(date).toLocaleDateString('en-IN') : '-';
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: ({ getValue }) => <PaymentStatusBadge status={getValue()} />,
    },
    {
      header: 'Actions',
      id: 'actions',
      sortable: false,
      cell: ({ row }) => {
        const payment = row;
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/payments/${payment._id}`);
              }}
              className="p-1.5 text-zinc-400 hover:text-blue-600 transition-colors rounded"
              title="View"
            >
              <Eye className="w-4 h-4" />
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(payment._id);
                }}
                className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors rounded"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={payments || []}
      onRowClick={(row) => navigate(`/payments/${row._id}`)}
    />
  );
}
