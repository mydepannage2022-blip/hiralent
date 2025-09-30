"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPermission = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const checkPermission = (module, requiredLevel) => {
    return async (req, res, next) => {
        try {
            const role = req.user?.role;
            if (!role) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const permission = await prisma_1.default.rolePermission.findFirst({
                where: { role_name: role, module },
            });
            const levels = ["none", "read", "write", "manage"];
            const hasAccess = permission &&
                levels.indexOf(permission.access_level) >= levels.indexOf(requiredLevel);
            if (!hasAccess) {
                return res
                    .status(403)
                    .json({ error: "Forbidden: Permission denied" });
            }
            next();
        }
        catch (err) {
            return res.status(500).json({
                error: "Permission check failed",
                detail: err.message,
            });
        }
    };
};
exports.checkPermission = checkPermission;
