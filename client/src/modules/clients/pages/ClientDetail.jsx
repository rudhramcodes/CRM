import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  MessageSquare,
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Hash,
  KeyRound,
  Briefcase,
  MapPin,
  CheckCircle2,
  Send,
} from 'lucide-react';
import {
  useGetClientByIdQuery,
  useUpdateClientMutation,
  useDeleteClientMutation,
  useInviteClientMutation,
} from '../../../services/clientApi';
import ClientStatusBadge from '../components/ClientStatusBadge';
import ClientForm from '../components/ClientForm';
import MeetingForm from '../../meetings/components/MeetingForm';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import EmptyState from '../../../components/ui/EmptyState';
import { DetailSkeleton } from '../../../components/ui/Skeleton';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../../../components/ui/Select';
import { CLIENT_STATUS, BRANDS, BRAND_METAS } from '../../../constants';
import { cn } from '../../../utils/cn';
import toast from 'react-hot-toast';
import { formatDate, getTimeAgo } from '../../../utils/formatters';

const BRAND_LABELS = BRANDS.reduce((acc, b) => ({ ...acc, [b.value]: b.label }), {});

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  const { data: clientData, isLoading, error } = useGetClientByIdQuery(id);
  const [updateClient] = useUpdateClientMutation();
  const [deleteClient, { isLoading: isDeleting }] = useDeleteClientMutation();
  const [inviteClient, { isLoading: isInviting }] = useInviteClientMutation();

  const client = clientData?.data?.client;

  useEffect(() => {
    if (client) {
      dispatch(setPageTitle(client.companyName));
    }
  }, [client, dispatch]);

  const handleDelete = () => setShowDeleteConfirm(true);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateClient({ id, status: newStatus }).unwrap();
      toast.success(`Client status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update status');
    }
  };

  const handleInvite = async () => {
    try {
      await inviteClient(id).unwrap();
      toast.success(`Portal credentials sent to ${client.email}`);
    } catch (err) {
      if (err?.status === 409) {
        toast.error(err?.data?.message || 'Portal account already active');
      } else {
        toast.error(err?.data?.message || 'Failed to send portal invite');
      }
    }
  };

  const confirmDelete = useCallback(async () => {
    try {
      await deleteClient(id).unwrap();
      toast.success('Client deleted successfully');
      navigate('/clients');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete client');
    }
  }, [id, deleteClient, navigate]);

  const canManage = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canDelete = user && ['super_admin', 'admin'].includes(user.role);
  const portalActive = !!client?.user;

  if (isLoading) {
    return <DetailSkeleton />;
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

  const initials =
    client.companyName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'CL';

  const brandMeta = BRAND_METAS[client.brand];
  const brandLabel = BRAND_LABELS[client.brand] || client.brand;
  const cleanPhone = client.phone ? client.phone.replace(/[^\d+]/g, '') : null;
  const waNumber = client.phone ? client.phone.replace(/[^\d]/g, '') : null;

  const address = client.address || {};
  const hasAddress = address.street || address.city || address.state || address.pincode;

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/clients')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-500 hover:text-primary-900 transition-colors w-fit group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Client Directory</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Status Selector */}
          {canManage && (
            <Select value={client.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 sm:h-9 w-auto gap-1.5 text-xs font-semibold rounded-xl bg-white border-zinc-200/90 shadow-2xs">
                <ClientStatusBadge status={client.status} />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-zinc-200/80">
                {CLIENT_STATUS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMeetingModal(true)}
              className="rounded-xl border-zinc-200/90 text-xs font-semibold shadow-2xs h-8 sm:h-9 px-2.5 sm:px-3"
            >
              <Calendar className="w-3.5 h-3.5 mr-1 text-zinc-500" />
              <span className="hidden sm:inline">Schedule Meeting</span>
              <span className="sm:hidden">Meeting</span>
            </Button>
          )}

          {canManage && !portalActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInvite}
              loading={isInviting}
              className="rounded-xl border-zinc-200/90 text-xs font-semibold shadow-2xs text-primary-900 h-8 sm:h-9 px-2.5 sm:px-3"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1 text-zinc-500" />
              <span className="hidden sm:inline">Send Portal Invite</span>
              <span className="sm:hidden">Invite</span>
            </Button>
          )}

          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditModal(true)}
              className="rounded-xl border-zinc-200/90 text-xs font-semibold shadow-2xs h-8 sm:h-9 px-2.5 sm:px-3"
            >
              <Edit2 className="w-3.5 h-3.5 sm:mr-1 text-zinc-500" />
              <span>Edit</span>
            </Button>
          )}

          {canDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              loading={isDeleting}
              className="rounded-xl text-xs font-semibold shadow-2xs h-8 sm:h-9 px-2.5 sm:px-3"
            >
              <Trash2 className="w-3.5 h-3.5 sm:mr-1" />
              <span>Delete</span>
            </Button>
          )}
        </div>
      </div>

      {/* Hero Client Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-7 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary-900 text-white rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg shadow-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold text-primary-900 tracking-tight break-words">
                  {client.companyName}
                </h1>
                <ClientStatusBadge status={client.status} />
                {portalActive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Portal Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-zinc-100 text-zinc-500 border border-zinc-200/60">
                    Portal Inactive
                  </span>
                )}
                {client.convertedFrom && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    Converted from Lead
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 mt-1.5 text-xs text-zinc-500 flex-wrap">
                <span className="font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md font-semibold border border-zinc-200/60 text-[11px]">
                  {client.clientId || 'Client ID not assigned'}
                </span>
                <span className="hidden sm:inline">&bull;</span>
                <span className="flex items-center gap-1 text-zinc-700 font-medium">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  {client.contactPerson}
                </span>
                <span className="hidden sm:inline">&bull;</span>
                <span className="text-[11px] text-zinc-400">Created {formatDate(client.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Venture Logo Badge */}
          {brandMeta ? (
            <div className="flex items-center gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200/70 shrink-0 self-stretch sm:self-start md:self-center">
              {brandMeta.logo ? (
                <img
                  src={brandMeta.logo}
                  alt={brandMeta.label}
                  className="w-6 h-6 sm:w-7 sm:h-7 object-contain rounded-md bg-white p-0.5 border border-zinc-200/80 shadow-2xs"
                />
              ) : (
                <div
                  className={cn(
                    'w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shadow-2xs bg-gradient-to-br',
                    brandMeta.gradient
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
          ) : client.brand ? (
            <div className="px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs font-semibold text-zinc-700 self-start">
              {brandLabel}
            </div>
          ) : null}
        </div>

        {/* Quick Contact & Action Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-zinc-100">
          {/* Email Box */}
          <a
            href={`mailto:${client.email}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200/70 transition-all group active:scale-[0.99]"
          >
            <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-500 group-hover:text-primary-900 shadow-2xs shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Email Address
              </p>
              <p className="text-xs font-medium text-zinc-800 truncate group-hover:underline">
                {client.email}
              </p>
            </div>
          </a>

          {/* Phone Box */}
          {client.phone ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 gap-2">
              <a
                href={`tel:${cleanPhone}`}
                className="flex items-center gap-3 min-w-0 hover:text-primary-900 group"
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-500 group-hover:text-primary-900 shadow-2xs shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Phone Number
                  </p>
                  <p className="text-xs font-medium text-zinc-800 truncate group-hover:underline">
                    {client.phone}
                  </p>
                </div>
              </a>
              {waNumber && (
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs active:scale-95"
                  title="Chat on WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 opacity-60">
              <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-400 shadow-2xs shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Phone Number
                </p>
                <p className="text-xs text-zinc-400">Not provided</p>
              </div>
            </div>
          )}

          {/* Contact Person Box */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
            <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-500 shadow-2xs shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Point of Contact
              </p>
              <p className="text-xs font-medium text-zinc-800 truncate">
                {client.contactPerson}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Content: Tax & Profile / Address & Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column: Tax & Identification Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-6 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)]">
          <h3 className="text-sm font-bold text-primary-900 tracking-tight flex items-center gap-2 mb-3 sm:mb-4 pb-3 border-b border-zinc-100">
            <CreditCard className="w-4 h-4 text-zinc-500" />
            <span>Tax & Business Identifiers</span>
          </h3>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 py-1">
              <span className="text-xs text-zinc-500 font-medium">GST Identification (GSTIN)</span>
              <span className="text-xs font-mono font-semibold text-primary-900 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200/60 w-fit">
                {client.gstNumber || 'Not Registered'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 py-1 border-t border-zinc-100">
              <span className="text-xs text-zinc-500 font-medium">PAN Number</span>
              <span className="text-xs font-mono font-semibold text-primary-900 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200/60 w-fit">
                {client.panNumber || 'Not Provided'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-zinc-100">
              <span className="text-xs text-zinc-500 font-medium">Assigned Venture</span>
              <span className="text-xs font-semibold text-primary-900">
                {brandLabel}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-zinc-100">
              <span className="text-xs text-zinc-500 font-medium">Account Status</span>
              <ClientStatusBadge status={client.status} />
            </div>
          </div>
        </div>

        {/* Right Column: Registered Office Address Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-6 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)]">
          <h3 className="text-sm font-bold text-primary-900 tracking-tight flex items-center gap-2 mb-3 sm:mb-4 pb-3 border-b border-zinc-100">
            <MapPin className="w-4 h-4 text-zinc-500" />
            <span>Registered Office & Location</span>
          </h3>

          {hasAddress ? (
            <div className="space-y-3">
              {address.street && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Street Address
                  </p>
                  <p className="text-xs font-medium text-zinc-800 mt-0.5 break-words">
                    {address.street}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-100">
                {address.city && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      City
                    </p>
                    <p className="text-xs font-medium text-zinc-800 mt-0.5 truncate">
                      {address.city}
                    </p>
                  </div>
                )}
                {address.state && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      State / Province
                    </p>
                    <p className="text-xs font-medium text-zinc-800 mt-0.5 truncate">
                      {address.state}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-100">
                {address.pincode && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Postal Code / PIN
                    </p>
                    <p className="text-xs font-mono font-medium text-zinc-800 mt-0.5">
                      {address.pincode}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Country
                  </p>
                  <p className="text-xs font-medium text-zinc-800 mt-0.5 truncate">
                    {address.country || 'India'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <MapPin className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-xs text-zinc-400">No physical address recorded</p>
              {canManage && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="mt-2 text-xs font-semibold text-primary-900 hover:underline cursor-pointer"
                >
                  Add address
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes & Activity Stream Section */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-6 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-bold text-primary-900 tracking-tight flex items-center gap-2 mb-4 pb-3 border-b border-zinc-100">
          <MessageSquare className="w-4 h-4 text-zinc-500" />
          <span>Notes & Activity Feed</span>
        </h3>

        <div className="space-y-3">
          {!client.notes || client.notes.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-xs text-zinc-400">No communication notes recorded yet</p>
            </div>
          ) : (
            [...client.notes].reverse().map((note, idx) => (
              <div
                key={note._id || idx}
                className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100/90 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-white border border-zinc-200/80 flex items-center justify-center text-xs font-bold text-zinc-700 shadow-2xs shrink-0 mt-0.5">
                  {note.createdBy?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-primary-900">
                      {note.createdBy?.name || 'Team Member'}
                    </p>
                    <span className="text-[10px] text-zinc-400">
                      {getTimeAgo(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 mt-1 whitespace-pre-wrap leading-relaxed">
                    {note.text}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Client Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Profile: ${client.companyName}`}
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

      {/* Delete Client Confirm Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Client Account?"
        message={`Are you sure you want to permanently delete "${client.companyName}"? All linked records will be archived.`}
      />

      {/* Schedule Meeting Modal */}
      <Modal
        open={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        title={`Schedule Meeting with ${client.companyName}`}
        size="lg"
      >
        <MeetingForm
          defaultClient={client._id}
          onSuccess={() => {
            setShowMeetingModal(false);
            toast.success('Meeting scheduled successfully');
          }}
          onCancel={() => setShowMeetingModal(false)}
        />
      </Modal>
    </div>
  );
}

