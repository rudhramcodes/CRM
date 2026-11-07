import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const EMAILS = Object.freeze([
  'poojachoudhary.aghhori@rudhramenterprises.com',
  'prashantkanvinde@rudhramenterprises.com',
]);
const MODULES = Object.freeze(['leads', 'clients']);
const READS = Object.freeze(['leads:read', 'clients:read']);

class PreparationError extends Error {}

const run = async () => {
  const args = process.argv.slice(2);
  if (args.some((arg) => !['--apply', '--dry-run'].includes(arg))
    || (args.includes('--apply') && args.includes('--dry-run'))) {
    throw new PreparationError('Usage: node server/scripts/setClientLeadReadOnly.mjs [--dry-run | --apply]');
  }
  const apply = args.includes('--apply');
  dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
  const { default: config } = await import('../src/config/index.js');
  const { default: User } = await import('../src/modules/auth/auth.model.js');
  const { ROLES } = await import('../src/constants/index.js');
  const readableRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE];

  if (!config.mongodbUri) throw new PreparationError('MONGODB_URI is required.');
  if (apply && !User.schema.path('readOnlyModules')) {
    throw new PreparationError('User.readOnlyModules schema must be implemented before applying.');
  }

  try {
    await mongoose.connect(config.mongodbUri, {
      autoIndex: false,
      autoCreate: false,
      serverSelectionTimeoutMS: 10000,
    });
    const users = await User.find({ email: { $in: EMAILS } })
      .select('_id email role permissions readOnlyModules')
      .lean();

    // Complete both accounts' preflight before making any update.
    for (const email of EMAILS) {
      const matches = users.filter((user) => user.email === email);
      if (matches.length !== 1) {
        throw new PreparationError(`Expected exactly one account for ${email}; no updates started.`);
      }
    }
    for (const user of users) {
      if (!readableRoles.includes(user.role)) {
        throw new PreparationError(`Role does not allow both module reads for ${user.email}; no updates started.`);
      }
      for (const field of ['permissions', 'readOnlyModules']) {
        if (Object.hasOwn(user, field)
          && (!Array.isArray(user[field]) || user[field].some((value) => typeof value !== 'string'))) {
          throw new PreparationError(`Invalid ${field} for ${user.email}; no updates started.`);
        }
      }
    }

    const plans = users.map((user) => {
      const permissions = (user.permissions ?? []).filter((permission) =>
        !MODULES.some((module) => permission.startsWith(`${module}:`)) || READS.includes(permission));
      const after = {
        email: user.email,
        role: user.role,
        permissions: [...permissions, ...READS.filter((read) => !permissions.includes(read))],
        readOnlyModules: [...new Set([...(user.readOnlyModules ?? []), ...MODULES])],
      };
      return { user, after };
    });

    process.stdout.write(`${apply ? 'Apply' : 'Dry-run (no writes)'}\n`);
    for (const { user, after } of plans) {
      if (apply) {
        // Exact snapshots distinguish absent fields from empty arrays, avoiding lost concurrent edits.
        const filter = { _id: user._id, email: user.email, role: user.role };
        for (const field of ['permissions', 'readOnlyModules']) {
          filter[field] = Object.hasOwn(user, field) ? { $eq: user[field] } : { $exists: false };
        }
        const result = await User.updateOne(filter, {
          $set: { permissions: after.permissions },
          $addToSet: { readOnlyModules: { $each: MODULES } },
        }, { runValidators: true, timestamps: false });
        if (result.matchedCount !== 1) {
          throw new PreparationError(`Account changed concurrently: ${user.email}; stopped. Earlier account updates, if any, remain applied.`);
        }
      }
      process.stdout.write(`${JSON.stringify({
        before: {
          email: user.email,
          role: user.role,
          permissions: user.permissions ?? [],
          readOnlyModules: user.readOnlyModules ?? [],
        },
        after,
      }, null, 2)}\n`);
    }
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  // Driver/configuration error messages can contain credentials; report only our safe errors.
  process.stderr.write(`${error instanceof PreparationError
    ? error.message
    : 'Script failed while loading configuration or accessing MongoDB; no error details printed to protect secrets.'}\n`);
  process.exitCode = 1;
});
