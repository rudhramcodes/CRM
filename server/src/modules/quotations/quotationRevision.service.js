import mongoose from 'mongoose';
import Quotation from './quotation.model.js';
import ApiError from '../../utils/ApiError.js';
import { snapshotContent, latestProjection, idOf } from '../../services/quotationSnapshot.js';
import { storeArtifacts, removeArtifacts, readArtifact, renderFrozenArtifacts } from '../../services/quotationArtifacts.js';
import { tokensSchema, startWorkingSchema, editWorkingSchema, saveRevisionSchema, archiveSchema } from './quotationRevision.validation.js';

export const parseRevisionInput = (schema, input) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw ApiError.badRequest('Invalid revision request', parsed.error.issues);
  return parsed.data;
};
export const conflict = () => ApiError.conflict('Quotation changed or is archived. Reload and retry with current version tokens.');
export const getFamily = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid quotation ID');
  const family = await Quotation.findById(id).lean();
  if (!family) throw ApiError.notFound('Quotation not found');
  return family;
};
export const requireVersioned = (family) => {
  if (family.schemaVersion !== 2) throw ApiError.conflict('Create an explicit legacy baseline before using revisions');
};
export const getRevision = async (id, version) => {
  const family = await getFamily(id);
  requireVersioned(family);
  const revision = family.revisions.find((item) => item.version === Number(version));
  if (!revision) throw ApiError.notFound('Saved quotation revision not found');
  return revision;
};

export const makeWorkingCopy = (content, tokens, user) => ({
  ...tokens, editVersion: 0, content, createdBy: user._id, updatedBy: user._id,
  createdAt: new Date(), updatedAt: new Date(),
});
const workingFilter = (family, tokens) => ({
  _id: family._id, schemaVersion: 2, archivedAt: null, latestVersion: tokens.baseVersion,
  'workingCopy.baseVersion': tokens.baseVersion, 'workingCopy.editVersion': tokens.editVersion,
});
const updated = async (filter, update) => {
  const family = await Quotation.findOneAndUpdate(filter, update, { new: true, runValidators: true }).lean();
  if (!family) throw conflict();
  return family;
};

export const createWorkingCopy = async (id, input, user) => {
  const tokens = parseRevisionInput(startWorkingSchema, input);
  const family = await getFamily(id);
  requireVersioned(family);
  const source = family.revisions.find((revision) => revision.version === tokens.sourceVersion);
  if (!source) throw ApiError.badRequest('Source version does not belong to this quotation');
  const content = await snapshotContent(source.content);
  return updated({ _id: id, schemaVersion: 2, latestVersion: tokens.baseVersion, workingCopy: null, archivedAt: null }, {
    $set: { workingCopy: makeWorkingCopy(content, tokens, user) },
  });
};

export const editWorkingCopy = async (id, input, user) => {
  const { changes, ...tokens } = parseRevisionInput(editWorkingSchema, input);
  const family = await getFamily(id);
  requireVersioned(family);
  if (!family.workingCopy) throw conflict();
  if (family.latestVersion > 0) {
    if (changes.client !== undefined && changes.client !== String(family.client)) {
      throw ApiError.badRequest('Family client cannot change after V1; edit printed recipient fields instead');
    }
    if (changes.project !== undefined && (changes.project || null) !== (family.project ? String(family.project) : null)) {
      throw ApiError.badRequest('Family project cannot change after V1');
    }
  }
  const content = await snapshotContent({ ...family.workingCopy.content, ...changes });
  return updated(workingFilter(family, tokens), {
    $set: { 'workingCopy.content': content, 'workingCopy.updatedBy': user._id, 'workingCopy.updatedAt': new Date() },
    $inc: { 'workingCopy.editVersion': 1 },
  });
};

export const discardWorkingCopy = async (id, input) => {
  const tokens = parseRevisionInput(tokensSchema, input);
  const family = await getFamily(id);
  requireVersioned(family);
  return updated(workingFilter(family, tokens), { $set: { workingCopy: null } });
};

export const saveRevision = async (id, input, user) => {
  const { revisionNote, ...tokens } = parseRevisionInput(saveRevisionSchema, input);
  const family = await getFamily(id);
  requireVersioned(family);
  const working = family.workingCopy;
  if (!working || family.archivedAt || family.latestVersion !== tokens.baseVersion ||
      working.baseVersion !== tokens.baseVersion || working.editVersion !== tokens.editVersion) throw conflict();
  const content = await snapshotContent(working.content);
  const version = family.latestVersion + 1;
  const previous = family.revisions.at(-1)?.content || {};
  const changedFields = Object.keys(content).filter((field) => JSON.stringify(content[field]) !== JSON.stringify(previous[field]));
  const revisionId = new mongoose.Types.ObjectId();
  const artifacts = await storeArtifacts(content, version, { quotationId: family._id, revisionId });
  const revision = {
    _id: revisionId, version, content, artifacts, status: 'draft', revisionNote, changedFields,
    createdBy: user._id, createdByName: user.name, createdAt: new Date(), provenance: 'native', originalArtifactAvailable: true,
    sendAttempts: [], statusEvents: [], sentAt: null, acceptedAt: null, rejectedAt: null, expiredAt: null,
  };
  try {
    const quotation = await updated(workingFilter(family, tokens), {
      $push: { revisions: revision },
      $set: { ...latestProjection(content), latestVersion: version, workingCopy: null, status: 'draft',
        sentAt: null, acceptedAt: null, rejectedAt: null, expiredAt: null },
    });
    return { quotation, revision: quotation.revisions.at(-1) };
  } catch (error) {
    await removeArtifacts(artifacts);
    throw error;
  }
};

export const archiveQuotation = async (id, input, user) => {
  const { baseVersion, archived } = parseRevisionInput(archiveSchema, input);
  const family = await getFamily(id);
  requireVersioned(family);
  return updated({ _id: id, schemaVersion: 2, latestVersion: baseVersion, archivedAt: family.archivedAt }, {
    $set: { archivedAt: archived ? new Date() : null, archivedBy: archived ? user._id : null },
  });
};

export const getWorkingArtifact = async (id, type) => {
  const family = await getFamily(id);
  requireVersioned(family);
  if (!family.workingCopy) throw ApiError.notFound('Working copy not found');
  const content = await snapshotContent(family.workingCopy.content);
  const bytes = await renderFrozenArtifacts(content, family.latestVersion + 1);
  return bytes[type];
};
export const getRevisionArtifact = async (id, version, type) => {
  const revision = await getRevision(id, version);
  return readArtifact(revision.artifacts[type]);
};

export const getInvoiceSource = async (quotationId, revisionId) => {
  const family = await getFamily(quotationId);
  requireVersioned(family);
  if (family.archivedAt) throw ApiError.conflict('Archived quotations cannot be used for invoices');
  if (!revisionId) throw ApiError.badRequest('sourceRevision is required for versioned quotations');
  const revision = family.revisions.find((item) => String(item._id) === String(revisionId));
  if (!revision) throw ApiError.badRequest('Source revision does not belong to this quotation');
  return {
    revisionId: revision._id, version: revision.version, clientId: idOf(family.client),
    projectId: idOf(family.project), content: revision.content, status: revision.status,
  };
};
