import ApiResponse from '../../utils/ApiResponse.js';
import * as clientService from './client.service.js';

export const list = async (req, res, next) => {
  try {
    const { page, limit, sort, ...query } = req.query;
    const result = await clientService.getAll(query, { page, limit, sort });
    ApiResponse.paginated(res, result.clients, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const client = await clientService.getById(req.params.id);
    ApiResponse.success(res, 200, { client });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const client = await clientService.create(req.body, req.user);
    ApiResponse.created(res, { client }, 'Client created successfully');
  } catch (error) {
    next(error);
  }
};

export const convertFromLead = async (req, res, next) => {
  try {
    const client = await clientService.convertFromLead(req.params.leadId, req.user);
    ApiResponse.created(res, { client }, 'Lead converted to client successfully');
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const client = await clientService.update(req.params.id, req.body);
    ApiResponse.success(res, 200, { client }, 'Client updated successfully');
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await clientService.remove(req.params.id);
    ApiResponse.success(res, 200, null, 'Client deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const stats = async (req, res, next) => {
  try {
    const data = await clientService.getStats();
    ApiResponse.success(res, 200, data);
  } catch (error) {
    next(error);
  }
};
