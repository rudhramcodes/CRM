import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  CalendarClock,
  Plus,
  Receipt,
  Sparkles,
  Video,
  ChevronRight,
  ShieldCheck,
  Calendar,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import ClientCard from '../components/ClientCard';
import CredOdometer from '../components/CredOdometer';
import { useGetClientMeQuery } from '../../../services/clientApi';
import { useGetProjectsQuery } from '../../../services/projectApi';
import { useGetMeetingsQuery } from '../../../services/meetingApi';
import { useGetInvoicesQuery } from '../../../services/invoiceApi';
import { formatCurrency, formatDate } from '../../../utils/formatters';

const STATUS_CONFIG = {
  planning: { label: 'Discovery', color: 'text-sky-700 bg-sky-50 border-sky-200' },
  active: { label: 'In Progress', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  review: { label: 'Review Stage', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  completed: { label: 'Completed', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  on_hold: { label: 'On Hold', color: 'text-zinc-600 bg-zinc-100 border-zinc-200' },
  cancelled: { label: 'Cancelled', color: 'text-rose-700 bg-rose-50 border-rose-200' },
};

export default function ClientDashboard() {
  const { data: me, isLoading: meLoading } = useGetClientMeQuery();
  const { data: projectsData, isLoading: projectsLoading } = useGetProjectsQuery({ limit: 4 });
  const { data: meetingsData, isLoading: meetingsLoading } = useGetMeetingsQuery({ limit: 4 });
  const { data: invoicesData, isLoading: invoicesLoading } = useGetInvoicesQuery({ limit: 3 });

  const client = me?.data?.client;
  const user = me?.data?.user;
  const stats = me?.data?.stats || { projectsByStatus: [], totalProjects: 0, upcomingMeetings: 0 };
  const projects = projectsData?.data?.projects || projectsData?.projects || projectsData?.data || [];
  const meetings = meetingsData?.data?.meetings || meetingsData?.meetings || meetingsData?.data || [];
  const invoices = Array.isArray(invoicesData?.data)
    ? invoicesData.data
    : (invoicesData?.data?.invoices || invoicesData?.invoices || []);

  const nextMeeting = meetings.find((m) => new Date(m.date) >= new Date(new Date().setHours(0, 0, 0, 0))) || meetings[0];

  const totalOutstanding = invoices.reduce((sum, inv) => {
    if (inv.status === 'paid' || inv.status === 'cancelled') return sum;
    const invTotal = inv.total ?? inv.totalAmount ?? 0;
    const remaining = inv.balanceDue != null ? inv.balanceDue : (invTotal - (inv.paidAmount || 0));
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-medium tracking-wider text-emerald-700 uppercase">
              Client Portal &bull; Active Dashboard
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            Welcome, {client?.companyName || user?.name || 'Partner'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Track your ongoing projects, review deliverables, manage scheduled sessions, and check invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/portal/meetings/new">
            <Button className="bg-primary-900 hover:bg-primary-800 text-white font-medium shadow-xs border-0">
              <Plus className="w-4 h-4" /> Schedule Meeting
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Section: Client Card & Quick Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Client Card Column */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <ClientCard client={client} user={user} />
        </div>

        {/* Metric Tiles */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 sm:p-6 rounded-2xl border border-zinc-200/80 bg-white relative overflow-hidden group hover:border-zinc-300 transition-all shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium text-zinc-500">Total Projects</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FolderOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-3xl sm:text-4xl font-bold text-zinc-900 font-heading">
                {meLoading ? <Skeleton className="h-9 w-16 bg-zinc-200" /> : <CredOdometer value={stats.totalProjects} />}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Active briefs & productions</p>
            </div>
            <Link
              to="/portal/projects"
              className="text-xs font-semibold text-primary-900 flex items-center gap-1 hover:underline"
            >
              View projects <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="p-5 sm:p-6 rounded-2xl border border-zinc-200/80 bg-white relative overflow-hidden group hover:border-zinc-300 transition-all shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium text-zinc-500">Scheduled Meetings</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <CalendarClock className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-3xl sm:text-4xl font-bold text-zinc-900 font-heading">
                {meLoading ? <Skeleton className="h-9 w-16 bg-zinc-200" /> : <CredOdometer value={stats.upcomingMeetings} />}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Confirmed video sessions</p>
            </div>
            <Link
              to="/portal/meetings"
              className="text-xs font-semibold text-primary-900 flex items-center gap-1 hover:underline"
            >
              View calendar <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="p-5 sm:p-6 rounded-2xl border border-zinc-200/80 bg-white relative overflow-hidden group hover:border-zinc-300 transition-all shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium text-zinc-500">Outstanding Balance</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-bold text-zinc-900 font-heading">
                {invoicesLoading ? (
                  <Skeleton className="h-8 w-24 bg-zinc-200" />
                ) : (
                  <CredOdometer value={totalOutstanding} prefix="₹" />
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {totalOutstanding > 0 ? 'Pending invoice clearance' : 'All accounts settled'}
              </p>
            </div>
            <Link
              to="/portal/invoices"
              className="text-xs font-semibold text-primary-900 flex items-center gap-1 hover:underline"
            >
              View invoices <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="p-5 sm:p-6 rounded-2xl border border-zinc-200/80 bg-white relative overflow-hidden group hover:border-zinc-300 transition-all shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-medium text-zinc-500">Deliverables & QA</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-3xl sm:text-4xl font-bold text-zinc-900 font-heading">
                100<span className="text-xl text-primary-900">%</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Quality verification</p>
            </div>
            <Link
              to="/portal/guide"
              className="text-xs font-semibold text-primary-900 flex items-center gap-1 hover:underline"
            >
              Portal handbook <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Upcoming Meeting Hero (if any) */}
      {nextMeeting && (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-900 flex items-center justify-center shrink-0 border border-primary-100">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-900">
                  Upcoming Meeting
                </span>
                <span className="text-xs text-zinc-500 font-medium">
                  {formatDate(nextMeeting.date)} &bull; {nextMeeting.startTime} &ndash; {nextMeeting.endTime}
                </span>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 font-heading">
                {nextMeeting.title}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                {nextMeeting.description || 'Synchronized strategic review session with the Rudhram team.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {nextMeeting.meetingLink ? (
              <a
                href={nextMeeting.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-900 hover:bg-primary-800 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                <Video className="w-4 h-4" /> Join Meeting Room
              </a>
            ) : (
              <Link to={`/portal/meetings/${nextMeeting._id}`}>
                <Button variant="outline" className="border-zinc-300 text-zinc-700 hover:bg-zinc-50">
                  View Meeting Details
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Active Projects & Billing Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Active Projects */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">PORTFOLIO</span>
              <h2 className="text-lg font-bold text-zinc-900 font-heading">Active Projects</h2>
            </div>
            <Link to="/portal/projects" className="text-xs font-semibold text-primary-900 hover:underline flex items-center gap-1">
              View all ({projects.length}) <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {projectsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full bg-zinc-200 rounded-xl" />
              <Skeleton className="h-24 w-full bg-zinc-200 rounded-xl" />
            </div>
          ) : projects.length === 0 ? (
            <div className="p-8 rounded-2xl border border-zinc-200 bg-white text-center">
              <EmptyState
                title="No active projects assigned"
                description="When work commences, your dedicated timeline and deliverables will appear here."
              />
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const statusMeta = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
                const totalDeliverables = project.deliverables?.length || 0;
                const delivered = (project.deliverables || []).filter((d) => d.status === 'delivered').length;
                const pct = totalDeliverables > 0 ? Math.round((delivered / totalDeliverables) * 100) : 0;

                return (
                  <Link
                    key={project._id}
                    to={`/portal/projects/${project._id}`}
                    className="block group"
                  >
                    <div className="p-5 rounded-2xl border border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-xs transition-all duration-150">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-zinc-900 group-hover:text-primary-900 transition-colors truncate font-heading">
                            {project.name}
                          </h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Code: <span className="font-mono text-zinc-700 font-medium">{project.projectCode || '—'}</span> &bull;{' '}
                            Brand: <span className="capitalize">{project.brand || 'Rudhram'}</span>
                          </p>
                        </div>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>Deliverables Complete</span>
                          <span className="font-mono font-semibold text-zinc-800">
                            {delivered} / {totalDeliverables} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className="h-full bg-primary-900 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Invoices Snapshot & Support Concierge */}
        <div className="lg:col-span-5 space-y-6">
          {/* Invoices Snapshot */}
          <div className="p-6 rounded-2xl border border-zinc-200/80 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">FINANCES</span>
                <h3 className="text-base font-bold text-zinc-900 font-heading">Recent Invoices</h3>
              </div>
              <Link to="/portal/invoices" className="text-xs font-semibold text-primary-900 hover:underline">
                View Ledger
              </Link>
            </div>

            {invoicesLoading ? (
              <Skeleton className="h-20 w-full bg-zinc-200 rounded-xl" />
            ) : invoices.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">No invoices issued yet.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {invoices.slice(0, 3).map((inv) => (
                  <Link
                    key={inv._id}
                    to="/portal/invoices"
                    className="flex items-center justify-between py-3 hover:bg-zinc-50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="font-mono text-xs font-semibold text-zinc-900">{inv.invoiceNumber}</p>
                      <p className="text-[11px] text-zinc-500">{formatDate(inv.issueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xs text-zinc-900">{formatCurrency(inv.total ?? inv.totalAmount)}</p>
                      <span className="text-[10px] capitalize font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{inv.status?.replace('_', ' ')}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Account Assistance Card */}
          <div className="p-6 rounded-2xl border border-zinc-200/80 bg-white shadow-xs text-zinc-900 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-900 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold font-heading text-zinc-900">Dedicated Account Support</h4>
                <p className="text-xs text-zinc-500">Direct team access & project collaboration</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed pt-1">
              Have a question about a deliverable, need a revision, or want to review project milestones? Connect with our team anytime.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <Link to="/portal/meetings/new" className="flex-1">
                <Button size="sm" variant="secondary" className="w-full text-xs">
                  <Calendar className="w-3.5 h-3.5" /> Book Sync
                </Button>
              </Link>
              <Link to="/portal/projects" className="flex-1">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  <MessageSquare className="w-3.5 h-3.5" /> Project Chat
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}