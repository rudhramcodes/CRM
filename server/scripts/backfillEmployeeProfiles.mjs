import mongoose from 'mongoose';
import config from '../src/config/index.js';
import User from '../src/modules/auth/auth.model.js';
import { Counter, EmployeeProfile } from '../src/modules/employees/employee.model.js';
import { generateEmployeeId } from '../src/modules/employees/employee.service.js';
import logger from '../src/utils/logger.js';

const STAFF_ROLES = ['admin', 'manager', 'employee'];

const sequenceFromEmployeeId = (employeeId) => {
  const match = String(employeeId || '').match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
};

const run = async () => {
  await mongoose.connect(config.mongodbUri);
  logger.info('[backfill] Connected to MongoDB');

  const existingProfiles = await EmployeeProfile.find({}).select('employeeId').lean();
  const maxSequence = existingProfiles.reduce(
    (max, profile) => Math.max(max, sequenceFromEmployeeId(profile.employeeId)),
    0,
  );

  if (maxSequence > 0) {
    await Counter.findOneAndUpdate(
      { key: 'employeeId' },
      { $max: { value: maxSequence } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  const users = await User.find({ role: { $in: STAFF_ROLES } })
    .select('_id name email role')
    .sort({ createdAt: 1 })
    .lean();
  const profileUserIds = new Set(
    (await EmployeeProfile.find({ user: { $in: users.map((user) => user._id) } }).select('user').lean())
      .map((profile) => String(profile.user)),
  );

  let created = 0;
  for (const user of users) {
    if (profileUserIds.has(String(user._id))) continue;
    const profile = await EmployeeProfile.create({
      user: user._id,
      employeeId: await generateEmployeeId(),
      designation: null,
      dateOfJoining: null,
      dateOfLeaving: null,
    });
    created += 1;
    logger.info(`[backfill] ${user.name} <${user.email}> -> ${profile.employeeId}`);
  }

  logger.info(`[backfill] Staff users: ${users.length}; profiles created: ${created}; already present: ${profileUserIds.size}`);
  logger.info('[backfill] Review designation, date of joining, salary, and bank details in the Employees directory.');
  await mongoose.disconnect();
};

run().catch(async (error) => {
  logger.error(`[backfill] Failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
