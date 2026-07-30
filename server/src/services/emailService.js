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

export const sendEmail = async ({ to, subject, html }) => {
  const client = getClient();

  if (!client) {
    logger.info(`[EMAIL FALLBACK] To: ${to} | Subject: ${subject}`);
    return { id: 'dev-fallback' };
  }

  try {
    const { data, error } = await client.emails.send({
      from: `${config.resend.fromName} <${config.resend.fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
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
