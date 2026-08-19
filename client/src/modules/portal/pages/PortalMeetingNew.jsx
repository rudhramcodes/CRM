import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
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

  const staff = staffData?.data || staffData || [];

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

  const inputClass = (hasError) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
      hasError
        ? 'border-red-300 bg-red-50 focus:ring-red-400 focus:border-red-400'
        : 'border-zinc-200 focus:ring-primary-900 focus:border-primary-900'
    }`;

  const toggleAttendee = (id) => {
    setForm((f) => ({
      ...f,
      attendees: f.attendees.includes(id) ? f.attendees.filter((a) => a !== id) : [...f.attendees, id],
    }));
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

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setErrors((x) => ({ ...x, title: '' })); }}
            className={inputClass(errors.title)}
            placeholder="Project kickoff"
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); setErrors((x) => ({ ...x, date: '' })); }}
              className={inputClass(errors.date)}
            />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Start *</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => { setForm((f) => ({ ...f, startTime: e.target.value })); setErrors((x) => ({ ...x, startTime: '', endTime: '' })); }}
              className={inputClass(errors.startTime)}
            />
            {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">End *</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => { setForm((f) => ({ ...f, endTime: e.target.value })); setErrors((x) => ({ ...x, endTime: '' })); }}
              className={inputClass(errors.endTime)}
            />
            {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime}</p>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Meeting Link</label>
            <div className="relative">
              <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="url"
                value={form.meetingLink}
                onChange={(e) => { setForm((f) => ({ ...f, meetingLink: e.target.value })); setErrors((x) => ({ ...x, meetingLink: '' })); }}
                className={`${inputClass(errors.meetingLink)} pl-9`}
                placeholder="https://meet.google.com/..."
              />
            </div>
            {errors.meetingLink && <p className="text-xs text-red-500 mt-1">{errors.meetingLink}</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className={inputClass()}
              placeholder="Google Meet / Office / Phone"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Invite our team</label>
          {staff.length === 0 ? (
            <p className="text-sm text-zinc-400">No team members available.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {staff.map((member) => (
                <button
                  key={member._id}
                  type="button"
                  onClick={() => toggleAttendee(member._id)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    form.attendees.includes(member._id)
                      ? 'bg-primary-900 border-primary-900 text-white'
                      : 'border-zinc-200 text-zinc-600 hover:border-primary-900/40'
                  }`}
                >
                  {member.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className={`${inputClass()} resize-none`}
            rows={3}
            placeholder="Agenda, context, anything we should know..."
          />
        </div>

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