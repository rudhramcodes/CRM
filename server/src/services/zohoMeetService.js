import logger from '../utils/logger.js';
import config from '../config/index.js';
import { Setting } from '../modules/settings/settings.model.js';

// manageOrg.READ is required by the user.json (org-id) endpoint — without it the API returns 400
const SCOPES = ['ZohoMeeting.meeting.CREATE', 'ZohoMeeting.meeting.READ', 'ZohoMeeting.manageOrg.READ'];

// Callback stores "https://accounts.zoho.in" (no path); token/auth endpoints need ".../oauth/v2"
const normalizeAccountsUrl = (url) => (url && !url.includes('/oauth/v2') ? `${url}/oauth/v2` : url);

const getOAuthCreds = async () => {
  const [clientId, clientSecret, refreshToken, orgName, orgId, userId, accountsUrl, apiDomain] = await Promise.all([
    Setting.findOne({ key: 'zohoClientId' }),
    Setting.findOne({ key: 'zohoClientSecret' }),
    Setting.findOne({ key: 'zohoRefreshToken' }),
    Setting.findOne({ key: 'zohoOrgName' }),
    Setting.findOne({ key: 'zohoOrgId' }),
    Setting.findOne({ key: 'zohoUserId' }),
    Setting.findOne({ key: 'zohoAccountsUrl' }),
    Setting.findOne({ key: 'zohoApiDomain' }),
  ]);
  return {
    clientId: clientId?.value || process.env.ZOHO_CLIENT_ID || '',
    clientSecret: clientSecret?.value || process.env.ZOHO_CLIENT_SECRET || '',
    refreshToken: refreshToken?.value || process.env.ZOHO_REFRESH_TOKEN || '',
    orgName: orgName?.value || process.env.ZOHO_ORG_NAME || 'Rudhram CRM',
    orgId: orgId?.value || process.env.ZOHO_ORG_ID || '',
    userId: userId?.value || process.env.ZOHO_USER_ID || '',
    accountsUrl: normalizeAccountsUrl(accountsUrl?.value || process.env.ZOHO_ACCOUNTS_URL || config.zoho.accountsUrl),
    apiDomain: apiDomain?.value || '',
  };
};

// Token API DC: stored accounts URL (set during connect) > env override > config default
const getAccountsUrl = async () => (await getOAuthCreds()).accountsUrl;

// Meeting API DC: derive from token api_domain (e.g. "https://www.zohoapis.in" -> "https://meeting.zoho.in/api/v2")
const deriveMeetingApi = (apiDomain) => {
  const m = apiDomain?.match(/zohoapis\.([a-z.]+)/);
  return m ? `https://meeting.zoho.${m[1]}/api/v2` : null;
};

const getMeetingApi = async () => {
  const { apiDomain } = await getOAuthCreds();
  return deriveMeetingApi(apiDomain) || process.env.ZOHO_MEETING_API || config.zoho.meetingApi;
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
    logger.error('Zoho token request failed', { url, status: res.status, response: data });
    throw new Error(mapZohoError(data.error, data.error_description, res.status));
  }
  return data;
};

const mapZohoError = (code, description, status) => {
  const map = {
    invalid_client: 'Invalid Zoho Client ID or Client Secret — verify both in Zoho API Console, and confirm they are from the same client.',
    invalid_grant: 'The Zoho authorization code was already used or expired — click Connect again.',
    redirect_uri_mismatch: 'Zoho redirect URI mismatch — register the exact callback URL in Zoho API Console.',
    invalid_scope: 'Zoho scope not allowed — enable ZohoMeeting scopes on the client in Zoho API Console.',
    'invalid code': 'The Zoho authorization code is invalid or expired — click Connect again.',
  };
  if (map[code]) return map[code];
  return description || `Zoho error: ${code || status}`;
};

export const isOAuthConfigured = async () => {
  const { clientId, clientSecret, refreshToken } = await getOAuthCreds();
  return Boolean(clientId && clientSecret && refreshToken);
};

export const buildAuthUrl = async (redirectUri) => {
  const { clientId, clientSecret, accountsUrl } = await getOAuthCreds();
  if (!clientId || !clientSecret) return null;

  const params = new URLSearchParams({
    scope: SCOPES.join(','),
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${accountsUrl}/auth?${params.toString()}`;
};

export const exchangeCode = async (code, redirectUri, accountsServer = '') => {
  const { clientId, clientSecret } = await getOAuthCreds();
  if (!clientId || !clientSecret) throw new Error('Zoho OAuth client not configured');

  // Zoho multi-DC: callback includes accounts-server (e.g. https://accounts.zoho.in) when
  // the user's org lives in a non-default DC — use it or token exchange fails with invalid_client
  const accountsUrl = accountsServer ? `${accountsServer}/oauth/v2` : await getAccountsUrl();

  const data = await postForm(`${accountsUrl}/token`, {
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

  if (accountsServer) {
    await Setting.findOneAndUpdate(
      { key: 'zohoAccountsUrl' },
      { $set: { key: 'zohoAccountsUrl', value: accountsServer } },
      { upsert: true, new: true },
    );
  }

  if (api_domain) {
    await Setting.findOneAndUpdate(
      { key: 'zohoApiDomain' },
      { $set: { key: 'zohoApiDomain', value: api_domain } },
      { upsert: true, new: true },
    );
  }

  try {
    const orgInfo = await getOrgInfo(access_token);
    // Zoho returns org id as userDetails.zsoid (number, not top-level)
    const zsoid = orgInfo?.userDetails?.zsoid;
    const zuid = orgInfo?.userDetails?.zuid;
    if (zsoid) {
      await Setting.findOneAndUpdate(
        { key: 'zohoOrgId' },
        { $set: { key: 'zohoOrgId', value: String(zsoid) } },
        { upsert: true, new: true },
      );
    } else {
      logger.warn('Zoho user API returned no zsoid', { response: orgInfo });
    }
    // presenter ZUID is required when creating sessions — save it at connect time
    if (zuid) {
      await Setting.findOneAndUpdate(
        { key: 'zohoUserId' },
        { $set: { key: 'zohoUserId', value: String(zuid) } },
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

  const data = await postForm(`${await getAccountsUrl()}/token`, {
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
  const url = `${await getMeetingApi()}/user.json`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'X-ZSOURCE': orgName,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error('Zoho user API failed', { url, status: res.status, response: body });
    throw new Error(`Zoho user API failed: ${res.status}`);
  }
  return res.json();
};

export const disconnectOAuth = async () => {
  await Setting.findOneAndDelete({ key: 'zohoRefreshToken' });
  await Setting.findOneAndDelete({ key: 'zohoOrgId' });
  await Setting.findOneAndDelete({ key: 'zohoUserId' });
  await Setting.findOneAndDelete({ key: 'zohoApiDomain' });
  await Setting.findOneAndDelete({ key: 'zohoAccountsUrl' });
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

  // Self-heal: if org ID or presenter ZUID missing (e.g. OAuth connected before parsing was fixed), fetch both now
  let orgId = creds.orgId;
  let userId = creds.userId;
  if (!orgId || !userId) {
    try {
      const accessToken = await refreshAccessToken();
      const orgInfo = await getOrgInfo(accessToken);
      const zsoid = orgInfo?.userDetails?.zsoid;
      const zuid = orgInfo?.userDetails?.zuid;
      if (zsoid) {
        orgId = String(zsoid);
        await Setting.findOneAndUpdate(
          { key: 'zohoOrgId' },
          { $set: { key: 'zohoOrgId', value: orgId } },
          { upsert: true, new: true },
        );
      }
      if (zuid) {
        userId = String(zuid);
        await Setting.findOneAndUpdate(
          { key: 'zohoUserId' },
          { $set: { key: 'zohoUserId', value: userId } },
          { upsert: true, new: true },
        );
      }
    } catch (err) {
      logger.warn('Zoho org ID self-heal failed', { error: err.message });
    }
  }

  if (!orgId || !userId) {
    logger.warn('Zoho org ID or presenter ZUID not found — run OAuth flow first');
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
        presenter: Number(userId),
        startTime: startTimeZoho,
        duration: durationMs,
        timezone: 'Asia/Kolkata',
        participants: attendees.map((email) => ({ email })),
      },
    };

    const res = await fetch(`${await getMeetingApi()}/${orgId}/sessions.json`, {
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
