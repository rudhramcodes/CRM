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
    logger.info(`[EMAIL FALLBACK] To: ${to} | Subject: ${subject}\n${html}`);
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
    <h1>Welcome to Rudhram</h1>
    <p>Hi ${name},</p>
    <p>Your account has been created successfully.</p>
    <p>Please verify your email to get started.</p>
  `;
  return sendEmail({ to: email, subject: 'Welcome to Rudhram', html });
};

export const sendVerificationEmail = async (email, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px;">
      <h2 style="color: #1c1917; margin: 0 0 8px;">Verify your email</h2>
      <p style="color: #57534e; font-size: 14px; line-height: 1.6;">Use the code below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
      <div style="background: #f5f5f4; border-radius: 8px; padding: 20px; text-align: center; margin: 16px 0;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1c1917; -webkit-user-select: all; user-select: all; cursor: pointer;">${otp}</span>
      </div>
      <p style="color: #78716c; font-size: 12px; line-height: 1.6;">Tap or click the code above to select it, then copy it (Ctrl/Cmd + C).</p>
      <p style="color: #78716c; font-size: 12px; line-height: 1.6;">If you did not request this, you can safely ignore this email.</p>
    </div>
  `;
  return sendEmail({ to: email, subject: `Your Rudhram verification code: ${otp}`, html });
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
  return sendEmail({ to: email, subject: 'Reset your Rudhram password', html });
};
