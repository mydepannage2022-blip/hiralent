import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: EmailOptions): Promise<void> => {
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

    const info = await transporter.sendMail({
      from: `"Talenta Team" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html,
    });

    console.log(`📤 Email successfully sent to ${to} | Message ID: ${info.messageId}`);
  } catch (err) {
    console.error("❌ Failed to send email:", (err as Error).message);
    // You could optionally rethrow here or notify admin team
  }
};
