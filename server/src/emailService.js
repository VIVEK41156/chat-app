import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let transporter = null;
let activeGmailUser = '';

export const initEmailTransporter = () => {
  const user = (process.env.GMAIL_USER || 'vivekparri41156@gmail.com').trim();
  const rawPass = process.env.GMAIL_APP_PASS || process.env.GMAIL_APP_PASSWORD || 'kjxhoonggvdhdfyu';
  const pass = rawPass.replace(/\s+/g, '').trim();

  if (user && pass) {
    activeGmailUser = user;
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Direct SSL
      auth: {
        user,
        pass
      },
      pool: true, // Reuse pooled SMTP connections for instant dispatch
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 7000
    });
    console.log(`[Email] Gmail SMTP configured with connection pooling for: ${user}`);
  } else {
    console.log('[Email] No Gmail credentials found. Running in Mock / Dev Preview Mode.');
  }
};

export const sendOtpEmail = async (toEmail, otpCode, name = 'User') => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0c1317; margin: 0; padding: 20px; color: #e9edef; }
        .container { max-width: 500px; margin: 0 auto; background-color: #111b21; border: 1px solid #222d34; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
        .header { background-color: #00a884; padding: 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; }
        .content { padding: 32px 24px; text-align: center; }
        .content p { font-size: 14px; color: #8696a0; line-height: 1.6; margin: 0 0 20px; }
        .otp-box { background-color: #202c33; border: 2px dashed #00a884; border-radius: 10px; padding: 18px 24px; display: inline-block; margin: 10px 0 24px; }
        .otp-code { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #25D366; margin: 0; font-family: monospace; }
        .warning { font-size: 12px; color: #ffd279; background-color: #182229; padding: 12px; border-radius: 8px; border: 1px solid #2a3942; margin-top: 10px; }
        .footer { padding: 16px; text-align: center; font-size: 11px; color: #667781; border-top: 1px solid #222d34; background-color: #0b141a; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WhatsApp Web Verification</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <p>Use the following 6-digit One-Time Password (OTP) to complete your secure email authentication and access your chat account:</p>
          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
          </div>
          <p>This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
          <div class="warning">
            🛡️ If you did not request this verification, you can safely ignore this email.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} WhatsApp Real-Time Chat System. End-to-end verified.
        </div>
      </div>
    </body>
    </html>
  `;

  if (transporter) {
    try {
      const fromAddr = activeGmailUser || 'vivekparri41156@gmail.com';
      const info = await transporter.sendMail({
        from: `"WhatsApp Security" <${fromAddr}>`,
        to: toEmail,
        subject: `${otpCode} is your WhatsApp verification code`,
        text: `Your WhatsApp verification code is: ${otpCode}. It expires in 5 minutes.`,
        html: htmlContent
      });
      console.log(`[Email] OTP email successfully sent to ${toEmail}. Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[Email] Failed to send Gmail SMTP email:', err);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`\n======================================================`);
    console.log(`[DEV OTP] Generated for ${toEmail}: 👉 ${otpCode} 👈`);
    console.log(`======================================================\n`);
    return { success: true, mode: 'dev_preview', otp: otpCode };
  }
};
