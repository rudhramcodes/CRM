import DataTable from '../../../components/tables/DataTable';
import TaskStatusBadge from './TaskStatusBadge';
import TaskPriorityBadge from './TaskPriorityBadge';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../../../components/ui/Select';
import { formatDate } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import { Edit2, Trash2 } from 'lucide-react';

const TASK_STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

export default function TaskTable({ tasks, loading, error, onRowClick, canEdit, canDelete, onEdit, onDelete, onStatusChange,
  serverPagination, page, pageSize, total, totalPages, hasNextPage, hasPrevPage, onPageChange, onPageSizeChange }) {
  const columns = [
    {
      header: 'Title',
      accessor: 'title',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary-900/30 shrink-0" />
          <div>
            <p className="font-medium text-primary-900 text-sm">{row.title}</p>
            {row.project?.name && (
              <p className="text-xs text-zinc-400">{row.project.name}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: ({ row }) =>
        canEdit && onStatusChange ? (
          <div onClick={(e) => e.stopPropagation()}>
            <Select value={row.status} onValueChange={(val) => onStatusChange(row._id, val)}>
              <SelectTrigger
                className={cn(
                  'w-auto gap-1 border-0 bg-transparent p-0 shadow-none',
                  'hover:bg-transparent focus:ring-0',
                  '[&>svg]:text-zinc-400 [&>svg]:w-3 [&>svg]:h-3',
                )}
              >
                <TaskStatusBadge status={row.status} />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <TaskStatusBadge status={row.status} />
        ),
    },
    {
      header: 'Priority',
      accessor: 'priority',
      cell: ({ value }) => <TaskPriorityBadge priority={value} />,
    },
    {
      header: 'Assignee',
      accessor: 'assignedTo',
      cell: ({ value }) => (
        <span className="text-sm text-zinc-500">{value?.name || 'Unassigned'}</span>
      ),
    },
    {
      header: 'Due Date',
      accessor: 'dueDate',
      cell: ({ value }) => (
        <span className="text-sm text-zinc-400">{value ? formatDate(value) : '—'}</span>
      ),
    },
    ...(canEdit || canDelete
      ? [{
          header: 'Actions',
          accessor: '_id',
          sortable: false,
          cell: ({ row }) => (
            <div className="flex items-center gap-1">
              {canEdit && (
                <button onClick={(e) => { e.stopPropagation(); onEdit?.(row); }}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors" title="Edit task">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {canDelete && (
                <button onClick={(e) => { e.stopPropagation(); onDelete?.(row); }}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete task">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ),
        }]
      : []),
  ];

  return (
    <DataTable
      columns={columns}
      data={tasks}
      loading={loading}
      error={error}
      searchable={false}
      emptyTitle="No tasks found"
      emptyDescription="Create your first task to get started."
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
