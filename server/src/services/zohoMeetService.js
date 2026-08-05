import logger from '../utils/logger.js';
import { Setting } from '../modules/settings/settings.model.js';

const SCOPES = ['ZohoMeeting.meeting.CREATE', 'ZohoMeeting.meeting.READ'];
const ZOHO_ACCOUNTS_URL = 'https://accounts.zoho.com/oauth/v2';
const ZOHO_MEETING_API = 'https://meeting.zoho.com/api/v2';

const getOAuthCreds = async () => {
  const [clientId, clientSecret, refreshToken, orgName, orgId] = await Promise.all([
    Setting.findOne({ key: 'zohoClientId' }),
    Setting.findOne({ key: 'zohoClientSecret' }),
    Setting.findOne({ key: 'zohoRefreshToken' }),
    Setting.findOne({ key: 'zohoOrgName' }),
    Setting.findOne({ key: 'zohoOrgId' }),
  ]);
  return {
    clientId: clientId?.value || process.env.ZOHO_CLIENT_ID || '',
    clientSecret: clientSecret?.value || process.env.ZOHO_CLIENT_SECRET || '',
    refreshToken: refreshToken?.value || process.env.ZOHO_REFRESH_TOKEN || '',
    orgName: orgName?.value || process.env.ZOHO_ORG_NAME || 'Rudhram CRM',
    orgId: orgId?.value || process.env.ZOHO_ORG_ID || '',
  };
};

const postForm = async (url, params) => {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || `Zoho token request failed: ${res.status}`);
  }
  return data;
};

export const isOAuthConfigured = async () => {
  const { clientId, clientSecret, refreshToken } = await getOAuthCreds();
  return Boolean(clientId && clientSecret && refreshToken);
};

export const buildAuthUrl = async (redirectUri) => {
  const { clientId, clientSecret } = await getOAuthCreds();
  if (!clientId || !clientSecret) return null;

  const params = new URLSearchParams({
    scope: SCOPES.join(','),
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${ZOHO_ACCOUNTS_URL}/auth?${params.toString()}`;
};

export const exchangeCode = async (code, redirectUri) => {
  const { clientId, clientSecret } = await getOAuthCreds();
  if (!clientId || !clientSecret) throw new Error('Zoho OAuth client not configured');

  const data = await postForm(`${ZOHO_ACCOUNTS_URL}/token`, {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const { refresh_token, access_token, api_domain } = data;

  if (!refresh_token) {
    throw new Error('No refresh token returned — re-run with prompt=consent');
  }

  await Setting.findOneAndUpdate(
    { key: 'zohoRefreshToken' },
    { $set: { key: 'zohoRefreshToken', value: refresh_token } },
    { upsert: true, new: true },
  );

  if (api_domain) {
    await Setting.findOneAndUpdate(
      { key: 'zohoApiDomain' },
      { $set: { key: 'zohoApiDomain', value: api_domain } },
      { upsert: true, new: true },
    );
  }

  try {
    const orgInfo = await getOrgInfo(access_token);
    if (orgInfo?.zsoid) {
      await Setting.findOneAndUpdate(
        { key: 'zohoOrgId' },
        { $set: { key: 'zohoOrgId', value: orgInfo.zsoid } },
        { upsert: true, new: true },
      );
    }
  } catch (err) {
    logger.warn('Could not fetch Zoho org ID', { error: err.message });
  }
};

let cachedAccessToken = '';
let cachedTokenExpiry = 0;

const refreshAccessToken = async (force = false) => {
  if (!force && cachedAccessToken && Date.now() < cachedTokenExpiry) return cachedAccessToken;

  const { clientId, clientSecret, refreshToken } = await getOAuthCreds();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Zoho OAuth not fully configured');
  }

  const data = await postForm(`${ZOHO_ACCOUNTS_URL}/token`, {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  cachedAccessToken = data.access_token;
  cachedTokenExpiry = Date.now() + (data.expires_in || 3600) * 1000 - 60_000;
  return cachedAccessToken;
};

const getAuthHeaders = async () => {
  const accessToken = await refreshAccessToken();
  const { orgName } = await getOAuthCreds();
  return {
    Authorization: `Zoho-oauthtoken ${accessToken}`,
    'X-ZSOURCE': orgName,
    'Content-Type': 'application/json;charset=UTF-8',
  };
};

export const getOrgInfo = async (accessToken) => {
  const { orgName } = await getOAuthCreds();
  const res = await fetch(`${ZOHO_MEETING_API}/user.json`, {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'X-ZSOURCE': orgName,
    },
  });
  if (!res.ok) throw new Error(`Zoho user API failed: ${res.status}`);
  return res.json();
};

export const disconnectOAuth = async () => {
  await Setting.findOneAndDelete({ key: 'zohoRefreshToken' });
  await Setting.findOneAndDelete({ key: 'zohoOrgId' });
  await Setting.findOneAndDelete({ key: 'zohoApiDomain' });
  cachedAccessToken = '';
  cachedTokenExpiry = 0;
};

export const getConnectedEmail = async () => {
  try {
    const accessToken = await refreshAccessToken();
    const info = await getOrgInfo(accessToken);
    return info?.email || null;
  } catch {
    return null;
  }
};

// Zoho API expects date-time as "Jun 19, 2020 07:00 PM"
const buildZohoDateTime = (dateStr, timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(dateStr);
  d.setHours(h, m, 0, 0);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${month} ${day}, ${year} ${displayHours}:${minutes} ${ampm}`;
};

const getDurationMs = (startTime, endTime) => {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMs = sh * 3600000 + sm * 60000;
  const endMs = eh * 3600000 + em * 60000;
  return endMs - startMs;
};

export const generateMeetLink = async ({ title, date, startTime, endTime, attendees = [], agenda = '' }) => {
  const creds = await getOAuthCreds();
  if (!creds.clientId || !creds.clientSecret || !creds.refreshToken) {
    logger.info('Zoho Meeting not configured — skipping link generation');
    return null;
  }

  if (!creds.orgId) {
    logger.warn('Zoho org ID not found — run OAuth flow first');
    return null;
  }

  try {
    const headers = await getAuthHeaders();
    const startTimeZoho = buildZohoDateTime(date, startTime);
    const durationMs = getDurationMs(startTime, endTime);

    const payload = {
      session: {
        topic: title,
        agenda,
        startTime: startTimeZoho,
        duration: durationMs,
        timezone: 'Asia/Kolkata',
        participants: attendees.map((email) => ({ email })),
      },
    };

    const res = await fetch(`${ZOHO_MEETING_API}/${creds.orgId}/sessions.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      logger.error('Zoho Meeting create failed', { status: res.status, body: await res.text() });
      return null;
    }

    const data = await res.json();
    return data?.session?.joinLink || null;
  } catch (err) {
    logger.error('Zoho Meeting link generation failed', { error: err.message });
    return null;
  }
};
