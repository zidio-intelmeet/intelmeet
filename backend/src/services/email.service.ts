/**
 * Email Service - Handles sending emails for invitations and notifications
 * Currently supports: Console logging (development)
 * Can be extended with: SendGrid, Nodemailer, AWS SES, etc.
 */

import { logger } from "../utils/logger";

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

      // TODO: Replace with actual email service (SendGrid, Nodemailer, etc.)
      // For now, log to console and mock success

      const emailContent = `
        <h2>Welcome to ${organizationName}!</h2>
        <p>Hi ${memberName},</p>
        <p>${adminName} (${adminEmail}) has invited you to join their workspace on IntellMeet.</p>
        
        <h3>What's Next?</h3>
        <p>Click the link below to accept the invitation and join the workspace:</p>
        <a href="${invitationLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Accept Invitation
        </a>
        
        <p>Or copy this link in your browser: ${invitationLink}</p>
        
        <h3>Meeting & Task Management</h3>
        <p>Once you join, you'll be able to:</p>
        <ul>
          <li>View meetings assigned to you</li>
          <li>See tasks on the kanban board</li>
          <li>Collaborate with your team</li>
        </ul>
        
        <p>Best regards,<br>IntellMeet Team</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          Invitation token: ${invitationToken}<br>
          Do not share this token with anyone
        </p>
      `;

      logger.info(
        `📧 Sending invitation email to ${memberEmail} from ${adminEmail}`,
        {
          memberEmail,
          memberName,
          organizationName,
          adminName,
        }
      );

      // TODO: Implement actual email sending
      // Example with SendGrid:
      // const response = await sgMail.send({
      //   to: memberEmail,
      //   from: process.env.SENDGRID_FROM_EMAIL || 'noreply@intellmeet.com',
      //   subject: `Join ${organizationName} on IntellMeet`,
      //   html: emailContent,
      // });

      // Log the invitation link for development
      console.log("\n🔗 INVITATION LINK (for development):");
      console.log(invitationLink);
      console.log("\n");

      return true;
    } catch (error) {
      logger.error("Failed to send invitation email", {
        error: error instanceof Error ? error.message : String(error),
      });
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
    try {
      logger.info(`📧 Sending welcome email to ${memberEmail}`, {
        memberEmail,
        memberName,
        organizationName,
      });

      // TODO: Implement actual email sending

      return true;
    } catch (error) {
      logger.error("Failed to send welcome email", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

export default EmailService;
