import Project from './project.model.js';
import Client from '../clients/client.model.js';
import ApiError from '../../utils/ApiError.js';
import paginate, { getPaginationMeta, escapeRegex } from '../../utils/pagination.js';

export const create = async (data) => {
  return Project.create(data);
};

export const findById = async (id) => {
  return Project.findById(id)
    .populate('client', 'companyName contactPerson email brand status')
    .populate('ownerId', 'name email avatar')
    .populate('teamMembers.user', 'name email avatar')
    .populate('tasks.assignedTo', 'name email avatar')
    .populate('tasks.createdBy', 'name email avatar')
    .populate('activities.performedBy', 'name email avatar role')
    .populate('stageHistory.changedBy', 'name')
    .populate('qcChecklist.scopeComplete.checkedBy', 'name')
    .populate('qcChecklist.filesCorrect.checkedBy', 'name')
    .populate('qcChecklist.clientCommitmentsMet.checkedBy', 'name')
    .populate('qcChecklist.noOpenBlockers.checkedBy', 'name')
    .populate('closingNote.writtenBy', 'name')
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
  if (query.stage) filter.stage = query.stage;
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

export const updateById = async (id, data, activities = [], expectedVersion) => {
  const update = { ...data };
  if (activities.length > 0) {
    update.$push = { activities: { $each: activities } };
    delete update.activities;
  }
  update.$inc = { __v: 1 };
  const filter = { _id: id };
  if (expectedVersion !== undefined) filter.__v = expectedVersion;
  const project = await Project.findOneAndUpdate(filter, update, { new: true, runValidators: true })
    .populate('client', 'companyName contactPerson email brand status')
    .populate('ownerId', 'name email avatar')
    .populate('teamMembers.user', 'name email avatar')
    .populate('tasks.assignedTo', 'name email avatar')
    .populate('tasks.createdBy', 'name email avatar')
    .populate('activities.performedBy', 'name email avatar role')
    .populate('stageHistory.changedBy', 'name')
    .populate('qcChecklist.scopeComplete.checkedBy', 'name')
    .populate('qcChecklist.filesCorrect.checkedBy', 'name')
    .populate('qcChecklist.clientCommitmentsMet.checkedBy', 'name')
    .populate('qcChecklist.noOpenBlockers.checkedBy', 'name')
    .populate('closingNote.writtenBy', 'name')
    .populate('createdBy', 'name email');
  if (!project) throw ApiError.conflict('Project changed while you were editing. Refresh and try again.');
  return project;
};

export const deleteById = async (id) => {
  return Project.findByIdAndDelete(id);
};

export const countByStatus = async () => {
  return Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
};

export const countByStage = async () => {
  return Project.aggregate([
    {
      $group: {
        _id: {
          $ifNull: [
            '$stage',
            {
              $switch: {
                branches: [
                  { case: { $eq: ['$status', 'active'] }, then: 'execution' },
                  { case: { $eq: ['$status', 'review'] }, then: 'review' },
                  { case: { $eq: ['$status', 'completed'] }, then: 'delivered' },
                ],
                default: 'planning',
              },
            },
          ],
        },
        count: { $sum: 1 },
      },
    },
  ]);
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
