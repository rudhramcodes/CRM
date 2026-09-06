import { getCurrentRate, formatRateSummary } from '../rateCardUtils';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Archive, BriefcaseBusiness, MapPin, Plus, RefreshCw, Search, Users, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { setPageTitle } from '../../../app/store/uiSlice';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { useArchiveFreelancerMutation, useGetFreelancerStatsQuery, useGetFreelancersQuery } from '../../../services/freelancerApi';
import { BRANDS } from '../../../constants';

const ventureLabels = Object.fromEntries(BRANDS.map((brand) => [brand.value, brand.label]));
const statusTone = { active: 'success', inactive: 'warning', archived: 'default' };

export default function FreelancerList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [filters, setFilters] = useState({ page: 1, limit: 10, search: '', venture: '', status: 'active' });
  const queryFilters = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
  const [archiveTarget, setArchiveTarget] = useState(null);
  const { data, isLoading, isFetching, error, refetch } = useGetFreelancersQuery(queryFilters);
  const { data: statsData, isLoading: statsLoading } = useGetFreelancerStatsQuery();
  const [archiveFreelancer, { isLoading: isArchiving }] = useArchiveFreelancerMutation();
  const freelancers = data?.data || [];
  const pagination = data?.pagination || {};
  const stats = statsData?.data || {};
  const canManage = ['super_admin', 'admin', 'manager'].includes(user?.role);

  useEffect(() => { dispatch(setPageTitle('Freelancers')); }, [dispatch]);

  const updateFilter = (key, value) => setFilters((previous) => ({ ...previous, [key]: value, page: 1 }));
  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveFreelancer(archiveTarget._id).unwrap();
      toast.success('Freelancer archived');
      setArchiveTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Unable to archive freelancer');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600"><BriefcaseBusiness className="h-3.5 w-3.5" /> Crew directory</div>
          <h1 className="font-heading text-2xl font-semibold text-primary-900">Freelancers</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">Find and manage the creative and operations crew behind every venture.</p>
        </div>
        {canManage && <Button onClick={() => navigate('/freelancers/new')}><Plus className="h-4 w-4" /> Add Freelancer</Button>}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Active freelancers" value={statsLoading ? '—' : stats.active || 0} icon={Users} tone="text-indigo-700" />
        <SummaryCard label="Across ventures" value={statsLoading ? '—' : Object.keys(stats.byVenture || {}).length} icon={BriefcaseBusiness} tone="text-violet-700" />
        <SummaryCard label="Inactive" value={statsLoading ? '—' : stats.inactive || 0} icon={UserRound} tone="text-amber-700" />
        <SummaryCard label="Archived" value={statsLoading ? '—' : stats.archived || 0} icon={Archive} tone="text-zinc-600" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-[#fcfcfb] p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search by name, phone, city, service or code" className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />{filters.search && <button type="button" aria-label="Clear search" onClick={() => updateFilter('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"><X className="h-4 w-4" /></button>}</div>
            <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 outline-none focus:border-indigo-400"><option value="active">Active only</option><option value="inactive">Inactive only</option><option value="">All current</option><option value="archived">Archived</option></select>
            <button type="button" onClick={() => refetch()} disabled={isFetching} className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2.5 text-zinc-500 hover:bg-zinc-50 disabled:opacity-50" title="Refresh freelancers"><RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /></button>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{[{ value: '', label: 'All ventures' }, ...BRANDS].map((brand) => <button type="button" key={brand.value} onClick={() => updateFilter('venture', brand.value)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${filters.venture === brand.value ? 'border-primary-900 bg-primary-900 text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'}`}>{brand.label}</button>)}</div>
        </div>

        {isLoading ? <DirectorySkeleton /> : error ? <div className="p-12"><EmptyState icon={Users} title="Unable to load freelancers" description={error?.data?.message || 'Please try again.'} /></div> : freelancers.length === 0 ? <div className="p-12"><EmptyState icon={Users} title="No freelancers yet" description="Build your crew directory by adding your first photographer, event manager, or production specialist." action={canManage ? <Button onClick={() => navigate('/freelancers/new')}><Plus className="h-4 w-4" /> Add your first freelancer</Button> : null} /></div> : <>
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-zinc-100 bg-zinc-50/70 text-[11px] uppercase tracking-wider text-zinc-400"><tr><th className="px-5 py-3 font-semibold">Freelancer</th><th className="px-4 py-3 font-semibold">Venture & services</th><th className="px-4 py-3 font-semibold">Location</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-5 py-3 text-right font-semibold">Action</th></tr></thead><tbody className="divide-y divide-zinc-100">{freelancers.map((freelancer) => <DirectoryRow key={freelancer._id} freelancer={freelancer} onOpen={() => navigate(`/freelancers/${freelancer._id}`)} onArchive={() => setArchiveTarget(freelancer)} canManage={canManage} />)}</tbody></table></div>
          <div className="grid gap-3 p-3 md:hidden">{freelancers.map((freelancer) => <DirectoryCard key={freelancer._id} freelancer={freelancer} onOpen={() => navigate(`/freelancers/${freelancer._id}`)} onArchive={() => setArchiveTarget(freelancer)} canManage={canManage} />)}</div>
          <div className="flex flex-col gap-2 border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between"><span>Showing {freelancers.length} of {pagination.total || freelancers.length} freelancers</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={!pagination.hasPrevPage} onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}>Previous</Button><Button variant="secondary" size="sm" disabled={!pagination.hasNextPage} onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}>Next</Button></div></div>
        </>}
      </section>

      <ConfirmDialog open={Boolean(archiveTarget)} onClose={() => setArchiveTarget(null)} onConfirm={confirmArchive} confirmLabel={isArchiving ? 'Archiving…' : 'Archive'} loading={isArchiving} title="Archive freelancer?" message={archiveTarget ? `Archive ${archiveTarget.displayName || archiveTarget.fullName}? Their history will be preserved.` : ''} />
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, tone }) { return <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-50 ${tone}`}><Icon className="h-4 w-4" /></span><span className="text-2xl font-semibold text-primary-900">{value}</span></div><p className="mt-3 text-xs font-medium text-zinc-500">{label}</p></div>; }
function ventureNames(freelancer) { return (freelancer.ventureProfiles || []).map((profile) => ventureLabels[profile.venture] || profile.venture); }
function services(freelancer) { return (freelancer.ventureProfiles || []).flatMap((profile) => profile.serviceCategories || []).slice(0, 3); }
function currentRate(freelancer) { return getCurrentRate((freelancer.ventureProfiles || []).flatMap((profile) => profile.rateCards || [])); }
function rateSummary(freelancer) { return formatRateSummary(currentRate(freelancer)); }
function DirectoryRow({ freelancer, onOpen, onArchive, canManage }) { return <tr className="group hover:bg-zinc-50/70"><td className="px-5 py-4"><button type="button" onClick={onOpen} className="flex items-center gap-3 text-left"><Avatar freelancer={freelancer} /><span><span className="block font-medium text-zinc-800 group-hover:text-indigo-700">{freelancer.displayName || freelancer.fullName}</span><span className="mt-0.5 block text-xs text-zinc-400">{freelancer.freelancerCode} · {freelancer.phone}</span></span></button></td><td className="px-4 py-4"><div className="flex flex-wrap gap-1.5">{ventureNames(freelancer).map((name) => <Badge key={name} variant="info" size="sm">{name}</Badge>)}</div><p className="mt-1.5 text-xs capitalize text-zinc-500">{services(freelancer).join(' · ') || 'Services not added'}</p>{rateSummary(freelancer) && <p className="mt-1 text-[11px] font-semibold text-emerald-700">{rateSummary(freelancer)}</p>}</td><td className="px-4 py-4"><span className="flex items-center gap-1.5 text-sm text-zinc-600"><MapPin className="h-3.5 w-3.5 text-zinc-400" />{freelancer.city || 'Location not added'}</span></td><td className="px-4 py-4"><Badge variant={statusTone[freelancer.status] || 'default'}>{freelancer.status}</Badge></td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><Button variant="secondary" size="sm" onClick={onOpen}>View</Button>{canManage && freelancer.status !== 'archived' && <button type="button" onClick={onArchive} className="rounded-lg p-2 text-zinc-400 hover:bg-rose-50 hover:text-rose-600" title="Archive"><Archive className="h-4 w-4" /></button>}</div></td></tr>; }
function DirectoryCard({ freelancer, onOpen, onArchive, canManage }) { return <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"><button type="button" onClick={onOpen} className="flex w-full items-start gap-3 text-left"><Avatar freelancer={freelancer} /><span className="min-w-0 flex-1"><span className="block truncate font-medium text-zinc-800">{freelancer.displayName || freelancer.fullName}</span><span className="mt-0.5 block text-xs text-zinc-400">{freelancer.freelancerCode} · {freelancer.phone}</span></span><Badge variant={statusTone[freelancer.status] || 'default'}>{freelancer.status}</Badge></button><div className="mt-4 flex flex-wrap gap-1.5">{ventureNames(freelancer).map((name) => <Badge key={name} variant="info" size="sm">{name}</Badge>)}</div><p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500"><MapPin className="h-3.5 w-3.5" />{freelancer.city || 'Location not added'}</p><div className="mt-4 flex gap-2"><Button size="sm" onClick={onOpen}>Open profile</Button>{canManage && freelancer.status !== 'archived' && <Button variant="secondary" size="sm" onClick={onArchive}><Archive className="h-3.5 w-3.5" /> Archive</Button>}</div></div>; }
function Avatar({ freelancer }) { return freelancer.profilePhoto ? <img src={freelancer.profilePhoto} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-semibold text-indigo-700">{(freelancer.displayName || freelancer.fullName || 'F')[0].toUpperCase()}</div>; }
function DirectorySkeleton() { return <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-lg bg-zinc-100" />)}</div>; }
