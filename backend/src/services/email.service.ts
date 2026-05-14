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
  adminEmail: string;
  adminName: string;
  organizationName: string;
  invitationToken: string;
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

      logger.info(`📧 Sending invitation email to ${memberEmail} from ${adminEmail}`, {
        memberEmail,
        memberName,
        organizationName,
        adminName,
      });

      const emailHtml = `
        <h2>Welcome to ${organizationName}!</h2>
        <p>Hi ${memberName},</p>
        <p><strong>${adminEmail}</strong> wants to add you to their organization on IntellMeet.</p>
        
        <p>Click the link below to accept the invitation and join the workspace:</p>
        <br/>
        <a href="${invitationLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Accept Invitation
        </a>
        <br/><br/>
        <p>Or copy this link in your browser: ${invitationLink}</p>
        
        <hr>
        <p style="font-size: 12px; color: #666;">
          Invitation token: ${invitationToken}<br>
          Do not share this token with anyone
        </p>
      `;

      const { data, error } = await resend.emails.send({
        from: env.EMAIL_FROM || 'sujugohel27@gmail.com', // Must be verified domain or onboarding@resend.dev
        to: memberEmail,
        subject: `${adminEmail} invited you to join their organization`,
        html: emailHtml,
      });

      if (error) {
        logger.error("Resend API Error", { error });
        console.error("❌ RESEND ERROR:", error);
        console.log("\n🔗 INVITATION LINK (development fallback):");
        console.log(invitationLink);
        console.log("\n");
        return false;
      }

      logger.info("Email sent successfully", { data });
      return true;
    } catch (error) {
      logger.error("Failed to send invitation email", {
        error: error instanceof Error ? error.message : String(error),
      });
      console.error("❌ EMAIL SERVICE EXCEPTION:", error);
      return false;
    }
  }

  /**
   * Send welcome email after member joins
   */
  static async sendWelcomeEmail(
    memberEmail: string,
    memberName: string,
    organizationName: string
  ): Promise<boolean> {
    // Left for future implementation
    return true;
  }
}

export default EmailService;
