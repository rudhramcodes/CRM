import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { Plus, UserCheck, Sparkles, Building2 } from 'lucide-react';
import RefreshCwIcon from '../../../components/ui/RefreshCwIcon';
import {
  useGetClientsQuery,
  useGetClientStatsQuery,
  useUpdateClientMutation,
  useDeleteClientMutation,
} from '../../../services/clientApi';
import ClientTable from '../components/ClientTable';
import ClientFilters from '../components/ClientFilters';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import { StatCardSkeleton, TableSkeleton } from '../../../components/ui/Skeleton';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { LEAD_BRANDS, BRAND_METAS } from '../../../constants';
import { cn } from '../../../utils/cn';
import toast from 'react-hot-toast';

export default function ClientList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [queryParams, setQueryParams] = useState({ page: 1, limit: 10, status: 'active' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeBrand, setActiveBrand] = useState('');

  useEffect(() => {
    dispatch(setPageTitle('Clients'));
  }, [dispatch]);

  const {
    data: clientsData,
    isLoading,
    error,
    refetch: refetchClients,
    isFetching: isFetchingClients,
  } = useGetClientsQuery(queryParams);

  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useGetClientStatsQuery();

  const [updateClient] = useUpdateClientMutation();
  const [deleteClient] = useDeleteClientMutation();

  const clients = clientsData?.data || [];
  const pagination = clientsData?.pagination;
  const stats = statsData?.data || statsData || {};

  const handleBrandChange = useCallback((brand) => {
    setActiveBrand(brand);
    setQueryParams((prev) => {
      const next = { ...prev, page: 1, status: 'active' };
      if (brand) next.brand = brand;
      else delete next.brand;
      return next;
    });
  }, []);

  const handleFilterChange = useCallback((filters) => {
    setQueryParams((prev) => {
      const next = { ...prev, page: 1, status: 'active' };
      if (filters.search) next.search = filters.search;
      else delete next.search;
      return next;
    });
  }, []);

  const canCreate = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canEdit = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);

  const handleEdit = useCallback(
    (row) => {
      navigate(`/clients/${row._id}`);
    },
    [navigate]
  );

  const handleStatusChange = useCallback(
    async (clientId, status) => {
      try {
        await updateClient({ id: clientId, status }).unwrap();
        toast.success(`Client marked as ${status}`);
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to update status');
      }
    },
    [updateClient]
  );

  const handleDelete = useCallback((row) => setDeleteTarget(row), []);

  const handlePageChange = useCallback((newPage) => {
    setQueryParams((prev) => ({ ...prev, page: newPage }));
  }, []);

  const handlePageSizeChange = useCallback((newLimit) => {
    setQueryParams((prev) => ({ ...prev, page: 1, limit: newLimit }));
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteClient(deleteTarget._id).unwrap();
      toast.success('Client deleted successfully');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete client');
    }
  }, [deleteTarget, deleteClient]);

  // Derived KPI metrics
  // Derived KPI metrics
  const totalCount = stats.total || 0;
  const activeCount = stats.active || totalCount || 0;
  const activePercent = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100;
  const activeVenturesCount = Object.keys(stats.byBrand || {}).length;

  const kpis = [
    {
      title: 'Active Clients',
      value: activeCount,
      desc: 'Verified active corporate & individual accounts',
      icon: UserCheck,
      iconColor: 'text-emerald-600 bg-emerald-50',
    },
    {
      title: 'Client Retention',
      value: `${activePercent}%`,
      desc: 'Active accounts conversion ratio',
      icon: Building2,
      iconColor: 'text-zinc-700 bg-zinc-100',
    },
    {
      title: 'Active Ventures',
      value: activeVenturesCount,
      desc: 'Brands with active clients',
      icon: Sparkles,
      iconColor: 'text-indigo-600 bg-indigo-50',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary-900 tracking-tight">
            Client Directory
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Manage corporate client accounts, billing profiles, and portal credentials
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Refresh Action */}
          <button
            onClick={() => {
              refetchClients();
              refetchStats();
            }}
            disabled={isFetchingClients}
            className="p-2 rounded-xl text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors disabled:opacity-50 border border-zinc-200/80 bg-white shadow-2xs cursor-pointer active:scale-95"
            title="Refresh client data"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isFetchingClients ? 'animate-spin' : ''}`} />
          </button>

          {/* Add Client CTA */}
          {canCreate && (
            <Button
              onClick={() => navigate('/clients/new')}
              className="rounded-xl text-xs font-semibold shadow-md shadow-primary-900/10 px-3 py-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Add Client</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            const isFeaturedLast = idx === 2;
            return (
              <div
                key={idx}
                className={cn(
                  'bg-white rounded-2xl border border-zinc-200/80 p-3.5 sm:p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-zinc-300/80 transition-all duration-200 flex flex-col justify-between',
                  isFeaturedLast && 'col-span-2 sm:col-span-1'
                )}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    {kpi.title}
                  </span>
                  <div
                    className={cn(
                      'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs',
                      kpi.iconColor
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                </div>
                <div className={cn(isFeaturedLast ? 'flex sm:block items-baseline justify-between sm:justify-start gap-2' : '')}>
                  <p className="text-xl sm:text-2xl font-bold text-primary-900 tracking-tight">
                    {kpi.value}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 truncate font-normal">
                    {kpi.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Venture Brand Switcher Tab Bar */}
      <div className="-mx-2 px-2 sm:mx-0 sm:px-0 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]">
        <button
          onClick={() => handleBrandChange('')}
          className={cn(
            'flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs border',
            !activeBrand
              ? 'bg-primary-900 text-white border-primary-900 shadow-sm'
              : 'bg-white text-zinc-600 hover:text-primary-900 hover:bg-zinc-50 border-zinc-200/80'
          )}
        >
          <span>All Ventures</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px]',
              !activeBrand ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'
            )}
          >
            {activeCount}
          </span>
        </button>

        {LEAD_BRANDS.map((b) => {
          const count = stats.byBrand?.[b.value] || 0;
          const meta = BRAND_METAS[b.value];
          const isSelected = activeBrand === b.value;

          return (
            <button
              key={b.value}
              onClick={() => handleBrandChange(b.value)}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs border',
                isSelected
                  ? 'bg-primary-900 text-white border-primary-900 shadow-sm'
                  : 'bg-white text-zinc-600 hover:text-primary-900 hover:bg-zinc-50 border-zinc-200/80'
              )}
            >
              {meta?.logo ? (
                <img
                  src={meta.logo}
                  alt={b.label}
                  className="w-4 h-4 rounded-sm object-contain shrink-0"
                />
              ) : (
                <div
                  className={cn(
                    'w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[8px] font-bold text-white shrink-0 bg-gradient-to-br',
                    meta?.gradient || 'from-zinc-600 to-zinc-800'
                  )}
                >
                  {meta?.initial || b.label?.[0]}
                </div>
              )}
              <span>{b.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px]',
                  isSelected ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <ClientFilters onFilterChange={handleFilterChange} />

      {/* Table Section */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-2xs">
          <TableSkeleton rows={5} />
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-12 text-center shadow-2xs">
          <EmptyState
            icon={UserCheck}
            title="Failed to load clients"
            description={error?.data?.message || 'Something went wrong. Please try again.'}
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)]">
          <ClientTable
            clients={clients}
            loading={false}
            error={null}
            onRowClick={(row) => navigate(`/clients/${row._id}`)}
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            serverPagination
            page={pagination?.page || 1}
            pageSize={pagination?.limit || 10}
            total={pagination?.total}
            totalPages={pagination?.pages}
            hasNextPage={pagination?.hasNextPage}
            hasPrevPage={pagination?.hasPrevPage}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Client Profile?"
        message={
          deleteTarget
            ? `Are you sure you want to delete client "${deleteTarget.companyName}"? This action cannot be undone.`
            : ''
        }
      />
    </div>
  );
}

