import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, ExternalLink } from 'lucide-react';
import PaymentStatusBadge from './PaymentStatusBadge';
import { PAYMENT_METHODS, PAYMENT_TYPES } from '../../../constants';
import DataTable from '../../../components/tables/DataTable';

const typeMap = PAYMENT_TYPES.reduce((map, type) => { map[type.value] = type.label; return map; }, {});

const methodMap = PAYMENT_METHODS.reduce((map, m) => {
  map[m.value] = m.label;
  return map;
}, {});

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const purposeClasses = {
  advance: 'bg-blue-50 text-blue-700 border-blue-100',
  partial: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  final: 'bg-green-50 text-green-700 border-green-100',
  other: 'bg-zinc-50 text-zinc-700 border-zinc-200',
};

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
        const bal = Number(inv.balanceDue ?? (inv.total - row.amount));
        const settled = bal <= 0;
        return (
          <span className={settled ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
            {settled ? 'Settled' : fmt(bal)}
          </span>
        );
      },
    },
    {
      header: 'Purpose',
      accessor: 'paymentType',
      cell: ({ getValue }) => {
        const value = getValue();
        return (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${purposeClasses[value] || purposeClasses.other}`}>
            {typeMap[value] || 'Payment'}
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
              aria-label={`View payment ${payment.receiptNumber || payment._id}`}
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
                aria-label={`Delete payment ${payment.receiptNumber || payment._id}`}
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
