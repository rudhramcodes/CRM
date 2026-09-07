import ApiResponse from '../../utils/ApiResponse.js';
import * as freelancerService from './freelancer.service.js';

export const list = async (req, res, next) => {
  try {
    const { page, limit, sort, ...query } = req.query;
    const result = await freelancerService.getAll(query, { page, limit, sort });
    ApiResponse.paginated(res, result.freelancers, result.pagination);
  } catch (error) { next(error); }
};

export const stats = async (_req, res, next) => {
  try { ApiResponse.success(res, 200, await freelancerService.getStats()); } catch (error) { next(error); }
};

export const getById = async (req, res, next) => {
  try { ApiResponse.success(res, 200, { freelancer: await freelancerService.getById(req.params.id) }); } catch (error) { next(error); }
};

export const create = async (req, res, next) => {
  try { ApiResponse.created(res, { freelancer: await freelancerService.create(req.body, req.user) }, 'Freelancer created successfully'); } catch (error) { next(error); }
};

export const update = async (req, res, next) => {
  try { ApiResponse.success(res, 200, { freelancer: await freelancerService.update(req.params.id, req.body, req.user) }, 'Freelancer updated successfully'); } catch (error) { next(error); }
};

export const archive = async (req, res, next) => {
  try { ApiResponse.success(res, 200, { freelancer: await freelancerService.archive(req.params.id, req.user) }, 'Freelancer archived successfully'); } catch (error) { next(error); }
};

export const remove = async (req, res, next) => {
  try { await freelancerService.remove(req.params.id, req.user); ApiResponse.success(res, 200, null, 'Freelancer permanently deleted'); } catch (error) { next(error); }
};
