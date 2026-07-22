import ApiResponse from '../../utils/ApiResponse.js';
import * as paymentService from './payment.service.js';

export const list = async (req, res, next) => {
  try {
    const result = await paymentService.getPayments(req.query);
    ApiResponse.paginated(res, result.payments, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    ApiResponse.success(res, 200, { payment });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const payment = await paymentService.createPayment(req.body, req.user);
    ApiResponse.created(res, { payment }, 'Payment recorded successfully');
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const payment = await paymentService.updatePayment(req.params.id, req.body);
    ApiResponse.success(res, 200, { payment }, 'Payment updated successfully');
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await paymentService.deletePayment(req.params.id);
    ApiResponse.success(res, 200, null, 'Payment deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const invoicePayments = async (req, res, next) => {
  try {
    const payments = await paymentService.getInvoicePayments(req.params.invoiceId);
    ApiResponse.success(res, 200, { payments });
  } catch (error) {
    next(error);
  }
};

export const stats = async (req, res, next) => {
  try {
    const data = await paymentService.getPaymentStats();
    ApiResponse.success(res, 200, data);
  } catch (error) {
    next(error);
  }
};
