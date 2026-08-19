import { Resend } from 'resend';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let resend = null;

const getClient = () => {
  if (resend) return resend;
  if (!config.resend.apiKey) return null;
  resend = new Resend(config.resend.apiKey);
  return resend;
};

export const sendEmail = async ({ to, subject, html, attachments }) => {
  const client = getClient();

  if (!client) {
    logger.info(`[EMAIL FALLBACK] To: ${to} | Subject: ${subject}\n${html}`);
    return { id: 'dev-fallback' };
  }

  try {
    const { data, error } = await client.emails.send({
      from: `${config.resend.fromName} <${config.resend.fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      attachments,
    });

    if (error) {
      logger.error(`Resend failed: ${error.message}`);
      throw error;
    }

    logger.info(`Email sent: ${data?.id} | to: ${to} | subject: ${subject}`);
    return data;
  } catch (err) {
    logger.error(`Email send failed: ${err.message}`);
    throw err;
  }
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const INK = '#0b0b0b';
const BODY = '#52525b';
const MUTED = '#a1a1aa';
const BORDER = '#e4e4e7';
const BG = '#f4f4f5';

const fmtINR = (val) =>
  `\u20B9${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const renderEmail = ({ preheader = '', heading, subtext = '', bodyHtml = '', cta = null, ctas = null, footerNote = '' }) => {
  const buttons = cta ? [cta] : (Array.isArray(ctas) ? ctas : []);
  const ctaHtml = buttons.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;border-collapse:separate;border-spacing:0 0;"><tr>${buttons.map((b) => `<td align="center"><a href="${b.url}" style="display:inline-block;margin:0 6px;padding:13px 30px;font-family:${FONT};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;background:${INK};border-radius:10px;white-space:nowrap;">${b.text}</a></td>`).join('')}</tr></table>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
<span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td align="center" style="padding-bottom:28px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td width="44" height="44" align="center" style="background:${INK};border-radius:12px;font-family:${FONT};font-size:20px;font-weight:700;color:#ffffff;line-height:44px;">R</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid ${BORDER};border-radius:16px;padding:40px 40px 36px;">
        <h1 style="margin:0 0 10px;font-family:${FONT};font-size:22px;font-weight:700;color:${INK};line-height:1.3;">${heading}</h1>
        ${subtext ? `<p style="margin:0 0 22px;font-family:${FONT};font-size:15px;color:${BODY};line-height:1.7;">${subtext}</p>` : ''}
        ${bodyHtml}
        ${ctaHtml}
      </td></tr>
      <tr><td align="center" style="padding:28px 16px 0;">
        <p style="margin:0;font-family:${FONT};font-size:12px;color:${MUTED};line-height:1.6;">Rudhram &mdash; Manage your business, grow your revenue.</p>
        ${footerNote ? `<p style="margin:6px 0 0;font-family:${FONT};font-size:12px;color:${MUTED};line-height:1.6;">${footerNote}</p>` : ''}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
};

export const renderVerificationEmail = (email, otp) => {
  const bodyHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 6px;"><tr>
      <td align="center" style="background:${BG};border:1px solid ${BORDER};border-radius:14px;padding:22px 30px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td><span style="font-family:${FONT};font-size:34px;font-weight:700;letter-spacing:12px;color:${INK};-webkit-user-select:all;user-select:all;cursor:pointer;line-height:1.2;">${otp}</span></td>
          <td style="padding-left:14px;line-height:0;"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></td>
        </tr></table>
      </td>
    </tr></table>
    <p style="margin:6px 0 0;font-family:${FONT};font-size:13px;color:#71717a;line-height:1.6;">Tap the code above &mdash; it selects itself so you can copy it in one tap &mdash; then paste it in the app.</p>
  `;
  return renderEmail({
    preheader: `Your verification code is ${otp}. It expires in 10 minutes.`,
    heading: 'Verify your email',
    subtext: `We sent this code to <strong style="color:${INK};">${email}</strong>. Enter it in the app to verify your account. The code expires in <strong>10 minutes</strong>.`,
    bodyHtml,
    footerNote: 'Didn\u2019t request this? You can safely ignore this email.',
  });
};

export const renderWelcomeEmail = (name) => {
  const loginUrl = `${config.clientUrl}/auth/login`;
  return renderEmail({
    preheader: 'Your Rudhram account is ready. Verify your email to get started.',
    heading: 'Welcome to Rudhram',
    subtext: `Hi ${name}, your account has been created. Verify your email to unlock everything.`,
    bodyHtml: `<p style="margin:0;font-family:${FONT};font-size:15px;color:${BODY};line-height:1.7;">We\u2019ve sent a verification code to your inbox in a separate email. Use it to confirm your address and start managing your business.</p>`,
    cta: { url: loginUrl, text: 'Sign in to Rudhram' },
    footerNote: 'If you didn\u2019t expect this email, you can safely ignore it.',
  });
};

export const renderPasswordResetEmail = (resetUrl) =>
  renderEmail({
    preheader: 'Reset your Rudhram password. The link expires in 1 hour.',
    heading: 'Reset your password',
    subtext: 'Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.',
    bodyHtml: `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${BG};border:1px solid ${BORDER};border-radius:12px;padding:16px 20px;font-family:${FONT};font-size:13px;color:${MUTED};">If the button doesn\u2019t work, copy this link into your browser:<br><a href="${resetUrl}" style="color:${INK};">${resetUrl}</a></td></tr></table>`,
    cta: { url: resetUrl, text: 'Reset password' },
    footerNote: 'If you didn\u2019t request a password reset, you can safely ignore this email.',
  });

export const renderNotificationEmail = ({ title, message, link }) => {
  const fullUrl = link && link.startsWith('/') ? `${config.clientUrl}${link}` : link;
  const bodyHtml = `<p style="margin:0;font-family:${FONT};font-size:15px;color:${BODY};line-height:1.7;">${message}</p>`;
  return renderEmail({
    preheader: title,
    heading: title,
    bodyHtml,
    cta: fullUrl ? { url: fullUrl, text: 'View details' } : null,
    footerNote: 'You\u2019re receiving this because you have notifications enabled in Rudhram.',
  });
};

const meetingRow = (label, value) =>
  `<tr><td style="padding:12px 18px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;color:${MUTED};width:110px;">${label}</td><td style="padding:12px 18px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;font-weight:600;color:${INK};text-align:right;">${value}</td></tr>`;

export const renderMeetingEmail = ({ type, title, date, startTime, endTime, location, meetingLink, detailsUrl }) => {
  const isReminder = type === 'reminder';
  const rows = [
    meetingRow('Date', date),
    meetingRow('Time', `${startTime} &ndash; ${endTime}`),
    location ? meetingRow('Location', location) : '',
    meetingLink ? meetingRow('Link', `<a href="${meetingLink}" style="color:${INK};">${meetingLink}</a>`) : '',
  ].filter(Boolean).join('');

  return renderEmail({
    preheader: isReminder
      ? `${title} starts in 1 hour.`
      : `A new meeting has been scheduled: ${title}.`,
    heading: title,
    subtext: isReminder
      ? 'Friendly reminder &mdash; this meeting starts in <strong>1 hour</strong>.'
      : 'A new meeting has been scheduled for you.',
    bodyHtml: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
      <tr><td style="padding:14px 18px;background:${BG};font-family:${FONT};font-size:14px;font-weight:700;color:${INK};">${title}</td></tr>
      ${rows}
    </table>`,
    ctas: [
      { url: detailsUrl, text: 'View meeting details' },
      meetingLink ? { url: meetingLink, text: 'Direct join' } : null,
    ].filter(Boolean),
    footerNote: 'Rudhram &middot; Meeting notification',
  });
};

export const sendMeetingEmail = async (to, meeting, type = 'scheduled') => {
  const detailsUrl = `${config.clientUrl}/meetings/${meeting._id}`;
  const subject = `${type === 'reminder' ? 'Reminder: ' : 'Meeting scheduled: '}${meeting.title}`;
  return sendEmail({
    to,
    subject,
    html: renderMeetingEmail({
      type,
      title: meeting.title,
      date: new Date(meeting.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      location: meeting.location || null,
      meetingLink: meeting.meetingLink || null,
      detailsUrl,
    }),
  });
};

export const renderInvoiceEmail = ({ clientName, invoiceNumber, total, dueDate }) =>
  renderEmail({
    preheader: `Invoice ${invoiceNumber} for ${fmtINR(total)} is due by ${new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
    heading: `Invoice ${invoiceNumber}`,
    subtext: `Dear ${clientName},`,
    bodyHtml: `
      <p style="margin:0;font-family:${FONT};font-size:15px;color:${BODY};line-height:1.7;">Please find attached the invoice <strong style="color:${INK};">${invoiceNumber}</strong> for <strong style="color:${INK};">${fmtINR(total)}</strong>, due by <strong style="color:${INK};">${new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>.</p>
      <p style="margin:16px 0 0;font-family:${FONT};font-size:15px;color:${BODY};line-height:1.7;">The PDF copy is attached to this email for your records. If you have any questions, feel free to reach out.</p>
    `,
    footerNote: 'Rudhram &middot; Thank you for your business.',
  });

export const renderPaymentEmail = ({ clientName, invoiceNumber, amount, date, outstanding }) =>
  renderEmail({
    preheader: `Payment of ${fmtINR(amount)} received for invoice ${invoiceNumber}.`,
    heading: 'Payment received',
    subtext: `Dear ${clientName},`,
    bodyHtml: `
      <p style="margin:0;font-family:${FONT};font-size:15px;color:${BODY};line-height:1.7;">We\u2019ve received a payment of <strong style="color:#059669;">${fmtINR(amount)}</strong> towards invoice <strong style="color:${INK};">${invoiceNumber}</strong>. Thank you!</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid ${BORDER};border-radius:10px;overflow:hidden;">
        <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;color:${MUTED};">Amount paid</td><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;font-weight:600;color:${INK};text-align:right;">${fmtINR(amount)}</td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;color:${MUTED};">Invoice</td><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;color:${INK};text-align:right;">${invoiceNumber}</td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;color:${MUTED};">Date</td><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;color:${INK};text-align:right;">${new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td></tr>
        <tr><td style="padding:12px 16px;font-family:${FONT};font-size:13px;color:${MUTED};">Outstanding</td><td style="padding:12px 16px;font-family:${FONT};font-size:13px;font-weight:600;color:${INK};text-align:right;">${fmtINR(Math.max(0, outstanding))}</td></tr>
      </table>
    `,
    footerNote: 'Rudhram &middot; Thank you for your payment.',
  });

export const sendWelcomeEmail = async (email, name) =>
  sendEmail({ to: email, subject: 'Welcome to Rudhram', html: renderWelcomeEmail(name) });

export const sendVerificationEmail = async (email, otp) =>
  sendEmail({ to: email, subject: `Your Rudhram verification code: ${otp}`, html: renderVerificationEmail(email, otp) });

export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${config.clientUrl}/auth/reset-password?token=${resetToken}`;
  return sendEmail({ to: email, subject: 'Reset your Rudhram password', html: renderPasswordResetEmail(resetUrl) });
};

export const BRAND_PORTAL_NAMES = {
  aghori: 'Aghori',
  panigrahna: 'Panigrahna',
  house_of_joggi: 'House of Joggi',
  damrru: 'Damrru',
  tandavs: 'Tandavs',
  kapaalik: 'Kapaalik',
  kalyannam: 'Kalyannam',
  storage_media_solution: 'Storage Media Solution',
};

export const renderPortalInviteEmail = ({ portalName, inviteUrl }) =>
  renderEmail({
    preheader: `You've been invited to the ${portalName} client portal. Set your password to get started.`,
    heading: `Welcome to ${portalName}`,
    subtext: `You've been invited to the <strong style="color:${INK};">${portalName}</strong> client portal. Set a password to sign in and access your projects, tasks, and meetings.`,
    bodyHtml: `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${BG};border:1px solid ${BORDER};border-radius:12px;padding:16px 20px;font-family:${FONT};font-size:13px;color:${MUTED};">If the button doesn\u2019t work, copy this link into your browser:<br><a href="${inviteUrl}" style="color:${INK};">${inviteUrl}</a></td></tr></table>`,
    cta: { url: inviteUrl, text: 'Set your password' },
    footerNote: 'This link expires in 7 days. If you didn\u2019t expect this email, you can safely ignore it.',
  });

export const sendPortalInviteEmail = async (email, inviteToken, brand) => {
  const portalName = BRAND_PORTAL_NAMES[brand] || 'Rudhram';
  const inviteUrl = `${config.clientUrl}/portal/accept-invite?token=${inviteToken}`;
  return sendEmail({
    to: email,
    subject: `You're invited to the ${portalName} client portal`,
    html: renderPortalInviteEmail({ portalName, inviteUrl }),
  });
};
