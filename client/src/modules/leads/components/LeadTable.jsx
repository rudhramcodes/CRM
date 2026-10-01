import DataTable from '../../../components/tables/DataTable';
import LeadStatusBadge from './LeadStatusBadge';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../../../components/ui/Select';
import { formatDate } from '../../../utils/formatters';
import { LEAD_STATUS, LEAD_BRANDS, BRAND_METAS } from '../../../constants';
import { cn } from '../../../utils/cn';
import { Edit2, Trash2, Mail, Phone, Building2 } from 'lucide-react';

export default function LeadTable({
  leads,
  loading,
  error,
  onRowClick,
  searchable,
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
  selectable,
  selectedIds,
  onSelectionChange,
}) {
  const columns = [
    {
      header: 'Lead Name & Company',
      accessor: 'name',
      cell: ({ row }) => {
        const initials = row.name
          ?.split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'LE';

        const assignedClientId = row.clientId || row.convertedToClient?.clientId;

        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-100 border border-zinc-200/80 rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <span className="text-primary-900 font-bold text-xs">{initials}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-primary-900 text-xs sm:text-sm truncate leading-snug">
                  {row.name}
                </p>
                {assignedClientId && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-100/90 font-mono text-[10px] font-semibold text-zinc-600 border border-zinc-200/80 shrink-0"
                    title={`Assigned Client ID: ${assignedClientId} (${row.convertedToClient?.status || 'inactive'})`}
                  >
                    {assignedClientId}
                  </span>
                )}
                {!row.isRead && (
                  <span className="relative flex h-2 w-2 mb-0.5 shrink-0" title="Unread lead">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                )}
              </div>
              {row.company ? (
                <p className="text-[11px] text-zinc-400 truncate flex items-center gap-1 font-normal">
                  <Building2 className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span className="truncate">{row.company}</span>
                </p>
              ) : (
                <p className="text-[11px] text-zinc-400 truncate font-normal">{row.email}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Venture',
      accessor: 'brand',
      cell: ({ value }) => {
        const brandObj = LEAD_BRANDS.find((b) => b.value === value);
        const meta = BRAND_METAS[value];

        if (meta) {
          return (
            <div className="flex items-center gap-1.5">
              {meta.logo ? (
                <img
                  src={meta.logo}
                  alt={meta.name}
                  className="w-5 h-5 rounded-md object-contain border border-zinc-200/80 p-0.5 bg-white shrink-0 shadow-2xs"
                />
              ) : (
                <div
                  className={cn(
                    'w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-2xs bg-gradient-to-br',
                    meta.gradient
                  )}
                >
                  {meta.name?.[0] || 'R'}
                </div>
              )}
              <span className="text-xs font-medium text-zinc-700 truncate max-w-[110px]">
                {meta.name}
              </span>
            </div>
          );
        }

        return brandObj ? (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200/60">
            {brandObj.label}
          </span>
        ) : (
          <span className="text-xs text-zinc-300">—</span>
        );
      },
    },
    {
      header: 'Contact Info',
      accessor: 'email',
      cell: ({ row }) => (
        <div className="space-y-0.5 text-xs text-zinc-600">
          <div className="flex items-center gap-1.5 truncate">
            <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
            <span className="truncate max-w-[150px]">{row.email}</span>
          </div>
          {row.phone && (
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] truncate">
              <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
              <span>{row.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Source',
      accessor: 'source',
      cell: ({ value }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200/60 capitalize">
          {value?.replace(/_/g, ' ') || 'Direct'}
        </span>
      ),
    },
    {
      header: 'Stage Status',
      accessor: 'status',
      cell: ({ row }) =>
        canEdit && onStatusChange ? (
          <div onClick={(e) => e.stopPropagation()}>
            <Select value={row.status} onValueChange={(val) => onStatusChange(row._id, val)}>
              <SelectTrigger
                className={cn(
                  'w-auto gap-1 border-0 bg-transparent p-0 shadow-none cursor-pointer',
                  'hover:bg-transparent focus:ring-0',
                  '[&>svg]:text-zinc-400 [&>svg]:w-3 [&>svg]:h-3',
                )}
              >
                <LeadStatusBadge status={row.status} />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                {LEAD_STATUS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{s.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <LeadStatusBadge status={row.status} />
        ),
    },
    {
      header: 'Assigned To',
      accessor: 'assignedTo',
      cell: ({ value }) => (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-[9px] font-bold text-zinc-600 shrink-0">
            {value?.name?.[0]?.toUpperCase() || '—'}
          </div>
          <span className="text-xs font-medium text-zinc-600 truncate max-w-[100px]">
            {value?.name || 'Unassigned'}
          </span>
        </div>
      ),
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
                    title="Edit lead"
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
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete lead"
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
      data={leads}
      loading={loading}
      error={error}
      searchable={searchable}
      searchPlaceholder="Search in table..."
      emptyTitle="No leads found"
      emptyDescription="Get started by creating your first lead in the pipeline."
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
      selectable={selectable}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
    />
  );
}
