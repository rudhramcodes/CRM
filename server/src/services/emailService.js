import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
};

export const sendEmail = async ({ to, subject, html }) => {
  // Fallback: log to console when SMTP is not configured
  if (!config.smtp.user || !config.smtp.pass) {
    logger.info(`[EMAIL FALLBACK] To: ${to} | Subject: ${subject}`);
    logger.info(`[EMAIL FALLBACK] Body preview: ${html.replace(/<[^>]*>/g, '').trim().slice(0, 200)}...`);
    return { messageId: 'dev-fallback', accepted: [to] };
  }

  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: `"Rudhram CRM" <${config.smtp.user}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email send failed: ${error.message}`);
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
