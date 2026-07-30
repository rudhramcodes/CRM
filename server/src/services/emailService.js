import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { Setting } from '../modules/settings/settings.model.js';

const createTransporter = (smtpConfig) => {
  const host = smtpConfig?.host || config.smtp.host;
  const port = smtpConfig?.port || config.smtp.port;
  const user = smtpConfig?.user || config.smtp.user;
  const pass = smtpConfig?.pass || config.smtp.pass;
  const isSecure = port === 465;
  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
};

const resolveSmtpConfig = async () => {
  const keys = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpSenderName', 'smtpSenderEmail'];
  const settings = await Setting.find({ key: { $in: keys } });
  if (!settings.length) return null;
  const db = {};
  for (const s of settings) db[s.key] = s.value;
  if (!db.smtpHost || !db.smtpUser) return null;
  return {
    host: db.smtpHost,
    port: db.smtpPort || config.smtp.port,
    user: db.smtpUser,
    pass: db.smtpPass || config.smtp.pass,
    senderName: db.smtpSenderName || 'Rudhram CRM',
    senderEmail: db.smtpSenderEmail || db.smtpUser,
  };
};

export const sendEmail = async ({ to, subject, html, attachments }) => {
  const dbSmtp = await resolveSmtpConfig();
  const smtp = dbSmtp || config.smtp;
  const hasCredentials = smtp.user && smtp.pass;

  if (!hasCredentials) {
    logger.info(`[EMAIL FALLBACK] To: ${to} | Subject: ${subject}`);
    if (attachments) logger.info(`[EMAIL FALLBACK] Attachments: ${attachments.length} file(s)`);
    return { messageId: 'dev-fallback', accepted: [to] };
  }

  const transport = createTransporter(smtp);

  try {
    await transport.verify();
    logger.info('SMTP connection verified successfully');
  } catch (verifyError) {
    logger.warn(`SMTP verify() failed (non-fatal, trying to send anyway): ${verifyError.message}`);
  }

  try {
    const mailOptions = {
      from: `"${smtp.senderName || 'Rudhram CRM'}" <${smtp.senderEmail || smtp.user}>`,
      to,
      subject,
      html,
    };
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }
    const info = await transport.sendMail(mailOptions);
    logger.info(`Email sent successfully: ${info.messageId} | to: ${to} | subject: ${subject}`);
    transport.close();
    return info;
  } catch (error) {
    logger.error(`Email send failed: ${error.message}`);
    logger.error(`SMTP config used - host: ${smtp.host}, port: ${smtp.port}, user: ${smtp.user}`);
    transport.close();
    throw error;
  }
};

export const sendWelcomeEmail = async (email, name) => {
  const html = `
    <h1>Welcome to Rudhram CRM</h1>
    <p>Hi ${name},</p>
    <p>Your account has been created successfully.</p>
    <p>Please verify your email to get started.</p>
  `;
  return sendEmail({ to: email, subject: 'Welcome to Rudhram CRM', html });
};

export const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${config.clientUrl}/auth/verify-email?token=${token}`;
  const html = `
    <h1>Verify Your Email</h1>
    <p>Click the link below to verify your email address:</p>
    <a href="${verifyUrl}">${verifyUrl}</a>
    <p>This link expires in 24 hours.</p>
    <p>If you did not create an account, please ignore this email.</p>
  `;
  return sendEmail({ to: email, subject: 'Verify your Rudhram CRM account', html });
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${config.clientUrl}/auth/reset-password?token=${resetToken}`;
  const html = `
    <h1>Reset Your Password</h1>
    <p>Hi,</p>
    <p>Click the link below to reset your password:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>This link expires in 1 hour.</p>
    <p>If you did not request this, please ignore this email.</p>
  `;
  return sendEmail({ to: email, subject: 'Reset your Rudhram CRM password', html });
};
