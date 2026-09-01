import { useState } from 'react';
import { useGetHolidaysQuery, useCreateHolidayMutation, useUpdateHolidayMutation, useDeleteHolidayMutation } from '../../../services/attendanceApi';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function AttendanceHolidays() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', date: '', description: '', type: 'public' });

  const { data, isLoading } = useGetHolidaysQuery({ year });
  const [createHoliday, { isLoading: creating }] = useCreateHolidayMutation();
  const [updateHoliday, { isLoading: updating }] = useUpdateHolidayMutation();
  const [deleteHoliday] = useDeleteHolidayMutation();

  const holidays = data?.data?.holidays || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateHoliday({ id: editingId, ...form }).unwrap();
      } else {
        await createHoliday(form).unwrap();
      }
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setForm({ name: '', date: '', description: '', type: 'public' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (h) => {
    setForm({ name: h.name, date: h.date?.split('T')[0] || '', description: h.description || '', type: h.type || 'public' });
    setEditingId(h._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this holiday?')) return;
    try { await deleteHoliday(id).unwrap(); } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holidays</h1>
          <p className="text-sm text-gray-500">Manage company holidays for {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Holiday
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Holiday' : 'New Holiday'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="public">Public</option>
                <option value="optional">Optional</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={creating || updating} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holiday</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : holidays.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No holidays for {year}</td></tr>
            ) : (
              holidays.map((h) => (
                <tr key={h._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{h.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(h.date), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{format(new Date(h.date), 'EEEE')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{h.type}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(h)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="h-4 w-4 text-gray-500" /></button>
                      <button onClick={() => handleDelete(h._id)} className="p-1 hover:bg-gray-100 rounded"><Trash2 className="h-4 w-4 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
