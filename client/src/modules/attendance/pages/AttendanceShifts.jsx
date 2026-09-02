import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { useGetShiftsQuery, useCreateShiftMutation, useUpdateShiftMutation, useDeleteShiftMutation } from '../../../services/attendanceApi';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import { PageLoader } from '../../../components/ui/Loader';
import Modal from '../../../components/ui/Modal';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AttendanceShifts() {
  const dispatch = useDispatch();
  const { data, isLoading } = useGetShiftsQuery();
  const [createShift, { isLoading: creating }] = useCreateShiftMutation();
  const [updateShift, { isLoading: updating }] = useUpdateShiftMutation();
  const [deleteShift] = useDeleteShiftMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', startTime: '09:00', endTime: '18:00', gracePeriod: 15, isActive: true, isDefault: false });

  useEffect(() => {
    dispatch(setPageTitle('Shifts'));
  }, [dispatch]);

  const shifts = data?.data?.shifts || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateShift({ id: editingId, ...form }).unwrap();
        toast.success('Shift updated');
      } else {
        await createShift(form).unwrap();
        toast.success('Shift created');
      }
      resetForm();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save shift');
    }
  };

  const resetForm = () => {
    setForm({ name: '', startTime: '09:00', endTime: '18:00', gracePeriod: 15, isActive: true, isDefault: false });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (shift) => {
    setForm({ name: shift.name, startTime: shift.startTime, endTime: shift.endTime, gracePeriod: shift.gracePeriodMinutes || shift.gracePeriod || 15, isActive: shift.isActive, isDefault: shift.isDefault });
    setEditingId(shift._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this shift?')) return;
    try {
      await deleteShift(id).unwrap();
      toast.success('Shift deleted');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete shift');
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-900">Shifts</h2>
          <p className="text-sm text-zinc-500 mt-1">Manage work shifts and schedules</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4" />
          Add Shift
        </Button>
      </div>

      {shifts.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No shifts configured"
          description="Create your first shift to get started."
          action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Add Shift</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <div key={shift._id} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-zinc-900">{shift.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
                    <Clock className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>{shift.startTime} — {shift.endTime} ({shift.duration}h)</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">Grace: {shift.gracePeriodMinutes || shift.gracePeriod || 0}min</p>
                  <div className="flex gap-2 mt-2">
                    {shift.isDefault && <Badge variant="primary">Default</Badge>}
                    {!shift.isActive && <Badge variant="danger">Inactive</Badge>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleEdit(shift)} className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(shift._id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={resetForm} title={editingId ? 'Edit Shift' : 'New Shift'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-1 focus:ring-primary-900 focus:border-primary-900 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Start Time</label>
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-1 focus:ring-primary-900 focus:border-primary-900 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">End Time</label>
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-1 focus:ring-primary-900 focus:border-primary-900 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Grace Period (minutes)</label>
            <input type="number" value={form.gracePeriod} onChange={(e) => setForm({ ...form, gracePeriod: Number(e.target.value) })} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-1 focus:ring-primary-900 focus:border-primary-900 outline-none" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-zinc-300 text-primary-900 focus:ring-primary-900" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="rounded border-zinc-300 text-primary-900 focus:ring-primary-900" />
              Default
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
            <Button type="submit" loading={creating || updating}>{editingId ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
