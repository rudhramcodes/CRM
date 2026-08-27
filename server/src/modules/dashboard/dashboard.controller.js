import * as dashboardService from './dashboard.service.js';
import ApiResponse from '../../utils/ApiResponse.js';

export const getDashboardOverview = async (req, res, next) => {
  try {
    const data = await dashboardService.getOverview();
    ApiResponse.success(res, 200, data);
  } catch (error) {
    next(error);
  }
};

export const getVentureData = async (req, res, next) => {
  try {
    const { brand } = req.params;
    const data = await dashboardService.getVentureDashboard(brand);
    ApiResponse.success(res, 200, data);
  } catch (error) {
    next(error);
  }
};
