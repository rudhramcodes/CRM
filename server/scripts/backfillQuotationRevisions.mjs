import mongoose from 'mongoose';
import config from '../src/config/index.js';
import logger from '../src/utils/logger.js';
import User from '../src/modules/auth/auth.model.js';
import Quotation from '../src/modules/quotations/quotation.model.js';
import { migrateQuotation } from '../src/modules/quotations/quotationRevision.migration.js';

const run = async () => {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  if (apply && args.includes('--dry-run')) throw new Error('Choose --apply or --dry-run, not both');
  const actorId = args.find((arg) => arg.startsWith('--actor='))?.slice(8);
  if (apply && !mongoose.isValidObjectId(actorId)) throw new Error('--apply requires --actor=<authorized User ObjectId>');
  await mongoose.connect(config.mongodbUri, { autoIndex: false, autoCreate: false });
  try {
    const actor = apply ? await User.findOne({ _id: actorId, role: { $in: ['admin', 'super_admin'] } }).lean() : null;
    if (apply && !actor) throw new Error('Migration actor must be an Admin or SuperAdmin');
    const cursor = Quotation.find({ schemaVersion: { $ne: 2 } }).select('_id quotationNumber status').lean().cursor();
    let processed = 0;
    try {
      for await (const quotation of cursor) {
        if (apply) await migrateQuotation(quotation._id, actor);
        processed += 1;
        logger.info('quotation revision baseline', {
          mode: apply ? 'applied' : 'dry-run eligible; artifacts not validated',
          quotationId: quotation._id, quotationNumber: quotation.quotationNumber, status: quotation.status,
        });
      }
    } finally {
      await cursor.close();
    }
    logger.info('quotation revision backfill complete', { mode: apply ? 'apply' : 'dry-run', processed });
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  logger.error('quotation revision backfill failed', { message: error instanceof Error ? error.message : 'Unknown migration error' });
  process.exitCode = 1;
});
