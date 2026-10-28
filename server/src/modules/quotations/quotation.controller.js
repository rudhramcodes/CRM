import ApiResponse from '../../utils/ApiResponse.js';
import * as quotationService from './quotation.service.js';

export const list = async (req, res, next) => {
  try {
    const result = await quotationService.getQuotations(req.query);
    ApiResponse.paginated(res, result.quotations, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const quotation = await quotationService.getQuotationById(req.params.id);
    ApiResponse.success(res, 200, { quotation });
  } catch (error) {
    next(error);
  }
};

export const getHtml = async (req, res, next) => {
  try {
    const html = await quotationService.getQuotationHtml(req.params.id);
    res.type('html').send(html);
  } catch (error) {
    next(error);
  }
};

export const downloadPdf = async (req, res, next) => {
  try {
    const quotation = await quotationService.getQuotationById(req.params.id);
    const pdf = await quotationService.getQuotationPdf(req.params.id);
    const filename = `quotation-${quotation.quotationNumber || req.params.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const quotation = await quotationService.createQuotation(req.body, req.user);
    ApiResponse.created(res, { quotation }, 'Quotation created successfully');
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const quotation = await quotationService.updateQuotation(req.params.id, req.body);
    ApiResponse.success(res, 200, { quotation }, 'Quotation updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const quotation = await quotationService.updateQuotationStatus(
      req.params.id,
      req.body.status,
    );
    ApiResponse.success(
      res,
      200,
      { quotation },
      `Quotation ${req.body.status} successfully`,
    );
  } catch (error) {
    next(error);
  }
};

export const resendEmail = async (req, res, next) => {
  try {
    await quotationService.resendQuotationEmail(req.params.id);
    ApiResponse.success(res, 200, null, 'Quotation email sent successfully');
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await quotationService.deleteQuotation(req.params.id);
    ApiResponse.success(res, 200, null, 'Quotation deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const stats = async (req, res, next) => {
  try {
    const data = await quotationService.getStats();
    ApiResponse.success(res, 200, data);
  } catch (error) {
    next(error);
  }
};
