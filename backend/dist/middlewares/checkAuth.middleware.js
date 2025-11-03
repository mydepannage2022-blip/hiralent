"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAuth = void 0;
const jwt_util_1 = require("../utils/jwt.util");
const prisma_1 = __importDefault(require("../lib/prisma"));
const checkAuth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        let token = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : null;
        // ✅ Fallback sur cookie httpOnly
        if (!token && req.cookies?.token) {
            token = req.cookies.token;
        }
        if (!token) {
            return res.status(401).json({ error: true, message: 'Access denied. No token provided.' });
        }
        const decoded = (0, jwt_util_1.verifyToken)(token);
        if (!decoded?.user_id) {
            return res.status(401).json({ error: true, message: 'Invalid token payload' });
        }
        // Vérifier que l'utilisateur existe toujours
        const user = await prisma_1.default.user.findUnique({
            where: { user_id: decoded.user_id },
            select: {
                user_id: true,
                email: true,
                role: true,
                agency_id: true,
                is_email_verified: true,
            },
        });
        if (!user) {
            return res.status(401).json({ error: true, message: 'User not found' });
        }
        // Attacher l'user au req pour les contrôleurs
        req.user = {
            user_id: user.user_id,
            email: user.email,
            role: user.role,
            agency_id: user.agency_id,
        };
        console.log('🔐 User authenticated:', user.user_id, user.email);
        return next();
    }
    catch (error) {
        console.error('❌ Auth middleware error:', error);
        return res.status(401).json({ error: true, message: 'Invalid token' });
    }
};
exports.checkAuth = checkAuth;
