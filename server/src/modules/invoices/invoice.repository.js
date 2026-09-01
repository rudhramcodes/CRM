import mongoose from 'mongoose';
import Invoice from './invoice.model.js';
import paginate, { getPaginationMeta, escapeRegex } from '../../utils/pagination.js';

const Client = mongoose.model('Client');

export const create = async (data) => {
  return Invoice.create(data);
};

export const findById = async (id) => {
  return Invoice.findById(id)
    .populate('client', 'clientId companyName contactPerson email phone gstNumber brand address')
    .populate('project', 'title status')
    .populate('createdBy', 'name email');
};

export const findByInvoiceNumber = async (invoiceNumber) => {
  return Invoice.findOne({ invoiceNumber });
};

export const findAll = async (query = {}, options = {}) => {
  const { page, limit, skip, sort } = paginate(options);
  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search), 'i');
    const matchingClients = await Client.find(
      { companyName: searchRegex },
      { _id: 1 },
    );
    const clientIds = matchingClients.map((c) => c._id);
    filter.$or = [{ invoiceNumber: searchRegex }];
    if (clientIds.length > 0) {
      filter.$or.push({ client: { $in: clientIds } });
    }
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.client) {
    filter.client = query.client;
  }

  if (query.brand) {
    const brandClients = await Client.find({ brand: query.brand }).select('_id').lean();
    const clientIds = brandClients.map((c) => c._id);
    filter.client = { $in: clientIds };
  }

  if (query.dateFrom || query.dateTo) {
    filter.issueDate = {};
    if (query.dateFrom) filter.issueDate.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.issueDate.$lte = new Date(query.dateTo);
  }

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('client', 'clientId companyName brand'),
    Invoice.countDocuments(filter),
  ]);

  return { invoices, pagination: getPaginationMeta(total, page, limit) };
};

export const updateById = async (id, data) => {
  return Invoice.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('client', 'clientId companyName contactPerson email phone gstNumber brand address')
    .populate('project', 'title status')
    .populate('createdBy', 'name email');
};

export const deleteById = async (id) => {
  return Invoice.findByIdAndDelete(id);
};

export const countByStatus = async () => {
  return Invoice.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
};

export const countByBrand = async () => {
  return Invoice.aggregate([
    {
      $lookup: {
        from: 'clients',
        localField: 'client',
        foreignField: '_id',
        as: 'clientDoc',
      },
    },
    { $unwind: { path: '$clientDoc', preserveNullAndEmptyArrays: true } },
    { $group: { _id: '$clientDoc.brand', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
};

export const getRevenueByBrand = async () => {
  return Invoice.aggregate([
    { $match: { status: { $in: ['paid', 'sent', 'overdue', 'partially_paid'] } } },
    {
      $lookup: {
        from: 'clients',
        localField: 'client',
        foreignField: '_id',
        as: 'clientDoc',
      },
    },
    { $unwind: { path: '$clientDoc', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$clientDoc.brand',
        totalRevenue: { $sum: '$total' },
        totalPaid: { $sum: '$paidAmount' },
        totalPending: { $sum: '$balanceDue' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

export const countAll = async (filter = {}) => {
  return Invoice.countDocuments(filter);
};

export const getRevenueStats = async () => {
  const result = await Invoice.aggregate([
    { $match: { status: { $in: ['paid', 'sent', 'overdue', 'partially_paid'] } } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalPaid: { $sum: '$paidAmount' },
        totalPending: { $sum: '$balanceDue' },
        count: { $sum: 1 },
      },
    },
  ]);
  return result[0] || { totalRevenue: 0, totalPaid: 0, totalPending: 0, count: 0 };
};

export const countOverdue = async () => {
  const now = new Date();
  return Invoice.countDocuments({
    status: { $in: ['sent', 'overdue', 'partially_paid'] },
    dueDate: { $lt: now },
  });
};

export const getInvoiceCountByPrefix = async (prefix) => {
  return Invoice.countDocuments({ invoiceNumber: { $regex: `^${escapeRegex(prefix)}` } });
};
