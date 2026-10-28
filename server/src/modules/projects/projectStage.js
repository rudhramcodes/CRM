import ApiError from '../../utils/ApiError.js';
import { PROJECT_STAGES, STAGE_PROGRESS } from '../../constants/index.js';

export const QC_ITEMS = ['scopeComplete', 'filesCorrect', 'clientCommitmentsMet', 'noOpenBlockers'];
export const LEGACY_STAGE = { planning: 'planning', active: 'execution', review: 'review', completed: 'delivered' };
export const STAGE_STATUS = { brief: 'planning', planning: 'planning', execution: 'active', review: 'review', delivered: 'completed' };

export const assertProjectEditor = (project, user) => {
  if (['admin', 'super_admin'].includes(user?.role)) return;
  const id = String(user?._id);
  const assigned = String(project.ownerId?._id || project.ownerId) === id
    || (project.teamMembers || []).some((member) => String(member.user?._id || member.user) === id);
  if (user?.role !== 'manager' || !assigned) throw ApiError.forbidden('Only an Admin or an assigned project Manager can change this project');
};

export const hasPassedQC = (project) => project.qcChecklist?.status === 'passed'
  && QC_ITEMS.every((key) => {
    const item = project.qcChecklist[key];
    return item?.checked === true && item.checkedBy && item.checkedAt;
  });

export const getStageChange = (project, targetStage, user, reason = '') => {
  assertProjectEditor(project, user);
  if (!Object.values(PROJECT_STAGES).includes(targetStage)) throw ApiError.badRequest('Invalid project stage');
  if (!project.stage) throw ApiError.conflict('This legacy project needs the approved SOP migration before changing stage');
  if (project.stage === targetStage) return null;
  const backwards = STAGE_PROGRESS[targetStage] < STAGE_PROGRESS[project.stage];
  const trimmedReason = reason.trim();
  if (backwards && !trimmedReason) throw ApiError.badRequest('A reason is required to move a project backward');
  if (targetStage === PROJECT_STAGES.DELIVERED) {
    const note = project.closingNote;
    if (!hasPassedQC(project) || !note?.deliveredWhat?.trim() || !note.deliveredWhen || !note.writtenBy || !note.writtenAt) {
      throw ApiError.badRequest('Admin QC and Closing Note required');
    }
    const pending = (project.deliverables || []).filter((item) => item.status !== 'delivered');
    if (pending.length) throw ApiError.badRequest(`Undelivered deliverables exist: ${pending.map((item) => item.title).join(', ')}`);
  }
  return { fromStage: project.stage, toStage: targetStage, changedBy: user._id, reason: trimmedReason, changedAt: new Date(), backwards };
};
