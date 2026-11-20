import cron from 'node-cron';
import Notification from '../modules/notifications/notification.model.js';
import { sendExpoPush } from '../modules/notifications/expoPush.js';
import logger from '../utils/logger.js';

// Sends pushes held over quiet hours: one per person, or one summary when several waited.
// Already-read notifications are dropped (the person saw them in the app).
export const releaseHeldPushes = async (now = new Date()) => {
  const due = await Notification.find({ pushAt: { $lte: now } }).select('_id').lean();
  const byUser = new Map();
  for (const { _id } of due) {
    // claim each one, so a second server or a re-run never sends it again
    const n = await Notification.findOneAndUpdate({ _id, pushAt: { $ne: null } }, { $unset: { pushAt: 1 } }, { new: true }).lean();
    if (!n || n.read) continue;
    const k = String(n.recipient);
    byUser.set(k, [...(byUser.get(k) || []), n]);
  }
  for (const [recipient, list] of byUser) {
    const push = list.length === 1 ? list[0] : {
      title: 'While you were away',
      message: `${list.length} task updates: ${list.slice(0, 3).map((n) => n.title).join(', ')}${list.length > 3 ? '…' : ''}`,
      link: '/notifications',
      type: 'task_digest',
    };
    await sendExpoPush(recipient, push).catch((err) => logger.error(`[HeldPush] ${err.message}`));
  }
  return byUser.size;
};

export const startHeldPushCron = () => {
  cron.schedule('*/5 * * * *', () => releaseHeldPushes().catch((err) => logger.error('Held push cron failed', { error: err.message })));
  logger.info('Held push cron: every 5 min');
};
