"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownershipGuard = void 0;
const ownershipGuard = (extractOwnerId) => {
    return (req, res, next) => {
        const ownerId = extractOwnerId(req);
        const currentUserId = req.user?.user_id;
        if (!currentUserId || currentUserId !== ownerId) {
            res.status(403).json({ error: "Forbidden: Not your resource" });
            return; // ✅ Explicit return to satisfy void type
        }
        next();
    };
};
exports.ownershipGuard = ownershipGuard;
