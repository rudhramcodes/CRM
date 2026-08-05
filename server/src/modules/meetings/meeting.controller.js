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
    const result = await meetingService.createMeeting(req.body, req.user);
    if (result.meetings) {
      ApiResponse.created(res, result, 'Meeting series scheduled successfully');
    } else {
      ApiResponse.created(res, { meeting: result }, 'Meeting scheduled successfully');
    }
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
    const { allSeries } = req.query;
    const result = await meetingService.deleteMeeting(req.params.id, {
      allSeries: allSeries === 'true',
    });
    ApiResponse.success(res, 200, result, 'Meeting deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const regenerateMeetLink = async (req, res, next) => {
  try {
    const meeting = await meetingService.regenerateMeetLink(req.params.id);
    ApiResponse.success(res, 200, { meeting }, 'Meeting link regenerated');
  } catch (error) {
    next(error);
  }
};

export const addActionItem = async (req, res, next) => {
  try {
    const meeting = await meetingService.addActionItem(req.params.id, req.body);
    ApiResponse.success(res, 201, { meeting, actionItems: meeting.actionItems }, 'Action item added');
  } catch (error) {
    next(error);
  }
};

export const updateActionItem = async (req, res, next) => {
  try {
    const meeting = await meetingService.updateActionItem(req.params.id, req.params.itemId, req.body);
    ApiResponse.success(res, 200, { meeting }, 'Action item updated');
  } catch (error) {
    next(error);
  }
};

export const removeActionItem = async (req, res, next) => {
  try {
    const meeting = await meetingService.removeActionItem(req.params.id, req.params.itemId);
    ApiResponse.success(res, 200, { meeting }, 'Action item removed');
  } catch (error) {
    next(error);
  }
};

export const convertActionItem = async (req, res, next) => {
  try {
    const result = await meetingService.convertActionItemToTask(
      req.params.id,
      req.params.itemId,
      req.body.projectId,
      req.user,
    );
    ApiResponse.success(res, 200, result, 'Action item converted to task');
  } catch (error) {
    next(error);
  }
};
