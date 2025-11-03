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
        const info = await transporter.sendMail({
            from: fromAddress,
            to,
            subject,
            html,
        });
        console.log(`📤 Email successfully sent to ${to} | Message ID: ${info.messageId}`);
    }
    catch (err) {
        console.error("❌ Failed to send email:", err.message);
        // You could optionally rethrow here or notify admin team
    }
};
exports.sendEmail = sendEmail;
