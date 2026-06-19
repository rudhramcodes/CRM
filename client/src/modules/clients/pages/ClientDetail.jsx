import { useEffect, useState } from 'react';
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
  CreditCard,
  Hash,
} from 'lucide-react';
import {
  useGetClientByIdQuery,
  useDeleteClientMutation,
} from '../../../services/clientApi';
import ClientStatusBadge from '../components/ClientStatusBadge';
import ClientForm from '../components/ClientForm';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Loader from '../../../components/ui/Loader';
import EmptyState from '../../../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { formatDate, getTimeAgo } from '../../../utils/formatters';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: clientData, isLoading, error } = useGetClientByIdQuery(id);
  const [deleteClient, { isLoading: isDeleting }] = useDeleteClientMutation();

  const client = clientData?.data?.client;

  useEffect(() => {
    if (client) {
      dispatch(setPageTitle(client.companyName));
    }
  }, [client, dispatch]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) return;
    try {
      await deleteClient(id).unwrap();
      toast.success('Client deleted successfully');
      navigate('/clients');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to delete client');
    }
  };

  const canManage = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size="lg" text="Loading client..." />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <EmptyState
          title="Client not found"
          description={error?.data?.message || 'This client does not exist or has been deleted.'}
          action={
            <Button variant="secondary" onClick={() => navigate('/clients')}>
              Back to Clients
            </Button>
          }
        />
      </div>
    );
  }

  const addressStr = [client.address?.street, client.address?.city, client.address?.state, client.address?.pincode]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/clients')}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
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

      {/* Client Info Card */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-primary-900 font-semibold text-lg">
                  {client.companyName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-primary-900">{client.companyName}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <ClientStatusBadge status={client.status} />
                  {client.convertedFrom && (
                    <>
                      <span className="text-xs text-zinc-400">|</span>
                      <span className="text-xs text-green-600 font-medium">
                        Converted from Lead
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 pt-6 border-t border-zinc-100">
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Company</p>
                <p className="text-sm text-primary-900">{client.companyName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Contact Person</p>
                <p className="text-sm text-primary-900">{client.contactPerson}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Email</p>
                <p className="text-sm text-primary-900">{client.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Phone</p>
                <p className="text-sm text-primary-900">{client.phone || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">GST Number</p>
                <p className="text-sm text-primary-900">{client.gstNumber || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Hash className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">PAN Number</p>
                <p className="text-sm text-primary-900">{client.panNumber || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400">Created</p>
                <p className="text-sm text-primary-900">{formatDate(client.createdAt)}</p>
              </div>
            </div>
          </div>

          {addressStr && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <p className="text-xs text-zinc-400 mb-1">Address</p>
              <p className="text-sm text-primary-900">{addressStr}</p>
            </div>
          )}
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

        <div className="divide-y divide-zinc-100">
          {(!client.notes || client.notes.length === 0) ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-zinc-400">No notes yet</p>
            </div>
          ) : (
            [...client.notes].reverse().map((note, idx) => (
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
        title="Edit Client"
        size="lg"
      >
        <ClientForm
          client={client}
          onSuccess={() => {
            setShowEditModal(false);
          }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>
    </div>
  );
}
