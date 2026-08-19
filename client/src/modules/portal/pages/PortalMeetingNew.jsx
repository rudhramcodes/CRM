import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import DatePicker from '../../../components/forms/DatePicker';
import TimePicker from '../../../components/forms/TimePicker';
import LinkInput from '../../../components/forms/LinkInput';
import { useCreateMeetingMutation } from '../../../services/meetingApi';
import { useGetPortalStaffQuery } from '../../../services/userApi';

export default function PortalMeetingNew() {
  const navigate = useNavigate();
  const { data: staffData } = useGetPortalStaffQuery();
  const [createMeeting, { isLoading }] = useCreateMeetingMutation();

  const [form, setForm] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    meetingLink: '',
    location: '',
    notes: '',
    attendees: [],
  });
  const [errors, setErrors] = useState({});

  const staff = staffData?.data?.staff || [];

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.date) e.date = 'Date is required';
    if (!form.startTime) e.startTime = 'Start time is required';
    if (!form.endTime) e.endTime = 'End time is required';
    else if (form.startTime >= form.endTime) e.endTime = 'End time must be after start time';
    if (form.meetingLink && !/^https?:\/\/\S+$/.test(form.meetingLink)) e.meetingLink = 'Enter a valid URL';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!validate()) return;
    try {
      await createMeeting({
        title: form.title.trim(),
        date: new Date(form.date).toISOString(),
        startTime: form.startTime,
        endTime: form.endTime,
        meetingLink: form.meetingLink || undefined,
        location: form.location || undefined,
        notes: form.notes || undefined,
        attendees: form.attendees,
      }).unwrap();
      toast.success('Meeting scheduled');
      navigate('/portal/meetings');
    } catch (err) {
      const msg = err?.data?.message || 'Failed to schedule meeting';
      if (err?.data?.errors) {
        const apiErrors = {};
        for (const er of err.data.errors) apiErrors[er.field] = er.message;
        setErrors(apiErrors);
      }
      toast.error(msg);
    }
  };

  const toggleAttendee = (id) => {
    setForm((f) => ({
      ...f,
      attendees: f.attendees.includes(id) ? f.attendees.filter((a) => a !== id) : [...f.attendees, id],
    }));
  };

  const setField = (field) => (value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((x) => ({ ...x, [field]: '' }));
  };

  return (
    <div className="max-w-2xl space-y-5">
      <Link to="/portal/meetings" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to meetings
      </Link>

      <div>
        <h1 className="font-heading text-xl font-semibold text-primary-900">Schedule a Meeting</h1>
        <p className="text-sm text-zinc-500 mt-1">Pick a time that works and our team will join you.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
        <Input
          label="Title *"
          value={form.title}
          onChange={(e) => setField('title')(e.target.value)}
          error={errors.title}
          placeholder="Project kickoff"
        />

        <div className="grid sm:grid-cols-3 gap-4">
          <DatePicker
            label="Date *"
            value={form.date}
            onChange={setField('date')}
            error={errors.date}
            placeholder="Select date"
          />
          <TimePicker
            label="Start *"
            value={form.startTime}
            onChange={setField('startTime')}
            error={errors.startTime}
          />
          <TimePicker
            label="End *"
            value={form.endTime}
            onChange={setField('endTime')}
            error={errors.endTime}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <LinkInput
            label="Meeting Link"
            value={form.meetingLink}
            onChange={(e) => setField('meetingLink')(e.target.value)}
            error={errors.meetingLink}
            placeholder="https://meet.google.com/..."
          />
          <Input
            label="Location"
            value={form.location}
            onChange={(e) => setField('location')(e.target.value)}
            placeholder="Google Meet / Office / Phone"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-700">
            Attendees {staff.length > 0 && <span className="text-xs text-zinc-400">({form.attendees.length} selected)</span>}
          </label>
          {staff.length === 0 ? (
            <p className="text-xs text-zinc-400">No staff users available</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 p-3">
              {staff.map((member) => {
                const checked = form.attendees.includes(member._id);
                return (
                  <label
                    key={member._id}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300 accent-indigo-600"
                      checked={checked}
                      onChange={() => toggleAttendee(member._id)}
                    />
                    <span className="truncate">{member.name || member.email}</span>
                    <span className="ml-auto text-[11px] uppercase tracking-wide text-zinc-400">{member.role}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setField('notes')(e.target.value)}
          rows={3}
          placeholder="Agenda, context, anything we should know..."
        />

        <div className="flex items-center gap-2">
          <Button type="submit" loading={isLoading} disabled={isLoading}>
            <CalendarClock className="w-3.5 h-3.5" /> Schedule Meeting
          </Button>
          <Link to="/portal/meetings" className="text-sm text-zinc-500 hover:text-primary-900 px-2 py-2 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}