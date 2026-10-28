import ApiResponse from '../../utils/ApiResponse.js';
import * as payrollService from './payroll.service.js';

export const listRuns = async (req, res, next) => {
  try {
    const runs = await payrollService.listPayrollRuns(req.query.year);
    ApiResponse.success(res, 200, { runs });
  } catch (error) {
    next(error);
  }
};

export const generate = async (req, res, next) => {
  try {
    const result = await payrollService.generateDraft(req.body, req.user);
    ApiResponse.success(res, 200, result, 'Payroll draft generated');
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const result = await payrollService.getRunById(req.params.id);
    ApiResponse.success(res, 200, result);
  } catch (error) {
    next(error);
  }
};

export const finalize = async (req, res, next) => {
  try {
    const result = await payrollService.finalizeRun(req.params.id, req.user);
    ApiResponse.success(res, 200, result, 'Payroll finalized');
  } catch (error) {
    next(error);
  }
};

export const reopen = async (req, res, next) => {
  try {
    const result = await payrollService.reopenRun(req.params.id, req.body.reason, req.user);
    ApiResponse.success(res, 200, result, 'Payroll reopened');
  } catch (error) {
    next(error);
  }
};

export const mySlips = async (req, res, next) => {
  try {
    const slips = await payrollService.getMySlips(req.user._id);
    ApiResponse.success(res, 200, { slips });
  } catch (error) {
    next(error);
  }
};

export const slipPdf = async (req, res, next) => {
  try {
    const pdf = await payrollService.getSalarySlipPdf(req.params.id, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="salary-slip.pdf"');
    res.setHeader('Content-Length', pdf.length);
    res.end(pdf);
  } catch (error) {
    next(error);
  }
};
