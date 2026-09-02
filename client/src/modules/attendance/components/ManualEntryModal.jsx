import { useState } from 'react';
import { useManualEntryMutation, useGetShiftsQuery } from '../../../services/attendanceApi';
import { useGetUsersQuery } from '../../../services/userApi';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { DatePickerSimple } from '../../../components/ui/DatePickerSimple';
import TimePicker from '../../../components/ui/TimePicker';
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

  const [errors, setErrors] = useState({});
  const [manualEntry, { isLoading }] = useManualEntryMutation();
  const { data: usersData } = useGetUsersQuery({ limit: 100 });

  const users = usersData?.data?.users || usersData?.data || [];

  const userOptions = [
    { value: '', label: 'Select employee' },
    ...users.map((u) => ({ value: u._id, label: u.name })),
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.employee) newErrors.employee = 'Employee is required';
    if (!form.date) newErrors.date = 'Date is required';
    if (form.clockInTime && form.clockOutTime && form.clockOutTime <= form.clockInTime) {
      newErrors.clockOutTime = 'Clock out must be after clock in';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
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
      setErrors({});
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save');
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
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
          {errors.employee && <p className="text-xs text-red-600 mt-1">{errors.employee}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Date *</label>
          <DatePickerSimple
            value={form.date}
            onChange={(val) => handleChange('date', val)}
            label=""
            placeholder="Pick a date"
          />
          {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Clock In Time</label>
            <TimePicker
              value={form.clockInTime}
              onChange={(val) => handleChange('clockInTime', val)}
              label=""
            />
            {errors.clockInTime && <p className="text-xs text-red-600 mt-1">{errors.clockInTime}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Clock Out Time</label>
            <TimePicker
              value={form.clockOutTime}
              onChange={(val) => handleChange('clockOutTime', val)}
              label=""
            />
            {errors.clockOutTime && <p className="text-xs text-red-600 mt-1">{errors.clockOutTime}</p>}
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
