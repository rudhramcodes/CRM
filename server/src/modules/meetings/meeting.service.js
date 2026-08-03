import ApiError from '../../utils/ApiError.js';
import * as meetingRepository from './meeting.repository.js';
import * as notificationService from '../notifications/notification.service.js';
import { sendMeetingEmail } from '../../services/emailService.js';
import { ROLES } from '../../constants/index.js';
import config from '../../config/index.js';

const STAFF_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE];

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

export const createMeeting = async (data, user) => {
  const duration = computeDuration(data.startTime, data.endTime);
  if (duration <= 0) {
    throw ApiError.badRequest('End time must be after start time');
  }

  const payload = {
    title: data.title,
    date: new Date(data.date),
    startTime: data.startTime,
    endTime: data.endTime,
    meetingLink: data.meetingLink || '',
    location: data.location || '',
    notes: data.notes || '',
    recordingLink: data.recordingLink || '',
    lead: data.lead || null,
    client: data.client || null,
    createdBy: user._id,
    status: data.status || 'scheduled',
  };

  const meeting = await meetingRepository.create(payload);

  const notif = notificationService.buildNotification('meeting_scheduled', {
    meetingTitle: data.title, date: data.date,
  });
  const detailLink = `${config.clientUrl}/meetings/${meeting._id}`;
  const basePayload = {
    referenceId: meeting._id,
    referenceModel: 'Meeting',
    actionBy: user._id,
    link: detailLink,
    ...notif,
  };

  // In-app + socket to every active staff member (email is sent separately to guarantee delivery)
  const { staff, clientEmail } = await getMeetingContacts(meeting);
  notificationService.createAndSendBulk(staff.map((s) => s._id), {
    ...basePayload,
    channels: { inApp: true, email: false },
  }).catch(() => {});

  // Direct email with meeting details + join button to all staff and the client (if linked)
  const emailQueue = [
    ...staff.map((s) => sendMeetingEmail(s.email, meeting, 'scheduled')),
    clientEmail ? sendMeetingEmail(clientEmail, meeting, 'scheduled') : null,
  ].filter(Boolean);
  await Promise.allSettled(emailQueue);

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

  return meetingRepository.updateById(id, updateData);
};

export const updateMeetingNotes = async (id, notes) => {
  const meeting = await meetingRepository.findById(id);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found');
  }

  return meetingRepository.updateNotesById(id, notes);
};

export const deleteMeeting = async (id) => {
  const meeting = await meetingRepository.findById(id);
  if (!meeting) {
    throw ApiError.notFound('Meeting not found');
  }
  return meetingRepository.deleteById(id);
};
