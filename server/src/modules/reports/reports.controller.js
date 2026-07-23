import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as reportsService from './reports.service.js';

const handlers = {
  revenue: reportsService.getRevenueReport,
  pipeline: reportsService.getPipelineReport,
  clients: reportsService.getClientReport,
  invoices: reportsService.getInvoiceReport,
  productivity: reportsService.getProductivityReport,
};

export const getReport = async (req, res, next) => {
  try {
    const { type, from, to } = req.query;
    const handler = handlers[type];
    if (!handler) throw new ApiError(400, 'Invalid report type');
    const data = await handler(from, to);
    ApiResponse.success(res, 200, { type, period: { from: from || null, to: to || null }, ...data });
  } catch (error) {
    next(error);
  }
};
