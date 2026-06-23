import ApiResponse from '../../utils/ApiResponse.js';
import * as meetingService from './meeting.service.js';

export const list = async (req, res, next) => {
  try {
    const result = await meetingService.getMeetings(req.query);
    ApiResponse.paginated(res, result.meetings, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const meeting = await meetingService.getMeetingById(req.params.id);
    ApiResponse.success(res, 200, { meeting });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const meeting = await meetingService.createMeeting(req.body, req.user);
    ApiResponse.created(res, { meeting }, 'Meeting scheduled successfully');
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const meeting = await meetingService.updateMeeting(req.params.id, req.body);
    ApiResponse.success(res, 200, { meeting }, 'Meeting updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateNotes = async (req, res, next) => {
  try {
    const meeting = await meetingService.updateMeetingNotes(req.params.id, req.body.notes);
    ApiResponse.success(res, 200, { meeting }, 'Notes updated successfully');
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await meetingService.deleteMeeting(req.params.id);
    ApiResponse.success(res, 200, null, 'Meeting deleted successfully');
  } catch (error) {
    next(error);
  }
};
