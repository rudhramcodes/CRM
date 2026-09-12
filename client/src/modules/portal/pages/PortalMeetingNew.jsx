import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Video, MapPin, AlignLeft, Users, Calendar } from 'lucide-react';
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
      toast.success('Meeting scheduled successfully');
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
    <div className="max-w-3xl space-y-6 mx-auto">
      <Link to="/portal/meetings" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to schedule
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-primary-900" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-900">
            Scheduling
          </span>
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-900">Schedule a Strategy Session</h1>
        <p className="text-sm text-zinc-500 mt-1">Book a video conference or checkpoint with your assigned project lead.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div>
          <label className="block text-xs font-semibold uppercase text-zinc-700 mb-1.5">Session Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setField('title')(e.target.value)}
            placeholder="e.g. Creative Review & Milestone Demo"
            className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
          />
          {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title}</p>}
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-700 mb-1.5">Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setField('date')(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
            />
            {errors.date && <p className="text-xs text-rose-600 mt-1">{errors.date}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-700 mb-1.5">Start Time *</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setField('startTime')(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
            />
            {errors.startTime && <p className="text-xs text-rose-600 mt-1">{errors.startTime}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-700 mb-1.5">End Time *</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setField('endTime')(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
            />
            {errors.endTime && <p className="text-xs text-rose-600 mt-1">{errors.endTime}</p>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-700 mb-1.5 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-zinc-400" /> Virtual Room Link
            </label>
            <input
              type="url"
              value={form.meetingLink}
              onChange={(e) => setField('meetingLink')(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
            />
            {errors.meetingLink && <p className="text-xs text-rose-600 mt-1">{errors.meetingLink}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Location / Format
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setField('location')(e.target.value)}
              placeholder="Google Meet / Studio / Phone"
              className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase text-zinc-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" /> Invite Team Members
            </span>
            {form.attendees.length > 0 && (
              <span className="text-primary-900 font-medium">{form.attendees.length} selected</span>
            )}
          </label>
          {staff.length === 0 ? (
            <p className="text-xs text-zinc-400">No team members available for selection</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
              {staff.map((member) => {
                const checked = form.attendees.includes(member._id);
                return (
                  <label
                    key={member._id}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm cursor-pointer border transition-all ${
                      checked
                        ? 'bg-primary-50 border-primary-200 text-primary-950 font-medium'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300 accent-primary-900"
                      checked={checked}
                      onChange={() => toggleAttendee(member._id)}
                    />
                    <span className="truncate text-xs">{member.name || member.email}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-zinc-400">{member.role}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-zinc-700 mb-1.5 flex items-center gap-1.5">
            <AlignLeft className="w-3.5 h-3.5 text-zinc-400" /> Agenda & Topics
          </label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setField('notes')(e.target.value)}
            placeholder="Discussion topics, deliverable review points..."
            className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 transition-colors resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading}
            className="bg-primary-900 hover:bg-primary-800 text-white font-medium px-6 py-2.5 shadow-xs"
          >
            <CalendarClock className="w-4 h-4" /> Confirm Schedule
          </Button>
          <Link
            to="/portal/meetings"
            className="px-4 py-2.5 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}