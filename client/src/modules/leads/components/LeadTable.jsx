import DataTable from '../../../components/tables/DataTable';
import LeadStatusBadge from './LeadStatusBadge';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../../../components/ui/Select';
import { formatDate } from '../../../utils/formatters';
import { LEAD_STATUS, LEAD_BRANDS, BRAND_METAS } from '../../../constants';
import { cn } from '../../../utils/cn';
import { Edit2, Mail, Phone, Building2 } from 'lucide-react';

export default function LeadTable({
  leads,
  loading,
  error,
  onRowClick,
  searchable,
  canEdit,
  onEdit,
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
    ...(canEdit
      ? [
          {
            header: 'Actions',
            accessor: '_id',
            sortable: false,
            cell: ({ row }) => (
              <div className="flex items-center gap-1">
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
              </div>
            ),
          },
        ]
      : []),
  ];

  const displayedIds = leads.map((l) => l._id).filter(Boolean);
  const allSelected = displayedIds.length > 0 && displayedIds.every((id) => selectedIds.includes(id));

  const handleSelectAllMobile = () => {
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !displayedIds.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedIds, ...displayedIds])]);
    }
  };

  return (
    <>
      {/* Desktop / Tablet Table View (>= md) */}
      <div className="hidden md:block">
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
      </div>

      {/* Mobile Touch Card View (< md) */}
      <div className="md:hidden divide-y divide-zinc-100">
        {/* Mobile Select All Header */}
        {selectable && leads.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50/80 border-b border-zinc-100">
            <button
              type="button"
              onClick={handleSelectAllMobile}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-primary-900 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAllMobile}
                className="w-4 h-4 rounded border-zinc-300 text-primary-900 focus:ring-primary-900 cursor-pointer"
              />
              <span>Select all on page ({leads.length})</span>
            </button>
            {selectedIds.length > 0 && (
              <span className="text-[10px] font-bold text-primary-900 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200/60">
                {selectedIds.length} selected
              </span>
            )}
          </div>
        )}

        {leads.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-primary-900">No leads found</p>
            <p className="text-xs text-zinc-400 mt-1">Get started by creating your first lead in the pipeline.</p>
          </div>
        ) : (
          <div className="p-3 space-y-2.5">
            {leads.map((lead) => {
              const initials = lead.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'LE';
              const assignedClientId = lead.clientId || lead.convertedToClient?.clientId;
              const meta = BRAND_METAS[lead.brand];
              const isSelected = selectable && selectedIds.includes(lead._id);

              return (
                <div
                  key={lead._id}
                  onClick={() => onRowClick?.(lead)}
                  className={cn(
                    'bg-white rounded-2xl border p-3.5 shadow-2xs transition-all active:scale-[0.99] cursor-pointer space-y-2.5',
                    isSelected
                      ? 'border-primary-900 bg-primary-50/20 ring-1 ring-primary-900/20'
                      : 'border-zinc-200/80 hover:border-zinc-300',
                  )}
                >
                  {/* Top Row: Select Checkbox + Avatar + Name + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {selectable && (
                        <input
                          type="checkbox"
                          aria-label={`Select ${lead.name}`}
                          checked={isSelected}
                          onChange={() => {
                            if (selectedIds.includes(lead._id)) {
                              onSelectionChange(selectedIds.filter((id) => id !== lead._id));
                            } else {
                              onSelectionChange([...selectedIds, lead._id]);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-zinc-300 text-primary-900 focus:ring-primary-900 mt-0.5 cursor-pointer shrink-0"
                        />
                      )}
                      <div className="w-8 h-8 bg-zinc-100 border border-zinc-200/80 rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
                        <span className="text-primary-900 font-bold text-xs">{initials}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-primary-900 text-xs sm:text-sm truncate leading-snug">
                            {lead.name}
                          </p>
                          {!lead.isRead && (
                            <span className="relative flex h-2 w-2 shrink-0" title="Unread lead">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                            </span>
                          )}
                        </div>
                        {lead.company ? (
                          <p className="text-[11px] text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span className="truncate">{lead.company}</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{lead.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Interactive Status on Mobile */}
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                      {canEdit && onStatusChange ? (
                        <Select value={lead.status} onValueChange={(val) => onStatusChange(lead._id, val)}>
                          <SelectTrigger className="w-auto gap-1 border-0 bg-transparent p-0 shadow-none cursor-pointer hover:bg-transparent focus:ring-0 [&>svg]:text-zinc-400 [&>svg]:w-3 [&>svg]:h-3">
                            <LeadStatusBadge status={lead.status} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                            {LEAD_STATUS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                <span className="text-xs">{s.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <LeadStatusBadge status={lead.status} />
                      )}
                    </div>
                  </div>

                  {/* Venture & Client ID row */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {meta ? (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-50 border border-zinc-200/80">
                        {meta.logo ? (
                          <img src={meta.logo} alt={meta.name} className="w-3.5 h-3.5 object-contain rounded-xs" />
                        ) : (
                          <span className={cn('w-2 h-2 rounded-full', meta.gradient)} />
                        )}
                        <span className="text-[11px] font-medium text-zinc-700">{meta.name}</span>
                      </div>
                    ) : lead.brand ? (
                      <span className="text-[11px] font-medium bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md border border-zinc-200/60">
                        {lead.brand}
                      </span>
                    ) : null}

                    {assignedClientId && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-100/90 font-mono text-[10px] font-semibold text-zinc-600 border border-zinc-200/80">
                        Client ID: {assignedClientId}
                      </span>
                    )}

                    {lead.source && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100/80 text-zinc-500 capitalize">
                        {lead.source.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  {/* Quick Action Contact Buttons: 1-tap call & 1-tap email */}
                  <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/70 text-xs font-semibold text-zinc-700 active:scale-95 transition-all cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="truncate">{lead.phone}</span>
                      </a>
                    ) : (
                      <div className="flex-1 text-center py-1 text-[11px] text-zinc-400">No phone</div>
                    )}

                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/70 text-xs font-semibold text-zinc-700 active:scale-95 transition-all cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        <span className="truncate">Email</span>
                      </a>
                    ) : null}

                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.(lead);
                        }}
                        className="p-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/70 text-zinc-500 hover:text-primary-900 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Edit lead"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Card Footer: Assigned to & Date */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[8px] font-bold text-zinc-600">
                        {lead.assignedTo?.name?.[0]?.toUpperCase() || '—'}
                      </div>
                      <span className="truncate max-w-[120px]">{lead.assignedTo?.name || 'Unassigned'}</span>
                    </div>
                    <span>{formatDate(lead.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile Pagination */}
        {(totalPages > 1 || onPageChange) && (
          <div className="flex items-center justify-between p-3 border-t border-zinc-100 bg-zinc-50/50">
            <span className="text-xs text-zinc-500">
              Page {page} of {totalPages || 1} ({total || leads.length} leads)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onPageChange?.(page - 1)}
                disabled={!hasPrevPage && page <= 1}
                className="px-2.5 py-1 text-xs border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange?.(page + 1)}
                disabled={!hasNextPage && page >= totalPages}
                className="px-2.5 py-1 text-xs border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
