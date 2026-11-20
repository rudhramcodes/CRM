import * as authRepository from '../auth/auth.repository.js';
import logger from '../../utils/logger.js';
import { countUnreadByRecipient } from './notification.repository.js';
import { pushStyle } from './pushStyle.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Sends one notification to every phone the recipient is signed in on, and forgets phones Expo says are gone.
// shortcut: no receipt polling (the second Expo step); add it if delivery problems need tracing.
export const sendExpoPush = async (recipient, { _id, title, message, link, type, referenceModel, referenceId }) => {
  const tokens = await authRepository.findPushTokens(recipient);
  if (!tokens.length) return;
  const style = pushStyle({ type, referenceModel, referenceId });
  // The app icon shows how many notifications are unread.
  const badge = await countUnreadByRecipient(recipient).catch(() => undefined);

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(tokens.map((to) => ({
      to,
      title: title || 'Rudhram CRM',
      body: message,
      sound: style.interruptionLevel === 'passive' ? null : 'default',
      badge,
      ...style,
      data: { id: _id ? String(_id) : undefined, type, link, referenceModel, referenceId: referenceId ? String(referenceId) : undefined },
    }))),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Expo push HTTP ${res.status}`);

  const { data = [] } = await res.json();
  const gone = tokens.filter((_, i) => data[i]?.details?.error === 'DeviceNotRegistered');
  if (gone.length) await authRepository.removePushTokens(recipient, gone);
  data.forEach((ticket, i) => {
    if (ticket.status === 'error') logger.warn(`[Push] ${tokens[i]}: ${ticket.message}`);
  });
};
