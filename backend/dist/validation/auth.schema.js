"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyEmailSchema = exports.ResetPasswordSchema = exports.ForgotPasswordSchema = exports.LoginSchema = exports.SignupSchema = void 0;
const zod_1 = require("zod");
exports.SignupSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    full_name: zod_1.z.string().min(2),
    role: zod_1.z.enum(["candidate", "company_admin", "admin", "agency_admin"]),
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
exports.ForgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.ResetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(10),
    newPassword: zod_1.z.string().min(6),
});
exports.VerifyEmailSchema = zod_1.z.object({
    token: zod_1.z.string().min(10),
});
