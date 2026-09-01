import { useState } from 'react';
import { useGetShiftsQuery, useCreateShiftMutation, useUpdateShiftMutation, useDeleteShiftMutation } from '../../../services/attendanceApi';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';

export default function AttendanceShifts() {
  const { data, isLoading } = useGetShiftsQuery();
  const [createShift, { isLoading: creating }] = useCreateShiftMutation();
  const [updateShift, { isLoading: updating }] = useUpdateShiftMutation();
  const [deleteShift] = useDeleteShiftMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', startTime: '09:00', endTime: '18:00', duration: 8, gracePeriodMinutes: 15, isActive: true, isDefault: false });

  const shifts = data?.data?.shifts || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateShift({ id: editingId, ...form }).unwrap();
      } else {
        await createShift(form).unwrap();
      }
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setForm({ name: '', startTime: '09:00', endTime: '18:00', duration: 8, gracePeriodMinutes: 15, isActive: true, isDefault: false });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (shift) => {
    setForm({ name: shift.name, startTime: shift.startTime, endTime: shift.endTime, duration: shift.duration, gracePeriodMinutes: shift.gracePeriodMinutes, isActive: shift.isActive, isDefault: shift.isDefault });
    setEditingId(shift._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this shift?')) return;
    try { await deleteShift(id).unwrap(); } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shifts</h1>
          <p className="text-sm text-gray-500">Manage work shifts and schedules</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Shift
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Shift' : 'New Shift'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
              <input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (min)</label>
              <input type="number" value={form.gracePeriodMinutes} onChange={(e) => setForm({ ...form, gracePeriodMinutes: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="rounded" />
                Default
              </label>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={creating || updating} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="text-gray-500">Loading shifts...</p>
        ) : shifts.length === 0 ? (
          <p className="text-gray-500">No shifts configured</p>
        ) : (
          shifts.map((shift) => (
            <div key={shift._id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{shift.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    {shift.startTime} — {shift.endTime} ({shift.duration}h)
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Grace: {shift.gracePeriodMinutes}min</p>
                  <div className="flex gap-2 mt-2">
                    {shift.isDefault && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Default</span>}
                    {!shift.isActive && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Inactive</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(shift)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="h-4 w-4 text-gray-500" /></button>
                  <button onClick={() => handleDelete(shift._id)} className="p-1 hover:bg-gray-100 rounded"><Trash2 className="h-4 w-4 text-red-500" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
