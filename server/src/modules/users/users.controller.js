import ApiResponse from '../../utils/ApiResponse.js';
import * as usersService from './users.service.js';

export const list = async (req, res, next) => {
  try {
    const { page, limit, search, role, isActive, sort } = req.query;
    const result = await usersService.listUsers(
      { search, role, isActive },
      { page: parseInt(page), limit: parseInt(limit), sort },
    );
    ApiResponse.success(res, 200, result);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.params.id);
    ApiResponse.success(res, 200, { user });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const user = await usersService.createUser(req.body, req.user);
    ApiResponse.created(res, { user }, 'User created successfully');
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const user = await usersService.updateUser(req.params.id, req.body, req.user);
    ApiResponse.success(res, 200, { user }, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await usersService.deleteUser(req.params.id);
    ApiResponse.success(res, 200, null, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const changeRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await usersService.updateUserRole(req.params.id, role);
    ApiResponse.success(res, 200, { user }, 'User role updated successfully');
  } catch (error) {
    next(error);
  }
};

export const stats = async (req, res, next) => {
  try {
    const userStats = await usersService.getUserStats();
    ApiResponse.success(res, 200, userStats);
  } catch (error) {
    next(error);
  }
};
