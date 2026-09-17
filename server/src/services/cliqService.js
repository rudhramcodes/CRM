import config from '../config/index.js';
import logger from '../utils/logger.js';

export const isCliqConfigured = () => {
  return Boolean(config.cliq.webhookUrl || Object.values(config.cliq.channels).some(url => url));
};

// Zoho Cliq incoming webhook — one POST, no OAuth needed.
// Channel webhook supports plain text reliably; card/buttons keep getting
// rejected by the schema, so format everything inline instead.
export const sendCliqMessage = async ({ title, message, link, channel }) => {
  const targetChannelUrl = config.cliq.channels?.[channel] || config.cliq.webhookUrl || config.cliq.channels?.general;
  logger.info(`[CliqService] Attempting to send message to channel "${channel}", resolved URL: ${targetChannelUrl ? 'Yes' : 'No'}`);
  if (!targetChannelUrl) return false;

  try {
    // Resolve relative links (e.g. /leads/123) to absolute URLs the team can click
    const fullLink = link && !link.startsWith('http') ? `${config.appUrl}${link}` : link || '';
    const text = fullLink ? `${title} — ${message}\n\n${fullLink}` : `${title} — ${message}`;
    const payload = { text };
    logger.info(`[CliqService] Sending payload: ${text}`);
    const res = await fetch(targetChannelUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.error(`Zoho Cliq webhook failed for channel ${channel || 'default'}`, { status: res.status, body: await res.text().catch(() => '') });
      return false;
    }
    return true;
  } catch (err) {
    logger.error('Zoho Cliq send failed', { error: err.message });
    return false;
  }
};
