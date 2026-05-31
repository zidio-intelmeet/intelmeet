import { Resend } from 'resend';
import { ApiError } from '../utils/api-error';

let resendClient: Resend | null = null;

const getResend = () => {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      console.warn("⚠️ RESEND_API_KEY missing. Emails will not send.");
      resendClient = new Resend('re_dummy_key'); 
    } else {
      resendClient = new Resend(process.env.RESEND_API_KEY);
    }
  }
  return resendClient;
};

export class EmailService {
  
  static async sendWelcomeEmail(toEmail: string, userName: string) {
    const resend = getResend();
    try {
      console.log(`📧 Attempting to send welcome email to ${toEmail}...`);
      const data = await resend.emails.send({
        from: 'IntellMeet <onboarding@resend.dev>', 
        to: [toEmail], 
        subject: 'Welcome to IntellMeet Workspace!',
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2>Welcome to IntellMeet, ${userName}! 🚀</h2>
            <p>Your workspace is ready. You can now schedule meetings, track tasks, and use AI to summarize your calls.</p>
            <p>Let's build something great.</p>
          </div>
        `
      });
      return data;
    } catch (error: any) {
      console.error("❌ Failed to send email:", error);
      throw new ApiError(500, `Email service failed: ${error.message}`);
    }
  }

  static async sendMeetingInvite(toEmail: string, meetingCode: string, hostName: string) {
    const resend = getResend();
    try {
      const data = await resend.emails.send({
        from: 'IntellMeet <onboarding@resend.dev>',
        to: [toEmail], 
        subject: `${hostName} invited you to a meeting`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2>You have been invited to a meeting!</h2>
            <p><strong>Host:</strong> ${hostName}</p>
            <p><strong>Room Code:</strong> ${meetingCode}</p>
            <a href="http://localhost:5173/meeting/${meetingCode}" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">Join Meeting Now</a>
          </div>
        `
      });
      return data;
    } catch (error: any) {
      throw new ApiError(500, `Failed to send invite: ${error.message}`);
    }
  }

  static async sendInvitationEmail(data: {
    memberEmail: string;
    memberName: string;
    adminEmail: string;
    adminName: string;
    organizationName: string;
    invitationToken: string;
    invitationLink: string;
  }) {
    const resend = getResend();
    try {
      console.log(`📧 Sending org invite to ${data.memberEmail}...`);
      const response = await resend.emails.send({
        from: 'IntellMeet <onboarding@resend.dev>',
        to: [data.memberEmail], 
        subject: `${data.adminName} invited you to join ${data.organizationName}`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2>You've been invited!</h2>
            <p><strong>${data.adminName}</strong> (${data.adminEmail}) has invited you to join the <strong>${data.organizationName}</strong> workspace on IntellMeet.</p>
            <a href="${data.invitationLink}" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">Accept Invitation</a>
          </div>
        `
      });
      return true; 
    } catch (error: any) {
      console.error("❌ Failed to send org invite:", error);
      return false; 
    }
  }
}

export default EmailService;