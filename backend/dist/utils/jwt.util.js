"use strict";
// backend/src/utils/jwt.util.ts (SUPER SIMPLE VERSION)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeviceHash = exports.getSessionIdFromToken = exports.refreshToken = exports.isTokenExpired = exports.getTokenExpiration = exports.decodeToken = exports.verifyTokenWithDetails = exports.verifyToken = exports.generateTokenWithSession = exports.generateTokenLegacy = exports.generateUserToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateToken = (payload, expiresIn = '7d') => {
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn });
};
exports.generateToken = generateToken;
const generateUserToken = (userId, expiresIn = '15m') => {
    return jsonwebtoken_1.default.sign({ user_id: userId }, process.env.JWT_SECRET, { expiresIn });
};
exports.generateUserToken = generateUserToken;
// Legacy function for existing code
const generateTokenLegacy = (userId, role, agencyId) => {
    return jsonwebtoken_1.default.sign({
        user_id: userId,
        role,
        ...(agencyId && { agency_id: agencyId })
    }, process.env.JWT_SECRET, { expiresIn: '7d' });
};
exports.generateTokenLegacy = generateTokenLegacy;
const generateTokenWithSession = (userId, role, sessionId, agencyId, deviceHash, companyId) => {
    return jsonwebtoken_1.default.sign({
        user_id: userId,
        role,
        session_id: sessionId,
        ...(agencyId && { agency_id: agencyId }),
        ...(deviceHash && { device_hash: deviceHash }),
        ...(companyId && { company_id: companyId }) // ✅
    }, process.env.JWT_SECRET, { expiresIn: '7d' });
};
exports.generateTokenWithSession = generateTokenWithSession;
// Verify JWT token
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    }
    catch (error) {
        console.error('JWT Verification Error:', error.message);
        return null;
    }
};
exports.verifyToken = verifyToken;
// Verify token with details
const verifyTokenWithDetails = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        return { payload: decoded, error: null, expired: false };
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            return { payload: null, error: 'Token expired', expired: true };
        }
        else if (error.name === 'JsonWebTokenError') {
            return { payload: null, error: 'Invalid token', expired: false };
        }
        else {
            return { payload: null, error: 'Token verification failed', expired: false };
        }
    }
};
exports.verifyTokenWithDetails = verifyTokenWithDetails;
// Decode without verification
const decodeToken = (token) => {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch (error) {
        console.error('JWT Decode Error:', error.message);
        return null;
    }
};
exports.decodeToken = decodeToken;
// Get expiration
const getTokenExpiration = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        if (decoded && decoded.exp) {
            return new Date(decoded.exp * 1000);
        }
        return null;
    }
    catch (error) {
        return null;
    }
};
exports.getTokenExpiration = getTokenExpiration;
// Check if expired
const isTokenExpired = (token) => {
    const expiration = (0, exports.getTokenExpiration)(token);
    if (!expiration)
        return true;
    return expiration < new Date();
};
exports.isTokenExpired = isTokenExpired;
// Refresh token
const refreshToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        return jsonwebtoken_1.default.sign(decoded, process.env.JWT_SECRET, { expiresIn: '7d' });
    }
    catch (error) {
        console.error('Refresh Token Error:', error.message);
        return null;
    }
};
exports.refreshToken = refreshToken;
// Get session ID
const getSessionIdFromToken = (token) => {
    const payload = (0, exports.decodeToken)(token);
    return payload?.session_id || null;
};
exports.getSessionIdFromToken = getSessionIdFromToken;
// Device hash
const createDeviceHash = (userAgent, ip) => {
    const crypto = require('crypto');
    const deviceString = `${userAgent}:${ip}`;
    return crypto.createHash('md5').update(deviceString).digest('hex');
};
exports.createDeviceHash = createDeviceHash;
