import { useState } from 'react';
import { useManualEntryMutation, useGetShiftsQuery } from '../../../services/attendanceApi';
import { useGetUsersQuery } from '../../../services/userApi';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import Switch from '../../../components/ui/Switch';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'wfh', label: 'Work From Home' },
  { value: 'leave', label: 'Leave' },
];

export default function ManualEntryModal({ open, onClose }) {
  const [form, setForm] = useState({
    employee: '',
    date: new Date().toISOString().split('T')[0],
    clockInTime: '',
    clockOutTime: '',
    status: 'present',
    notes: '',
    isWFH: false,
  });

  const [manualEntry, { isLoading }] = useManualEntryMutation();
  const { data: usersData } = useGetUsersQuery({ limit: 200 });

  const users = usersData?.data?.users || usersData?.data || [];

  const userOptions = [
    { value: '', label: 'Select employee' },
    ...users.map((u) => ({ value: u._id, label: u.name })),
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await manualEntry(form).unwrap();
      toast.success('Manual entry saved');
      setForm({
        employee: '',
        date: new Date().toISOString().split('T')[0],
        clockInTime: '',
        clockOutTime: '',
        status: 'present',
        notes: '',
        isWFH: false,
      });
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save');
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal open={open} onClose={onClose} title="Manual Attendance Entry">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Employee *</label>
          <Select value={form.employee} onValueChange={(val) => handleChange('employee', val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {userOptions.filter(o => o.value).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Date *</label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => handleChange('date', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Clock In Time</label>
            <Input
              type="time"
              value={form.clockInTime}
              onChange={(e) => handleChange('clockInTime', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Clock Out Time</label>
            <Input
              type="time"
              value={form.clockOutTime}
              onChange={(e) => handleChange('clockOutTime', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
          <Select value={form.status} onValueChange={(val) => handleChange('status', val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Notes</label>
          <Textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={2}
            placeholder="Optional notes..."
          />
        </div>

        <div className="pt-1">
          <Switch
            checked={form.isWFH}
            onChange={(val) => handleChange('isWFH', val)}
            label="Work From Home"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isLoading}>Save Entry</Button>
        </div>
      </form>
    </Modal>
  );
}
