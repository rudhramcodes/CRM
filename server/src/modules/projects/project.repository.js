import Project from './project.model.js';
import Client from '../clients/client.model.js';
import paginate, { getPaginationMeta, escapeRegex } from '../../utils/pagination.js';

export const create = async (data) => {
  return Project.create(data);
};

export const findById = async (id) => {
  return Project.findById(id)
    .populate('client', 'companyName contactPerson email brand status')
    .populate('teamMembers.user', 'name email avatar')
    .populate('tasks.assignedTo', 'name email avatar')
    .populate('tasks.createdBy', 'name email avatar')
    .populate('activities.performedBy', 'name email avatar role')
    .populate('createdBy', 'name email');
};

export const findAll = async (query = {}, options = {}) => {
  const { page, limit, skip, sort } = paginate(options);
  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: searchRegex }, { description: searchRegex }];
  }

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.tag) filter.tags = { $in: [query.tag] };
  if (query.employeeFilter) filter['teamMembers.user'] = query.employeeFilter;
  if (options.client) filter.client = options.client;

  if (query.brand) {
    const brandClientIds = (await Client.find({ brand: query.brand }).select('_id').lean()).map((c) => c._id);
    filter.client = { $in: brandClientIds };
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('client', 'companyName contactPerson email brand status')
      .populate('teamMembers.user', 'name email avatar')
      .populate('createdBy', 'name email'),
    Project.countDocuments(filter),
  ]);

  return { projects, pagination: getPaginationMeta(total, page, limit) };
};

export const updateById = async (id, data, activities = []) => {
  const update = { ...data };
  if (activities.length > 0) {
    update.$push = { activities: { $each: activities } };
    delete update.activities;
  }
  return Project.findByIdAndUpdate(id, update, { new: true, runValidators: true })
    .populate('client', 'companyName contactPerson email brand status')
    .populate('teamMembers.user', 'name email avatar')
    .populate('tasks.assignedTo', 'name email avatar')
    .populate('tasks.createdBy', 'name email avatar')
    .populate('activities.performedBy', 'name email avatar role')
    .populate('createdBy', 'name email');
};

export const deleteById = async (id) => {
  return Project.findByIdAndDelete(id);
};

export const countByStatus = async () => {
  return Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
};

export const countByBrand = async () => {
  return Project.aggregate([
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

export const countAll = async (filter = {}) => {
  return Project.countDocuments(filter);
};
