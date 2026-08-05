import { google } from 'googleapis';
import logger from '../utils/logger.js';
import { Setting } from '../modules/settings/settings.model.js';

// Google Calendar scopes: create events + attach Meet conferences.
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

// OAuth2 creds (client id/secret/refresh token) resolve from the settings store,
// falling back to env vars. Stored creds win so the UI can configure them live.
const getOAuthCreds = async () => {
  const [clientId, clientSecret, refreshToken, calendarId] = await Promise.all([
    Setting.findOne({ key: 'googleClientId' }),
    Setting.findOne({ key: 'googleClientSecret' }),
    Setting.findOne({ key: 'googleRefreshToken' }),
    Setting.findOne({ key: 'googleCalendarId' }),
  ]);
  return {
    clientId: clientId?.value || process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    clientSecret: clientSecret?.value || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    refreshToken: refreshToken?.value || process.env.GOOGLE_REFRESH_TOKEN || '',
    calendarId: calendarId?.value || process.env.GOOGLE_CALENDAR_ID || 'primary',
  };
};

let oauthClient = null;
let cachedOAuthKey = '';

const getOAuthClient = async () => {
  const { clientId, clientSecret, refreshToken } = await getOAuthCreds();
  if (!clientId || !clientSecret || !refreshToken) return null;
  const key = `${clientId}|${clientSecret}|${refreshToken}`;
  if (oauthClient && cachedOAuthKey === key) return oauthClient;
  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  oauthClient = client;
  cachedOAuthKey = key;
  return oauthClient;
};

export const isOAuthConfigured = async () => {
  const { clientId, clientSecret, refreshToken } = await getOAuthCreds();
  return Boolean(clientId && clientSecret && refreshToken);
};

// Build the Google consent URL.
export const buildAuthUrl = async (redirectUri) => {
  const { clientId, clientSecret } = await getOAuthCreds();
  if (!clientId || !clientSecret) return null;
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
};

// Exchange the auth code for tokens and persist the refresh token.
export const exchangeCode = async (code, redirectUri) => {
  const { clientId, clientSecret } = await getOAuthCreds();
  if (!clientId || !clientSecret) throw new Error('Google OAuth client not configured');
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error('No refresh token returned — re-run with prompt=consent');
  }
  await Setting.findOneAndUpdate(
    { key: 'googleRefreshToken' },
    { $set: { key: 'googleRefreshToken', value: tokens.refresh_token } },
    { upsert: true, new: true },
  );
  oauthClient = null;
  cachedOAuthKey = '';
};

export const disconnectOAuth = async () => {
  await Setting.findOneAndDelete({ key: 'googleRefreshToken' });
  oauthClient = null;
  cachedOAuthKey = '';
};

// Get the email of the connected Google account (calendar "primary" owner).
export const getConnectedEmail = async () => {
  const client = await getOAuthClient();
  if (!client) return null;
  try {
    const info = await client.getTokenInfo((await client.getAccessToken()).token);
    return info.email || null;
  } catch {
    return null;
  }
};

const buildDate = (dateStr, timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
};

export const generateMeetLink = async ({ title, date, startTime, endTime, attendees = [] }) => {
  const client = await getOAuthClient();
  if (!client) {
    logger.info('Google Meet not configured — skipping link generation');
    return null;
  }

  try {
    const { calendarId } = await getOAuthCreds();
    const cal = google.calendar({ version: 'v3', auth: client });
    const start = buildDate(date, startTime);

    const event = {
      summary: title,
      start: { dateTime: start.toISOString() },
      end: {
        dateTime: new Date(start.getTime() + (toMinutes(endTime) - toMinutes(startTime)) * 60000).toISOString(),
      },
      attendees: attendees.map((a) => ({ email: a })),
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const res = await cal.events.insert({
      calendarId,
      requestBody: event,
      conferenceDataVersion: 1,
    });

    return res.data.hangoutLink || null;
  } catch (err) {
    logger.error('Google Meet link generation failed', { error: err.message });
    return null;
  }
};

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
