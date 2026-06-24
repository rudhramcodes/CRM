import Client from './client.model.js';
import paginate, { getPaginationMeta, escapeRegex } from '../../utils/pagination.js';

export const create = async (data) => {
  return Client.create(data);
};

export const findById = async (id) => {
  return Client.findById(id)
    .populate('convertedFrom', 'name email source status')
    .populate('notes.createdBy', 'name email avatar role')
    .populate('createdBy', 'name email');
};

export const findByEmail = async (email) => {
  return Client.findOne({ email });
};

export const findByGst = async (gstNumber) => {
  return Client.findOne({ gstNumber });
};

export const findAll = async (query = {}, options = {}) => {
  const { page, limit, skip, sort } = paginate(options);

  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [
      { companyName: searchRegex },
      { contactPerson: searchRegex },
      { email: searchRegex },
      { gstNumber: searchRegex },
    ];
  }

  if (query.status) {
    filter.status = query.status;
  }

  const [clients, total] = await Promise.all([
    Client.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('convertedFrom', 'name email source status'),
    Client.countDocuments(filter),
  ]);

  return { clients, pagination: getPaginationMeta(total, page, limit) };
};

export const updateById = async (id, data) => {
  return Client.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('convertedFrom', 'name email source status')
    .populate('notes.createdBy', 'name email avatar role');
};

export const deleteById = async (id) => {
  return Client.findByIdAndDelete(id);
};

export const countByStatus = async () => {
  return Client.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
};

export const countAll = async (filter = {}) => {
  return Client.countDocuments(filter);
};
