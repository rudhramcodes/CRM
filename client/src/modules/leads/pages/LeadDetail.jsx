import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  MessageSquare,
  Send,
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  Globe,
} from 'lucide-react';
import {
  useGetLeadByIdQuery,
  useDeleteLeadMutation,
  useAddLeadNoteMutation,
} from '../../../services/leadApi';
import LeadStatusBadge from '../components/LeadStatusBadge';
import LeadForm from '../components/LeadForm';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Loader from '../../../components/ui/Loader';
import EmptyState from '../../../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { formatDate, formatDateTime, getTimeAgo } from '../../../utils/formatters';
import { LEAD_SOURCES, LEAD_BRANDS } from '../../../constants';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteText, setNoteText] = useState('');

  const { data: leadData, isLoading, error } = useGetLeadByIdQuery(id);
  const [deleteLead, { isLoading: isDeleting }] = useDeleteLeadMutation();
  const [addNote, { isLoading: isAddingNote }] = useAddLeadNoteMutation();

  const lead = leadData?.data?.lead;

  useEffect(() => {
    if (lead) {
      dispatch(setPageTitle(lead.name));
    }
  }, [lead, dispatch]);

  const handleDelete = () => setShowDeleteConfirm(true);

  const confirmDelete = useCallback(async () => {
    try {
      await deleteLead(id).unwrap();
      toast.success('Lead deleted successfully');
      navigate('/leads');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to delete lead');
    }
  }, [id, deleteLead, navigate]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await addNote({ id, text: noteText.trim() }).unwrap();
      toast.success('Note added');
      setNoteText('');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to add note');
    }
  };

  const sourceLabel = LEAD_SOURCES.find((s) => s.value === lead?.source)?.label || lead?.source || 'Other';
  const canManage = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size="lg" text="Loading lead..." />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <EmptyState
          title="Lead not found"
          description={error?.data?.message || 'This lead does not exist or has been deleted.'}
          action={
            <Button variant="secondary" onClick={() => navigate('/leads')}>
              Back to Leads
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
          onClick={() => navigate('/leads')}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Leads
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

      {/* Lead Info Card */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-primary-900 font-semibold text-lg">
                  {lead.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-primary-900">{lead.name}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <LeadStatusBadge status={lead.status} />
                  <span className="text-xs text-zinc-400">|</span>
                  <span className="text-xs text-zinc-500 capitalize">
                    Source: {sourceLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 pt-6 border-t border-zinc-100">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Email</p>
                <p className="text-sm text-primary-900">{lead.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Phone</p>
                <p className="text-sm text-primary-900">{lead.phone || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Company Brand</p>
                <p className="text-sm text-primary-900">
                  {LEAD_BRANDS.find((b) => b.value === lead.brand)?.label || (
                    <span className="text-zinc-300">—</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Company</p>
                <p className="text-sm text-primary-900">{lead.company || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Assigned To</p>
                <p className="text-sm text-primary-900">{lead.assignedTo?.name || 'Unassigned'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Created</p>
                <p className="text-sm text-primary-900">{formatDate(lead.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Source</p>
                <p className="text-sm text-primary-900 capitalize">{sourceLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-primary-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Notes & Activity
          </h3>
        </div>

        {canManage && (
          <form onSubmit={handleAddNote} className="px-6 py-4 border-b border-zinc-100">
            <div className="flex gap-3">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-900"
              />
              <Button type="submit" size="sm" loading={isAddingNote}>
                <Send className="w-3.5 h-3.5" />
                Add
              </Button>
            </div>
          </form>
        )}

        <div className="divide-y divide-zinc-100">
          {(!lead.notes || lead.notes.length === 0) ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-zinc-400">No notes yet</p>
            </div>
          ) : (
            [...lead.notes].reverse().map((note, idx) => (
              <div key={note._id || idx} className="px-6 py-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-zinc-600">
                      {note.createdBy?.name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-700">{note.text}</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {note.createdBy?.name || 'Unknown'} &middot; {getTimeAgo(note.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Lead"
        size="lg"
      >
        <LeadForm
          lead={lead}
          onSuccess={() => {
            setShowEditModal(false);
          }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Lead?"
        message="Are you sure you want to delete this lead? This action cannot be undone."
      />
    </div>
  );
}
