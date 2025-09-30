"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const hasPermission = async (role, module, requiredLevel) => {
    const permission = await prisma_1.default.rolePermission.findFirst({
        where: {
            role_name: role,
            module,
        },
    });
    if (!permission)
        return false;
    const levels = ["read", "write", "admin"];
    const userLevelIndex = levels.indexOf(permission.access_level);
    const requiredLevelIndex = levels.indexOf(requiredLevel);
    return userLevelIndex >= requiredLevelIndex;
};
exports.hasPermission = hasPermission;
