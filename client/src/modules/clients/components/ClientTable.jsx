import DataTable from '../../../components/tables/DataTable';
import ClientStatusBadge from './ClientStatusBadge';
import { formatDate } from '../../../utils/formatters';
import { BRANDS, BRAND_METAS } from '../../../constants';
import { cn } from '../../../utils/cn';
import { Edit2, Trash2, Mail, Phone, MessageSquare, Building2 } from 'lucide-react';

const BRAND_LABELS = BRANDS.reduce((acc, b) => ({ ...acc, [b.value]: b.label }), {});

export default function ClientTable({
  clients,
  loading,
  error,
  onRowClick,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onStatusChange,
  serverPagination,
  page,
  pageSize,
  total,
  totalPages,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onPageSizeChange,
}) {
  const columns = [
    {
      header: 'Company & Contact',
      accessor: 'companyName',
      cell: ({ row }) => {
        const initials =
          row.companyName
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'CL';

        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-100 border border-zinc-200/80 rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <span className="text-primary-900 font-bold text-xs">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-primary-900 text-xs sm:text-sm truncate leading-snug">
                {row.companyName}
              </p>
              {row.contactPerson && (
                <p className="text-[11px] text-zinc-400 truncate font-normal">
                  {row.contactPerson}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Client ID',
      accessor: 'clientId',
      cell: ({ value }) => (
        <span className="whitespace-nowrap rounded-md bg-zinc-100/90 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-600 border border-zinc-200/60 shadow-2xs">
          {value || '—'}
        </span>
      ),
    },
    {
      header: 'Venture',
      accessor: 'brand',
      cell: ({ value }) => {
        const meta = BRAND_METAS[value];
        const label = BRAND_LABELS[value] || value;

        if (meta) {
          return (
            <div className="flex items-center gap-1.5">
              {meta.logo ? (
                <img
                  src={meta.logo}
                  alt={meta.label || label}
                  className="w-5 h-5 rounded-md object-contain border border-zinc-200/80 p-0.5 bg-white shrink-0 shadow-2xs"
                />
              ) : (
                <div
                  className={cn(
                    'w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-2xs bg-gradient-to-br',
                    meta.gradient
                  )}
                >
                  {meta.initial || label?.[0] || 'R'}
                </div>
              )}
              <span className="text-xs font-medium text-zinc-700 truncate max-w-[110px]">
                {meta.label || label}
              </span>
            </div>
          );
        }

        return value ? (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200/60">
            {label}
          </span>
        ) : (
          <span className="text-xs text-zinc-300">—</span>
        );
      },
    },
    {
      header: 'Contact Info',
      accessor: 'email',
      cell: ({ row }) => {
        const cleanPhone = row.phone ? row.phone.replace(/[^\d+]/g, '') : null;
        const waNumber = row.phone ? row.phone.replace(/[^\d]/g, '') : null;

        return (
          <div className="space-y-0.5 text-xs text-zinc-600">
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
              <a
                href={`mailto:${row.email}`}
                onClick={(e) => e.stopPropagation()}
                className="truncate max-w-[150px] hover:text-primary-900 hover:underline"
              >
                {row.email}
              </a>
            </div>
            {row.phone && (
              <div className="flex items-center gap-2 text-zinc-400 text-[11px] truncate">
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                  <a
                    href={`tel:${cleanPhone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-primary-900 hover:underline"
                  >
                    {row.phone}
                  </a>
                </div>
                {waNumber && (
                  <a
                    href={`https://wa.me/${waNumber}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-emerald-600 hover:text-emerald-700 transition-colors p-0.5 rounded hover:bg-emerald-50"
                    title="Open WhatsApp"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Tax ID (GST)',
      accessor: 'gstNumber',
      cell: ({ value }) => (
        <span className="text-xs font-mono text-zinc-600">
          {value || '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: ({ row }) => <ClientStatusBadge status={row.status} />,
    },
    {
      header: 'Created',
      accessor: 'createdAt',
      cell: ({ value }) => (
        <span className="text-xs text-zinc-400 whitespace-nowrap">{formatDate(value)}</span>
      ),
    },
    ...(canEdit || canDelete
      ? [
          {
            header: 'Actions',
            accessor: '_id',
            sortable: false,
            cell: ({ row }) => (
              <div className="flex items-center gap-1">
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(row);
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                    title="Edit client"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(row);
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete client"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <DataTable
      columns={columns}
      data={clients}
      loading={loading}
      error={error}
      searchable={false}
      emptyTitle="No clients found"
      emptyDescription="Get started by creating your first client or converting a won lead."
      onRowClick={onRowClick}
      serverPagination={serverPagination}
      page={page}
      pageSize={pageSize}
      total={total}
      totalPages={totalPages}
      hasNextPage={hasNextPage}
      hasPrevPage={hasPrevPage}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  );
}

