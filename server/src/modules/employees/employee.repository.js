import { Counter, EmployeeCompensation, EmployeeProfile } from './employee.model.js';

export const nextCounterValue = async (key) => {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return counter.value;
};

export const createProfile = async (data) => EmployeeProfile.create(data);

export const findProfileByUser = async (userId) => EmployeeProfile.findOne({ user: userId });

export const findProfileById = async (id) => EmployeeProfile.findById(id);

export const findProfileByEmployeeId = async (employeeId) => EmployeeProfile.findOne({ employeeId });

export const findProfilesByUsers = async (userIds = []) => {
  if (!userIds.length) return [];
  return EmployeeProfile.find({ user: { $in: userIds } }).lean();
};

export const updateProfile = async (userId, data) =>
  EmployeeProfile.findOneAndUpdate({ user: userId }, data, { new: true, runValidators: true });

export const deleteProfileByUser = async (userId) => EmployeeProfile.findOneAndDelete({ user: userId });

export const upsertCompensation = async (userId, data) =>
  EmployeeCompensation.findOneAndUpdate(
    { employee: userId },
    { ...data, employee: userId },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

export const findCompensationByUser = async (userId) =>
  EmployeeCompensation.findOne({ employee: userId }).select(
    '+monthlyGrossSalary +salaryEffectiveFrom +bankName +bankAccountNumber +ifscCode +updatedBy',
  );

export const findCompensationsByUsers = async (userIds = []) => {
  if (!userIds.length) return [];
  return EmployeeCompensation.find({ employee: { $in: userIds } })
    .select('+monthlyGrossSalary +salaryEffectiveFrom +bankName +bankAccountNumber +ifscCode')
    .lean();
};

export const deleteCompensationByUser = async (userId) =>
  EmployeeCompensation.findOneAndDelete({ employee: userId });
