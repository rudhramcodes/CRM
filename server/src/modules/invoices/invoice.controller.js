import ApiResponse from '../../utils/ApiResponse.js';
import * as invoiceService from './invoice.service.js';

export const list = async (req, res, next) => {
  try {
    const result = await invoiceService.getInvoices(req.query);
    ApiResponse.paginated(res, result.invoices, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    ApiResponse.success(res, 200, { invoice });
  } catch (error) {
    next(error);
  }
};

export const getHtml = async (req, res, next) => {
  try {
    const html = await invoiceService.getInvoiceHtml(req.params.id);
    res.type('html').send(html);
  } catch (error) {
    next(error);
  }
};

export const downloadPdf = async (req, res, next) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    const pdf = await invoiceService.getInvoicePdf(req.params.id);
    const filename = `invoice-${invoice.invoiceNumber || req.params.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const invoice = await invoiceService.createInvoice(req.body, req.user);
    ApiResponse.created(res, { invoice }, 'Invoice created successfully');
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const invoice = await invoiceService.updateInvoice(req.params.id, req.body);
    ApiResponse.success(res, 200, { invoice }, 'Invoice updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const invoice = await invoiceService.updateInvoiceStatus(req.params.id, req.body.status);
    ApiResponse.success(res, 200, { invoice }, `Invoice ${req.body.status} successfully`);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await invoiceService.deleteInvoice(req.params.id);
    ApiResponse.success(res, 200, null, 'Invoice deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const stats = async (req, res, next) => {
  try {
    const data = await invoiceService.getStats();
    ApiResponse.success(res, 200, data);
  } catch (error) {
    next(error);
  }
};

export const resendEmail = async (req, res, next) => {
  try {
    await invoiceService.sendInvoiceEmailById(req.params.id);
    ApiResponse.success(res, 200, null, 'Invoice email sent successfully');
  } catch (error) {
    next(error);
  }
};
