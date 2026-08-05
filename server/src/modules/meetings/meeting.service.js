import mongoose from 'mongoose';
import ApiError from '../../utils/ApiError.js';
import * as meetingRepository from './meeting.repository.js';
import * as notificationService from '../notifications/notification.service.js';
import { sendMeetingEmail } from '../../services/emailService.js';
import { generateMeetLink } from '../../services/googleMeetService.js';
import { ROLES } from '../../constants/index.js';

const STAFF_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE];
const MAX_SERIES_OCCURRENCES = 60;

function computeDuration(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

// Active staff users + the linked client's email (client has no login, email only)
export const getMeetingContacts = async (meeting) => {
  const User = (await import('../auth/auth.model.js')).default;
  const staff = await User.find({ role: { $in: STAFF_ROLES }, isActive: true }).select('_id name email');
  let clientEmail = null;
  if (meeting.client) {
    const Client = (await import('../clients/client.model.js')).default;
    const clientId = typeof meeting.client === 'object' ? meeting.client._id : meeting.client;
    const client = await Client.findById(clientId).select('email');
    clientEmail = client?.email || null;
  }
  return { staff, clientEmail };
};

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

// ponytail: bounded expansion (max 60) — never lets a series explode the DB.
const expandSeriesDates = (startDate, recurrence) => {
  const { type, interval = 1, occurrences, endDate } = recurrence;
  const dates = [new Date(startDate)];
  const cap = Math.min(occurrences || MAX_SERIES_OCCURRENCES, MAX_SERIES_OCCURRENCES);
  const stopAt = endDate ? new Date(endDate) : null;

  const add = (d) => {
    if (stopAt && d > stopAt) return null;
    if (dates.length >= cap) return null;
    return d;
  };

  let cursor = new Date(startDate);
  while (true) {
    if (dates.length >= cap) break;
    if (type === 'daily') cursor = new Date(cursor.setDate(cursor.getDate() + interval));
    else if (type === 'weekly') cursor = new Date(cursor.setDate(cursor.getDate() + 7 * interval));
    else if (type === 'monthly') cursor = new Date(cursor.setMonth(cursor.getMonth() + interval));

    if (stopAt && cursor > stopAt) break;
    const next = add(cursor);
    if (!next) break;
    dates.push(new Date(cursor));
  }
  return dates;
};

// A conflict is another non-cancelled meeting on the same date whose time
// window overlaps and which shares any person (attendee or creator).
const findConflicts = async ({ date, startTime, endTime, people, excludeId }) => {
  const candidates = await meetingRepository.findConflicting(date, excludeId);
  return candidates.filter((m) => {
    if (!overlaps(toMinutes(startTime), toMinutes(endTime), toMinutes(m.startTime), toMinutes(m.endTime))) {
      return false;
    }
    const mPeople = [String(m.createdBy), ...(m.attendees || []).map((a) => String(a))];
    return people.some((p) => mPeople.includes(p));
  });
};

export const createMeeting = async (data, user) => {
  const duration = computeDuration(data.startTime, data.endTime);
  if (duration <= 0) {
    throw ApiError.badRequest('End time must be after start time');
  }

  const attendees = [...new Set((data.attendees || []).map((a) => a.toString()))];
  const people = [...new Set([user._id.toString(), ...attendees])];

  const conflicts = await findConflicts({
    date: new Date(data.date),
    startTime: data.startTime,
    endTime: data.endTime,
    people,
  });
  if (conflicts.length > 0) {
    throw ApiError.conflict(
      `Time conflict with: ${conflicts.map((c) => c.title).join(', ')} (${conflicts[0].startTime}-${conflicts[0].endTime})`,
    );
  }

  const { recurrence } = data;
  const meetLink = data.meetingLink ||
    (await generateMeetLink({
      title: data.title,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      attendees: [],
    }));

  const { staff, clientEmail } = await getMeetingContacts(data);

  const notifyScheduled = async (meeting) => {
    const notif = notificationService.buildNotification('meeting_scheduled', {
      meetingTitle: data.title, date: meeting.date,
    });
    const recipients = attendees.length > 0 ? attendees : staff.map((s) => s._id.toString());

    notificationService.createAndSendBulk(recipients, {
      referenceId: meeting._id,
      referenceModel: 'Meeting',
      actionBy: user._id,
      link: `/meetings/${meeting._id}`,
      channels: { inApp: true, email: false },
      ...notif,
    }).catch(() => {});

    const staffById = new Map(staff.map((s) => [s._id.toString(), s]));
    const emailQueue = [
      ...recipients.map((id) => {
        const s = staffById.get(id);
        return s ? sendMeetingEmail(s.email, meeting, 'scheduled') : null;
      }),
      clientEmail ? sendMeetingEmail(clientEmail, meeting, 'scheduled') : null,
    ].filter(Boolean);
    await Promise.allSettled(emailQueue);
  };

  const buildPayload = (date, occurrenceIndex, seriesId) => ({
    title: data.title,
    date: new Date(date),
    startTime: data.startTime,
    endTime: data.endTime,
    meetingLink: meetLink || '',
    location: data.location || '',
    notes: data.notes || '',
    recordingLink: data.recordingLink || '',
    lead: data.lead || null,
    client: data.client || null,
    attendees,
    createdBy: user._id,
    status: data.status || 'scheduled',
    seriesId: seriesId || null,
    seriesType: recurrence?.type || 'none',
    occurrenceIndex: occurrenceIndex || 0,
  });

  const isRecurring = recurrence && recurrence.type !== 'none';

  if (isRecurring) {
    const dates = expandSeriesDates(data.date, recurrence);
    const seriesId = new mongoose.Types.ObjectId();
    const created = [];
    for (let i = 0; i < dates.length; i += 1) {
      if (i > 0) {
        const conflicts = await findConflicts({
          date: dates[i],
          startTime: data.startTime,
          endTime: data.endTime,
          people,
        });
        if (conflicts.length > 0) {
          throw ApiError.conflict(
            `Recurring meeting clashes on ${dates[i].toISOString().split('T')[0]} with: ${conflicts.map((c) => c.title).join(', ')}`,
          );
        }
      }
      const datePayload = buildPayload(dates[i], i, seriesId);
      if (data.actionItems?.length) {
        datePayload.actionItems = data.actionItems.map((item) => ({
          text: item.text,
          assignee: item.assignee || null,
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
        }));
      }
      created.push(await meetingRepository.create(datePayload));
    }

    await notifyScheduled(created[0]);
    return { meetings: created, seriesId, count: created.length };
  }

  const payload = buildPayload(data.date, 0, null);
  if (data.actionItems?.length) {
    payload.actionItems = data.actionItems.map((item) => ({
      text: item.text,
      assignee: item.assignee || null,
      dueDate: item.dueDate ? new Date(item.dueDate) : null,
    }));
  }

  const meeting = await meetingRepository.create(payload);
  await notifyScheduled(meeting);
  return meeting;
};

export const getMeetings = async (query) => {
  const { page, limit, sortBy, sortOrder, ...filters } = query;
  return meetingRepository.findAll(filters, { page, limit, sortBy, sortOrder });
};

export const getMeetingById = async (id) => {
  const meeting = await meetingRepository.findById(id);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found');
  }
  return meeting;
};

export const regenerateMeetLink = async (id) => {
  const meeting = await meetingRepository.findById(id);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found');
  }
  const link = await generateMeetLink({
    title: meeting.title,
    date: meeting.date,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    attendees: [],
  });
  if (!link) {
    throw ApiError.badRequest(
      'Google Meet is not configured. Add GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY to .env, or paste a link manually.',
    );
  }
  return meetingRepository.updateById(id, { meetingLink: link });
};

export const updateMeeting = async (id, data) => {
  const meeting = await meetingRepository.findById(id);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found');
  }

  const updateData = { ...data };
  if (data.date) updateData.date = new Date(data.date);

  if (data.startTime && data.endTime) {
    const duration = computeDuration(data.startTime, data.endTime);
    if (duration <= 0) {
      throw ApiError.badRequest('End time must be after start time');
    }
  }

  if (data.date || data.startTime || data.endTime || data.attendees) {
    const attendees = data.attendees
      ? [...new Set(data.attendees.map((a) => a.toString()))]
      : [...new Set((meeting.attendees || []).map((a) => String(a._id || a)))];
    const people = [...new Set([String(meeting.createdBy._id || meeting.createdBy), ...attendees])];

    const conflicts = await findConflicts({
      date: data.date ? new Date(data.date) : meeting.date,
      startTime: data.startTime || meeting.startTime,
      endTime: data.endTime || meeting.endTime,
      people,
      excludeId: id,
    });
    if (conflicts.length > 0) {
      throw ApiError.conflict(
        `Time conflict with: ${conflicts.map((c) => c.title).join(', ')} (${conflicts[0].startTime}-${conflicts[0].endTime})`,
      );
    }

    if (data.attendees) updateData.attendees = attendees;
  }

  if (data.actionItems) {
    updateData.actionItems = data.actionItems.map((item) => ({
      text: item.text,
      assignee: item.assignee || null,
      dueDate: item.dueDate ? new Date(item.dueDate) : null,
      status: item.status || 'pending',
    }));
  }

  return meetingRepository.updateById(id, updateData);
};

export const updateMeetingNotes = async (id, notes) => {
  const meeting = await meetingRepository.findById(id);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found');
  }

  return meetingRepository.updateNotesById(id, notes);
};

export const deleteMeeting = async (id, { allSeries = false } = {}) => {
  const meeting = await meetingRepository.findById(id);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found');
  }
  if (allSeries && meeting.seriesId) {
    return { deleted: await meetingRepository.deleteSeries(meeting.seriesId) };
  }
  await meetingRepository.deleteById(id);
  return { deleted: 1 };
};

export const addActionItem = async (id, data) => {
  const meeting = await meetingRepository.findById(id);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found');
  }

  return meetingRepository.addActionItem(id, {
    text: data.text,
    assignee: data.assignee || null,
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
  });
};

export const updateActionItem = async (id, itemId, data) => {
  const meeting = await meetingRepository.findById(id);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found');
  }

  const item = meeting.actionItems.find((i) => i._id.toString() === itemId);
  if (!item) {
    throw ApiError.notFound('Action item not found');
  }

  const updateData = { ...data };
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
  else if (data.dueDate === null || data.dueDate === '') updateData.dueDate = null;

  return meetingRepository.updateActionItem(id, itemId, updateData);
};

export const removeActionItem = async (id, itemId) => {
  const meeting = await meetingRepository.findById(id);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found');
  }

  const item = meeting.actionItems.find((i) => i._id.toString() === itemId);
  if (!item) {
    throw ApiError.notFound('Action item not found');
  }

  return meetingRepository.removeActionItem(id, itemId);
};

export const convertActionItemToTask = async (id, itemId, projectId, user) => {
  const meeting = await meetingRepository.findById(id);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found');
  }

  const item = meeting.actionItems.find((i) => i._id.toString() === itemId);
  if (!item) {
    throw ApiError.notFound('Action item not found');
  }

  if (item.convertedToTask) {
    throw ApiError.conflict('This action item has already been converted to a task');
  }

  const taskService = await import('../tasks/task.service.js');
  const task = await taskService.createTask(
    {
      title: item.text,
      project: projectId,
      assignedTo: item.assignee?._id || item.assignee || undefined,
      dueDate: item.dueDate || undefined,
      tags: ['meeting-action'],
    },
    user,
  );

  const updated = await meetingRepository.markActionItemConverted(id, itemId, task._id);
  return { task, meeting: updated };
};
