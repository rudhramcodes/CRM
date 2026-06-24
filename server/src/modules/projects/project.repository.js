import Project from './project.model.js';
import paginate, { getPaginationMeta, escapeRegex } from '../../utils/pagination.js';

export const create = async (data) => {
  return Project.create(data);
};

export const findById = async (id) => {
  return Project.findById(id)
    .populate('teamMembers.user', 'name email avatar')
    .populate('createdBy', 'name email');
};

export const findAll = async (query = {}, options = {}) => {
  const { page, limit, skip, sort } = paginate(options);
  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: searchRegex }, { description: searchRegex }];
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.tag) {
    filter.tags = { $in: [query.tag] };
  }

  if (query.employeeFilter) {
    filter['teamMembers.user'] = query.employeeFilter;
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('teamMembers.user', 'name email avatar')
      .populate('createdBy', 'name email'),
    Project.countDocuments(filter),
  ]);

  return { projects, pagination: getPaginationMeta(total, page, limit) };
};

export const updateById = async (id, data) => {
  return Project.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('teamMembers.user', 'name email avatar')
    .populate('createdBy', 'name email');
};

export const deleteById = async (id) => {
  return Project.findByIdAndDelete(id);
};

export const countByStatus = async () => {
  return Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
};

export const countAll = async (filter = {}) => {
  return Project.countDocuments(filter);
};
