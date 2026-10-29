import Project from '../modules/projects/project.model.js';
const generateProjectCode = async () => {
  const [last] = await Project.aggregate([
    { $match: { projectCode: /^\d+$/ } },
    { $group: { _id: null, sequence: { $max: { $toLong: '$projectCode' } } } },
  ]);
  return String(Number(last?.sequence || 0) + 1).padStart(3, '0');
};

export const migrateProjectCodes = async () => {
  const projects = await Project.find({
    $or: [{ projectCode: /^RE-.*PRJ-/ }, { projectCode: '' }, { projectCode: null }],
  }).sort({ createdAt: 1, _id: 1 }).select('_id').lean();
  if (!projects.length) return;
  let sequence = Number(await generateProjectCode());
  await Project.bulkWrite(projects.map((project) => ({
    updateOne: {
      filter: { _id: project._id },
      update: { $set: { projectCode: String(sequence++).padStart(3, '0') } },
    },
  })));
};

export default generateProjectCode;
