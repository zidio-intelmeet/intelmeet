import { Resend } from 'resend';
import { logger } from '../utils/logger';

// Initialize only if key exists, otherwise let the service handle it
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const EmailService = {
  /**
   * Sends a standard email.
   * In Dev: Logs to console (No-op).
   * In Prod: Requires valid RESEND_API_KEY.
   * Returns: boolean (success status).
   */
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    // DEV: No-op mock
    if (process.env.NODE_ENV !== "production") {
      logger.info(`[Email Service] Mock Send To: ${to}, Subject: ${subject}`);
      return true;
    }

    // PROD: Fail fast if misconfigured
    if (!resend) {
      logger.error("Email configuration error: RESEND_API_KEY missing in production environment");
      throw new Error("Email service is not configured correctly in production.");
    }

    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: [to],
        subject,
        html,
      });
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : JSON.stringify(error);
      logger.error(`Email send failed: ${errorMessage}`);
      return false;
    }
  },

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    return this.sendEmail(
      email, 
      "Welcome to IntelMeet", 
      `<h1>Hi ${name}, welcome!</h1><p>Your workspace is ready.</p>`
    );
  },

  async sendInvitationEmail(data: {
    memberEmail: string;
    memberName: string;
    adminName: string;
    organizationName: string;
    invitationLink: string;
  }): Promise<boolean> {
    return this.sendEmail(
      data.memberEmail,
      `${data.adminName} invited you to join ${data.organizationName}`,
      `<p>Hi ${data.memberName}, you've been invited to ${data.organizationName}.</p>
      <a href="${data.invitationLink}">Accept Invitation</a>`
    );
  },

  async sendPasswordResetEmail(email: string, name: string, resetLink: string): Promise<boolean> {
    return this.sendEmail(
      email,
      "Reset your IntelMeet password",
      `<h2>Hi ${name},</h2>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetLink}" style="background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Reset Password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`
    );
  }
};

export default EmailService;