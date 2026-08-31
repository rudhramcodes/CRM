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
  Link as LinkIcon,
  MapPin,
  FileText,
  Save,
  X,
  Users,
  CheckCircle2,
  Circle,
  Plus,
  RefreshCcw,
  Briefcase,
} from 'lucide-react';
import {
  useGetMeetingByIdQuery,
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
import toast from 'react-hot-toast';
import { formatDate } from '../../../utils/formatters';
import { BRANDS } from '../../../constants';

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
  const canWriteNotes = user && ['super_admin', 'admin', 'manager', 'employee'].includes(user.role);

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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/meetings')}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Meetings
        </button>

        <div className="flex items-center gap-2">
          {canManage && (
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" size="sm" onClick={handleDelete} loading={isDeleting}>
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Meeting Info Card */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-primary-900" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-primary-900">{meeting.title}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <MeetingStatusBadge status={meeting.status} />
                  {meeting.meetingLink && (
                    <>
                      <span className="text-xs text-zinc-400">|</span>
                      <a
                        href={meeting.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-900/70 hover:text-primary-900 flex items-center gap-1"
                      >
                        <LinkIcon className="w-3 h-3" />
                        Join Meeting
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 pt-6 border-t border-zinc-100">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Date</p>
                <p className="text-sm text-primary-900">{formatDate(meeting.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Time</p>
                <p className="text-sm text-primary-900">
                  {meeting.startTime} - {meeting.endTime}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Location</p>
                <p className="text-sm text-primary-900">{meeting.location || '—'}</p>
              </div>
            </div>
          </div>

          {/* Related To */}
          {(meeting.lead || meeting.client) && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {meeting.client && (
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-400">Client</p>
                      <p className="text-sm text-primary-900">{meeting.client.companyName}</p>
                    </div>
                  </div>
                )}
                {meeting.lead && (
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-400">Lead</p>
                      <p className="text-sm text-primary-900">{meeting.lead.name}</p>
                    </div>
                  </div>
                )}
                {(meeting.brand || meeting.client?.brand || meeting.lead?.brand) && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-4 h-4 text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-400">Venture</p>
                      <p className="text-sm text-primary-900">
                        {BRAND_LABELS[meeting.brand || meeting.client?.brand || meeting.lead?.brand] || meeting.brand || meeting.client?.brand || meeting.lead?.brand}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attendees */}
          {meeting.attendees?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-zinc-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400">Attendees ({meeting.attendees.length})</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {meeting.attendees.map((a) => (
                      <span
                        key={a?._id || a}
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-full px-2.5 py-1"
                      >
                        <span className="w-5 h-5 rounded-full bg-primary-50 text-primary-900 flex items-center justify-center text-[10px] font-semibold uppercase">
                          {(a?.name || '?')[0]}
                        </span>
                        {a?.name || a?.email || '—'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {meeting.meetingLink && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-3">
                <LinkIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400">Meeting Link</p>
                  <a
                    href={meeting.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-900 hover:underline truncate block"
                  >
                    {meeting.meetingLink}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Recording Link */}
          {meeting.recordingLink && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-3">
                <LinkIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400">Recording</p>
                  <a
                    href={meeting.recordingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-900 hover:underline truncate block"
                  >
                    {meeting.recordingLink}
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discussion Notes */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary-900 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Discussion Notes
          </h3>
          {canWriteNotes && !editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-xs text-primary-900/70 hover:text-primary-900 flex items-center gap-1 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>
        <div className="px-6 py-4">
          {editingNotes ? (
            <div className="space-y-3">
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                className="w-full min-h-[120px] px-3 py-2.5 text-sm text-zinc-700 border border-zinc-200 rounded-lg resize-y focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900"
                placeholder="What was discussed in the meeting?"
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
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveNotes}
                  loading={isSavingNotes}
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Notes
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
              {meeting.notes || (
                <span className="text-zinc-400 italic">No discussion notes yet.</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Action Items
            {meeting.actionItems?.length > 0 && (
              <span className="text-xs font-normal text-zinc-400">
                ({meeting.actionItems.filter((i) => i.status === 'done').length}/{meeting.actionItems.length} done)
              </span>
            )}
          </h3>
        </div>
        <div className="px-6 py-4 space-y-3">
          {(meeting.actionItems || []).length === 0 && (
            <p className="text-sm text-zinc-400 italic">No action items yet.</p>
          )}

          <ul className="space-y-2">
            {meeting.actionItems?.map((item) => {
              const done = item.status === 'done';
              const isBusy = busyItem === item._id;
              return (
                <li
                  key={item._id}
                  className="flex items-start gap-3 rounded-lg border border-zinc-100 px-3 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleItem(item)}
                    disabled={isBusy}
                    className="mt-0.5 shrink-0 text-zinc-400 hover:text-primary-900 disabled:opacity-50"
                    title={done ? 'Mark pending' : 'Mark done'}
                  >
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${done ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                      {item.text}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {item.assignee?.name && <>Assignee: {item.assignee.name} · </>}
                      {item.dueDate && <>Due: {formatDate(item.dueDate)} · </>}
                      {item.convertedToTask && (
                        <span className="inline-flex items-center gap-1 text-primary-900">
                          <RefreshCcw className="w-3 h-3" /> Converted to task
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canManage && !item.convertedToTask && (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={convertTargets[item._id] || ''}
                          onChange={(e) =>
                            setConvertTargets((prev) => ({ ...prev, [item._id]: e.target.value }))
                          }
                          className="text-xs border border-zinc-200 rounded-md px-2 py-1.5 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-primary-900"
                        >
                          <option value="">To project…</option>
                          {projects.map((p) => (
                            <option key={p._id} value={p._id}>{p.title}</option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleConvert(item)}
                          loading={isBusy}
                          disabled={!convertTargets[item._id]}
                        >
                          Convert
                        </Button>
                      </div>
                    )}
                    {canManage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item._id)}
                        loading={isBusy}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {canManage && (
            <form onSubmit={handleAddItem} className="flex items-center gap-2 pt-1">
              <input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="Add an action item…"
                className="flex-1 text-sm px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900"
              />
              <Button type="submit" size="sm" loading={isAddingItem}>
                <Plus className="w-3.5 h-3.5" />
                Add
              </Button>
            </form>
          )}
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

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Meeting?"
        message="Are you sure you want to delete this meeting? This action cannot be undone."
      />
    </div>
  );
}
