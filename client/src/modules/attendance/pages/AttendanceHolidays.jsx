import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../app/store/uiSlice';
import { useGetHolidaysQuery, useCreateHolidayMutation, useUpdateHolidayMutation, useDeleteHolidayMutation } from '../../../services/attendanceApi';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_OPTIONS = [
  { value: 'national', label: 'National' },
  { value: 'company', label: 'Company' },
  { value: 'optional', label: 'Optional' },
];

export default function AttendanceHolidays() {
  const dispatch = useDispatch();
  const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', date: '', description: '', type: 'company' });

  useEffect(() => {
    dispatch(setPageTitle('Holidays'));
  }, [dispatch]);

  const { data, isLoading } = useGetHolidaysQuery({ year });
  const [createHoliday, { isLoading: creating }] = useCreateHolidayMutation();
  const [updateHoliday, { isLoading: updating }] = useUpdateHolidayMutation();
  const [deleteHoliday] = useDeleteHolidayMutation();

  const holidays = data?.data?.holidays || [];

  const yearOptions = [2025, 2026, 2027].map((y) => ({ value: y, label: String(y) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateHoliday({ id: editingId, ...form }).unwrap();
        toast.success('Holiday updated');
      } else {
        await createHoliday(form).unwrap();
        toast.success('Holiday created');
      }
      resetForm();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save holiday');
    }
  };

  const resetForm = () => {
    setForm({ name: '', date: '', description: '', type: 'company' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (h) => {
    setForm({ name: h.name, date: h.date?.split('T')[0] || '', description: h.description || '', type: h.type || 'company' });
    setEditingId(h._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this holiday?')) return;
    try {
      await deleteHoliday(id).unwrap();
      toast.success('Holiday deleted');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete holiday');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-900">Holidays</h2>
          <p className="text-sm text-zinc-500 mt-1">Manage company holidays for {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={(val) => setYear(Number(val))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4" />
            Add Holiday
          </Button>
        </div>
      </div>

      <Modal open={showForm} onClose={resetForm} title={editingId ? 'Edit Holiday' : 'New Holiday'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
            <Input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Date</label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Type</label>
            <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
            <Input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
            <Button type="submit" loading={creating || updating}>{editingId ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : holidays.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={`No holidays for ${year}`}
            description="Add holidays to help with attendance tracking."
            action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Add Holiday</Button>}
          />
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Holiday</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Day</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {holidays.map((h) => (
                <tr key={h._id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900">{h.name}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{format(new Date(h.date), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{format(new Date(h.date), 'EEEE')}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 capitalize">{h.type}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(h)} className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(h._id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : holidays.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={`No holidays for ${year}`}
            description="Add holidays to help with attendance tracking."
            action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Add Holiday</Button>}
          />
        ) : (
          holidays.map((h) => (
            <div key={h._id} className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-zinc-900">{h.name}</p>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(h)} className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-900 hover:bg-zinc-100 transition-colors"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(h._id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="text-sm text-zinc-600">{format(new Date(h.date), 'dd MMM yyyy, EEEE')}</p>
              <p className="text-xs text-zinc-400 capitalize mt-1">{h.type}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
