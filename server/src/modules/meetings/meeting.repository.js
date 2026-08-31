import Meeting from './meeting.model.js';
import Client from '../clients/client.model.js';
import Lead from '../leads/lead.model.js';
import paginate, { getPaginationMeta, escapeRegex } from '../../utils/pagination.js';

export const create = async (data) => {
  return Meeting.create(data);
};

export const findById = async (id) => {
  return Meeting.findById(id)
    .populate('lead', 'name email company')
    .populate('client', 'companyName contactPerson email')
    .populate('attendees', 'name email avatar')
    .populate('createdBy', 'name email');
};

export const findAll = async (query = {}, options = {}) => {
  const { page, limit, skip, sort } = paginate(options);
  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search), 'i');
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

  if (query.brand) {
    const [brandClientIds, brandLeadIds] = await Promise.all([
      Client.find({ brand: query.brand }).select('_id').lean(),
      Lead.find({ brand: query.brand, isDeleted: false }).select('_id').lean(),
    ]);
    const clientIds = brandClientIds.map((c) => c._id);
    const leadIds = brandLeadIds.map((l) => l._id);
    filter.$or = [
      { client: { $in: clientIds } },
      { lead: { $in: leadIds } },
    ];
  }

  if (query.dateFrom || query.dateTo) {
    filter.date = {};
    if (query.dateFrom) filter.date.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.date.$lte = new Date(query.dateTo);
  }

  if (options.accessFilter) {
    Object.assign(filter, options.accessFilter);
  }

  const [meetings, total] = await Promise.all([
    Meeting.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('lead', 'name email brand')
      .populate('client', 'companyName contactPerson brand')
      .populate('attendees', 'name email avatar')
      .populate('createdBy', 'name email'),
    Meeting.countDocuments(filter),
  ]);

  return { meetings, pagination: getPaginationMeta(total, page, limit) };
};

export const updateById = async (id, data) => {
  return Meeting.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('lead', 'name email company')
    .populate('client', 'companyName contactPerson email')
    .populate('attendees', 'name email avatar')
    .populate('createdBy', 'name email');
};

export const updateNotesById = async (id, notes) => {
  return Meeting.findByIdAndUpdate(id, { notes }, { new: true, runValidators: true })
    .populate('lead', 'name email company')
    .populate('client', 'companyName contactPerson email')
    .populate('attendees', 'name email avatar')
    .populate('createdBy', 'name email');
};

export const deleteById = async (id) => {
  return Meeting.findByIdAndDelete(id);
};

export const findBySeriesId = async (seriesId) => {
  return Meeting.find({ seriesId }).select('_id title date startTime endTime status');
};

export const deleteSeries = async (seriesId) => {
  const res = await Meeting.deleteMany({ seriesId });
  return res.deletedCount;
};

export const addActionItem = async (id, item) => {
  return Meeting.findByIdAndUpdate(
    id,
    { $push: { actionItems: item } },
    { new: true, runValidators: true },
  ).populate('actionItems.assignee', 'name email avatar');
};

export const updateActionItem = async (id, itemId, data) => {
  const set = {};
  if (data.text !== undefined) set['actionItems.$.text'] = data.text;
  if (data.assignee !== undefined) set['actionItems.$.assignee'] = data.assignee;
  if (data.dueDate !== undefined) set['actionItems.$.dueDate'] = data.dueDate ?? null;
  if (data.status !== undefined) {
    set['actionItems.$.status'] = data.status;
    set['actionItems.$.completedAt'] = data.status === 'done' ? new Date() : null;
  }

  return Meeting.findOneAndUpdate(
    { _id: id, 'actionItems._id': itemId },
    { $set: set },
    { new: true, runValidators: true },
  ).populate('actionItems.assignee', 'name email avatar');
};

export const removeActionItem = async (id, itemId) => {
  return Meeting.findByIdAndUpdate(
    id,
    { $pull: { actionItems: { _id: itemId } } },
    { new: true },
  ).populate('actionItems.assignee', 'name email avatar');
};

export const markActionItemConverted = async (id, itemId, taskId) => {
  return Meeting.findOneAndUpdate(
    { _id: id, 'actionItems._id': itemId },
    { $set: { 'actionItems.$.convertedToTask': taskId } },
    { new: true },
  ).populate('actionItems.assignee', 'name email avatar');
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

export const findConflicting = async (date, excludeId) => {
  const start = new Date(date);
  const endOfDay = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const filter = {
    date: { $gte: start, $lt: endOfDay },
    status: { $ne: 'cancelled' },
  };
  if (excludeId) filter._id = { $ne: excludeId };

  return Meeting.find(filter).select('_id title date startTime endTime attendees createdBy status');
};
