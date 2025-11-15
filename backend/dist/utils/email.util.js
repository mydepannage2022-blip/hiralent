"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const sendEmail = async ({ to, subject, html, from }) => {
    try {
        const transporter = nodemailer_1.default.createTransport({
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
        const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const info = await transporter.sendMail({
                    from: fromAddress,
                    to,
                    subject,
                    html,
                });
                console.log(`📤 Email successfully sent to ${to} | Message ID: ${info.messageId} | attempt=${attempt}`);
                // Success, return early
                return;
            }
            catch (err) {
                const errMsg = err.message || String(err);
                console.error(`❌ Failed to send email to ${to} on attempt ${attempt}:`, errMsg);
                if (attempt < maxAttempts) {
                    // exponential backoff: 2^attempt * 1000ms
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`⏳ Retrying to send email in ${delay}ms...`);
                    await sleep(delay);
                    continue;
                }
                else {
                    console.error(`❌ All attempts to send email to ${to} have failed.`);
                }
            }
        }
    }
    catch (err) {
        console.error("❌ Failed to send email:", err.message);
    }
};
exports.sendEmail = sendEmail;
