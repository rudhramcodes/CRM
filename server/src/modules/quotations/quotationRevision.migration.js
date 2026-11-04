import mongoose from 'mongoose';
import Quotation from './quotation.model.js';
import { getFamily, makeWorkingCopy, conflict } from './quotationRevision.service.js';
import { snapshotContent, latestProjection } from '../../services/quotationSnapshot.js';
import { storeArtifacts, removeArtifacts } from '../../services/quotationArtifacts.js';

export const migrateQuotation = async (id, user) => {
  const family = await getFamily(id);
  if (family.schemaVersion === 2) return family;
  const content = await snapshotContent(family);
  const revisionId = new mongoose.Types.ObjectId();
  const artifacts = await storeArtifacts(content, 1, { quotationId: family._id, revisionId });
  const revision = {
    _id: revisionId, version: 1, content, artifacts, status: family.status,
    revisionNote: 'Legacy baseline reconstructed from current state', changedFields: [],
    createdBy: user._id, createdByName: user.name, createdAt: new Date(), provenance: 'legacy_reconstructed', originalArtifactAvailable: false,
    sentAt: family.sentAt, acceptedAt: family.acceptedAt, rejectedAt: family.rejectedAt, expiredAt: family.expiredAt,
    sendAttempts: [], statusEvents: [],
  };
  try {
    const result = await Quotation.findOneAndUpdate({
      _id: id, schemaVersion: { $ne: 2 }, updatedAt: family.updatedAt,
    }, { $set: {
      ...latestProjection(content), schemaVersion: 2, latestVersion: 1, revisions: [revision],
      workingCopy: family.status === 'draft' ? makeWorkingCopy(content, { sourceVersion: 1, baseVersion: 1 }, user) : null,
    } }, { new: true, runValidators: true }).lean();
    if (!result) throw conflict();
    return result;
  } catch (error) {
    await removeArtifacts(artifacts);
    throw error;
  }
};
