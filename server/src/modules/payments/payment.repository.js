import Payment from './payment.model.js';
import paginate, { getPaginationMeta, escapeRegex } from '../../utils/pagination.js';

export const create = async (data) => {
  return Payment.create(data);
};

export const findById = async (id) => {
  return Payment.findById(id)
    .populate('invoice', 'invoiceNumber total status')
    .populate('client', 'companyName contactPerson email')
    .populate('createdBy', 'name email');
};

export const findAll = async (query = {}, options = {}) => {
  const { page, limit, skip, sort } = paginate(options);
  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ referenceNo: searchRegex }];
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.paymentMethod) {
    filter.paymentMethod = query.paymentMethod;
  }

  if (query.invoice) {
    filter.invoice = query.invoice;
  }

  if (query.client) {
    filter.client = query.client;
  }

  if (query.dateFrom || query.dateTo) {
    filter.paymentDate = {};
    if (query.dateFrom) filter.paymentDate.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.paymentDate.$lte = new Date(query.dateTo);
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('invoice', 'invoiceNumber total status')
      .populate('client', 'companyName contactPerson')
      .populate('createdBy', 'name email'),
    Payment.countDocuments(filter),
  ]);

  return { payments, pagination: getPaginationMeta(total, page, limit) };
};

export const findByInvoice = async (invoiceId) => {
  return Payment.find({ invoice: invoiceId })
    .sort({ paymentDate: -1 })
    .populate('createdBy', 'name email');
};

export const updateById = async (id, data) => {
  return Payment.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('invoice', 'invoiceNumber total status')
    .populate('client', 'companyName contactPerson email')
    .populate('createdBy', 'name email');
};

export const deleteById = async (id) => {
  return Payment.findByIdAndDelete(id);
};

export const getTotalByInvoice = async (invoiceId) => {
  const result = await Payment.aggregate([
    { $match: { invoice: invoiceId, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result.length > 0 ? result[0].total : 0;
};

export const getStats = async () => {
  const [totalCollected, pendingAmount, byMethod] = await Promise.all([
    Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  return {
    totalCollected: totalCollected.length > 0 ? totalCollected[0].total : 0,
    pendingAmount: pendingAmount.length > 0 ? pendingAmount[0].total : 0,
    byMethod,
  };
};
