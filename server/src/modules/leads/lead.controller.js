import ApiResponse from '../../utils/ApiResponse.js';
import * as leadService from './lead.service.js';

export const list = async (req, res, next) => {
  try {
    const result = await leadService.getLeads(req.query);
    ApiResponse.paginated(res, result.leads, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const lead = await leadService.getLeadById(req.params.id);
    ApiResponse.success(res, 200, { lead });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const lead = await leadService.createLead(req.body, req.user);
    ApiResponse.created(res, { lead }, 'Lead created successfully');
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const lead = await leadService.updateLead(req.params.id, req.body, req.user);
    ApiResponse.success(res, 200, { lead }, 'Lead updated successfully');
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await leadService.deleteLead(req.params.id);
    ApiResponse.success(res, 200, null, 'Lead deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const addNote = async (req, res, next) => {
  try {
    const lead = await leadService.addNote(req.params.id, req.body, req.user);
    ApiResponse.success(res, 200, { lead }, 'Note added successfully');
  } catch (error) {
    next(error);
  }
};

export const stats = async (req, res, next) => {
  try {
    const leadStats = await leadService.getLeadStats();
    ApiResponse.success(res, 200, leadStats);
  } catch (error) {
    next(error);
  }
};
