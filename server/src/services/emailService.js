import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let transporter = null;
let resend = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!config.smtp?.user || !config.smtp?.pass) return null;
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
  return transporter;
};

const getResendClient = () => {
  if (resend) return resend;
  if (!config.resend?.apiKey) return null;
  resend = new Resend(config.resend.apiKey);
  return resend;
};

export const sendEmail = async ({ to, subject, html, attachments, from, fromName, replyTo }) => {
  const senderEmail = from || config.smtp?.fromEmail || config.resend?.fromEmail || config.smtp?.user || 'admin@rudhramenterprises.com';
  const senderName = fromName || config.smtp?.fromName || config.resend?.fromName || 'Rudhram Enterprises';
  const fromHeader = `"${senderName}" <${senderEmail}>`;

  const smtpClient = getTransporter();

  if (smtpClient) {
    try {
      const info = await smtpClient.sendMail({
        from: fromHeader,
        to: Array.isArray(to) ? to.join(', ') : to,
        replyTo: replyTo || senderEmail,
        subject,
        html,
        attachments,
      });

      logger.info(`Email sent via Zoho SMTP (${senderEmail}): ${info.messageId} | to: ${to} | subject: ${subject}`);
      return { id: info.messageId, provider: 'smtp' };
    } catch (err) {
      logger.error(`Zoho SMTP failed: ${err.message}. Checking Resend fallback...`);
      const resendClient = getResendClient();
      if (!resendClient) throw err;
    }
  }

  const resendClient = getResendClient();
  if (resendClient) {
    try {
      const { data, error } = await resendClient.emails.send({
        from: fromHeader,
        to: Array.isArray(to) ? to : [to],
        replyTo: replyTo || senderEmail,
        subject,
        html,
        attachments,
      });

      if (error) {
        logger.error(`Resend failed: ${error.message}`);
        throw error;
      }

      logger.info(`Email sent via Resend fallback: ${data?.id} | to: ${to} | subject: ${subject}`);
      return { id: data?.id, provider: 'resend' };
    } catch (err) {
      logger.error(`Email send failed: ${err.message}`);
      throw err;
    }
  }

  logger.info(`[EMAIL FALLBACK] From: ${fromHeader} | To: ${to} | Subject: ${subject}\n${html}`);
  return { id: 'dev-fallback' };
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
        <p style="margin:0;font-family:${FONT};font-size:12px;color:${MUTED};line-height:1.6;">Rudhram &mdash; Leading What's Next</p>
        <p style="margin:4px 0 0;font-family:${FONT};font-size:12px;color:${MUTED};line-height:1.6;">Support: <a href="mailto:support@rudhramenterprises.com" style="color:${MUTED};text-decoration:none;">support@rudhramenterprises.com</a> &middot; <a href="tel:+918655695623" style="color:${MUTED};text-decoration:none;">+91 8655695623</a></p>
        ${footerNote ? `<p style="margin:6px 0 0;font-family:${FONT};font-size:12px;color:${MUTED};line-height:1.6;">${footerNote}</p>` : ''}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
};

export const renderVerificationEmail = (email, otp, options = {}) => {
  const brand = options.brand || 'damrru';
  const { brandLabel, brandPhoneFormatted, rePhoneFormatted, brandEmail, reEmail } = getBrandSupportInfo(brand);

  const resolvedLogoUrl = options.logoUrl || `${config.clientUrl}/rudhram-logo.png`;
  const topBannerText = options.topBannerText || 'Your email verification OTP is ready';
  const topBannerBg = options.topBannerBg || '#8A5C2A';
  const topBannerTextColor = options.topBannerTextColor || '#ffffff';
  const SANS_FONT = "-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-scheme" content="light">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Verify Your Email - Rudhram</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet">
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f4f3ef; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .fluid { max-width: 100% !important; height: auto !important; }
    .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .mobile-hero-title { font-size: 24px !important; line-height: 1.25 !important; }
    .otp-code { font-size: 28px !important; letter-spacing: 8px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f3ef;font-family:${SANS_FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="580" cellpadding="0" cellspacing="0" class="email-container" style="max-width:580px;width:100%;">

  <!-- Main White Card Container -->
  <tr><td style="background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eae7e0;">
    <!-- Top Announcement Strip -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:${topBannerBg};padding:11px 20px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr>
              <td valign="middle">
                <span
                  style="color:${topBannerTextColor};font-family:${SANS_FONT};font-size:12.5px;font-weight:600;letter-spacing:0.2px;line-height:20px;white-space:nowrap;"
                >
                  ${topBannerText}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Brand Header (Centered Rudhram Logo) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:34px 24px 20px;">
          <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
            <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="135" style="width:135px;max-width:135px;height:auto;display:block;margin:0 auto;border:0;">
          </a>
        </td>
      </tr>
    </table>

    <!-- Hero Headline -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:0 32px 20px;" class="mobile-padding">
          <h1 class="mobile-hero-title" style="margin:0;font-family:${SANS_FONT};font-size:27px;font-weight:700;color:#181818;line-height:1.25;letter-spacing:-0.5px;text-align:center;">
            Verify Your Email
          </h1>
        </td>
      </tr>
    </table>

    <!-- Body & OTP Box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px 34px;" class="mobile-padding">
          <p style="margin:0 0 22px;font-family:${SANS_FONT};font-size:14.5px;color:#4c4c4c;line-height:1.65;text-align:center;">
            We sent a 6-digit verification code to <strong style="color:#191919;">${email}</strong>.<br>Enter this code in the application to complete your verification.
          </p>

          <!-- Large Monospace OTP Box -->
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 16px;">
            <tr>
              <td align="center" style="background-color:#f3efe6;border:1.5px solid #e0d8c8;border-radius:14px;padding:20px 36px;">
                <span class="otp-code" style="font-family:'JetBrains Mono', Consolas, Monaco, monospace;font-size:36px;font-weight:700;letter-spacing:12px;color:#191919;-webkit-user-select:all;user-select:all;cursor:pointer;line-height:1.2;display:inline-block;padding-left:12px;">${otp}</span>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 20px;font-family:${SANS_FONT};font-size:12px;color:#71717a;line-height:1.5;text-align:center;">
            &bull; Tap or click the code above to select and copy it easily.
          </p>
        </td>
      </tr>
    </table>

    <!-- Thin Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px;" class="mobile-padding">
          <div style="height:1px;background-color:#eeece6;font-size:0;line-height:0;">&nbsp;</div>
        </td>
      </tr>
    </table>

    <!-- Security Callout Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:32px;" class="mobile-padding">
          <div style="background-color:#eeede7;border:1px solid #e2dfd7;border-radius:14px;padding:26px 20px;text-align:center;">
            <h3 style="margin:0 0 8px;font-family:${SANS_FONT};font-size:15px;font-weight:700;color:#191919;">
              Security & Expiry Notice
            </h3>
            <p style="margin:0 0 14px;font-family:${SANS_FONT};font-size:12.5px;color:#555555;line-height:1.6;">
              This verification code expires in <strong>10 minutes</strong>. If you did not request this verification code, please ignore this email or contact our support team immediately.
            </p>
            <div style="margin:0 auto;border-top:1px solid #dcd7ce;padding-top:14px;text-align:left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>Support:</strong> ${rePhoneFormatted} &bull; ${reEmail}</td>
                </tr>
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>${brandLabel} Lead:</strong> ${brandPhoneFormatted !== '-' ? brandPhoneFormatted : 'Dedicated Support'} &bull; ${brandEmail}</td>
                </tr>
              </table>
            </div>
          </div>
        </td>
      </tr>
    </table>

  </td></tr>
  <!-- End of Main White Card -->

  <!-- Outer Footer Section -->
  <tr>
    <td align="center" style="padding:32px 20px 0;">
      <p style="margin:0 0 8px;font-family:${SANS_FONT};font-size:11.5px;color:#555555;line-height:1.6;">
        <a href="${config.clientUrl}" style="color:#555555;text-decoration:underline;">Rudhram Home</a> &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <a href="${config.clientUrl}" style="color:#555555;text-decoration:underline;">Support Center</a>
      </p>
      <p style="margin:0 0 4px;font-family:${SANS_FONT};font-size:11px;color:#8a8780;line-height:1.5;">
        &copy; 2026 Rudhram Enterprises. All rights reserved.<br>
        RE Support: ${rePhoneFormatted} &middot; ${reEmail}
      </p>
      <div align="center" style="margin-top:20px;">
        <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
          <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="85" style="width:85px;max-width:85px;height:auto;display:block;margin:0 auto;opacity:0.85;border:0;">
        </a>
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

export const renderWelcomeEmail = (name = 'Valued User', options = {}) => {
  const brand = options.brand || 'damrru';
  const { brandLabel, brandPhoneFormatted, rePhoneFormatted, brandEmail, reEmail } = getBrandSupportInfo(brand);

  const resolvedLogoUrl = options.logoUrl || `${config.clientUrl}/rudhram-logo.png`;
  const loginUrl = options.loginUrl || `${config.clientUrl}/auth/login`;
  const topBannerText = options.topBannerText || 'Welcome to Rudhram Enterprises';
  const topBannerBg = options.topBannerBg || '#8A5C2A';
  const topBannerTextColor = options.topBannerTextColor || '#ffffff';
  const buttonBg = options.buttonBg || '#8A5C2A';
  const buttonTextColor = options.buttonTextColor || '#ffffff';
  const SANS_FONT = "-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-scheme" content="light">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Welcome to Rudhram, ${name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f4f3ef; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .fluid { max-width: 100% !important; height: auto !important; }
    .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .mobile-hero-title { font-size: 24px !important; line-height: 1.25 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f3ef;font-family:${SANS_FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="580" cellpadding="0" cellspacing="0" class="email-container" style="max-width:580px;width:100%;">

  <!-- Main White Card Container -->
  <tr><td style="background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eae7e0;">
    <!-- Top Announcement Strip -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:${topBannerBg};padding:11px 20px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr>
              <td valign="middle" style="padding-right:6px;">
                <a
                  href="${loginUrl}"
                  target="_blank"
                  style="color:${topBannerTextColor};font-family:${SANS_FONT}; text-decoration:underline; text-underline-offset: 3px; font-size:12.5px;font-weight:600;letter-spacing:0.2px;line-height:20px;white-space:nowrap;"
                >
                  ${topBannerText}
                </a>
              </td>

              <td valign="bottom" style="line-height:0;">
                <a
                  href="${loginUrl}"
                  target="_blank"
                  style="display:block;color:${topBannerTextColor};text-decoration:none;"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${topBannerTextColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Brand Header (Centered Rudhram Logo) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:34px 24px 20px;">
          <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
            <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="135" style="width:135px;max-width:135px;height:auto;display:block;margin:0 auto;border:0;">
          </a>
        </td>
      </tr>
    </table>

    <!-- Hero Headline -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:0 32px 24px;" class="mobile-padding">
          <h1 class="mobile-hero-title" style="margin:0;font-family:${SANS_FONT};font-size:27px;font-weight:700;color:#181818;line-height:1.25;letter-spacing:-0.5px;text-align:center;">
            Welcome to Rudhram, ${name}
          </h1>
        </td>
      </tr>
    </table>

    <!-- Body & CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px 34px;" class="mobile-padding">
          <p style="margin:0 0 18px;font-family:${SANS_FONT};font-size:14.5px;color:#4c4c4c;line-height:1.65;text-align:center;">
            Hi <strong style="color:#191919;">${name}</strong>,<br>Your account has been created successfully. We are excited to have you on board! You can now sign in to access your platform dashboard, collaborate with your team, and manage your account.
          </p>

          <!-- CTA Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 16px;">
            <tr>
              <td align="center">
                <a href="${loginUrl}" target="_blank" style="display:inline-block;background-color:${buttonBg};color:${buttonTextColor};font-family:${SANS_FONT};font-size:13.5px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:7px;letter-spacing:0.2px;">
                  Sign In to Rudhram &rarr;
                </a>
              </td>
            </tr>
          </table>

          <!-- Verification Note Box -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid #ebe6dd;border-radius:12px;overflow:hidden;background-color:#faf9f6;">
            <tr>
              <td style="padding:14px 18px;font-family:${SANS_FONT};font-size:12.5px;color:#666666;line-height:1.5;">
                <strong>Verification Note:</strong> We have sent a verification OTP code in a separate email. Please use it to confirm your address and unlock full account permissions.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Thin Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px;" class="mobile-padding">
          <div style="height:1px;background-color:#eeece6;font-size:0;line-height:0;">&nbsp;</div>
        </td>
      </tr>
    </table>

    <!-- Support Callout Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:32px;" class="mobile-padding">
          <div style="background-color:#eeede7;border:1px solid #e2dfd7;border-radius:14px;padding:26px 20px;text-align:center;">
            <h3 style="margin:0 0 8px;font-family:${SANS_FONT};font-size:15px;font-weight:700;color:#191919;">
              Need Any Help Getting Started?
            </h3>
            <p style="margin:0 0 14px;font-family:${SANS_FONT};font-size:12.5px;color:#555555;line-height:1.6;">
              If you have any questions or require assistance setting up your workspace, our team is available to assist you.
            </p>
            <div style="margin:0 auto;border-top:1px solid #dcd7ce;padding-top:14px;text-align:left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>Support:</strong> ${rePhoneFormatted} &bull; ${reEmail}</td>
                </tr>
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>${brandLabel} Lead:</strong> ${brandPhoneFormatted !== '-' ? brandPhoneFormatted : 'Dedicated Support'} &bull; ${brandEmail}</td>
                </tr>
              </table>
            </div>
          </div>
        </td>
      </tr>
    </table>

  </td></tr>
  <!-- End of Main White Card -->

  <!-- Outer Footer Section -->
  <tr>
    <td align="center" style="padding:32px 20px 0;">
      <p style="margin:0 0 8px;font-family:${SANS_FONT};font-size:11.5px;color:#555555;line-height:1.6;">
        <a href="${config.clientUrl}" style="color:#555555;text-decoration:underline;">Rudhram Home</a> &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <a href="${config.clientUrl}" style="color:#555555;text-decoration:underline;">Support Center</a>
      </p>
      <p style="margin:0 0 4px;font-family:${SANS_FONT};font-size:11px;color:#8a8780;line-height:1.5;">
        &copy; 2026 Rudhram Enterprises. All rights reserved.<br>
        RE Support: ${rePhoneFormatted} &middot; ${reEmail}
      </p>
      <div align="center" style="margin-top:20px;">
        <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
          <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="85" style="width:85px;max-width:85px;height:auto;display:block;margin:0 auto;opacity:0.85;border:0;">
        </a>
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

export const sendWelcomeEmail = async (email, name, options = {}) =>
  sendEmail({ to: email, subject: `Welcome to Rudhram, ${name}`, html: renderWelcomeEmail(name, options) });

export const renderPasswordResetEmail = (resetUrl, options = {}) => {
  const clientName = options.clientName || 'Valued User';
  const brand = options.brand || 'damrru';
  const { brandLabel, brandPhoneFormatted, rePhoneFormatted, brandEmail, reEmail } = getBrandSupportInfo(brand);

  const resolvedLogoUrl = options.logoUrl || `${config.clientUrl}/rudhram-logo.png`;
  const resolvedResetUrl = resetUrl || `${config.clientUrl}/auth/reset-password`;
  const topBannerText = options.topBannerText || 'Password reset request';
  const topBannerBg = options.topBannerBg || '#8A5C2A';
  const topBannerTextColor = options.topBannerTextColor || '#ffffff';
  const buttonBg = options.buttonBg || '#8A5C2A';
  const buttonTextColor = options.buttonTextColor || '#ffffff';
  const SANS_FONT = "-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-scheme" content="light">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Reset Your Rudhram Password</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f4f3ef; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .fluid { max-width: 100% !important; height: auto !important; }
    .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .mobile-hero-title { font-size: 24px !important; line-height: 1.25 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f3ef;font-family:${SANS_FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="580" cellpadding="0" cellspacing="0" class="email-container" style="max-width:580px;width:100%;">

  <!-- Main White Card Container -->
  <tr><td style="background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eae7e0;">
    <!-- Top Announcement Strip -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:${topBannerBg};padding:11px 20px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr>
              <td valign="middle" style="padding-right:6px;">
                <a
                  href="${resolvedResetUrl}"
                  target="_blank"
                  style="color:${topBannerTextColor};font-family:${SANS_FONT}; text-decoration:underline; text-underline-offset: 3px; font-size:12.5px;font-weight:600;letter-spacing:0.2px;line-height:20px;white-space:nowrap;"
                >
                  ${topBannerText}
                </a>
              </td>

              <td valign="bottom" style="line-height:0;">
                <a
                  href="${resolvedResetUrl}"
                  target="_blank"
                  style="display:block;color:${topBannerTextColor};text-decoration:none;"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${topBannerTextColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Brand Header (Centered Rudhram Logo) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:34px 24px 20px;">
          <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
            <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="135" style="width:135px;max-width:135px;height:auto;display:block;margin:0 auto;border:0;">
          </a>
        </td>
      </tr>
    </table>

    <!-- Hero Headline -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:0 32px 24px;" class="mobile-padding">
          <h1 class="mobile-hero-title" style="margin:0;font-family:${SANS_FONT};font-size:27px;font-weight:700;color:#181818;line-height:1.25;letter-spacing:-0.5px;text-align:center;">
            Reset Your Password
          </h1>
        </td>
      </tr>
    </table>

    <!-- Body & CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px 34px;" class="mobile-padding">
          <p style="margin:0 0 18px;font-family:${SANS_FONT};font-size:14.5px;color:#4c4c4c;line-height:1.65;text-align:center;">
            Hi <strong style="color:#191919;">${clientName}</strong>,<br>We received a request to reset your password for your Rudhram account. Click the button below to choose a new password.
          </p>

          <!-- CTA Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 16px;">
            <tr>
              <td align="center">
                <a href="${resolvedResetUrl}" target="_blank" style="display:inline-block;background-color:${buttonBg};color:${buttonTextColor};font-family:${SANS_FONT};font-size:13.5px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:7px;letter-spacing:0.2px;">
                  Reset Password &rarr;
                </a>
              </td>
            </tr>
          </table>

          <!-- Direct Link Fallback Box -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid #ebe6dd;border-radius:12px;overflow:hidden;background-color:#faf9f6;">
            <tr>
              <td style="padding:14px 18px;font-family:${SANS_FONT};font-size:12px;color:#666666;line-height:1.5;">
                If the button above doesn&rsquo;t work, copy and paste this link into your browser:<br>
                <a href="${resolvedResetUrl}" target="_blank" style="color:#191919;font-weight:600;word-break:break-all;text-decoration:underline;">${resolvedResetUrl}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Thin Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px;" class="mobile-padding">
          <div style="height:1px;background-color:#eeece6;font-size:0;line-height:0;">&nbsp;</div>
        </td>
      </tr>
    </table>

    <!-- Expiration & Security Callout -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:32px;" class="mobile-padding">
          <div style="background-color:#eeede7;border:1px solid #e2dfd7;border-radius:14px;padding:26px 20px;text-align:center;">
            <h3 style="margin:0 0 8px;font-family:${SANS_FONT};font-size:15px;font-weight:700;color:#191919;">
              Security & Link Expiry Notice
            </h3>
            <p style="margin:0 0 14px;font-family:${SANS_FONT};font-size:12.5px;color:#555555;line-height:1.6;">
              This password reset link is valid for <strong>1 hour</strong>. If you did not request a password reset, your account is safe and you can safely ignore this email.
            </p>
            <div style="margin:0 auto;border-top:1px solid #dcd7ce;padding-top:14px;text-align:left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>Support:</strong> ${rePhoneFormatted} &bull; ${reEmail}</td>
                </tr>
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>${brandLabel} Lead:</strong> ${brandPhoneFormatted !== '-' ? brandPhoneFormatted : 'Dedicated Support'} &bull; ${brandEmail}</td>
                </tr>
              </table>
            </div>
          </div>
        </td>
      </tr>
    </table>

  </td></tr>
  <!-- End of Main White Card -->

  <!-- Outer Footer Section -->
  <tr>
    <td align="center" style="padding:32px 20px 0;">
      <p style="margin:0 0 8px;font-family:${SANS_FONT};font-size:11.5px;color:#555555;line-height:1.6;">
        <a href="${config.clientUrl}" style="color:#555555;text-decoration:underline;">Rudhram Home</a> &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <a href="${config.clientUrl}" style="color:#555555;text-decoration:underline;">Support Center</a>
      </p>
      <p style="margin:0 0 4px;font-family:${SANS_FONT};font-size:11px;color:#8a8780;line-height:1.5;">
        &copy; 2026 Rudhram Enterprises. All rights reserved.<br>
        RE Support: ${rePhoneFormatted} &middot; ${reEmail}
      </p>
      <div align="center" style="margin-top:20px;">
        <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
          <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="85" style="width:85px;max-width:85px;height:auto;display:block;margin:0 auto;opacity:0.85;border:0;">
        </a>
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

export const sendPasswordResetEmail = async (email, resetToken, options = {}) => {
  const resetUrl = `${config.clientUrl}/auth/reset-password?token=${resetToken}`;
  return sendEmail({
    to: email,
    subject: 'Reset your Rudhram password',
    html: renderPasswordResetEmail(resetUrl, options),
  });
};

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

export const renderQuotationEmail = ({ clientName, quotationNumber, total, validUntil }) =>
  renderEmail({
    preheader: `Quotation ${quotationNumber} for ${fmtINR(total)} from Rudhram Enterprises.`,
    heading: `Quotation ${quotationNumber}`,
    subtext: `Dear ${clientName},`,
    bodyHtml: `
      <p style="margin:0;font-family:${FONT};font-size:15px;color:${BODY};line-height:1.7;">Please find attached our quotation <strong style="color:${INK};">${quotationNumber}</strong> for <strong style="color:${INK};">${fmtINR(total)}</strong>.</p>
      ${validUntil ? `<p style="margin:16px 0 0;font-family:${FONT};font-size:15px;color:${BODY};line-height:1.7;">This quotation is valid until <strong style="color:${INK};">${new Date(validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>.</p>` : ''}
      <p style="margin:16px 0 0;font-family:${FONT};font-size:15px;color:${BODY};line-height:1.7;">The PDF copy is attached for your review. If you have any questions or would like to discuss the scope, feel free to reach out.</p>
    `,
    footerNote: 'Rudhram &middot; Thank you for considering our proposal.',
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

export const sendVerificationEmail = async (email, otp, options = {}) =>
  sendEmail({ to: email, subject: `Your Rudhram verification code: ${otp}`, html: renderVerificationEmail(email, otp, options) });

export const renderPortalInviteEmail = ({
  portalName = 'Rudhram',
  inviteUrl,
  clientName = 'Valued Client',
  brand = 'damrru',
  logoUrl,
  topBannerText = `You are invited to join ${portalName}`,
  topBannerUrl,
  topBannerBg = '#8A5C2A',
  topBannerTextColor = '#ffffff',
  buttonBg = '#8A5C2A',
  buttonTextColor = '#ffffff',
} = {}) => {
  const { brandLabel, brandPhoneFormatted, rePhoneFormatted, brandEmail, reEmail } = getBrandSupportInfo(brand);

  const resolvedLogoUrl = logoUrl || `${config.clientUrl}/rudhram-logo.png`;
  const resolvedInviteUrl = inviteUrl || `${config.clientUrl}/portal/accept-invite`;
  const effectiveTopBannerUrl = topBannerUrl || resolvedInviteUrl;
  const SANS_FONT = "-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-scheme" content="light">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Welcome to ${portalName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f4f3ef; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .fluid { max-width: 100% !important; height: auto !important; }
    .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .mobile-hero-title { font-size: 24px !important; line-height: 1.25 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f3ef;font-family:${SANS_FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="580" cellpadding="0" cellspacing="0" class="email-container" style="max-width:580px;width:100%;">

  <!-- Main White Card Container -->
  <tr><td style="background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eae7e0;">
    <!-- Top Announcement Strip -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:${topBannerBg};padding:11px 20px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr>
              <td valign="middle" style="padding-right:6px;">
                <a
                  href="${effectiveTopBannerUrl}"
                  target="_blank"
                  style="color:${topBannerTextColor};font-family:${SANS_FONT}; text-decoration:underline; text-underline-offset: 3px; font-size:12.5px;font-weight:600;letter-spacing:0.2px;line-height:20px;white-space:nowrap;"
                >
                  ${topBannerText}
                </a>
              </td>

              <td valign="bottom" style="line-height:0;">
                <a
                  href="${effectiveTopBannerUrl}"
                  target="_blank"
                  style="display:block;color:${topBannerTextColor};text-decoration:none;"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${topBannerTextColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Brand Header (Centered Rudhram Logo) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:34px 24px 20px;">
          <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
            <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="135" style="width:135px;max-width:135px;height:auto;display:block;margin:0 auto;border:0;">
          </a>
        </td>
      </tr>
    </table>

    <!-- Hero Headline -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:0 32px 24px;" class="mobile-padding">
          <h1 class="mobile-hero-title" style="margin:0;font-family:${SANS_FONT};font-size:27px;font-weight:700;color:#181818;line-height:1.25;letter-spacing:-0.5px;text-align:center;">
            Welcome to ${portalName}
          </h1>
        </td>
      </tr>
    </table>

    <!-- Body & CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px 34px;" class="mobile-padding">
          <p style="margin:0 0 18px;font-family:${SANS_FONT};font-size:14.5px;color:#4c4c4c;line-height:1.65;text-align:center;">
            Hello ${clientName},<br>You have been invited to access the <strong style="color:#191919;">${portalName}</strong> client portal. Set your password to activate your account and start reviewing project deliverables, tracking timelines, and managing invoices seamlessly.
          </p>

          <!-- CTA Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 16px;">
            <tr>
              <td align="center">
                <a href="${resolvedInviteUrl}" target="_blank" style="display:inline-block;background-color:${buttonBg};color:${buttonTextColor};font-family:${SANS_FONT};font-size:13.5px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:7px;letter-spacing:0.2px;">
                  Set Your Password &rarr;
                </a>
              </td>
            </tr>
          </table>

          <!-- Direct Link Fallback Box -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border:1px solid #ebe6dd;border-radius:12px;overflow:hidden;background-color:#faf9f6;">
            <tr>
              <td style="padding:14px 18px;font-family:${SANS_FONT};font-size:12px;color:#666666;line-height:1.5;">
                If the button above doesn&rsquo;t work, copy and paste this link into your browser:<br>
                <a href="${resolvedInviteUrl}" target="_blank" style="color:#191919;font-weight:600;word-break:break-all;text-decoration:underline;">${resolvedInviteUrl}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Thin Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px;" class="mobile-padding">
          <div style="height:1px;background-color:#eeece6;font-size:0;line-height:0;">&nbsp;</div>
        </td>
      </tr>
    </table>

    <!-- Expiration & Security Callout -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:32px;" class="mobile-padding">
          <div style="background-color:#eeede7;border:1px solid #e2dfd7;border-radius:14px;padding:26px 20px;text-align:center;">
            <h3 style="margin:0 0 8px;font-family:${SANS_FONT};font-size:15px;font-weight:700;color:#191919;">
              Important Security Information
            </h3>
            <p style="margin:0 0 14px;font-family:${SANS_FONT};font-size:12.5px;color:#555555;line-height:1.6;">
              *This invitation link is valid for <strong>7 days</strong>. If you did not expect this invitation, you can safely ignore this email.
            </p>
            <div style="margin:0 auto;border-top:1px solid #dcd7ce;padding-top:14px;text-align:left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>Support:</strong> ${rePhoneFormatted} &bull; ${reEmail}</td>
                </tr>
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>${brandLabel} Lead:</strong> ${brandPhoneFormatted !== '-' ? brandPhoneFormatted : 'Dedicated Support'} &bull; ${brandEmail}</td>
                </tr>
              </table>
            </div>
          </div>
        </td>
      </tr>
    </table>

  </td></tr>
  <!-- End of Main White Card -->

  <!-- Outer Footer Section -->
  <tr>
    <td align="center" style="padding:32px 20px 0;">
      <p style="margin:0 0 8px;font-family:${SANS_FONT};font-size:11.5px;color:#555555;line-height:1.6;">
        <a href="${config.clientUrl}" style="color:#555555;text-decoration:underline;">Client Portal</a> &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <a href="${config.clientUrl}" style="color:#555555;text-decoration:underline;">Support Center</a>
      </p>
      <p style="margin:0 0 4px;font-family:${SANS_FONT};font-size:11px;color:#8a8780;line-height:1.5;">
        &copy; 2026 Rudhram Enterprises. All rights reserved.<br>
        RE Support: ${rePhoneFormatted} &middot; ${reEmail}
      </p>
      <div align="center" style="margin-top:20px;">
        <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
          <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="85" style="width:85px;max-width:85px;height:auto;display:block;margin:0 auto;opacity:0.85;border:0;">
        </a>
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

export const sendPortalInviteEmail = async (email, inviteToken, options = {}) => {
  const portalName = options.portalName || 'Rudhram';
  const inviteUrl = `${config.clientUrl}/portal/accept-invite?token=${inviteToken}`;
  return sendEmail({
    to: email,
    subject: `You're invited to the ${portalName} client portal`,
    html: renderPortalInviteEmail({ portalName, inviteUrl, clientName: options.clientName, brand: options.brand }),
  });
};

// ── Leave Emails ──

export const renderLeaveAppliedEmail = ({
  employeeName = 'Employee',
  leaveType = 'Leave',
  dates = '—',
  duration = '1 day',
  reason = '',
  reviewUrl,
  brand = 'damrru',
  logoUrl,
  topBannerText = 'New Leave Application Submitted',
  topBannerUrl,
  topBannerBg = '#8A5C2A',
  topBannerTextColor = '#ffffff',
  buttonBg = '#8A5C2A',
  buttonTextColor = '#ffffff',
} = {}) => {
  const { brandLabel, brandPhoneFormatted, rePhoneFormatted, brandEmail, reEmail } = getBrandSupportInfo(brand);

  const resolvedLogoUrl = logoUrl || `${config.clientUrl}/rudhram-logo.png`;
  const resolvedReviewUrl = reviewUrl || `${config.clientUrl}/attendance/leaves`;
  const effectiveTopBannerUrl = topBannerUrl || resolvedReviewUrl;
  const SANS_FONT = "-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-scheme" content="light">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>New Leave Request - ${employeeName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f4f3ef; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .fluid { max-width: 100% !important; height: auto !important; }
    .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .mobile-hero-title { font-size: 24px !important; line-height: 1.25 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f3ef;font-family:${SANS_FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="580" cellpadding="0" cellspacing="0" class="email-container" style="max-width:580px;width:100%;">

  <!-- Main White Card Container -->
  <tr><td style="background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eae7e0;">
    <!-- Top Announcement Strip -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:${topBannerBg};padding:11px 20px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr>
              <td valign="middle" style="padding-right:6px;">
                <a
                  href="${effectiveTopBannerUrl}"
                  target="_blank"
                  style="color:${topBannerTextColor};font-family:${SANS_FONT}; text-decoration:underline; text-underline-offset: 3px; font-size:12.5px;font-weight:600;letter-spacing:0.2px;line-height:20px;white-space:nowrap;"
                >
                  ${topBannerText}
                </a>
              </td>

              <td valign="bottom" style="line-height:0;">
                <a
                  href="${effectiveTopBannerUrl}"
                  target="_blank"
                  style="display:block;color:${topBannerTextColor};text-decoration:none;"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${topBannerTextColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Brand Header (Centered Rudhram Logo) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:34px 24px 20px;">
          <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
            <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="135" style="width:135px;max-width:135px;height:auto;display:block;margin:0 auto;border:0;">
          </a>
        </td>
      </tr>
    </table>

    <!-- Hero Headline -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:0 32px 24px;" class="mobile-padding">
          <h1 class="mobile-hero-title" style="margin:0;font-family:${SANS_FONT};font-size:27px;font-weight:700;color:#181818;line-height:1.25;letter-spacing:-0.5px;text-align:center;">
            New Leave Application
          </h1>
        </td>
      </tr>
    </table>

    <!-- Body & Leave Details Box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px 34px;" class="mobile-padding">
          <p style="margin:0 0 20px;font-family:${SANS_FONT};font-size:14.5px;color:#4c4c4c;line-height:1.65;text-align:center;">
            <strong style="color:#191919;">${employeeName}</strong> has submitted a new leave application. Please review the details below and take action in the portal.
          </p>

          <!-- Leave Application Table -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #ebe6dd;border-radius:12px;overflow:hidden;background-color:#faf9f6;">
            <tr><td style="padding:14px 18px;background-color:#f3efe6;border-bottom:1px solid #ebe6dd;font-family:${SANS_FONT};font-size:13px;font-weight:700;color:#191919;" colspan="2">Leave Application Details</td></tr>
            <tr>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;color:#666666;width:120px;">Employee</td>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;font-weight:600;color:#191919;text-align:right;">${employeeName}</td>
            </tr>
            <tr>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;color:#666666;">Leave Type</td>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;font-weight:600;color:#191919;text-align:right;">${leaveType}</td>
            </tr>
            <tr>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;color:#666666;">Dates &amp; Duration</td>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;font-weight:600;color:#191919;text-align:right;">${dates} (${duration})</td>
            </tr>
            <tr>
              <td style="padding:14px 18px;font-family:${SANS_FONT};font-size:13px;color:#666666;">Reason</td>
              <td style="padding:14px 18px;font-family:${SANS_FONT};font-size:13px;color:#333333;text-align:right;">${reason || '—'}</td>
            </tr>
          </table>

          <!-- CTA Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 10px;">
            <tr>
              <td align="center">
                <a href="${resolvedReviewUrl}" target="_blank" style="display:inline-block;background-color:${buttonBg};color:${buttonTextColor};font-family:${SANS_FONT};font-size:13.5px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:7px;letter-spacing:0.2px;">
                  Review &amp; Approve Leave &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Thin Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px;" class="mobile-padding">
          <div style="height:1px;background-color:#eeece6;font-size:0;line-height:0;">&nbsp;</div>
        </td>
      </tr>
    </table>

    <!-- Support Callout Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:32px;" class="mobile-padding">
          <div style="background-color:#eeede7;border:1px solid #e2dfd7;border-radius:14px;padding:26px 20px;text-align:center;">
            <h3 style="margin:0 0 8px;font-family:${SANS_FONT};font-size:15px;font-weight:700;color:#191919;">
              HR &amp; Attendance Management
            </h3>
            <p style="margin:0 0 14px;font-family:${SANS_FONT};font-size:12.5px;color:#555555;line-height:1.6;">
              Review leave requests promptly to ensure proper team planning and attendance tracking across all ventures.
            </p>
            <div style="margin:0 auto;border-top:1px solid #dcd7ce;padding-top:14px;text-align:left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>RE HR Support:</strong> ${rePhoneFormatted} &bull; ${reEmail}</td>
                </tr>
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>${brandLabel} Lead:</strong> ${brandPhoneFormatted !== '-' ? brandPhoneFormatted : 'Dedicated Support'} &bull; ${brandEmail}</td>
                </tr>
              </table>
            </div>
          </div>
        </td>
      </tr>
    </table>

  </td></tr>
  <!-- End of Main White Card -->

  <!-- Outer Footer Section -->
  <tr>
    <td align="center" style="padding:32px 20px 0;">
      <p style="margin:0 0 8px;font-family:${SANS_FONT};font-size:11.5px;color:#555555;line-height:1.6;">
        <a href="${config.clientUrl}/attendance/leaves" style="color:#555555;text-decoration:underline;">Leave Portal</a> &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <a href="${config.clientUrl}" style="color:#555555;text-decoration:underline;">Rudhram CRM</a>
      </p>
      <p style="margin:0 0 4px;font-family:${SANS_FONT};font-size:11px;color:#8a8780;line-height:1.5;">
        &copy; 2026 Rudhram Enterprises. All rights reserved.<br>
        RE Support: ${rePhoneFormatted} &middot; ${reEmail}
      </p>
      <div align="center" style="margin-top:20px;">
        <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
          <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="85" style="width:85px;max-width:85px;height:auto;display:block;margin:0 auto;opacity:0.85;border:0;">
        </a>
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

export const renderLeaveApprovedEmail = ({
  employeeName = 'Employee',
  leaveType = 'Leave',
  dates = '—',
  duration = '1 day',
  detailsUrl,
  brand = 'damrru',
  logoUrl,
  topBannerText = 'Leave Application Approved',
  topBannerUrl,
  topBannerBg = '#8A5C2A',
  topBannerTextColor = '#ffffff',
  buttonBg = '#8A5C2A',
  buttonTextColor = '#ffffff',
} = {}) => {
  const { brandLabel, brandPhoneFormatted, rePhoneFormatted, brandEmail, reEmail } = getBrandSupportInfo(brand);

  const resolvedLogoUrl = logoUrl || `${config.clientUrl}/rudhram-logo.png`;
  const resolvedDetailsUrl = detailsUrl || `${config.clientUrl}/attendance/leaves`;
  const effectiveTopBannerUrl = topBannerUrl || resolvedDetailsUrl;
  const SANS_FONT = "-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-scheme" content="light">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Leave Request Approved - ${employeeName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f4f3ef; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .fluid { max-width: 100% !important; height: auto !important; }
    .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .mobile-hero-title { font-size: 24px !important; line-height: 1.25 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f3ef;font-family:${SANS_FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="580" cellpadding="0" cellspacing="0" class="email-container" style="max-width:580px;width:100%;">

  <!-- Main White Card Container -->
  <tr><td style="background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eae7e0;">
    <!-- Top Announcement Strip -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:${topBannerBg};padding:11px 20px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr>
              <td valign="middle" style="padding-right:6px;">
                <a
                  href="${effectiveTopBannerUrl}"
                  target="_blank"
                  style="color:${topBannerTextColor};font-family:${SANS_FONT}; text-decoration:underline; text-underline-offset: 3px; font-size:12.5px;font-weight:600;letter-spacing:0.2px;line-height:20px;white-space:nowrap;"
                >
                  ${topBannerText}
                </a>
              </td>

              <td valign="bottom" style="line-height:0;">
                <a
                  href="${effectiveTopBannerUrl}"
                  target="_blank"
                  style="display:block;color:${topBannerTextColor};text-decoration:none;"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${topBannerTextColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Brand Header (Centered Rudhram Logo) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:34px 24px 20px;">
          <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
            <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="135" style="width:135px;max-width:135px;height:auto;display:block;margin:0 auto;border:0;">
          </a>
        </td>
      </tr>
    </table>

    <!-- Hero Headline -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:0 32px 24px;" class="mobile-padding">
          <h1 class="mobile-hero-title" style="margin:0;font-family:${SANS_FONT};font-size:27px;font-weight:700;color:#181818;line-height:1.25;letter-spacing:-0.5px;text-align:center;">
            Leave Request Approved
          </h1>
        </td>
      </tr>
    </table>

    <!-- Body & Leave Details Box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px 34px;" class="mobile-padding">
          <p style="margin:0 0 20px;font-family:${SANS_FONT};font-size:14.5px;color:#4c4c4c;line-height:1.65;text-align:center;">
            Hello <strong style="color:#191919;">${employeeName}</strong>,<br>Great news! Your leave request has been officially <strong style="color:#059669;">Approved</strong>.
          </p>

          <!-- Leave Application Table -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #ebe6dd;border-radius:12px;overflow:hidden;background-color:#faf9f6;">
            <tr><td style="padding:14px 18px;background-color:#f3efe6;border-bottom:1px solid #ebe6dd;font-family:${SANS_FONT};font-size:13px;font-weight:700;color:#191919;" colspan="2">Approved Leave Details</td></tr>
            <tr>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;color:#666666;width:120px;">Employee</td>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;font-weight:600;color:#191919;text-align:right;">${employeeName}</td>
            </tr>
            <tr>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;color:#666666;">Leave Type</td>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;font-weight:600;color:#191919;text-align:right;">${leaveType}</td>
            </tr>
            <tr>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;color:#666666;">Dates &amp; Duration</td>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;font-weight:600;color:#191919;text-align:right;">${dates} (${duration})</td>
            </tr>
            <tr>
              <td style="padding:14px 18px;font-family:${SANS_FONT};font-size:13px;color:#666666;">Status</td>
              <td style="padding:14px 18px;font-family:${SANS_FONT};font-size:13px;font-weight:700;color:#059669;text-align:right;">Approved</td>
            </tr>
          </table>

          <!-- CTA Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 10px;">
            <tr>
              <td align="center">
                <a href="${resolvedDetailsUrl}" target="_blank" style="display:inline-block;background-color:${buttonBg};color:${buttonTextColor};font-family:${SANS_FONT};font-size:13.5px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:7px;letter-spacing:0.2px;">
                  View Leave Details &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Thin Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px;" class="mobile-padding">
          <div style="height:1px;background-color:#eeece6;font-size:0;line-height:0;">&nbsp;</div>
        </td>
      </tr>
    </table>

    <!-- HR Callout Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:32px;" class="mobile-padding">
          <div style="background-color:#eeede7;border:1px solid #e2dfd7;border-radius:14px;padding:26px 20px;text-align:center;">
            <h3 style="margin:0 0 8px;font-family:${SANS_FONT};font-size:15px;font-weight:700;color:#191919;">
              Enjoy Your Time Off!
            </h3>
            <p style="margin:0 0 14px;font-family:${SANS_FONT};font-size:12.5px;color:#555555;line-height:1.6;">
              Please ensure any urgent pending handovers or team coverage notes are completed prior to your leave date.
            </p>
            <div style="margin:0 auto;border-top:1px solid #dcd7ce;padding-top:14px;text-align:left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>RE HR Support:</strong> ${rePhoneFormatted} &bull; ${reEmail}</td>
                </tr>
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>${brandLabel} Lead:</strong> ${brandPhoneFormatted !== '-' ? brandPhoneFormatted : 'Dedicated Support'} &bull; ${brandEmail}</td>
                </tr>
              </table>
            </div>
          </div>
        </td>
      </tr>
    </table>

  </td></tr>
  <!-- End of Main White Card -->

  <!-- Outer Footer Section -->
  <tr>
    <td align="center" style="padding:32px 20px 0;">
      <p style="margin:0 0 8px;font-family:${SANS_FONT};font-size:11.5px;color:#555555;line-height:1.6;">
        <a href="${config.clientUrl}/attendance/leaves" style="color:#555555;text-decoration:underline;">Leave Portal</a> &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <a href="${config.clientUrl}" style="color:#555555;text-decoration:underline;">Rudhram CRM</a>
      </p>
      <p style="margin:0 0 4px;font-family:${SANS_FONT};font-size:11px;color:#8a8780;line-height:1.5;">
        &copy; 2026 Rudhram Enterprises. All rights reserved.<br>
        RE Support: ${rePhoneFormatted} &middot; ${reEmail}
      </p>
      <div align="center" style="margin-top:20px;">
        <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
          <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="85" style="width:85px;max-width:85px;height:auto;display:block;margin:0 auto;opacity:0.85;border:0;">
        </a>
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

export const renderLeaveRejectedEmail = ({
  employeeName = 'Employee',
  leaveType = 'Leave',
  dates = '—',
  duration = '1 day',
  reason = '',
  detailsUrl,
  brand = 'damrru',
  logoUrl,
  topBannerText = 'Leave Application Status Update',
  topBannerUrl,
  topBannerBg = '#8A5C2A',
  topBannerTextColor = '#ffffff',
  buttonBg = '#8A5C2A',
  buttonTextColor = '#ffffff',
} = {}) => {
  const { brandLabel, brandPhoneFormatted, rePhoneFormatted, brandEmail, reEmail } = getBrandSupportInfo(brand);

  const resolvedLogoUrl = logoUrl || `${config.clientUrl}/rudhram-logo.png`;
  const resolvedDetailsUrl = detailsUrl || `${config.clientUrl}/attendance/leaves`;
  const effectiveTopBannerUrl = topBannerUrl || resolvedDetailsUrl;
  const SANS_FONT = "-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-scheme" content="light">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Leave Request Rejected - ${employeeName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f4f3ef; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .fluid { max-width: 100% !important; height: auto !important; }
    .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .mobile-hero-title { font-size: 24px !important; line-height: 1.25 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f3ef;font-family:${SANS_FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="580" cellpadding="0" cellspacing="0" class="email-container" style="max-width:580px;width:100%;">

  <!-- Main White Card Container -->
  <tr><td style="background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eae7e0;">
    <!-- Top Announcement Strip -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:${topBannerBg};padding:11px 20px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr>
              <td valign="middle" style="padding-right:6px;">
                <a
                  href="${effectiveTopBannerUrl}"
                  target="_blank"
                  style="color:${topBannerTextColor};font-family:${SANS_FONT}; text-decoration:underline; text-underline-offset: 3px; font-size:12.5px;font-weight:600;letter-spacing:0.2px;line-height:20px;white-space:nowrap;"
                >
                  ${topBannerText}
                </a>
              </td>

              <td valign="bottom" style="line-height:0;">
                <a
                  href="${effectiveTopBannerUrl}"
                  target="_blank"
                  style="display:block;color:${topBannerTextColor};text-decoration:none;"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${topBannerTextColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Brand Header (Centered Rudhram Logo) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:34px 24px 20px;">
          <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
            <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="135" style="width:135px;max-width:135px;height:auto;display:block;margin:0 auto;border:0;">
          </a>
        </td>
      </tr>
    </table>

    <!-- Hero Headline -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:0 32px 24px;" class="mobile-padding">
          <h1 class="mobile-hero-title" style="margin:0;font-family:${SANS_FONT};font-size:27px;font-weight:700;color:#181818;line-height:1.25;letter-spacing:-0.5px;text-align:center;">
            Leave Request Update
          </h1>
        </td>
      </tr>
    </table>

    <!-- Body & Leave Details Box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px 34px;" class="mobile-padding">
          <p style="margin:0 0 20px;font-family:${SANS_FONT};font-size:14.5px;color:#4c4c4c;line-height:1.65;text-align:center;">
            Hello <strong style="color:#191919;">${employeeName}</strong>,<br>Your leave request has been reviewed by management and is marked as <strong style="color:#dc2626;">Rejected</strong>.
          </p>

          <!-- Leave Application Table -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #ebe6dd;border-radius:12px;overflow:hidden;background-color:#faf9f6;">
            <tr><td style="padding:14px 18px;background-color:#f3efe6;border-bottom:1px solid #ebe6dd;font-family:${SANS_FONT};font-size:13px;font-weight:700;color:#191919;" colspan="2">Leave Request Details</td></tr>
            <tr>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;color:#666666;width:120px;">Leave Type</td>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;font-weight:600;color:#191919;text-align:right;">${leaveType}</td>
            </tr>
            <tr>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;color:#666666;">Dates &amp; Duration</td>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;font-weight:600;color:#191919;text-align:right;">${dates} (${duration})</td>
            </tr>
            <tr>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;color:#666666;">Status</td>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;font-weight:700;color:#dc2626;text-align:right;">Rejected</td>
            </tr>
            <tr>
              <td style="padding:14px 18px;font-family:${SANS_FONT};font-size:13px;color:#666666;">Rejection Reason</td>
              <td style="padding:14px 18px;font-family:${SANS_FONT};font-size:13px;color:#dc2626;font-weight:500;text-align:right;">${reason || 'Not specified'}</td>
            </tr>
          </table>

          <!-- CTA Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 10px;">
            <tr>
              <td align="center">
                <a href="${resolvedDetailsUrl}" target="_blank" style="display:inline-block;background-color:${buttonBg};color:${buttonTextColor};font-family:${SANS_FONT};font-size:13.5px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:7px;letter-spacing:0.2px;">
                  View Leave Details &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Thin Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px;" class="mobile-padding">
          <div style="height:1px;background-color:#eeece6;font-size:0;line-height:0;">&nbsp;</div>
        </td>
      </tr>
    </table>

    <!-- HR Callout Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:32px;" class="mobile-padding">
          <div style="background-color:#eeede7;border:1px solid #e2dfd7;border-radius:14px;padding:26px 20px;text-align:center;">
            <h3 style="margin:0 0 8px;font-family:${SANS_FONT};font-size:15px;font-weight:700;color:#191919;">
              Questions Regarding This Decision?
            </h3>
            <p style="margin:0 0 14px;font-family:${SANS_FONT};font-size:12.5px;color:#555555;line-height:1.6;">
              If you need further clarification or wish to discuss alternative dates, please reach out to your reporting manager or HR team.
            </p>
            <div style="margin:0 auto;border-top:1px solid #dcd7ce;padding-top:14px;text-align:left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>RE HR Support:</strong> ${rePhoneFormatted} &bull; ${reEmail}</td>
                </tr>
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>${brandLabel} Lead:</strong> ${brandPhoneFormatted !== '-' ? brandPhoneFormatted : 'Dedicated Support'} &bull; ${brandEmail}</td>
                </tr>
              </table>
            </div>
          </div>
        </td>
      </tr>
    </table>

  </td></tr>
  <!-- End of Main White Card -->

  <!-- Outer Footer Section -->
  <tr>
    <td align="center" style="padding:32px 20px 0;">
      <p style="margin:0 0 8px;font-family:${SANS_FONT};font-size:11.5px;color:#555555;line-height:1.6;">
        <a href="${config.clientUrl}/attendance/leaves" style="color:#555555;text-decoration:underline;">Leave Portal</a> &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <a href="${config.clientUrl}" style="color:#555555;text-decoration:underline;">Rudhram CRM</a>
      </p>
      <p style="margin:0 0 4px;font-family:${SANS_FONT};font-size:11px;color:#8a8780;line-height:1.5;">
        &copy; 2026 Rudhram Enterprises. All rights reserved.<br>
        RE Support: ${rePhoneFormatted} &middot; ${reEmail}
      </p>
      <div align="center" style="margin-top:20px;">
        <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
          <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="85" style="width:85px;max-width:85px;height:auto;display:block;margin:0 auto;opacity:0.85;border:0;">
        </a>
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

export const sendLeaveAppliedEmail = async ({ to, employeeName, leaveType, dates, duration, reason, ...options }) => {
  return sendEmail({
    to,
    subject: `New Leave Request: ${employeeName} (${leaveType})`,
    html: renderLeaveAppliedEmail({ employeeName, leaveType, dates, duration, reason, ...options }),
  });
};

export const sendLeaveApprovedEmail = async ({ to, employeeName, leaveType, dates, duration, ...options }) => {
  return sendEmail({
    to,
    subject: `Leave Request Approved — ${leaveType} (${dates})`,
    html: renderLeaveApprovedEmail({ employeeName, leaveType, dates, duration, ...options }),
  });
};

export const sendLeaveRejectedEmail = async ({ to, employeeName, leaveType, dates, duration, reason, ...options }) => {
  return sendEmail({
    to,
    subject: `Leave Request Rejected — ${leaveType} (${dates})`,
    html: renderLeaveRejectedEmail({ employeeName, leaveType, dates, duration, reason, ...options }),
  });
};

const GOLD = '#B47737';
const CREAM = '#F6F1E0';
const DARK_BROWN = '#3B2515';
const LIGHT_GOLD = '#DCC19D';
const EMAIL_FONT = "'Bricolage Grotesque', Georgia, serif";
const EMAIL_BODY_FONT = "'Manrope', Helvetica, Arial, sans-serif";

export const RE_PHONE = '8655695623';
export const RE_EMAIL = 'support@rudhramenterprises.com';

export const BRAND_PHONE_MAP = {
  re: '8655695623',
  ag: '8655695624',
  aghori: '8655695624',
  aghhori: '8655695624',
  pg: '8655695625',
  panigrahna: '8655695625',
  hg: '8655695626',
  house_of_joggi: '8655695626',
  houseofjoogi: '8655695626',
  house_of_joogi: '8655695626',
  kl: '8655695627',
  kalyannam: '8655695627',
  td: '8655695628',
  tandavs: '8655695628',
  dm: '8655695629',
  damrru: '8655695629',
  kp: '-',
  kapaalik: '-',
};

export const BRAND_EMAIL_MAP = {
  re: 'support@rudhramenterprises.com',
  damrru: 'damrru@rudhramenterprises.com',
  dm: 'damrru@rudhramenterprises.com',
  panigrahna: 'panigrahna@rudhramenterprises.com',
  pg: 'panigrahna@rudhramenterprises.com',
  aghori: 'aghhori@rudhramenterprises.com',
  aghhori: 'aghhori@rudhramenterprises.com',
  ag: 'aghhori@rudhramenterprises.com',
  house_of_joggi: 'houseofjoogi@rudhramenterprises.com',
  houseofjoogi: 'houseofjoogi@rudhramenterprises.com',
  house_of_joogi: 'houseofjoogi@rudhramenterprises.com',
  hg: 'houseofjoogi@rudhramenterprises.com',
  kalyannam: 'kalyannam@rudhramenterprises.com',
  kl: 'kalyannam@rudhramenterprises.com',
  kapaalik: 'kapaalik@rudhramenterprises.com',
  kp: 'kapaalik@rudhramenterprises.com',
  tandavs: 'tandavs@rudhramenterprises.com',
  td: 'tandavs@rudhramenterprises.com',
};

export const getBrandSupportInfo = (brand) => {
  const brandKey = (brand || '').toLowerCase().trim();
  const brandLabel = {
    panigrahna: 'Panigrahna',
    aghori: 'Aghori',
    aghhori: 'Aghori',
    house_of_joggi: 'House of Joggi',
    houseofjoogi: 'House of Joggi',
    house_of_joogi: 'House of Joggi',
    damrru: 'Damrru',
    tandavs: 'Tandavs',
    kapaalik: 'Kapaalik',
    kalyannam: 'Kalyannam',
    ag: 'Aghori',
    pg: 'Panigrahna',
    hg: 'House of Joggi',
    kl: 'Kalyannam',
    td: 'Tandavs',
    dm: 'Damrru',
    kp: 'Kapaalik',
    re: 'Rudhram Enterprises',
  }[brandKey] || brand || 'Rudhram';

  const brandPhone = BRAND_PHONE_MAP[brandKey] || '-';
  const brandPhoneFormatted = brandPhone === '-' ? '-' : `+91 ${brandPhone}`;
  const rePhoneFormatted = `+91 ${RE_PHONE}`;

  const brandEmail = BRAND_EMAIL_MAP[brandKey] || RE_EMAIL;
  const reEmail = RE_EMAIL;

  return {
    brandLabel,
    brandPhone,
    brandPhoneFormatted,
    rePhone: RE_PHONE,
    rePhoneFormatted,
    brandEmail,
    reEmail,
  };
};

export const renderClientOnboardingEmail = ({
  clientName = 'Valued Client',
  companyName = 'Your Organization',
  clientId = 'C-00249',
  brand = 'damrru',
  portalUrl = `${config.clientUrl}/portal/login`,
  welcomeImageUrl,
  projectImageUrl,
  teamImageUrl,
  logoUrl,
  topBannerText = 'Your client portal is now active',
  topBannerUrl,
  topBannerBg = '#8A5C2A',
  topBannerTextColor = '#ffffff',
  buttonBg = '#8A5C2A',
  buttonTextColor = '#ffffff',
  heroHeadline,
  heroBody,
  heroCtaText = 'Access Client Portal',
  heroCtaUrl,
  feature1Title = 'Real-Time Project & Deliverable Tracking',
  feature1Body = 'Follow each phase of your project in real time. Review work-in-progress drafts and ensure timeline milestones are met without back-and-forth email chains.',
  feature1CtaText = 'Explore Projects',
  feature1CtaUrl,
  feature2Title = 'Dedicated Brand Team & Direct Communication',
  feature2Body = 'Work directly with your assigned account manager. Schedule check-ins, request adjustments, and get rapid responses during business hours.',
  feature2CtaText = 'Contact Account Team',
  feature2CtaUrl,
  calloutTitle = 'Your Client Portal is Ready',
  calloutSubtitle,
  calloutBody = 'Your secure client workspace gives you centralized control over invoices, payments, project timelines, and real-time deliverables. Sign in now to get started.',
  calloutCtaText = 'Open Client Portal &rarr;',
  calloutCtaUrl,
  calloutFinePrint = '*For your security, you will be prompted to set a new password upon your first sign-in. Never share your credentials with unauthorized third parties.',
} = {}) => {
  const { brandLabel, brandPhone, brandPhoneFormatted, rePhoneFormatted, brandEmail, reEmail } = getBrandSupportInfo(brand);

  const resolvedLogoUrl = logoUrl || `${config.clientUrl}/rudhram-logo.png`;
  const resolvedWelcomeImageUrl = welcomeImageUrl || 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1793775840/welcome-banner.avif';
  const resolvedProjectImageUrl = projectImageUrl || 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1793775840/team-support.avif';
  const resolvedTeamImageUrl = teamImageUrl || 'https://res.cloudinary.com/dvsrgdyi7/image/upload/v1793775842/team-management.avif';
  const resolvedPortalUrl = portalUrl || `${config.clientUrl}/portal/login`;
  const effectiveTopBannerUrl = topBannerUrl || resolvedPortalUrl;
  const effectiveHeroCtaUrl = heroCtaUrl || resolvedPortalUrl;
  const effectiveFeature1CtaUrl = feature1CtaUrl || resolvedPortalUrl;
  const effectiveFeature2CtaUrl = feature2CtaUrl || (brandEmail ? `mailto:${brandEmail}` : `mailto:${reEmail}`);
  const effectiveCalloutCtaUrl = calloutCtaUrl || resolvedPortalUrl;

  const resolvedHeadline = heroHeadline || `Welcome to Rudhram, ${clientName}`;
  const resolvedHeroBody = heroBody || `We are thrilled to welcome ${companyName ? `<strong>${companyName}</strong>` : 'you'} to Rudhram. Your dedicated client portal has been initialized, giving you centralized access to track project milestones, review deliverables, collaborate with your creative team, and manage invoices seamlessly.`;
  const resolvedCalloutSubtitle = calloutSubtitle || `Client ID: <strong style="color:#191919;">${clientId}</strong> &bull; <strong style="color:#191919;">${companyName}</strong>`;

  const SANS_FONT = "-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-scheme" content="light">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Welcome to Rudhram, ${clientName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f4f3ef; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .fluid { width: 100% !important; max-width: 100% !important; height: auto !important; }
    .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .stack-col { width: 100% !important; max-width: 100% !important; display: block !important; box-sizing: border-box !important; text-align: left !important; }
    .stack-col-spacer { display: none !important; width: 0 !important; height: 0 !important; font-size: 0 !important; line-height: 0 !important; }
    .mobile-center { text-align: center !important; }
    .mobile-hero-title { font-size: 24px !important; line-height: 1.25 !important; }
    .mobile-full-width { width: 100% !important; max-width: 100% !important; }
    .mobile-full-width table { width: 100% !important; max-width: 100% !important; }
    .mobile-full-width img { width: 100% !important; max-width: 100% !important; height: auto !important; }
    .mobile-img-bottom { margin-bottom: 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f3ef;font-family:${SANS_FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="580" cellpadding="0" cellspacing="0" class="email-container" style="max-width:580px;width:100%;">

  <!-- Main White Card Container -->
  <tr><td style="background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eae7e0;">
    
    <!-- Top Announcement Strip (Apollo-style dark green strip) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:${topBannerBg};padding:11px 20px;text-align:center;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
    <tr>
      <td valign="middle" style="padding-right:6px;">
        <a
          href="${effectiveTopBannerUrl}"
          target="_blank"
          style="color:${topBannerTextColor};font-family:${SANS_FONT}; text-decoration:underline; text-underline-offset: 3px; font-size:12.5px;font-weight:600;letter-spacing:0.2px;line-height:20px;white-space:nowrap;"
        >
          ${topBannerText}
        </a>
      </td>

      <td valign="bottom" style="line-height:0;">
        <a
          href="${effectiveTopBannerUrl}"
          target="_blank"
          style="display:block;color:${topBannerTextColor};text-decoration:none;"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${topBannerTextColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </a>
      </td>
    </tr>
  </table>
</td>
      </tr>
    </table>

    <!-- Brand Header (Centered Rudhram Logo) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:34px 24px 20px;">
          <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
            <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="135" style="width:135px;max-width:135px;height:auto;display:block;margin:0 auto;border:0;">
          </a>
        </td>
      </tr>
    </table>

    <!-- Hero Headline -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:0 32px 24px;" class="mobile-padding">
          <h1 class="mobile-hero-title" style="margin:0;font-family:${SANS_FONT};font-size:27px;font-weight:700;color:#181818;line-height:1.25;letter-spacing:-0.5px;text-align:center;">
            ${resolvedHeadline}
          </h1>
        </td>
      </tr>
    </table>

    <!-- Hero Image (Welcome Banner: client/public/welcome-banner.jpg) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:0 32px;" class="mobile-padding">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:516px;border-radius:12px;overflow:hidden;border:1px solid #ebe6dd;">
            <tr>
              <td style="padding:0;background-color:#000000;line-height:0;font-size:0;">
                <img src="${resolvedWelcomeImageUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='https://res.cloudinary.com/dvsrgdyi7/image/upload/v1793775840/welcome-banner.avif';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='welcome-banner.jpg';}" alt="Welcome to Rudhram" width="516" style="width:100%;max-width:516px;height:auto;display:block;border:0;" class="fluid">
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Hero Description & Primary CTA Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:24px 32px 34px;" class="mobile-padding">
          <p style="margin:0 auto 24px;max-width:480px;font-family:${SANS_FONT};font-size:14.5px;color:#4c4c4c;line-height:1.65;text-align:center;">
            ${resolvedHeroBody}
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
            <tr>
              <td align="center">
                <a href="${effectiveHeroCtaUrl}" target="_blank" style="display:inline-block;background-color:${buttonBg};color:${buttonTextColor};font-family:${SANS_FONT};font-size:13.5px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:7px;letter-spacing:0.2px;">
                  ${heroCtaText}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Thin Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px;" class="mobile-padding">
          <div style="height:1px;background-color:#eeece6;font-size:0;line-height:0;">&nbsp;</div>
        </td>
      </tr>
    </table>

    <!-- 2-Column Section 1: Left Image (team-support.jpg), Right Content -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:34px 32px;" class="mobile-padding">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <!-- Left: Framed Image (client/public/team-support.jpg) -->
              <td class="stack-col mobile-full-width mobile-img-bottom" width="230" valign="top" style="width:230px;vertical-align:top;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="mobile-full-width" style="max-width:230px;border-radius:12px;overflow:hidden;border:1px solid #ebe6dd;background-color:#ffffff;">
                  <tr>
                    <td style="padding:0;line-height:0;font-size:0;">
                      <img src="${resolvedProjectImageUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='https://res.cloudinary.com/dvsrgdyi7/image/upload/v1793775840/team-support.avif';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='team-support.jpg';}" alt="Real-Time Project & Deliverable Tracking" width="230" style="width:100%;max-width:230px;height:auto;display:block;border:0;" class="fluid">
                    </td>
                  </tr>
                </table>
               
              </td>
              <!-- Spacer -->
              <td class="stack-col-spacer" width="26" style="width:26px;font-size:0;line-height:0;">&nbsp;</td>
              <!-- Right: Content -->
              <td class="stack-col" width="260" valign="middle" style="width:260px;vertical-align:middle;">
                <h3 style="margin:0 0 10px;font-family:${SANS_FONT};font-size:17px;font-weight:700;color:#191919;line-height:1.35;letter-spacing:-0.2px;">
                  ${feature1Title}
                </h3>
                <p style="margin:0 0 18px;font-family:${SANS_FONT};font-size:13px;color:#555555;line-height:1.6;">
                  ${feature1Body}
                </p>
                <a href="${effectiveFeature1CtaUrl}" target="_blank" style="display:inline-block;background-color:${buttonBg};color:${buttonTextColor};font-family:${SANS_FONT};font-size:12.5px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:7px;">
                  ${feature1CtaText}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Thin Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px;" class="mobile-padding">
          <div style="height:1px;background-color:#eeece6;font-size:0;line-height:0;">&nbsp;</div>
        </td>
      </tr>
    </table>

    <!-- 2-Column Section 2: Image Right on Desktop, Image Top on Mobile -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:34px 32px;" class="mobile-padding">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl">
            <tr>
              <!-- Right on Desktop, Top on Mobile: Framed Image -->
              <td class="stack-col mobile-full-width mobile-img-bottom" width="230" valign="top" style="width:230px;vertical-align:top;" dir="ltr">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="mobile-full-width" style="max-width:230px;border-radius:12px;overflow:hidden;border:1px solid #ebe6dd;background-color:#ffffff;">
                  <tr>
                    <td style="padding:0;line-height:0;font-size:0;">
                      <img src="${resolvedTeamImageUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='https://res.cloudinary.com/dvsrgdyi7/image/upload/v1793775842/team-management.avif';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='team-management.jpg';}" alt="Dedicated Brand Team" width="230" style="width:100%;max-width:230px;height:auto;display:block;border:0;" class="fluid">
                    </td>
                  </tr>
                </table>
              </td>
              <!-- Spacer -->
              <td class="stack-col-spacer" width="26" style="width:26px;font-size:0;line-height:0;" dir="ltr">&nbsp;</td>
              <!-- Left on Desktop, Bottom on Mobile: Content -->
              <td class="stack-col" width="260" valign="middle" style="width:260px;vertical-align:middle;" dir="ltr">
                <h3 style="margin:0 0 10px;font-family:${SANS_FONT};font-size:17px;font-weight:700;color:#191919;line-height:1.35;letter-spacing:-0.2px;">
                  ${feature2Title}
                </h3>
                <p style="margin:0 0 18px;font-family:${SANS_FONT};font-size:13px;color:#555555;line-height:1.6;">
                  ${feature2Body}
                </p>
                <a href="${effectiveFeature2CtaUrl}" target="_blank" style="display:inline-block;background-color:${buttonBg};color:${buttonTextColor};font-family:${SANS_FONT};font-size:12.5px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:7px;">
                  ${feature2CtaText}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Highlight Callout Card (Apollo HubSpot Starter style) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px 36px;" class="mobile-padding">
          <div style="background-color:#eeede7;border:1px solid #e2dfd7;border-radius:14px;padding:32px 24px;text-align:center;">
            <h2 style="margin:0 0 6px;font-family:${SANS_FONT};font-size:19px;font-weight:700;color:#191919;line-height:1.3;letter-spacing:-0.2px;">
              ${calloutTitle}
            </h2>
            <p style="margin:0 0 14px;font-family:${SANS_FONT};font-size:13px;color:#666666;line-height:1.4;">
              ${resolvedCalloutSubtitle}
            </p>
            <p style="margin:0 auto 16px;max-width:420px;font-family:${SANS_FONT};font-size:13px;color:#555555;line-height:1.6;">
              ${calloutBody}
            </p>
            <div style="margin:0 auto 18px;">
              <span style="display:inline-block;background-color:#ffffff;border:1px solid #dedad1;border-radius:24px;padding:8px 16px;font-family:${SANS_FONT};font-size:12px;color:#2c2c2c;">
                <span style="color:#8a8a8a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;margin-right:4px;">Assigned Brand</span><br/>
                <strong>${brandLabel}</strong> &nbsp;&bull;&nbsp;
                <span style="color:#15803d;font-weight:600;">Verified Access</span>
              </span>
            </div>
            <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
              <tr>
                <td align="center">
                  <a href="${effectiveCalloutCtaUrl}" target="_blank" style="display:inline-block;background-color:${buttonBg};color:${buttonTextColor};font-family:${SANS_FONT};font-size:13px;font-weight:600;text-decoration:none;padding:11px 26px;border-radius:7px;">
                    ${calloutCtaText}
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:16px auto 0;max-width:440px;font-family:${SANS_FONT};font-size:10px;line-height:1.5;color:#888888;">
              ${calloutFinePrint}
            </p>
          </div>
        </td>
      </tr>
    </table>

  </td></tr>
  <!-- End of Main White Card -->

  <!-- Outer Footer Section (Apollo-style outside footer) -->
  <tr>
    <td align="center" style="padding:32px 20px 0;">
      
      <!-- Social Media Icons (Rounded Outlined Squares) -->
      <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 16px;">
        <tr>
          <td align="center">
            <a href="https://linkedin.com" target="_blank" style="display:inline-block;width:32px;height:32px;line-height:30px;border:1px solid #c9c6bc;border-radius:6px;text-align:center;text-decoration:none;color:#222222;font-family:${SANS_FONT};font-size:12px;font-weight:700;margin:0 3px;vertical-align:middle;box-sizing:border-box;background-color:#ffffff;">
              in
            </a>
            <a href="https://x.com" target="_blank" style="display:inline-block;width:32px;height:32px;line-height:30px;border:1px solid #c9c6bc;border-radius:6px;text-align:center;text-decoration:none;color:#222222;font-family:${SANS_FONT};font-size:12px;font-weight:700;margin:0 3px;vertical-align:middle;box-sizing:border-box;background-color:#ffffff;">
              &#120143;
            </a>
            <a href="https://instagram.com" target="_blank" style="display:inline-block;width:32px;height:32px;line-height:30px;border:1px solid #c9c6bc;border-radius:6px;text-align:center;text-decoration:none;color:#222222;font-family:${SANS_FONT};font-size:11px;font-weight:700;margin:0 3px;vertical-align:middle;box-sizing:border-box;background-color:#ffffff;">
              IG
            </a>
          </td>
        </tr>
      </table>

      <!-- Legal & Support Info -->
      <p style="margin:0 0 4px;font-family:${SANS_FONT};font-size:11px;color:#8a8780;line-height:1.5;">
        &copy; 2026 Rudhram Enterprises. All rights reserved.<br>
        RE Support: ${rePhoneFormatted} &middot; ${reEmail}
      </p>

      <!-- Bottom Brand Mark -->
      <div align="center" style="margin-top:20px;">
        <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
          <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="85" style="width:85px;max-width:85px;height:auto;display:block;margin:0 auto;opacity:0.85;border:0;">
        </a>
      </div>

    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

export const sendClientOnboardingEmail = async (email, { clientName, companyName, clientId, brand }) => {
  return sendEmail({
    to: email,
    subject: `Welcome to Rudhram, ${clientName}`,
    html: renderClientOnboardingEmail({ clientName, companyName, clientId, brand }),
  });
};

export const renderClientCredentialsEmail = ({ clientName = 'Valued Client', email, password, portalUrl = `${config.clientUrl}/portal/login`, brand = 'damrru', logoUrl, topBannerText = 'Your client portal login is ready', topBannerUrl, topBannerBg = '#8A5C2A', topBannerTextColor = '#ffffff', buttonBg = '#8A5C2A', buttonTextColor = '#ffffff' } = {}) => {
  const { brandLabel, brandPhone, brandPhoneFormatted, rePhoneFormatted, brandEmail, reEmail } = getBrandSupportInfo(brand);

  const resolvedLogoUrl = logoUrl || `${config.clientUrl}/rudhram-logo.png`;
  const resolvedPortalUrl = portalUrl || `${config.clientUrl}/portal/login`;
  const effectiveTopBannerUrl = topBannerUrl || resolvedPortalUrl;
  const SANS_FONT = "-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-scheme" content="light">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Your Rudhram Portal Login Credentials</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #f4f3ef; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .fluid { max-width: 100% !important; height: auto !important; }
    .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .mobile-hero-title { font-size: 24px !important; line-height: 1.25 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f3ef;font-family:${SANS_FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="580" cellpadding="0" cellspacing="0" class="email-container" style="max-width:580px;width:100%;">

  <!-- Main White Card Container -->
  <tr><td style="background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eae7e0;">
    <!-- Top Announcement Strip -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:${topBannerBg};padding:11px 20px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr>
              <td valign="middle" style="padding-right:6px;">
                <a
                  href="${effectiveTopBannerUrl}"
                  target="_blank"
                  style="color:${topBannerTextColor};font-family:${SANS_FONT}; text-decoration:underline; text-underline-offset: 3px; font-size:12.5px;font-weight:600;letter-spacing:0.2px;line-height:20px;white-space:nowrap;"
                >
                  ${topBannerText}
                </a>
              </td>

              <td valign="bottom" style="line-height:0;">
                <a
                  href="${effectiveTopBannerUrl}"
                  target="_blank"
                  style="display:block;color:${topBannerTextColor};text-decoration:none;"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${topBannerTextColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Brand Header (Centered Rudhram Logo) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:34px 24px 20px;">
          <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
            <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="135" style="width:135px;max-width:135px;height:auto;display:block;margin:0 auto;border:0;">
          </a>
        </td>
      </tr>
    </table>

    <!-- Hero Headline -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:0 32px 24px;" class="mobile-padding">
          <h1 class="mobile-hero-title" style="margin:0;font-family:${SANS_FONT};font-size:27px;font-weight:700;color:#181818;line-height:1.25;letter-spacing:-0.5px;text-align:center;">
            Your Client Portal Credentials
          </h1>
        </td>
      </tr>
    </table>

    <!-- Hero Description & Credentials Box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px 34px;" class="mobile-padding">
          <p style="margin:0 0 20px;font-family:${SANS_FONT};font-size:14.5px;color:#4c4c4c;line-height:1.65;text-align:center;">
            Dear <strong style="color:#191919;">${clientName}</strong>,<br>Your secure client portal account has been activated. Use your assigned credentials below to sign in.
          </p>
          
          <!-- Credentials Card Table -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #ebe6dd;border-radius:12px;overflow:hidden;background-color:#faf9f6;">
            <tr><td style="padding:14px 18px;background-color:#f3efe6;border-bottom:1px solid #ebe6dd;font-family:${SANS_FONT};font-size:13px;font-weight:700;color:#191919;" colspan="2">Secure Portal Login Access</td></tr>
            <tr>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;color:#666666;width:110px;">Email / ID</td>
              <td style="padding:14px 18px;border-bottom:1px solid #f0ebe0;font-family:${SANS_FONT};font-size:13px;font-weight:600;color:#191919;text-align:right;">${email}</td>
            </tr>
            <tr>
              <td style="padding:14px 18px;font-family:${SANS_FONT};font-size:13px;color:#666666;">Password</td>
              <td style="padding:14px 18px;font-family:monospace;font-size:14px;font-weight:700;color:#191919;text-align:right;letter-spacing:1px;">${password}</td>
            </tr>
          </table>

          <!-- CTA Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 10px;">
            <tr>
              <td align="center">
                <a href="${resolvedPortalUrl}" target="_blank" style="display:inline-block;background-color:${buttonBg};color:${buttonTextColor};font-family:${SANS_FONT};font-size:13.5px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:7px;letter-spacing:0.2px;">
                  Sign In to Portal &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Thin Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 32px;" class="mobile-padding">
          <div style="height:1px;background-color:#eeece6;font-size:0;line-height:0;">&nbsp;</div>
        </td>
      </tr>
    </table>

    <!-- Highlight Callout Card (Security & Support) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:32px;" class="mobile-padding">
          <div style="background-color:#eeede7;border:1px solid #e2dfd7;border-radius:14px;padding:26px 20px;text-align:center;">
            <h3 style="margin:0 0 8px;font-family:${SANS_FONT};font-size:16px;font-weight:700;color:#191919;">
              Important Security Notice
            </h3>
            <p style="margin:0 0 16px;font-family:${SANS_FONT};font-size:13px;color:#555555;line-height:1.6;">
              For your protection, please update your temporary password immediately upon your first sign-in via <strong>Settings &rarr; Change Password</strong>.
            </p>
            <div style="margin:0 auto;border-top:1px solid #dcd7ce;padding-top:14px;text-align:left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>Rudhram Support:</strong> ${rePhoneFormatted} &bull; ${reEmail}</td>
                </tr>
                <tr>
                  <td style="font-family:${SANS_FONT};font-size:12px;color:#666666;padding:3px 0;"><strong>${brandLabel} Lead:</strong> ${brandPhoneFormatted !== '-' ? brandPhoneFormatted : 'Dedicated Support'} &bull; ${brandEmail}</td>
                </tr>
              </table>
            </div>
          </div>
        </td>
      </tr>
    </table>

  </td></tr>
  <!-- End of Main White Card -->

  <!-- Outer Footer Section -->
  <tr>
    <td align="center" style="padding:32px 20px 0;">
      <p style="margin:0 0 8px;font-family:${SANS_FONT};font-size:11.5px;color:#555555;line-height:1.6;">
        <a href="${resolvedPortalUrl}" style="color:#555555;text-decoration:underline;">Client Portal</a> &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <a href="${resolvedPortalUrl}" style="color:#555555;text-decoration:underline;">Support Center</a>
      </p>
      <p style="margin:0 0 4px;font-family:${SANS_FONT};font-size:11px;color:#8a8780;line-height:1.5;">
        &copy; 2026 Rudhram Enterprises. All rights reserved.<br>
        RE Support: ${rePhoneFormatted} &middot; ${reEmail}
      </p>
      <div align="center" style="margin-top:20px;">
        <a href="${config.clientUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
          <img src="${resolvedLogoUrl}" onerror="if(!this.dataset.tried){this.dataset.tried=1;this.src='rudhram-logo.png';}else if(this.dataset.tried==1){this.dataset.tried=2;this.src='client/public/rudhram-logo.png';}" alt="Rudhram" width="85" style="width:85px;max-width:85px;height:auto;display:block;margin:0 auto;opacity:0.85;border:0;">
        </a>
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

export const sendClientCredentialsEmail = async (to, { clientName, email, password, brand }) => {
  const portalUrl = `${config.clientUrl}/portal/login`;
  return sendEmail({
    to,
    subject: `Your Rudhram Portal Login Credentials`,
    html: renderClientCredentialsEmail({ clientName, email, password, portalUrl, brand }),
  });
};

const BRAND_LABELS = {
  panigrahna: 'Panigrahna',
  aghori: 'Aghori',
  house_of_joggi: 'House of Joggi',
  damrru: 'Damrru',
  tandavs: 'Tandavs',
  kapaalik: 'Kapaalik',
  kalyannam: 'Kalyannam',
};

const formatINR = (val) =>
  `\u20B9${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const renderFreelancerSubmissionEmail = ({ freelancer }) => {
  const ventureDetails = freelancer.ventureProfiles
    .map((vp) => {
      const services = vp.serviceCategories?.length ? vp.serviceCategories.join(', ') : '—';
      const rates = vp.rateCards?.length
        ? vp.rateCards.map((r) => `${r.rateBasis}: ${formatINR(r.amount)} ${r.currency}`).join('; ')
        : '—';
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid ${LIGHT_GOLD};font-family:${EMAIL_BODY_FONT};font-size:13px;color:#8a7560;width:120px;vertical-align:top;">${BRAND_LABELS[vp.venture] || vp.venture}</td>
          <td style="padding:12px 16px;border-bottom:1px solid ${LIGHT_GOLD};font-family:${EMAIL_BODY_FONT};font-size:13px;font-weight:600;color:${DARK_BROWN};">${vp.internalTitle || '—'}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid ${LIGHT_GOLD};font-family:${EMAIL_BODY_FONT};font-size:13px;color:#8a7560;">Services</td>
          <td style="padding:12px 16px;border-bottom:1px solid ${LIGHT_GOLD};font-family:${EMAIL_BODY_FONT};font-size:13px;color:${DARK_BROWN};">${services}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid ${LIGHT_GOLD};font-family:${EMAIL_BODY_FONT};font-size:13px;color:#8a7560;">Skill Level</td>
          <td style="padding:12px 16px;border-bottom:1px solid ${LIGHT_GOLD};font-family:${EMAIL_BODY_FONT};font-size:13px;color:${DARK_BROWN};">${vp.skillLevel}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid ${LIGHT_GOLD};font-family:${EMAIL_BODY_FONT};font-size:13px;color:#8a7560;">Rates</td>
          <td style="padding:12px 16px;border-bottom:1px solid ${LIGHT_GOLD};font-family:${EMAIL_BODY_FONT};font-size:13px;color:${DARK_BROWN};">${rates}</td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>New Freelancer Application</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .fluid { max-width: 100% !important; height: auto !important; margin-left: auto !important; margin-right: auto !important; }
    .mobile-padding { padding-left: 24px !important; padding-right: 24px !important; }
    .details-table td { padding: 10px 12px !important; font-size: 12px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${CREAM};font-family:${EMAIL_BODY_FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" class="email-container" style="max-width:600px;width:100%;">

<tr><td align="center" style="padding-bottom:32px;">
  <a href="https://rudhramenterprises.com" target="_blank" style="text-decoration:none;">
    <img src="https://res.cloudinary.com/dvsrgdyi7/image/upload/v1784621259/rudhram-logo.png" alt="Rudhram" width="160" style="width:160px;max-width:160px;height:auto;display:block;border:0;" class="fluid">
  </a>
</td></tr>

<tr><td style="background:#ffffff;border:1px solid ${LIGHT_GOLD};border-radius:20px;overflow:hidden;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="height:4px;background:linear-gradient(90deg,${GOLD},${LIGHT_GOLD},${GOLD});font-size:0;line-height:0;">&nbsp;</td>
  </tr></table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:44px 44px 36px;" class="mobile-padding">
    <tr><td>
      <h1 style="margin:0 0 6px;font-family:${EMAIL_FONT};font-size:28px;font-weight:700;color:${DARK_BROWN};line-height:1.2;">New Freelancer Application</h1>
      <p style="margin:0 0 28px;font-family:${EMAIL_FONT};font-size:15px;color:${GOLD};line-height:1.5;">A new freelancer has submitted their profile for review</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;border:1px solid ${LIGHT_GOLD};border-radius:14px;overflow:hidden;" class="details-table">
        <tr><td style="padding:18px 22px;background:${CREAM};font-family:${EMAIL_FONT};font-size:15px;font-weight:700;color:${DARK_BROWN};border-bottom:1px solid ${LIGHT_GOLD};">Applicant Details</td></tr>
        <tr><td style="padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;color:#8a7560;width:140px;">Name</td>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;font-weight:600;color:${DARK_BROWN};text-align:right;">${freelancer.fullName}</td>
            </tr>
            ${freelancer.displayName && freelancer.displayName !== freelancer.fullName ? `
            <tr>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;color:#8a7560;">Display Name</td>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;font-weight:600;color:${DARK_BROWN};text-align:right;">${freelancer.displayName}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;color:#8a7560;">Phone</td>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;font-weight:600;color:${DARK_BROWN};text-align:right;">${freelancer.phone}</td>
            </tr>
            ${freelancer.email ? `
            <tr>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;color:#8a7560;">Email</td>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;font-weight:600;color:${DARK_BROWN};text-align:right;">${freelancer.email}</td>
            </tr>
            ` : ''}
            ${freelancer.whatsappNumber ? `
            <tr>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;color:#8a7560;">WhatsApp</td>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;font-weight:600;color:${DARK_BROWN};text-align:right;">${freelancer.whatsappNumber}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;color:#8a7560;">City</td>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;font-weight:600;color:${DARK_BROWN};text-align:right;">${freelancer.city || '—'}</td>
            </tr>
            <tr>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;color:#8a7560;">Type</td>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;font-weight:600;color:${DARK_BROWN};text-align:right;">${freelancer.freelancerType}</td>
            </tr>
            <tr>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;color:#8a7560;">Experience</td>
              <td style="padding:14px 22px;border-bottom:1px solid #f0ebe0;font-family:${EMAIL_BODY_FONT};font-size:13px;font-weight:600;color:${DARK_BROWN};text-align:right;">${freelancer.experienceYears} years</td>
            </tr>
            <tr>
              <td style="padding:14px 22px;font-family:${EMAIL_BODY_FONT};font-size:13px;color:#8a7560;">Code</td>
              <td style="padding:14px 22px;font-family:${EMAIL_BODY_FONT};font-size:13px;font-weight:600;color:${DARK_BROWN};text-align:right;">${freelancer.freelancerCode}</td>
            </tr>
          </table>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;border:1px solid ${LIGHT_GOLD};border-radius:14px;overflow:hidden;" class="details-table">
        <tr><td style="padding:18px 22px;background:${CREAM};font-family:${EMAIL_FONT};font-size:15px;font-weight:700;color:${DARK_BROWN};border-bottom:1px solid ${LIGHT_GOLD};">Venture Profiles</td></tr>
        <tr><td style="padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${ventureDetails || '<tr><td style="padding:14px 22px;font-family:${EMAIL_BODY_FONT};font-size:13px;color:#8a7560;">No venture profiles provided</td></tr>'}
          </table>
        </td></tr>
      </table>

      ${freelancer.bio ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;border:1px solid ${LIGHT_GOLD};border-radius:14px;overflow:hidden;" class="details-table">
        <tr><td style="padding:18px 22px;background:${CREAM};font-family:${EMAIL_FONT};font-size:15px;font-weight:700;color:${DARK_BROWN};border-bottom:1px solid ${LIGHT_GOLD};">Bio</td></tr>
        <tr><td style="padding:18px 22px;font-family:${EMAIL_BODY_FONT};font-size:13px;color:${DARK_BROWN};line-height:1.7;">${freelancer.bio}</td></tr>
      </table>
      ` : ''}

      <p style="margin:28px 0 0;font-family:${EMAIL_BODY_FONT};font-size:14px;color:#8a7560;line-height:1.7;">Review this application in the admin panel and update the status accordingly.</p>
    </td></tr>
  </table>
</td></tr>

<tr><td align="center" style="padding:32px 16px 0;">
  <p style="margin:0;font-family:${EMAIL_FONT};font-size:13px;color:${GOLD};line-height:1.6;letter-spacing:0.5px;">RUDHRAM</p>
  <p style="margin:8px 0 0;font-family:${EMAIL_BODY_FONT};font-size:12px;color:#a89880;line-height:1.6;">Leading What's Next</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

export const sendFreelancerSubmissionEmail = async (freelancer) => {
  const adminEmails = (config.adminEmails || '').split(',').map((e) => e.trim()).filter(Boolean);
  if (!adminEmails.length) {
    console.warn('No admin emails configured for freelancer submission notification');
    return;
  }

  return sendEmail({
    to: adminEmails,
    subject: `New Freelancer Application: ${freelancer.fullName} (${freelancer.freelancerCode})`,
    html: renderFreelancerSubmissionEmail({ freelancer }),
  });
};

export const renderFreelancerApplicantEmail = ({ freelancer }) => {
  return renderEmail({
    preheader: 'We have received your freelancer application',
    heading: 'Application Received',
    subtext: `Dear ${freelancer.fullName},`,
    bodyHtml: `
      <p style="margin:0;font-family:${FONT};font-size:15px;color:${BODY};line-height:1.7;">Thank you for applying to join the Rudhram freelancer network. We have successfully received your application (Code: <strong style="color:${INK};">${freelancer.freelancerCode}</strong>).</p>
      <p style="margin:16px 0 0;font-family:${FONT};font-size:15px;color:${BODY};line-height:1.7;">Our team will review your profile and keep your details in our secure records. If your profile matches our requirements for any upcoming projects, we will reach out to you directly.</p>
    `,
    footerNote: 'Rudhram &middot; Freelancer Network',
  });
};

export const sendFreelancerApplicantEmail = async (freelancer) => {
  if (!freelancer.email) return;
  return sendEmail({
    to: freelancer.email,
    subject: `Application Received - Rudhram Freelancer Network`,
    html: renderFreelancerApplicantEmail({ freelancer }),
  });
};

export const renderNewLeadEmail = ({ leadName, email, phone, company, brand, source, notes, detailsUrl }) => {
  const brandLabel = BRAND_LABELS[brand] || brand || 'Unknown';
  return renderEmail({
    preheader: `New Lead: ${leadName} (${brandLabel})`,
    heading: 'New Lead Captured',
    subtext: `A new lead has been added for <strong style="color:${INK};">${brandLabel}</strong>.`,
    bodyHtml: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:10px;overflow:hidden;margin-bottom:16px;">
        <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;color:${MUTED};width:120px;">Name</td><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;font-weight:600;color:${INK};">${leadName}</td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;color:${MUTED};">Email</td><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;font-weight:600;color:${INK};">${email || '—'}</td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;color:${MUTED};">Phone</td><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;font-weight:600;color:${INK};">${phone || '—'}</td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;color:${MUTED};">Company</td><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;font-weight:600;color:${INK};">${company || '—'}</td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;color:${MUTED};">Brand</td><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;font-weight:600;color:${INK};">${brandLabel}</td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;color:${MUTED};">Source</td><td style="padding:12px 16px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:13px;font-weight:600;color:${INK};">${source || '—'}</td></tr>
        <tr><td style="padding:12px 16px;font-family:${FONT};font-size:13px;color:${MUTED};">Notes</td><td style="padding:12px 16px;font-family:${FONT};font-size:13px;color:${BODY};">${notes || '—'}</td></tr>
      </table>
    `,
    cta: { url: detailsUrl, text: 'View Lead Details' },
    footerNote: 'Rudhram &middot; Lead Management',
  });
};

export const sendNewLeadEmail = async (to, { leadName, email, phone, company, brand, source, notes, leadId }) => {
  const detailsUrl = `${config.clientUrl}/leads/${leadId}`;
  return sendEmail({
    to,
    subject: `New Lead: ${leadName} - ${BRAND_LABELS[brand] || brand || 'Unknown'}`,
    html: renderNewLeadEmail({ leadName, email, phone, company, brand, source, notes, detailsUrl }),
  });
};

