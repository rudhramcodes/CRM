import * as freelancerRepo from './freelancer.repository.js';
import ApiError from '../../utils/ApiError.js';

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

const normalize = (data) => ({
  ...data,
  email: data.email?.trim().toLowerCase() || '',
  displayName: data.displayName?.trim() || data.fullName,
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
  await getById(id);
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
  await getById(id);
  return freelancerRepo.deleteById(id);
};
