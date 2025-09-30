"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordController = exports.forgotPasswordController = exports.verifyEmailController = exports.resendVerificationController = exports.loginController = exports.signupController = void 0;
const authService = __importStar(require("../services/auth.service"));
const signupController = async (req, res) => {
    try {
        const data = await authService.signup(req.body);
        res.status(201).json(data);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Signup failed";
        res.status(400).json({ error: message });
    }
};
exports.signupController = signupController;
const loginController = async (req, res) => {
    try {
        const data = await authService.login(req.body);
        res.status(200).json(data);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Login failed";
        res.status(401).json({ error: message });
    }
};
exports.loginController = loginController;
const resendVerificationController = async (req, res) => {
    try {
        // req.user middleware se aayega (authentication ke baad)
        const userId = req.user?.user_id;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const result = await authService.resendVerificationEmail(userId);
        res.status(200).json(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Failed to resend verification email";
        res.status(400).json({ error: message });
    }
};
exports.resendVerificationController = resendVerificationController;
const verifyEmailController = async (req, res) => {
    try {
        const token = req.query.token;
        if (!token) {
            return res.status(400).json({
                error: true,
                message: "Token is required"
            });
        }
        const result = await authService.verifyEmail({ token });
        if (result.error) {
            return res.status(400).json(result);
        }
        res.status(200).json({
            success: true,
            message: "Email verified successfully",
            user: result.user,
            token: result.token
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Verification failed";
        res.status(400).json({ error: true, message });
    }
};
exports.verifyEmailController = verifyEmailController;
const forgotPasswordController = async (req, res) => {
    try {
        await authService.forgotPassword(req.body);
        res.status(200).json({ message: "Reset link sent" });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Failed to send reset link";
        res.status(400).json({ error: message });
    }
};
exports.forgotPasswordController = forgotPasswordController;
const resetPasswordController = async (req, res) => {
    try {
        await authService.resetPassword(req.body);
        res.status(200).json({ message: "Password updated" });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Reset failed";
        res.status(400).json({ error: message });
    }
};
exports.resetPasswordController = resetPasswordController;
