import Quotation from './quotation.model.js';
import Client from '../clients/client.model.js';
import paginate, { getPaginationMeta, escapeRegex } from '../../utils/pagination.js';

const CLIENT_FIELDS = 'clientId companyName contactPerson email phone gstNumber brand address';
const PROJECT_FIELDS = 'projectCode title budget status deadline';

export const create = async (data) => Quotation.create(data);

export const findById = async (id) =>
  Quotation.findById(id)
    .populate('client', CLIENT_FIELDS)
    .populate('project', PROJECT_FIELDS)
    .populate('createdBy', 'name email');

export const findByQuotationNumber = async (quotationNumber) =>
  Quotation.findOne({ quotationNumber });

export const findAll = async (query = {}, options = {}) => {
  const { page, limit, skip, sort } = paginate(options);
  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search), 'i');
    const matchingClients = await Client.find({ companyName: searchRegex }, { _id: 1 });
    const clientIds = matchingClients.map((c) => c._id);
    filter.$or = [
      { quotationNumber: searchRegex },
      { subject: searchRegex },
      { scopeTitle: searchRegex },
    ];
    if (clientIds.length > 0) {
      filter.$or.push({ client: { $in: clientIds } });
    }
  }

  if (query.status) filter.status = query.status;
  if (query.client) filter.client = query.client;

  if (query.brand) {
    const brandClients = await Client.find({ brand: query.brand }).select('_id').lean();
    filter.client = { $in: brandClients.map((c) => c._id) };
  }

  if (query.dateFrom || query.dateTo) {
    filter.issueDate = {};
    if (query.dateFrom) filter.issueDate.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.issueDate.$lte = new Date(query.dateTo);
  }

  const [quotations, total] = await Promise.all([
    Quotation.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('client', 'clientId companyName brand')
      .populate('project', 'projectCode title'),
    Quotation.countDocuments(filter),
  ]);

  return { quotations, pagination: getPaginationMeta(total, page, limit) };
};

export const updateById = async (id, data) =>
  Quotation.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('client', CLIENT_FIELDS)
    .populate('project', PROJECT_FIELDS)
    .populate('createdBy', 'name email');

export const deleteById = async (id) => Quotation.findByIdAndDelete(id);

export const countAll = async (filter = {}) => Quotation.countDocuments(filter);

export const countByStatus = async () =>
  Quotation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

export const getFinancialStats = async () => {
  const result = await Quotation.aggregate([
    {
      $group: {
        _id: null,
        totalBudget: { $sum: '$budget' },
        totalQuoted: { $sum: '$price' },
        totalTax: { $sum: '$taxAmount' },
        totalValue: { $sum: '$total' },
        count: { $sum: 1 },
      },
    },
  ]);
  return result[0] || {
    totalBudget: 0,
    totalQuoted: 0,
    totalTax: 0,
    totalValue: 0,
    count: 0,
  };
};

export const getAcceptedStats = async () => {
  const result = await Quotation.aggregate([
    { $match: { status: 'accepted' } },
    {
      $group: {
        _id: null,
        acceptedValue: { $sum: '$total' },
        acceptedCount: { $sum: 1 },
      },
    },
  ]);
  return result[0] || { acceptedValue: 0, acceptedCount: 0 };
};

export const countByBrand = async () =>
  Quotation.aggregate([
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

export const getQuotationCountByPrefix = async (prefix) =>
  Quotation.countDocuments({ quotationNumber: { $regex: `^${escapeRegex(prefix)}` } });
