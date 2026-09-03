import { useState, useEffect } from 'react';
import { useManualEntryMutation } from '../../../services/attendanceApi';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import TimePicker from '../../../components/ui/TimePicker';
import Textarea from '../../../components/ui/Textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import Switch from '../../../components/ui/Switch';
import toast from 'react-hot-toast';
import { format, isValid } from 'date-fns';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'wfh', label: 'Work From Home' },
  { value: 'leave', label: 'Leave' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'weekend', label: 'Weekend' },
];

const getTimeHHMM = (val) => {
  if (!val) return '';
  const d = new Date(val);
  if (!isValid(d)) return '';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function AttendanceEditModal({ record, open, onClose }) {
  const [form, setForm] = useState({
    clockInTime: '',
    clockOutTime: '',
    status: 'present',
    notes: '',
    isWFH: false,
  });

  const [errors, setErrors] = useState({});
  const [manualEntry, { isLoading }] = useManualEntryMutation();

  useEffect(() => {
    if (record) {
      const clockIn = record.clockIn?.time || record.sessions?.[0]?.clockIn?.time || '';
      const clockOut = record.clockOut?.time || record.sessions?.[record.sessions.length - 1]?.clockOut?.time || '';

      setForm({
        clockInTime: getTimeHHMM(clockIn),
        clockOutTime: getTimeHHMM(clockOut),
        status: record.status || 'present',
        notes: record.notes || '',
        isWFH: Boolean(record.isWFH),
      });
      setErrors({});
    }
  }, [record]);

  if (!record) return null;

  const empName = record.employee?.name || 'Employee';
  const recDateStr = record.date ? format(new Date(record.date), 'yyyy-MM-dd') : '';
  const displayDate = record.date ? format(new Date(record.date), 'dd MMMM yyyy') : '';

  const isNonWorking = ['absent', 'leave', 'holiday', 'weekend'].includes(form.status);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!isNonWorking && form.clockInTime && form.clockOutTime && form.clockOutTime <= form.clockInTime) {
      newErrors.clockOutTime = 'Clock out must be after clock in';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      await manualEntry({
        recordId: record._id,
        employee: record.employee?._id || record.employee,
        date: recDateStr,
        clockInTime: isNonWorking ? '' : form.clockInTime,
        clockOutTime: isNonWorking ? '' : form.clockOutTime,
        status: form.status,
        notes: form.notes,
        isWFH: isNonWorking ? false : form.isWFH,
      }).unwrap();

      toast.success('Attendance record overridden successfully');
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update record');
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Attendance Record">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Record Summary Banner */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs flex justify-between items-center">
          <div>
            <span className="text-zinc-500">Employee:</span>{' '}
            <strong className="text-zinc-800">{empName}</strong>
          </div>
          <div>
            <span className="text-zinc-500">Date:</span>{' '}
            <strong className="text-zinc-800">{displayDate}</strong>
          </div>
        </div>

        {/* Status Dropdown */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
          <Select value={form.status} onValueChange={(val) => handleChange('status', val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Conditional Notice & Pickers */}
        {isNonWorking ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Reset Previous Sessions & Times</p>
            <p className="text-amber-700">
              Setting status to <strong className="capitalize">{form.status}</strong> will completely wipe out all previous clock-in/out sessions, pause breaks, and work hours for this date.
            </p>
          </div>
        ) : (
          <>
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

            {/* Work from home toggle */}
            <div className="pt-1">
              <Switch
                checked={form.isWFH}
                onChange={(val) => handleChange('isWFH', val)}
                label="Work From Home"
              />
            </div>

            <p className="text-[11px] text-zinc-500 italic">
              Note: Saving will override and replace all previous sessions and breaks with the specified session times.
            </p>
          </>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Override Reason / Notes</label>
          <Textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={2}
            placeholder="Reason for modifying this attendance record..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            Update Record
          </Button>
        </div>
      </form>
    </Modal>
  );
}
