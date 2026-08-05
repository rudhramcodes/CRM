import config from '../config/index.js';
import logger from '../utils/logger.js';

export const isCliqConfigured = () => Boolean(config.cliq.webhookUrl);

// Zoho Cliq incoming webhook — one POST, no OAuth needed.
// Channel webhook supports plain text reliably; card/buttons keep getting
// rejected by the schema, so format everything inline instead.
export const sendCliqMessage = async ({ title, message, link }) => {
  if (!isCliqConfigured()) return false;
  try {
    // Resolve relative links (e.g. /leads/123) to absolute URLs the team can click
    const fullLink = link && !link.startsWith('http') ? `${config.appUrl}${link}` : link || '';
    const text = fullLink ? `${title} — ${message}\n\n${fullLink}` : `${title} — ${message}`;
    const payload = { text };
    const res = await fetch(config.cliq.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.error('Zoho Cliq webhook failed', { status: res.status, body: await res.text().catch(() => '') });
      return false;
    }
    return true;
  } catch (err) {
    logger.error('Zoho Cliq send failed', { error: err.message });
    return false;
  }
};
