import nodemailer from 'nodemailer';
import { ENV } from '../config/env';

export interface OtpEmailResult {
  deliveredViaSmtp: boolean;
  error?: string;
}

export class MailerService {
  public static async sendRegistrationOtp(
    toEmail: string,
    recipientName: string,
    otpCode: string
  ): Promise<OtpEmailResult> {
    if (!ENV.SMTP_USER || !ENV.SMTP_PASS) {
      return {
        deliveredViaSmtp: false,
        error: 'SMTP credentials not configured in environment.',
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: ENV.SMTP_USER,
          pass: ENV.SMTP_PASS,
        },
      });

      const htmlBody = `
        <div style="background-color:#121316;color:#F4F5F8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:36px 24px;max-width:480px;margin:0 auto;border-radius:16px;border:1px solid #282B33;">
          <div style="margin-bottom:24px;">
            <span style="display:inline-block;background-color:#FFB800;color:#121316;font-weight:800;padding:6px 12px;border-radius:8px;font-size:14px;">⚡ Recall</span>
          </div>
          <h2 style="margin:0 0 12px;font-size:22px;color:#F4F5F8;">Verify your email address</h2>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#9DA3B4;">
            Hi ${recipientName}, enter the 6-digit verification code below in the Recall app to complete your account setup. This code expires in <strong>10 minutes</strong>.
          </p>
          <div style="background-color:#1A1C21;border:1px solid #FFB800;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
            <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#FFB800;font-family:monospace;">${otpCode}</span>
          </div>
          <p style="margin:0;font-size:12px;color:#6E7587;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: `"Recall Study Companion" <${ENV.SMTP_USER}>`,
        to: toEmail,
        subject: `${otpCode} is your Recall verification code`,
        text: `Hi ${recipientName}, your Recall 6-digit verification code is ${otpCode}. It expires in 10 minutes.`,
        html: htmlBody,
      });

      return { deliveredViaSmtp: true };
    } catch (err: any) {
      return {
        deliveredViaSmtp: false,
        error: err?.message || 'Failed to send email via SMTP',
      };
    }
  }
}
