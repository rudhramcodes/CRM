import mongoose from 'mongoose';
import config from './config/index.js';
import User from './modules/auth/auth.model.js';
import { ROLES, ROLE_PERMISSIONS } from './constants/index.js';
import logger from './utils/logger.js';

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    logger.info('Connected to MongoDB for seeding');

    const existing = await User.findOne({ email: 'faizal@crm.com' });
    if (existing) {
      logger.info('Super admin already exists, updating permissions...');
      existing.permissions = ROLE_PERMISSIONS[ROLES.SUPER_ADMIN];
      existing.isEmailVerified = true;
      await existing.save();
      logger.info('Super admin permissions updated');
    } else {
      const user = await User.create({
        name: 'Faizal Shaikh',
        email: 'faizal@crm.com',
        password: process.env.SEED_PASSWORD || 'admin123', // ponytail: env override, remove default after first seed
        role: ROLES.SUPER_ADMIN,
        permissions: ROLE_PERMISSIONS[ROLES.SUPER_ADMIN],
        isEmailVerified: true,
        phone: '+91-9876543210',
      });
      logger.info(`Super admin created: ${user.email}`);
    }

    await mongoose.disconnect();
    logger.info('Seeding complete');
    process.exit(0);
  } catch (error) {
    logger.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedSuperAdmin();
