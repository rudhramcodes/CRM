import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import {
  ArrowLeft,
  Edit2,
  MessageSquare,
  Send,
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  Globe,
  XCircle,
  ExternalLink,
  CheckCircle2,
  Clock,
  MessageCircle,
  ChevronDown,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  useGetLeadByIdQuery,
  useUpdateLeadMutation,
  useAddLeadNoteMutation,
} from '../../../services/leadApi';
import LeadStatusBadge from '../components/LeadStatusBadge';
import LeadForm from '../components/LeadForm';
import LeadCommunityGroupModal from '../components/LeadCommunityGroupModal';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
import { DetailSkeleton } from '../../../components/ui/Skeleton';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../../../components/ui/Select';
import toast from 'react-hot-toast';
import { formatDate, formatDateTime, getTimeAgo } from '../../../utils/formatters';
import { LEAD_STATUS, LEAD_SOURCES, LEAD_BRANDS, BRAND_METAS, BRAND_COMMUNITY_NAMES, VENTURE_CODES } from '../../../constants';
import { cn } from '../../../utils/cn';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReasonInput, setLostReasonInput] = useState('');
  const [noteText, setNoteText] = useState('');
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [isCallAction, setIsCallAction] = useState(false);
  const [pendingActionUrl, setPendingActionUrl] = useState(null);

  const { data: leadData, isLoading, error, refetch } = useGetLeadByIdQuery(id);
  const [updateLead, { isLoading: isUpdating }] = useUpdateLeadMutation();
  const [addNote, { isLoading: isAddingNote }] = useAddLeadNoteMutation();

  const lead = leadData?.data?.lead;

  useEffect(() => {
    if (lead) {
      dispatch(setPageTitle(lead.name));
    }
  }, [lead, dispatch]);

  const executeStatusChange = async (newStatus) => {
    try {
      await updateLead({ id, status: newStatus }).unwrap();
      if (newStatus === 'won') {
        toast.success('Lead converted to client successfully!');
        navigate('/clients');
      } else {
        toast.success(`Stage updated to ${newStatus.replace('_', ' ')}`);
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update status');
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'lost') {
      if (lead?.status === 'new') {
        toast.error('Lead must be contacted before it can be marked as lost.');
        return;
      }
      setShowLostModal(true);
      return;
    }
    // Intercept if changing status from new or changing to contacted
    if ((lead?.status === 'new' && newStatus !== 'new') || newStatus === 'contacted') {
      setPendingStatus(newStatus);
      setIsCallAction(false);
      setShowCommunityModal(true);
      return;
    }
    await executeStatusChange(newStatus);
  };

  const confirmCommunityProceed = async () => {
    setShowCommunityModal(false);
    if (isCallAction) {
      if (pendingActionUrl) {
        window.open(pendingActionUrl, '_blank');
      } else if (lead?.phone) {
        window.location.href = `tel:${lead.phone}`;
      }
      setIsCallAction(false);
      setPendingActionUrl(null);
      return;
    }
    if (pendingStatus) {
      const statusToSet = pendingStatus;
      setPendingStatus(null);
      await executeStatusChange(statusToSet);
    }
  };

  const handleCallAttempt = (e, url = null) => {
    if (lead?.status === 'new') {
      e?.preventDefault();
      setIsCallAction(true);
      setPendingActionUrl(url);
      setShowCommunityModal(true);
    }
  };

  const confirmLostReason = async () => {
    if (!lostReasonInput.trim()) {
      toast.error('Please specify a lost reason');
      return;
    }
    try {
      await updateLead({ id, status: 'lost', lostReason: lostReasonInput.trim() }).unwrap();
      setShowLostModal(false);
      setLostReasonInput('');
      toast.success('Lead marked as lost');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update lead status');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await addNote({ id, text: noteText.trim() }).unwrap();
      toast.success('Note added to timeline');
      setNoteText('');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to add note');
    }
  };

  const sourceLabel = LEAD_SOURCES.find((s) => s.value === lead?.source)?.label || lead?.source || 'Other';
  const brandMeta = lead?.brand ? BRAND_METAS[lead.brand] : null;
  const brandObj = LEAD_BRANDS.find((b) => b.value === lead?.brand);
  const canManage = user && ['super_admin', 'admin', 'manager', 'employee'].includes(user.role);

  // Clean phone number for whatsapp link
  const rawPhone = lead?.phone?.replace(/[^\d]/g, '') || '';
  const waLink = rawPhone ? `https://wa.me/${rawPhone.length === 10 ? `91${rawPhone}` : rawPhone}` : null;

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <EmptyState
          title="Lead not found"
          description={error?.data?.message || 'This lead does not exist or has been removed.'}
          action={
            <Button variant="secondary" onClick={() => navigate('/leads')}>
              Back to Leads
            </Button>
          }
        />
      </div>
    );
  }

  const initials = lead.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'LE';

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl pb-16">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/leads')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-500 hover:text-primary-900 transition-colors w-fit group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Leads Pipeline</span>
        </button>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          {/* Quick Stage Selector Dropdown */}
          {canManage && (
            <div className="col-span-1 sm:w-auto">
              <Select value={lead.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-9 w-full sm:w-auto gap-2 text-xs font-semibold rounded-xl bg-white border-zinc-200/90 shadow-2xs justify-between">
                  <LeadStatusBadge status={lead.status} />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                  {LEAD_STATUS.map((s) => {
                    const isLostDisabled = s.value === 'lost' && lead.status === 'new';
                    return (
                      <SelectItem
                        key={s.value}
                        value={s.value}
                        disabled={isLostDisabled}
                      >
                        <span className="flex items-center justify-between gap-2 w-full">
                          <span>{s.label}</span>
                          {isLostDisabled && (
                            <span className="text-[10px] text-zinc-400 font-normal">(Contact first)</span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditModal(true)}
              className="col-span-1 sm:w-auto rounded-xl border-zinc-200/90 text-xs font-semibold shadow-2xs h-9 justify-center"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1 text-zinc-500" />
              Edit
            </Button>
          )}

          {canManage && lead.status !== 'won' && (
            <Button
              size="sm"
              onClick={() => handleStatusChange('won')}
              className="col-span-2 sm:col-span-1 sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs h-9 justify-center"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Convert to Client
            </Button>
          )}
        </div>
      </div>

      {/* Hero Lead Banner Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-7 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary-900 text-white rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg shadow-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold text-primary-900 tracking-tight truncate">
                  {lead.name}
                </h1>
                <LeadStatusBadge status={lead.status} />
                {(lead.clientId || lead.convertedToClient?.clientId) && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 font-mono text-[11px] sm:text-xs font-semibold text-zinc-700 border border-zinc-200"
                    title={`Assigned Client ID: ${lead.clientId || lead.convertedToClient?.clientId}`}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        lead.convertedToClient?.status === 'active' || lead.status === 'won'
                          ? 'bg-emerald-500'
                          : 'bg-zinc-400',
                      )}
                    />
                    ID: {lead.clientId || lead.convertedToClient?.clientId}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 mt-1.5 text-[11px] sm:text-xs text-zinc-500 flex-wrap">
                {lead.company && (
                  <span className="flex items-center gap-1 font-medium text-zinc-700 truncate max-w-[150px] sm:max-w-none">
                    <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{lead.company}</span>
                  </span>
                )}
                {lead.company && <span className="text-zinc-300">&bull;</span>}
                <span className="capitalize">Source: {sourceLabel}</span>
                <span className="text-zinc-300">&bull;</span>
                <span className="shrink-0">Created {formatDate(lead.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Venture Logo Badge */}
          {brandMeta ? (
            <div className="flex items-center gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200/70 shrink-0 self-start sm:self-auto">
              {brandMeta.logo ? (
                <img
                  src={brandMeta.logo}
                  alt={brandMeta.name}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-contain p-0.5 bg-white border border-zinc-200/80 shadow-2xs"
                />
              ) : (
                <div
                  className={cn(
                    'w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-2xs bg-gradient-to-br',
                    brandMeta.gradient,
                  )}
                >
                  {brandMeta.name?.[0]}
                </div>
              )}
              <div>
                <p className="text-[9px] uppercase font-bold tracking-wider text-zinc-400">Venture</p>
                <p className="text-xs font-semibold text-primary-900">{brandMeta.name}</p>
              </div>
            </div>
          ) : brandObj ? (
            <div className="px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-700 text-xs font-semibold border border-zinc-200/70 self-start sm:self-auto">
              {brandObj.label}
            </div>
          ) : null}
        </div>

        {/* Lost Reason Alert Box if status === 'lost' */}
        {lead.status === 'lost' && lead.lostReason && (
          <div className="mt-4 sm:mt-6 p-3.5 sm:p-4 rounded-xl bg-rose-50/80 border border-rose-200/80 flex items-start gap-3 text-rose-800">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Lost Reason</p>
              <p className="text-xs sm:text-sm mt-0.5 text-rose-900 font-medium">{lead.lostReason}</p>
            </div>
          </div>
        )}

        {/* SOP Notice for New Leads: Community Group Creation Required */}
        {lead.status === 'new' && (
          <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="leading-relaxed">
                <span>
                  Create WhatsApp group in{' '}
                  <strong className="font-semibold text-primary-900">
                    {lead.brand === 'panigrahna' ? 'Panigrahna by Rudhram Enterprises' : (BRAND_COMMUNITY_NAMES[lead.brand] || `${brandMeta?.name || 'Brand'} by Rudhram Enterprises`)}
                  </strong>{' '}
                  under Client ID{' '}
                  <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-200/90 text-primary-900 shadow-2xs">
                    {lead.clientId || lead.convertedToClient?.clientId || `RE-${VENTURE_CODES[lead.brand] || 'PG'}-${new Date().getFullYear()}-001`}
                  </code>{' '}
                  before calling.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCallAction(false);
                setShowCommunityModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-50 active:bg-zinc-100 border border-zinc-200/90 text-xs font-semibold text-zinc-700 shadow-2xs shrink-0 cursor-pointer self-start sm:self-auto transition"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        )}

        {/* Contact Quick Access Bar: 2x2 Grid on Mobile, 4-col on Desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-zinc-100">
          {/* Email */}
          <div className="p-3 rounded-xl bg-zinc-50/70 border border-zinc-100 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Email</span>
              <Mail className="w-3.5 h-3.5 shrink-0" />
            </div>
            <a
              href={`mailto:${lead.email}`}
              className="text-xs sm:text-sm font-semibold text-primary-900 hover:underline truncate block"
              title={lead.email}
            >
              {lead.email}
            </a>
          </div>

          {/* Phone */}
          <div className="p-3 rounded-xl bg-zinc-50/70 border border-zinc-100 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Phone</span>
              <Phone className="w-3.5 h-3.5 shrink-0" />
            </div>
            {lead.phone ? (
              <div className="flex items-center justify-between gap-1.5">
                <a
                  href={`tel:${lead.phone}`}
                  onClick={(e) => handleCallAttempt(e)}
                  className="text-xs sm:text-sm font-semibold text-primary-900 hover:underline truncate"
                  title={lead.phone}
                >
                  {lead.phone}
                </a>
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => handleCallAttempt(e, waLink)}
                    className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded-md hover:bg-emerald-50 transition-colors shrink-0"
                    title="Open WhatsApp Chat"
                  >
                    <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">Not provided</p>
            )}
          </div>

          {/* Assigned Rep */}
          <div className="p-3 rounded-xl bg-zinc-50/70 border border-zinc-100 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Assigned Rep</span>
              <User className="w-3.5 h-3.5 shrink-0" />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-primary-900 truncate">
              {lead.assignedTo?.name || 'Unassigned'}
            </p>
          </div>

          {/* Follow-up Date */}
          <div className="p-3 rounded-xl bg-zinc-50/70 border border-zinc-100 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Follow-up</span>
              <Calendar className="w-3.5 h-3.5 shrink-0" />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-primary-900 truncate">
              {lead.followUpDate ? formatDate(lead.followUpDate) : 'No date set'}
            </p>
          </div>
        </div>

        {/* Linked Client Record Banner */}
        {(lead.convertedToClient || lead.clientId) && (
          <div className="mt-4 sm:mt-5 p-3.5 sm:p-4 rounded-xl bg-zinc-50/80 border border-zinc-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1 w-full">
              <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-primary-900 font-bold text-xs shadow-2xs shrink-0 mt-0.5 sm:mt-0">
                CL
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-zinc-900 font-mono">
                    {lead.convertedToClient?.clientId || lead.clientId}
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-semibold rounded-full border',
                      (lead.convertedToClient?.status === 'active' || lead.status === 'won')
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-zinc-100 text-zinc-600 border-zinc-200',
                    )}
                  >
                    {(lead.convertedToClient?.status === 'active' || lead.status === 'won')
                      ? 'Active Client Account'
                      : 'Initial Inactive Client'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 font-medium mt-1 leading-snug break-words">
                  Linked Account:{' '}
                  <span className="text-zinc-800 font-semibold">
                    {lead.convertedToClient?.companyName || lead.company || lead.name}
                  </span>
                </p>
                {lead.convertedToClient?.status === 'inactive' && lead.status !== 'won' && (
                  <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug break-words">
                    Will activate automatically when converted to won
                  </p>
                )}
              </div>
            </div>
            {lead.convertedToClient?._id && (
              <Link
                to={`/clients/${lead.convertedToClient._id}`}
                className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white border border-zinc-200/90 text-xs font-semibold text-primary-900 hover:bg-zinc-50 shadow-2xs transition-colors shrink-0 active:scale-[0.98]"
              >
                <span>View Client Details</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Notes & Activity Timeline */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-900 text-white flex items-center justify-center shadow-2xs shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary-900 tracking-tight">Notes & Activity Feed</h3>
              <p className="text-[11px] text-zinc-400 hidden sm:block">Internal discussion, client interactions, and progress updates</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200/80 shrink-0">
            {lead.notes?.length || 0} notes
          </span>
        </div>

        {/* New Note Form */}
        {canManage && (
          <form onSubmit={handleAddNote} className="p-3 sm:p-5 border-b border-zinc-100 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Log a client note, call summary, or next action..."
                className="flex-1 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-zinc-50 border border-zinc-200/90 rounded-xl text-xs sm:text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900 transition-all shadow-2xs min-w-0"
              />
              <Button
                type="submit"
                disabled={!noteText.trim()}
                loading={isAddingNote}
                className="rounded-xl px-3.5 sm:px-5 text-xs font-semibold shadow-2xs shrink-0"
              >
                <Send className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Post</span>
              </Button>
            </div>
          </form>
        )}

        {/* Notes Stream */}
        <div className="divide-y divide-zinc-100">
          {!lead.notes || lead.notes.length === 0 ? (
            <div className="px-4 py-10 sm:px-6 sm:py-12 text-center">
              <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-600">No notes recorded yet</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Leave a note above to track follow-up progress or meeting feedback.
              </p>
            </div>
          ) : (
            [...lead.notes].reverse().map((note, idx) => {
              const authorInitials = note.createdBy?.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'U';

              return (
                <div key={note._id || idx} className="p-3.5 sm:p-5 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary-900 shrink-0 shadow-2xs">
                      {authorInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-semibold text-primary-900 truncate">
                          {note.createdBy?.name || 'Team Member'}
                        </p>
                        <span className="text-[10px] sm:text-[11px] text-zinc-400 flex items-center gap-1 font-normal shrink-0">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(note.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-normal whitespace-pre-wrap break-words">
                        {note.text}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Lead Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Lead Information"
        size="lg"
      >
        <LeadForm
          lead={lead}
          onSuccess={() => {
            setShowEditModal(false);
            refetch();
          }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      {/* Mark as Lost Reason Modal */}
      <Modal
        open={showLostModal}
        onClose={() => setShowLostModal(false)}
        title="Mark Lead as Lost"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50/80 border border-rose-200/80 text-rose-800">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <p className="text-xs sm:text-sm">
              Please specify the reason for losing this opportunity to help improve future conversion.
            </p>
          </div>
          <textarea
            value={lostReasonInput}
            onChange={(e) => setLostReasonInput(e.target.value)}
            placeholder="e.g. Budget mismatch, chose competitor, postponed..."
            className="w-full px-3.5 py-2.5 border border-zinc-200/90 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900 resize-none shadow-2xs"
            rows={3}
            maxLength={500}
            autoFocus
          />
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowLostModal(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmLostReason}
              className="rounded-xl text-xs"
            >
              Confirm Lost
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lead Community Group SOP Modal */}
      <LeadCommunityGroupModal
        open={showCommunityModal}
        onClose={() => {
          setShowCommunityModal(false);
          setPendingStatus(null);
          setIsCallAction(false);
          setPendingActionUrl(null);
        }}
        onConfirm={confirmCommunityProceed}
        lead={lead}
        targetStatus={pendingStatus || 'contacted'}
        isCallAction={isCallAction}
        loading={isUpdating}
      />
    </div>
  );
}
