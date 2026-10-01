import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  FileText,
  Save,
  X,
  Users,
  CheckCircle2,
  Circle,
  Plus,
  RefreshCcw,
  Building2,
  User,
  Video,
  Repeat,
} from 'lucide-react';
import {
  useGetMeetingByIdQuery,
  useUpdateMeetingMutation,
  useDeleteMeetingMutation,
  useUpdateMeetingNotesMutation,
  useAddActionItemMutation,
  useUpdateActionItemMutation,
  useRemoveActionItemMutation,
  useConvertActionItemMutation,
} from '../../../services/meetingApi';
import { useGetProjectsQuery } from '../../../services/projectApi';
import MeetingStatusBadge from '../components/MeetingStatusBadge';
import MeetingForm from '../components/MeetingForm';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import EmptyState from '../../../components/ui/EmptyState';
import { DetailSkeleton } from '../../../components/ui/Skeleton';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../../../components/ui/Select';
import { MEETING_STATUS, BRANDS, BRAND_METAS } from '../../../constants';
import { cn } from '../../../utils/cn';
import toast from 'react-hot-toast';
import { formatDate } from '../../../utils/formatters';

const BRAND_LABELS = BRANDS.reduce((acc, b) => {
  acc[b.value] = b.label;
  return acc;
}, {});

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [convertTargets, setConvertTargets] = useState({});
  const [busyItem, setBusyItem] = useState(null);

  const { data: meetingData, isLoading, error } = useGetMeetingByIdQuery(id);
  const [updateMeeting] = useUpdateMeetingMutation();
  const [deleteMeeting, { isLoading: isDeleting }] = useDeleteMeetingMutation();
  const [updateNotes, { isLoading: isSavingNotes }] = useUpdateMeetingNotesMutation();
  const [addActionItem, { isLoading: isAddingItem }] = useAddActionItemMutation();
  const [updateActionItem] = useUpdateActionItemMutation();
  const [removeActionItem] = useRemoveActionItemMutation();
  const [convertActionItem] = useConvertActionItemMutation();
  const { data: projectsData } = useGetProjectsQuery({ limit: 100 });

  const projects = projectsData?.data?.projects || projectsData?.data || [];
  const meeting = meetingData?.data?.meeting;

  useEffect(() => {
    if (meeting) {
      dispatch(setPageTitle(meeting.title));
      setNotesText(meeting.notes || '');
    }
  }, [meeting, dispatch]);

  const handleDelete = () => setShowDeleteConfirm(true);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateMeeting({ id, status: newStatus }).unwrap();
      toast.success(`Meeting status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update status');
    }
  };

  const confirmDelete = useCallback(async () => {
    try {
      await deleteMeeting({ id }).unwrap();
      toast.success('Meeting deleted successfully');
      navigate('/meetings');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to delete meeting');
    }
  }, [id, deleteMeeting, navigate]);

  const handleSaveNotes = async () => {
    try {
      await updateNotes({ id, notes: notesText }).unwrap();
      toast.success('Notes updated successfully');
      setEditingNotes(false);
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to update notes');
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    try {
      await addActionItem({ id, text: newItemText.trim() }).unwrap();
      setNewItemText('');
      toast.success('Action item added');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to add action item');
    }
  };

  const handleToggleItem = async (item) => {
    setBusyItem(item._id);
    try {
      await updateActionItem({
        id,
        itemId: item._id,
        status: item.status === 'done' ? 'pending' : 'done',
      }).unwrap();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to update action item');
    } finally {
      setBusyItem(null);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setBusyItem(itemId);
    try {
      await removeActionItem({ id, itemId }).unwrap();
      toast.success('Action item removed');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to remove action item');
    } finally {
      setBusyItem(null);
    }
  };

  const handleConvert = async (item) => {
    const projectId = convertTargets[item._id];
    if (!projectId) {
      toast.error('Select a project to convert to');
      return;
    }
    setBusyItem(item._id);
    try {
      await convertActionItem({ id, itemId: item._id, projectId }).unwrap();
      toast.success('Action item converted to task');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to convert to task');
    } finally {
      setBusyItem(null);
    }
  };

  const canManage = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);
  const canWriteNotes =
    user && ['super_admin', 'admin', 'manager', 'employee'].includes(user.role);

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !meeting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <EmptyState
          title="Meeting not found"
          description={error?.data?.message || 'This meeting does not exist or has been deleted.'}
          action={
            <Button variant="secondary" onClick={() => navigate('/meetings')}>
              Back to Meetings
            </Button>
          }
        />
      </div>
    );
  }

  const brandKey =
    meeting.brand ||
    meeting.client?.brand ||
    meeting.lead?.brand;
  const brandMeta = BRAND_METAS[brandKey];
  const brandLabel = BRAND_LABELS[brandKey] || brandKey;

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/meetings')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-500 hover:text-primary-900 transition-colors w-fit group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Meetings</span>
        </button>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Left Actions: Status Selector + Video Link */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Status Selector */}
            {canManage && (
              <Select value={meeting.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 sm:h-9 w-auto gap-1.5 text-xs font-semibold rounded-xl bg-white border-zinc-200/90 shadow-2xs">
                  <MeetingStatusBadge status={meeting.status} />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                  {MEETING_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Direct Video Launcher */}
            {meeting.meetingLink && (
              <a
                href={meeting.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-8 sm:h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                <Video className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Join Video Meeting</span>
                <span className="sm:hidden">Join</span>
                <ExternalLink className="w-3 h-3 opacity-75 hidden sm:inline" />
              </a>
            )}
          </div>

          {/* Right Actions: Edit & Delete (justified to end on mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0 shrink-0">
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
                className="rounded-xl border-zinc-200/90 text-xs font-semibold shadow-2xs h-8 sm:h-9 w-8 sm:w-auto p-0 sm:px-3"
                title="Edit Meeting"
                aria-label="Edit Meeting"
              >
                <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                <span className="hidden sm:inline sm:ml-1">Edit</span>
              </Button>
            )}

            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                loading={isDeleting}
                className="rounded-xl text-xs font-semibold shadow-2xs h-8 sm:h-9 w-8 sm:w-auto p-0 sm:px-3"
                title="Delete Meeting"
                aria-label="Delete Meeting"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline sm:ml-1">Delete</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Meeting Banner Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-7 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary-900 text-white rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg shadow-sm shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-primary-900 tracking-tight">
                  {meeting.title}
                </h1>
                <MeetingStatusBadge status={meeting.status} />
                {meeting.seriesId && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                    <Repeat className="w-3 h-3" />
                    Recurring Series
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 flex-wrap">
                <span className="flex items-center gap-1 text-zinc-700 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  {formatDate(meeting.date)}
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1 text-zinc-700 font-medium">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  {meeting.startTime} - {meeting.endTime}
                </span>
                {meeting.location && (
                  <>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1 text-zinc-600">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      {meeting.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Venture Badge */}
          {brandMeta ? (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200/70 shrink-0 self-start md:self-center">
              {brandMeta.logo ? (
                <img
                  src={brandMeta.logo}
                  alt={brandMeta.label}
                  className="w-7 h-7 object-contain rounded-md bg-white p-0.5 border border-zinc-200/80 shadow-2xs"
                />
              ) : (
                <div
                  className={cn(
                    'w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shadow-2xs bg-gradient-to-br',
                    brandMeta.gradient,
                  )}
                >
                  {brandMeta.initial || 'R'}
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Associated Venture
                </p>
                <p className="text-xs font-bold text-primary-900">{brandMeta.label}</p>
              </div>
            </div>
          ) : brandKey ? (
            <div className="px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs font-semibold text-zinc-700">
              {brandLabel}
            </div>
          ) : null}
        </div>

        {/* Quick Information & Relations Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-zinc-100">
          {/* Related Client */}
          {meeting.client ? (
            <button
              type="button"
              onClick={() => navigate(`/clients/${meeting.client._id || meeting.client}`)}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200/70 transition-all text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-500 group-hover:text-primary-900 shadow-2xs shrink-0">
                <Building2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Client Profile
                </p>
                <p className="text-xs font-bold text-primary-900 truncate group-hover:underline">
                  {meeting.client.companyName}
                </p>
              </div>
            </button>
          ) : meeting.lead ? (
            <button
              type="button"
              onClick={() => navigate(`/leads/${meeting.lead._id || meeting.lead}`)}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200/70 transition-all text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-500 group-hover:text-primary-900 shadow-2xs shrink-0">
                <User className="w-4 h-4 text-sky-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Lead Opportunity
                </p>
                <p className="text-xs font-bold text-primary-900 truncate group-hover:underline">
                  {meeting.lead.name}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 opacity-60">
              <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-400 shadow-2xs shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Related Entity
                </p>
                <p className="text-xs text-zinc-400">Internal Meeting</p>
              </div>
            </div>
          )}

          {/* Meeting Link Box */}
          {meeting.meetingLink ? (
            <a
              href={meeting.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200/70 transition-all group"
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Video Conference
                </p>
                <p className="text-xs font-medium text-indigo-600 truncate group-hover:underline">
                  {meeting.meetingLink}
                </p>
              </div>
            </a>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 opacity-60">
              <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-400 shadow-2xs shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Video Link
                </p>
                <p className="text-xs text-zinc-400">In-person session</p>
              </div>
            </div>
          )}

          {/* Attendees Count & Snapshot */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
            <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-500 shadow-2xs shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Participants
              </p>
              <p className="text-xs font-bold text-primary-900 truncate">
                {meeting.attendees?.length || 0} Member{meeting.attendees?.length !== 1 ? 's' : ''} Invited
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendees Roster Card */}
      {meeting.attendees?.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)]">
          <h3 className="text-sm font-bold text-primary-900 tracking-tight flex items-center gap-2 mb-4 pb-3 border-b border-zinc-100">
            <Users className="w-4 h-4 text-zinc-500" />
            <span>Invited Participants ({meeting.attendees.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {meeting.attendees.map((a) => {
              const name = a?.name || 'User';
              const email = a?.email || '';
              const role = a?.role || 'staff';
              const isClient = role === 'client';

              return (
                <div
                  key={a?._id || a}
                  className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/70"
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-2xs shrink-0',
                      isClient
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
                        : 'bg-primary-900',
                    )}
                  >
                    {name[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-primary-900 truncate">{name}</p>
                    {email && <p className="text-[10px] text-zinc-400 truncate">{email}</p>}
                  </div>
                  <span
                    className={cn(
                      'text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border',
                      isClient
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                        : 'bg-white text-zinc-600 border-zinc-200/80',
                    )}
                  >
                    {role}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two Column Grid: Discussion Notes & Action Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Discussion Notes */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
            <h3 className="text-sm font-bold text-primary-900 tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-500" />
              <span>Discussion Notes</span>
            </h3>
            {canWriteNotes && !editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-xs font-semibold text-primary-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                Edit Notes
              </button>
            )}
          </div>

          <div className="flex-1">
            {editingNotes ? (
              <div className="space-y-3">
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="w-full min-h-[140px] px-3.5 py-2.5 text-xs sm:text-sm text-zinc-800 border border-zinc-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900"
                  placeholder="What was discussed in this session? Key conclusions, agreements..."
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setNotesText(meeting.notes || '');
                      setEditingNotes(false);
                    }}
                    className="rounded-xl text-xs font-semibold"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveNotes}
                    loading={isSavingNotes}
                    className="rounded-xl text-xs font-semibold"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Save Notes
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                {meeting.notes || (
                  <span className="text-zinc-400 italic">No discussion notes recorded yet.</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Action Items */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
            <h3 className="text-sm font-bold text-primary-900 tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-zinc-500" />
              <span>Action Items</span>
              {meeting.actionItems?.length > 0 && (
                <span className="text-[11px] font-semibold text-zinc-400">
                  ({meeting.actionItems.filter((i) => i.status === 'done').length}/{meeting.actionItems.length} done)
                </span>
              )}
            </h3>
          </div>

          <div className="flex-1 space-y-3">
            {(meeting.actionItems || []).length === 0 && (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">No follow-up action items created</p>
              </div>
            )}

            <ul className="space-y-2.5">
              {meeting.actionItems?.map((item) => {
                const done = item.status === 'done';
                const isBusy = busyItem === item._id;

                return (
                  <li
                    key={item._id}
                    className="p-3 rounded-xl border border-zinc-200/70 bg-zinc-50/60 flex items-start gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleItem(item)}
                      disabled={isBusy}
                      className="mt-0.5 shrink-0 text-zinc-400 hover:text-primary-900 cursor-pointer disabled:opacity-50"
                      title={done ? 'Mark pending' : 'Mark done'}
                    >
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-xs font-medium',
                          done ? 'text-zinc-400 line-through' : 'text-zinc-800',
                        )}
                      >
                        {item.text}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {item.assignee?.name && <>Assignee: {item.assignee.name} &bull; </>}
                        {item.dueDate && <>Due: {formatDate(item.dueDate)} &bull; </>}
                        {item.convertedToTask && (
                          <span className="inline-flex items-center gap-1 text-primary-900 font-semibold">
                            <RefreshCcw className="w-2.5 h-2.5" /> Converted to task
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {canManage && !item.convertedToTask && (
                        <div className="flex items-center gap-1">
                          <select
                            value={convertTargets[item._id] || ''}
                            onChange={(e) =>
                              setConvertTargets((prev) => ({
                                ...prev,
                                [item._id]: e.target.value,
                              }))
                            }
                            className="text-[11px] border border-zinc-200 rounded-lg px-2 py-1 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-primary-900 shadow-2xs"
                          >
                            <option value="">To project…</option>
                            {projects.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.title}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConvert(item)}
                            loading={isBusy}
                            disabled={!convertTargets[item._id]}
                            className="text-xs px-2 h-7"
                          >
                            Convert
                          </Button>
                        </div>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item._id)}
                          disabled={isBusy}
                          className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {canManage && (
              <form onSubmit={handleAddItem} className="flex items-center gap-2 pt-2">
                <input
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="Add a new action item…"
                  className="flex-1 text-xs px-3 py-2 bg-white border border-zinc-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-900/10 focus:border-primary-900 shadow-2xs"
                />
                <Button type="submit" size="sm" loading={isAddingItem} className="rounded-xl text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Meeting"
        size="lg"
      >
        <MeetingForm
          meeting={meeting}
          onSuccess={() => setShowEditModal(false)}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Meeting Session?"
        message="Are you sure you want to permanently delete this meeting? This action cannot be undone."
      />
    </div>
  );
}

