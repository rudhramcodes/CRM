import ApiError from '../../utils/ApiError.js';
import * as meetingRepository from './meeting.repository.js';
import * as notificationService from '../notifications/notification.service.js';

function computeDuration(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

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
  const basePayload = {
    referenceId: meeting._id, referenceModel: 'Meeting',
    actionBy: user._id, link: `/meetings/${meeting._id}`,
    ...notif,
  };

  // Notify the meeting creator
  notificationService.createAndSend({
    recipient: user._id, ...basePayload,
  }).catch(() => {});

  // Notify lead assignee if different from creator
  if (data.lead) {
    const Lead = (await import('../leads/lead.model.js')).default;
    const lead = await Lead.findById(data.lead).select('assignedTo');
    if (lead?.assignedTo && !lead.assignedTo.equals(user._id)) {
      notificationService.createAndSend({
        recipient: lead.assignedTo, ...basePayload,
      }).catch(() => {});
    }
  }

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
