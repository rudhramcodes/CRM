import config from '../config/index.js';
import logger from '../utils/logger.js';

export const isCliqConfigured = () => Boolean(config.cliq.webhookUrl);

// Zoho Cliq incoming webhook — one POST, no OAuth needed.
// Card renders the emoji title, message field and an "Open in CRM" button.
export const sendCliqMessage = async ({ title, message, link, emoji = '' }) => {
  if (!isCliqConfigured()) return false;
  try {
    const head = emoji ? `${emoji} ${title}` : title;
    const payload = { text: head };
    if (link) {
      payload.card = {
        title: head,
        thumbnail: 'https://www.zoho.com/cliq/images/cliq-icon.png',
        fields: [{ text: message }],
        buttons: [{ type: '+', label: 'Open in CRM', action: { type: 'open.url', url: link } }],
      };
    } else {
      payload.text = `${head} — ${message}`;
    }
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
