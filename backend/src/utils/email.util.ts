import nodemailer from "nodemailer";
import logger from "../lib/logger";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Result of an email send attempt (Session 1 — R-32).
 *
 * `sendEmail` USED to return void and swallow every failure, so callers such as
 * signup/invite could never tell a message silently failed. It now returns this
 * structured result AND logs failures at error level, so a caller can react
 * (e.g. surface `emailDelivered:false`) without the send itself throwing — mail
 * stays best-effort for the 13 call sites that treat it that way.
 */
export interface EmailResult {
  delivered: boolean;
  messageId?: string;
  error?: string;
}

export const sendEmail = async ({ to, subject, html, from }: EmailOptions): Promise<EmailResult> => {
  // sendEmail NEVER throws — callers (signup/invite) treat mail as best-effort and
  // rely on the returned result. The whole body is guarded so even a transport
  // misconfiguration surfaces as { delivered:false } instead of a thrown error
  // that would (e.g.) turn a signup into a 500.
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Use provided from address when given, otherwise default to Hiralent Team using SMTP_FROM
    const fromAddress = from || `"Hiralent Team" <${process.env.SMTP_FROM}>`;

    // Small helper for backoff
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    const maxAttempts = 3;
    let lastError = "";
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const info = await transporter.sendMail({
          from: fromAddress,
          to,
          subject,
          html,
        });

        console.log(`📤 Email successfully sent to ${to} | Message ID: ${info.messageId} | attempt=${attempt}`);
        return { delivered: true, messageId: info.messageId };
      } catch (err) {
        lastError = (err as Error).message || String(err);
        console.error(`❌ Failed to send email to ${to} on attempt ${attempt}:`, lastError);
        if (attempt < maxAttempts) {
          // exponential backoff: 2^attempt * 1000ms
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Retrying to send email in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
      }
    }

    // All attempts exhausted — surface (not swallow) the failure: log at error
    // level AND return a delivered:false result the caller can act on.
    logger.error({ to, subject, error: lastError }, "email delivery failed after retries");
    return { delivered: false, error: lastError };
  } catch (err) {
    // Transport creation / unexpected failure — still never throw.
    const message = (err as Error)?.message || String(err);
    logger.error({ to, subject, error: message }, "email send failed unexpectedly");
    return { delivered: false, error: message };
  }
};
