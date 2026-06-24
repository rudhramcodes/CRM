import Lead from './lead.model.js';
import paginate, { getPaginationMeta, escapeRegex } from '../../utils/pagination.js';

export const create = async (data) => {
  return Lead.create(data);
};

export const findById = async (id) => {
  return Lead.findById(id)
    .populate('assignedTo', 'name email avatar')
    .populate('notes.createdBy', 'name email avatar role')
    .populate('createdBy', 'name email')
    .populate('convertedToClient', 'companyName email phone status');
};

export const findByEmail = async (email) => {
  return Lead.findOne({ email });
};

export const findAll = async (query = {}, options = {}) => {
  const { page, limit, skip, sort } = paginate(options);

  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: searchRegex }, { email: searchRegex }, { company: searchRegex }, { phone: searchRegex }];
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.brand) {
    filter.brand = query.brand;
  }

  if (query.source) {
    filter.source = query.source;
  }

  if (query.assignedTo) {
    filter.assignedTo = query.assignedTo;
  }

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'name email avatar')
      .populate('convertedToClient', 'companyName email phone status'),
    Lead.countDocuments(filter),
  ]);

  return { leads, pagination: getPaginationMeta(total, page, limit) };
};

export const updateById = async (id, data) => {
  return Lead.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('assignedTo', 'name email avatar')
    .populate('notes.createdBy', 'name email avatar role')
    .populate('convertedToClient', 'companyName email phone status');
};

export const deleteById = async (id) => {
  return Lead.findByIdAndDelete(id);
};

export const countByStatus = async () => {
  return Lead.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
};

export const countAll = async (filter = {}) => {
  return Lead.countDocuments(filter);
};
