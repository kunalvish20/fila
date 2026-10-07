import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT ?? 587,
      secure: config.SMTP_SECURE,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS }
    });
  }
  return transporter;
}

export async function sendEmail(to: string | string[] | undefined, subject: string, html: string) {
  if (!to || (Array.isArray(to) && to.length === 0)) return;
  const tx = getTransporter();
  if (!tx) {
    console.info(`[email skipped: SMTP not configured] ${subject} -> ${Array.isArray(to) ? to.join(',') : to}`);
    return;
  }
  await tx.sendMail({
    from: config.SMTP_FROM || config.SMTP_USER,
    to,
    subject,
    html
  });
}

export function emailShell(title: string, content: string) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.55;color:#111827;background:#f8fafc;padding:24px">
      <div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden">
        <div style="padding:22px 26px;background:#111827;color:#fff">
          <h1 style="font-size:20px;margin:0">${title}</h1>
        </div>
        <div style="padding:26px">${content}</div>
      </div>
    </div>`;
}
