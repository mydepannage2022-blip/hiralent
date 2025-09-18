"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmailVerified = void 0;
const isEmailVerified = (req, res, next) => {
    if (!req.user?.is_email_verified) {
        res.status(403).json({ error: "Please verify your email first" });
        return;
    }
    next();
    return;
};
exports.isEmailVerified = isEmailVerified;
