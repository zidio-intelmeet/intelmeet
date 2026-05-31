/**
 * Email Service - Handles sending emails for invitations and notifications
 * Now using Resend
 */

import { logger } from "../utils/logger";
import { Resend } from "resend";
import env from "../configs/env";

const resend = new Resend(env.RESEND_API_KEY);

interface SendInvitationEmailParams {
  memberEmail: string;
  memberName: string;
  adminEmail?: string;
  adminName: string;
  organizationName: string;
  invitationToken?: string;
  invitationLink: string;
}

export class EmailService {
  /**
   * Send invitation email to new member
   */
  static async sendInvitationEmail(params: SendInvitationEmailParams): Promise<boolean> {
    try {
      const {
        memberEmail,
        memberName,
        adminEmail,
        adminName,
        organizationName,
        invitationToken,
        invitationLink,
      } = params;

      logger.info({
        memberEmail,
        memberName,
        organizationName,
        adminName,
      }, `📧 Sending invitation email to ${memberEmail}`);

      const emailHtml = `
        <h2>Welcome to ${organizationName}!</h2>
        <p>Hi ${memberName},</p>
        <p><strong>${adminEmail || adminName}</strong> wants to add you to their organization on IntellMeet.</p>
        
        <p>Click the link below to accept the invitation and join the workspace:</p>
        <br/>
        <a href="${invitationLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Accept Invitation
        </a>
        <br/><br/>
        <p>Or copy this link in your browser: ${invitationLink}</p>
        
        <hr>
        ${invitationToken ? `<p style="font-size: 12px; color: #666;">
          Invitation token: ${invitationToken}<br>
          Do not share this token with anyone
        </p>` : ""}
      `;

      const { data, error } = await resend.emails.send({
        from: env.EMAIL_FROM || 'onboarding@resend.dev',
        to: memberEmail,
        subject: `You've been invited to join ${organizationName} on IntellMeet`,
        html: emailHtml,
      });

      if (error) {
        logger.error({ error }, "Resend API Error");
        console.error("❌ RESEND ERROR:", error);
        console.log("\n🔗 INVITATION LINK (fallback):");
        console.log(invitationLink);
        return false;
      }

      logger.info({ data }, "Email sent successfully");
      return true;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
      }, "Failed to send invitation email");
      console.error("❌ EMAIL SERVICE EXCEPTION:", error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    memberEmail: string,
    memberName: string,
    resetLink: string
  ): Promise<boolean> {
    try {
      logger.info({ memberEmail }, "📧 Sending password reset email");

      const emailHtml = `
        <h2>Reset Your Password</h2>
        <p>Hi ${memberName},</p>
        <p>We received a request to reset your IntellMeet password.</p>
        <p>Click the link below to set a new password (valid for 1 hour):</p>
        <br/>
        <a href="${resetLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
        <br/><br/>
        <p>Or copy this link: ${resetLink}</p>
        <hr>
        <p style="font-size: 12px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
      `;

      const { data, error } = await resend.emails.send({
        from: env.EMAIL_FROM || 'onboarding@resend.dev',
        to: memberEmail,
        subject: 'Reset your IntellMeet password',
        html: emailHtml,
      });

      if (error) {
        logger.error({ error }, "Resend password reset API Error");
        return false;
      }

      logger.info({ data }, "Password reset email sent successfully");
      return true;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
      }, "Failed to send password reset email");
      return false;
    }
  }

  /**
   * Send welcome email after registration
   */
  static async sendWelcomeEmail(
    memberEmail: string,
    memberName: string,
    organizationName?: string
  ): Promise<boolean> {
    // Left for future implementation
    return true;
  }
}

export default EmailService;