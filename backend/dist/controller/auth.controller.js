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
exports.logoutController = exports.resetPasswordController = exports.forgotPasswordController = exports.verifyEmailController = exports.resendVerificationController = exports.loginController = exports.signupController = void 0;
const authService = __importStar(require("../services/auth.service"));
const isProd = process.env.NODE_ENV === 'production';
// Preserve the literal type for sameSite so it matches Express CookieOptions
const sameSiteValue = isProd ? 'none' : 'lax';
const cookieOptions = {
    httpOnly: true,
    secure: isProd, // HTTPS obligatoire en prod
    sameSite: sameSiteValue,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
};
const signupController = async (req, res) => {
    try {
        console.log('📝 Signup request received:', req.body?.email);
        const data = await authService.signup(req.body);
        console.log('🔍 Signup service returned:', {
            dataExists: !!data,
            dataType: typeof data,
            hasUser: !!(data && typeof data === 'object' && 'user' in data),
            hasToken: !!(data && typeof data === 'object' && 'token' in data),
            dataKeys: data && typeof data === 'object' ? Object.keys(data) : 'no data or not object'
        });
        if (data && typeof data === 'object' && 'error' in data && data.error === true) {
            return res.status(400).json(data);
        }
        // If service returned a user, always return it so client can persist UI state
        if (data && typeof data === 'object' && 'user' in data) {
            const { user, token } = data;
            // Set cookie if token is present
            if (token) {
                try {
                    if (process.env.NODE_ENV !== 'production') {
                        console.log('[auth.controller] setting token cookie for', user?.email, { cookieOptions, tokenPresent: !!token });
                    }
                    res.cookie('token', token, cookieOptions);
                    console.log('✅ Signup successful with token for:', user?.email);
                }
                catch (e) {
                    console.error('[auth.controller] failed to set cookie:', e);
                }
            }
            else {
                // No token returned: still return the user object so frontend can persist UI for cookie-only flows
                console.log('⚠️ Signup completed without token, returning user so client can persist UI state for:', user?.email);
            }
            const payload = { user };
            if (token)
                payload.token = token;
            return res.status(201).json(payload);
        }
    }
    catch (err) {
        console.error('❌ Signup controller error:', err);
        const message = err instanceof Error ? err.message : 'Signup failed';
        return res.status(400).json({ error: true, message });
    }
};
exports.signupController = signupController;
const loginController = async (req, res) => {
    try {
        console.log('📝 Login request received:', req.body?.email);
        const data = await authService.login(req.body);
        console.log('🔍 Login service returned:', {
            dataExists: !!data,
            dataType: typeof data,
            hasUser: !!(data && typeof data === 'object' && 'user' in data),
            hasToken: !!(data && typeof data === 'object' && 'token' in data),
            dataKeys: data && typeof data === 'object' ? Object.keys(data) : 'no data or not object'
        });
        if (data && typeof data === 'object' && 'error' in data && data.error === true) {
            return res.status(401).json(data);
        }
        if (data && typeof data === 'object' && 'user' in data && 'token' in data) {
            const { user, token } = data;
            // ⚡ Cookie httpOnly pour persistance
            res.cookie('token', token, cookieOptions);
            console.log('✅ Login successful with token for:', user?.email);
            return res.status(200).json({ user, token });
        }
        console.error('❌ Unexpected response structure from login service. Full response:', data);
        return res.status(500).json({
            error: true,
            message: 'Unexpected response from server',
            debug: { dataType: typeof data, dataExists: !!data }
        });
    }
    catch (err) {
        console.error('❌ Login controller error:', err);
        const message = err instanceof Error ? err.message : 'Login failed';
        return res.status(401).json({ error: true, message });
    }
};
exports.loginController = loginController;
const resendVerificationController = async (req, res) => {
    try {
        const authenticatedReq = req;
        const user_id = authenticatedReq.user?.user_id;
        if (!user_id) {
            return res.status(401).json({ error: true, message: 'User not authenticated - user_id missing' });
        }
        const result = await authService.resendVerificationEmail(user_id);
        if (result && typeof result === 'object' && 'error' in result && result.error === true) {
            return res.status(400).json(result);
        }
        return res.status(200).json(result);
    }
    catch (err) {
        console.error('❌ Resend verification error:', err);
        const message = err instanceof Error ? err.message : 'Failed to resend verification email';
        return res.status(400).json({ error: true, message });
    }
};
exports.resendVerificationController = resendVerificationController;
const verifyEmailController = async (req, res) => {
    try {
        const token = req.query.token;
        if (!token) {
            return res.status(400).json({ error: true, message: 'Token is required' });
        }
        const result = await authService.verifyEmail({ token });
        if (result && typeof result === 'object' && 'error' in result && result.error === true) {
            return res.status(400).json(result);
        }
        // The service may return { user, token } on success. If so, set cookie and return to client.
        if (result && typeof result === 'object' && 'user' in result) {
            const { user, token: authToken } = result;
            try {
                if (authToken) {
                    res.cookie('token', authToken, cookieOptions);
                }
            }
            catch (e) {
                console.error('[auth.controller] failed to set cookie during verifyEmail:', e);
            }
            return res.status(200).json({ user, token: authToken });
        }
        // Some older versions of the service may return a simple success flag; handle it gracefully.
        if (result && typeof result === 'object' && 'success' in result) {
            return res.status(200).json({ success: true, message: 'Email verified successfully' });
        }
        console.error('❌ Unexpected response from verifyEmail service:', result);
        return res.status(500).json({ error: true, message: 'Unexpected response from server' });
    }
    catch (err) {
        console.error('❌ Verify email error:', err);
        const message = err instanceof Error ? err.message : 'Verification failed';
        return res.status(400).json({ error: true, message });
    }
};
exports.verifyEmailController = verifyEmailController;
const forgotPasswordController = async (req, res) => {
    try {
        const result = await authService.forgotPassword(req.body);
        if (result && typeof result === 'object' && 'error' in result && result.error === true) {
            return res.status(400).json(result);
        }
        return res.status(200).json({ success: true, message: 'Password reset link sent to your email' });
    }
    catch (err) {
        console.error('❌ Forgot password error:', err);
        const message = err instanceof Error ? err.message : 'Failed to send reset link';
        return res.status(400).json({ error: true, message });
    }
};
exports.forgotPasswordController = forgotPasswordController;
const resetPasswordController = async (req, res) => {
    try {
        const result = await authService.resetPassword(req.body);
        if (result && typeof result === 'object' && 'error' in result && result.error === true) {
            return res.status(400).json(result);
        }
        return res.status(200).json({ success: true, message: 'Password updated successfully' });
    }
    catch (err) {
        console.error('❌ Reset password error:', err);
        const message = err instanceof Error ? err.message : 'Reset failed';
        return res.status(400).json({ error: true, message });
    }
};
exports.resetPasswordController = resetPasswordController;
// ➕ Ajout d'un logout propre qui efface le cookie httpOnly
const logoutController = async (_req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: isProd,
        sameSite: sameSiteValue,
        path: '/',
    });
    return res.status(200).json({ ok: true });
};
exports.logoutController = logoutController;
