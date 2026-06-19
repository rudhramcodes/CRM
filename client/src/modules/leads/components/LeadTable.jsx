import DataTable from '../../../components/tables/DataTable';
import LeadStatusBadge from './LeadStatusBadge';
import { formatDate } from '../../../utils/formatters';
import { Edit2, Trash2 } from 'lucide-react';

export default function LeadTable({ leads, loading, error, onRowClick, searchable, canEdit, canDelete, onEdit, onDelete }) {
  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-primary-900 font-medium text-xs">
              {row.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-medium text-primary-900">{row.name}</p>
            {row.company && (
              <p className="text-xs text-zinc-400">{row.company}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Email',
      accessor: 'email',
    },
    {
      header: 'Source',
      accessor: 'source',
      cell: ({ value }) => (
        <span className="text-xs capitalize text-zinc-500">
          {value?.replace(/_/g, ' ') || 'Other'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: ({ value }) => <LeadStatusBadge status={value} />,
    },
    {
      header: 'Assigned To',
      accessor: 'assignedTo',
      cell: ({ value }) => (
        <span className="text-sm text-zinc-500">
          {value?.name || 'Unassigned'}
        </span>
      ),
    },
    {
      header: 'Created',
      accessor: 'createdAt',
      cell: ({ value }) => (
        <span className="text-sm text-zinc-400">{formatDate(value)}</span>
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
                    className="p-1.5 rounded-md text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors"
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
                    className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
      emptyDescription="Get started by creating your first lead."
      onRowClick={onRowClick}
    />
  );
}
