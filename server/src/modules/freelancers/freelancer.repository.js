import Freelancer from './freelancer.model.js';
import paginate, { getPaginationMeta, escapeRegex } from '../../utils/pagination.js';

export const create = (data) => Freelancer.create(data);

export const findById = (id) => Freelancer.findById(id).populate('createdBy', 'name email').populate('updatedBy', 'name email');

export const findByPhone = (phone, excludeId = null) => {
  if (!phone) return null;
  const filter = { phone };
  if (excludeId) filter._id = { $ne: excludeId };
  return Freelancer.findOne(filter).select('_id freelancerCode fullName phone status');
};

export const findByEmail = (email, excludeId = null) => {
  if (!email) return null;
  const filter = { email: email.toLowerCase() };
  if (excludeId) filter._id = { $ne: excludeId };
  return Freelancer.findOne(filter).select('_id freelancerCode fullName email status');
};

export const findAll = async (query = {}, options = {}) => {
  const { page, limit, skip, sort } = paginate(options);
  const filter = {};
  if (query.status) filter.status = query.status;
  else if (query.includeArchived !== 'true') filter.status = { $ne: 'archived' };
  if (query.venture) filter['ventureProfiles.venture'] = query.venture;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [
      { freelancerCode: regex }, { fullName: regex }, { displayName: regex },
      { phone: regex }, { email: regex }, { city: regex },
      { 'ventureProfiles.serviceCategories': regex },
    ];
  }
  const [freelancers, total] = await Promise.all([
    Freelancer.find(filter).sort(sort).skip(skip).limit(limit).populate('createdBy', 'name'),
    Freelancer.countDocuments(filter),
  ]);
  return { freelancers, pagination: getPaginationMeta(total, page, limit) };
};

export const updateById = (id, data) => Freelancer.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('createdBy', 'name email').populate('updatedBy', 'name email');

export const countByStatus = () => Freelancer.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
export const countByVenture = () => Freelancer.aggregate([
  { $unwind: '$ventureProfiles' },
  { $match: { status: { $ne: 'archived' }, 'ventureProfiles.active': true } },
  { $group: { _id: '$ventureProfiles.venture', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]);
