import * as freelancerRepo from './freelancer.repository.js';
import ApiError from '../../utils/ApiError.js';
import { ROLES } from '../../constants/index.js';

const isAdmin = (user) => [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user?.role);

const nextFreelancerCode = async () => {
  const latest = await freelancerRepo.findLatestFreelancer();
  let nextNumber = 1;
  if (latest && latest.freelancerCode) {
    const match = latest.freelancerCode.match(/FRL-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  return `FRL-${String(nextNumber).padStart(5, '0')}`;
};

// Only fields that were sent are touched: a partial update (e.g. just { status }) must not blank the email.
const normalize = (data) => ({
  ...data,
  ...('email' in data ? { email: data.email?.trim().toLowerCase() || '' } : {}),
  ...('displayName' in data || 'fullName' in data ? { displayName: data.displayName?.trim() || data.fullName } : {}),
  ventureProfiles: data.ventureProfiles?.map((profile) => ({
    ...profile,
    serviceCategories: [...new Set(profile.serviceCategories || [])],
  })),
});

const assertDuplicateFree = async (data, id = null) => {
  const [phoneMatch, emailMatch] = await Promise.all([
    freelancerRepo.findByPhone(data.phone, id),
    data.email ? freelancerRepo.findByEmail(data.email, id) : null,
  ]);
  if (phoneMatch) throw ApiError.conflict(`A freelancer already uses this phone number (${phoneMatch.fullName})`);
  if (emailMatch) throw ApiError.conflict(`A freelancer already uses this email address (${emailMatch.fullName})`);
};

export const getAll = (query, options) => freelancerRepo.findAll(query, options);

export const getById = async (id) => {
  const freelancer = await freelancerRepo.findById(id);
  if (!freelancer) throw ApiError.notFound('Freelancer not found');
  return freelancer;
};

export const create = async (data, user = null) => {
  const normalized = normalize(data);
  await assertDuplicateFree(normalized);
  const auditFields = user?._id
    ? { createdBy: user._id, updatedBy: user._id }
    : {};
  return freelancerRepo.create({
    ...normalized,
    freelancerCode: normalized.freelancerCode || await nextFreelancerCode(),
    ...auditFields,
  });
};

export const update = async (id, data, user) => {
  const current = await getById(id);
  // Archiving and restoring are admin-only (same as DELETE /:id); a manager can't do it through an edit.
  const touchesArchive = data.status !== undefined && data.status !== current.status
    && (data.status === 'archived' || current.status === 'archived');
  if (touchesArchive && !isAdmin(user)) throw ApiError.forbidden('Only admins can archive or restore freelancers');
  const normalized = normalize(data);
  if (normalized.phone || normalized.email) await assertDuplicateFree(normalized, id);
  return freelancerRepo.updateById(id, { ...normalized, updatedBy: user._id });
};

export const archive = async (id, user) => {
  await getById(id);
  return freelancerRepo.updateById(id, { status: 'archived', updatedBy: user._id });
};

export const getStats = async () => {
  const [byStatus, byVenture] = await Promise.all([freelancerRepo.countByStatus(), freelancerRepo.countByVenture()]);
  const status = Object.fromEntries(byStatus.map((item) => [item._id, item.count]));
  return {
    total: Object.values(status).reduce((sum, count) => sum + count, 0) - (status.archived || 0),
    active: status.active || 0,
    inactive: status.inactive || 0,
    archived: status.archived || 0,
    byVenture: Object.fromEntries(byVenture.map((item) => [item._id, item.count])),
  };
};

export const countByStatus = () => freelancerRepo.countByStatus();

export const remove = async (id, user) => {
  const current = await getById(id);
  // Permanent delete is the last step after archiving, as on the web and mobile screens.
  if (current.status !== 'archived') throw ApiError.conflict('Archive the freelancer before deleting it permanently');
  return freelancerRepo.deleteById(id);
};
