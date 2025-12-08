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
exports.requireActiveSession = exports.checkAuthLegacy = exports.checkAuth = void 0;
const jwt_util_1 = require("../utils/jwt.util");
const blacklistService = __importStar(require("../services/auth/blacklist.service"));
const checkAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: true, message: 'Access token required' });
        }
        const token = authHeader.substring(7);
        // optional blacklist support
        const isBlacklisted = await blacklistService.isTokenBlacklisted?.(token);
        if (isBlacklisted) {
            return res.status(401).json({ error: true, message: 'Session terminated. Please login again.' });
        }
        const { payload, error, expired } = (0, jwt_util_1.verifyTokenWithDetails)(token);
        if (error || !payload) {
            return res.status(401).json({ error: true, message: expired ? 'Token expired' : 'Invalid token' });
        }
        req.user = {
            user_id: payload.user_id,
            role: payload.role,
            agency_id: payload.agency_id,
            session_id: payload.session_id || 'bypass',
            is_email_verified: payload.is_email_verified,
            email: payload.email,
            full_name: payload.full_name,
            company_id: payload.company_id ?? undefined, //  keep it on req.user
        };
        // (Optional) Enforce for company routes at middleware level:
        // if ((req.user.role === 'company' || req.user.role === 'company_admin') && !req.user.company_id) {
        //   return res.status(400).json({ success: false, message: 'Missing company_id in auth token' });
        // }
        next();
    }
    catch (error) {
        console.error('❌ Auth error:', error);
        res.status(500).json({ error: true, message: 'Authentication failed' });
    }
};
exports.checkAuth = checkAuth;
const checkAuthLegacy = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: true, message: 'Access token required' });
        }
        const token = authHeader.substring(7);
        const { payload, error, expired } = (0, jwt_util_1.verifyTokenWithDetails)(token);
        if (error || !payload) {
            return res.status(401).json({ error: true, message: expired ? 'Token expired' : 'Invalid token' });
        }
        req.user = {
            user_id: payload.user_id,
            role: payload.role,
            agency_id: payload.agency_id,
            session_id: payload.session_id || 'unknown',
            company_id: payload.company_id ?? undefined, //  keep it on legacy too
        };
        next();
    }
    catch (error) {
        console.error('Auth Legacy Middleware Error:', error);
        res.status(500).json({ error: true, message: 'Authentication failed' });
    }
};
exports.checkAuthLegacy = checkAuthLegacy;
const requireActiveSession = async (req, res, next) => {
    if (!req.user?.session_id || req.user.session_id === 'legacy') {
        return res.status(401).json({ error: true, message: 'Active session required. Please login again.' });
    }
    next();
};
exports.requireActiveSession = requireActiveSession;
