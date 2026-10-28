import cron from 'node-cron';
import logger from '../../utils/logger.js';
import { ROLES } from '../../constants/index.js';
import { generateDraft } from './payroll.service.js';

const PAYROLL_TIME_ZONE = 'Asia/Kolkata';

export const getPreviousPayrollMonth = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PAYROLL_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
};

const generatePreviousMonthDraft = async () => {
  const previousMonth = getPreviousPayrollMonth();
  try {
    const result = await generateDraft(
      previousMonth,
      { role: ROLES.SUPER_ADMIN, email: null, _id: null },
    );
    logger.info(
      `[Payroll] Month-end draft ready for ${previousMonth.year}-${String(previousMonth.month).padStart(2, '0')} (${result.slips.length} slips)`,
    );
  } catch (error) {
    if (error?.statusCode === 409) {
      logger.info(`[Payroll] Month-end draft skipped: ${error.message}`);
      return;
    }
    logger.error(`[Payroll] Month-end draft failed: ${error.message}`);
  }
};

export const startPayrollCrons = () => {
  cron.schedule('0 1 1 * *', generatePreviousMonthDraft, { timezone: PAYROLL_TIME_ZONE });
  logger.info('[Payroll] Cron jobs started');
};
