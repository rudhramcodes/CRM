import DataTable from '../../../components/tables/DataTable';
import ClientStatusBadge from './ClientStatusBadge';
import { formatDate } from '../../../utils/formatters';
import { BRANDS, BRAND_METAS } from '../../../constants';
import { cn } from '../../../utils/cn';
import {
  Edit2,
  Trash2,
  Mail,
  Phone,
  MessageSquare,
  MessageCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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
    <>
      {/* Desktop / Tablet: Full Data Table (>= md) */}
      <div className="hidden md:block">
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
      </div>

      {/* Mobile: Clean Touch Cards View (< md) */}
      <div className="md:hidden divide-y divide-zinc-100">
        {clients.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-primary-900">No clients found</p>
            <p className="text-xs text-zinc-400 mt-1">Get started by creating your first client account.</p>
          </div>
        ) : (
          <div className="p-3 space-y-2.5">
            {clients.map((client) => {
              const initials =
                client.companyName
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'CL';
              const meta = BRAND_METAS[client.brand];
              const brandLabel = BRAND_LABELS[client.brand] || client.brand;
              const cleanPhone = client.phone ? client.phone.replace(/[^\d+]/g, '') : null;
              const rawPhone = client.phone ? client.phone.replace(/[^\d]/g, '') : '';
              const waLink = rawPhone
                ? `https://wa.me/${rawPhone.length === 10 ? `91${rawPhone}` : rawPhone}`
                : null;

              return (
                <div
                  key={client._id}
                  onClick={() => onRowClick?.(client)}
                  className="bg-white rounded-2xl border border-zinc-200/90 p-3.5 shadow-2xs hover:border-zinc-300 transition-all cursor-pointer active:scale-[0.99] space-y-3"
                >
                  {/* Top Row: Company Info & Status */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center font-bold text-xs text-primary-900 shrink-0 shadow-2xs">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-primary-900 truncate">
                          {client.companyName}
                        </h4>
                        <p className="text-[11px] text-zinc-500 truncate font-normal">
                          {client.contactPerson || 'No contact person'}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <ClientStatusBadge status={client.status} />
                    </div>
                  </div>

                  {/* Badges Ribbon: Client ID, Venture, GST */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {client.clientId && (
                      <span className="font-mono text-[10px] font-semibold text-zinc-600 bg-zinc-100/90 px-2 py-0.5 rounded-md border border-zinc-200/60">
                        {client.clientId}
                      </span>
                    )}

                    {meta ? (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-50 border border-zinc-200/70 text-[10px] font-semibold text-zinc-700">
                        {meta.logo ? (
                          <img
                            src={meta.logo}
                            alt={meta.label}
                            className="w-3.5 h-3.5 object-contain rounded-xs"
                          />
                        ) : (
                          <div
                            className={cn(
                              'w-3 h-3 rounded-xs flex items-center justify-center text-[7px] text-white bg-gradient-to-br',
                              meta.gradient
                            )}
                          >
                            {meta.initial || 'R'}
                          </div>
                        )}
                        <span>{meta.label || brandLabel}</span>
                      </div>
                    ) : client.brand ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[10px] font-medium border border-zinc-200/60">
                        {brandLabel}
                      </span>
                    ) : null}

                    {client.gstNumber && (
                      <span className="font-mono text-[10px] text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200/50">
                        GST: {client.gstNumber}
                      </span>
                    )}
                  </div>

                  {/* Actions & Tap-to-Communicate Strip */}
                  <div
                    className="flex items-center justify-between gap-2 pt-2.5 border-t border-zinc-100/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      {cleanPhone && (
                        <a
                          href={`tel:${cleanPhone}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200/80 text-[11px] font-semibold transition-colors shadow-2xs active:scale-95"
                          title="Call client"
                        >
                          <Phone className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Call</span>
                        </a>
                      )}

                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-[11px] font-semibold transition-colors shadow-2xs active:scale-95"
                          title="WhatsApp client"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Chat</span>
                        </a>
                      )}

                      <a
                        href={`mailto:${client.email}`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200/80 text-[11px] font-semibold transition-colors shadow-2xs active:scale-95"
                        title="Email client"
                      >
                        <Mail className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Email</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit?.(client)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                          title="Edit client profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete?.(client)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete client profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile Pagination Bar */}
        {serverPagination && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-50/90 border-t border-zinc-100">
            <p className="text-xs text-zinc-500 font-medium">
              Page <span className="font-semibold text-primary-900">{page}</span> of{' '}
              <span className="font-semibold text-primary-900">{totalPages}</span>
              {total ? ` (${total} total)` : ''}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onPageChange?.(page - 1)}
                disabled={!hasPrevPage}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-zinc-200 text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                onClick={() => onPageChange?.(page + 1)}
                disabled={!hasNextPage}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-zinc-200 text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

