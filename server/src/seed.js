import mongoose from 'mongoose';
import config from './config/index.js';
import User from './modules/auth/auth.model.js';
import { ROLES, ROLE_PERMISSIONS } from './constants/index.js';
import logger from './utils/logger.js';

const SEED_EMAIL = process.env.SEED_EMAIL || 'fizzzydev@gmail.com';
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'Test@123';
const SEED_NAME = process.env.SEED_NAME || 'Faizal Shaikh';
const SEED_PHONE = process.env.SEED_PHONE || '+91-9023827460';

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    logger.info('[seed] Connected to MongoDB');

    const existing = await User.findOne({ role: ROLES.SUPER_ADMIN });
    if (existing) {
      logger.info(`[seed] Super admin already exists: ${existing.email}. Updating permissions...`);
      existing.permissions = ROLE_PERMISSIONS[ROLES.SUPER_ADMIN];
      existing.isEmailVerified = true;
      await existing.save();
      logger.info('[seed] Permissions updated');
      await mongoose.disconnect();
      process.exit(0);
    }

    const user = await User.create({
      name: SEED_NAME,
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
      role: ROLES.SUPER_ADMIN,
      permissions: ROLE_PERMISSIONS[ROLES.SUPER_ADMIN],
      isEmailVerified: true,
      isActive: true,
      phone: SEED_PHONE,
    });

    logger.info(`[seed] Super admin created:`);
    logger.info(`  Email:    ${user.email}`);
    logger.info(`  Password: ${SEED_PASSWORD}`);
    logger.info(`  Role:     ${user.role}`);

    await mongoose.disconnect();
    logger.info('[seed] Done');
    process.exit(0);
  } catch (error) {
    logger.error(`[seed] Failed: ${error.message}`);
    process.exit(1);
  }
};

seedSuperAdmin();
