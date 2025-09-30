"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = void 0;
const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        const role = req.user?.role;
        if (!role || !allowedRoles.includes(role)) {
            res.status(403).json({ error: "Forbidden: Role not allowed" });
            return; // ✅ ensures return type is void
        }
        next(); // ✅ required for successful middleware chain
    };
};
exports.checkRole = checkRole;
