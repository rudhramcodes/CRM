import Project from '../modules/projects/project.model.js';
import { VENTURE_CODES } from '../constants/index.js';

const generateProjectCode = async (brand) => {
  const ventureCode = VENTURE_CODES[brand];
  if (!ventureCode) {
    throw new Error(`Invalid brand: ${brand}. No venture code mapped.`);
  }

  const year = new Date().getFullYear().toString();
  const prefix = `RE-PRJ-${ventureCode}-${year}-`;

  const last = await Project.findOne({ projectCode: { $regex: `^${prefix}` } })
    .sort({ projectCode: -1 })
    .select('projectCode')
    .lean();

  let seq = 1;
  if (last?.projectCode) {
    const lastSeq = parseInt(last.projectCode.split('-').pop(), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(3, '0')}`;
};

export default generateProjectCode;
