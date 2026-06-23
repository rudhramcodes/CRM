import Meeting from './meeting.model.js';
import paginate, { getPaginationMeta } from '../../utils/pagination.js';

export const create = async (data) => {
  return Meeting.create(data);
};

export const findById = async (id) => {
  return Meeting.findById(id)
    .populate('lead', 'name email company')
    .populate('client', 'companyName contactPerson email')
    .populate('createdBy', 'name email');
};

export const findAll = async (query = {}, options = {}) => {
  const { page, limit, skip, sort } = paginate(options);
  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(query.search, 'i');
    filter.$or = [{ title: searchRegex }, { notes: searchRegex }, { location: searchRegex }];
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.lead) {
    filter.lead = query.lead;
  }

  if (query.client) {
    filter.client = query.client;
  }

  if (query.dateFrom || query.dateTo) {
    filter.date = {};
    if (query.dateFrom) filter.date.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.date.$lte = new Date(query.dateTo);
  }

  const [meetings, total] = await Promise.all([
    Meeting.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('lead', 'name email')
      .populate('client', 'companyName contactPerson')
      .populate('createdBy', 'name email'),
    Meeting.countDocuments(filter),
  ]);

  return { meetings, pagination: getPaginationMeta(total, page, limit) };
};

export const updateById = async (id, data) => {
  return Meeting.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('lead', 'name email company')
    .populate('client', 'companyName contactPerson email')
    .populate('createdBy', 'name email');
};

export const updateNotesById = async (id, notes) => {
  return Meeting.findByIdAndUpdate(id, { notes }, { new: true, runValidators: true })
    .populate('lead', 'name email company')
    .populate('client', 'companyName contactPerson email')
    .populate('createdBy', 'name email');
};

export const deleteById = async (id) => {
  return Meeting.findByIdAndDelete(id);
};

export const countByStatus = async () => {
  return Meeting.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
};

export const countUpcoming = async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Meeting.countDocuments({
    status: 'scheduled',
    date: { $gte: startOfToday },
  });
};
