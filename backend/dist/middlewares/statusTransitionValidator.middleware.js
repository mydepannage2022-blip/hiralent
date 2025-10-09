"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusTransitionValidator = void 0;
const validTransitions = {
    applied: ["shortlisted", "rejected"],
    shortlisted: ["interviewing", "rejected"],
    interviewing: ["hired", "rejected"],
};
const statusTransitionValidator = (req, res, next) => {
    const { previousStatus, newStatus } = req.body;
    const allowedNextStatuses = validTransitions[previousStatus];
    if (!allowedNextStatuses?.includes(newStatus)) {
        res
            .status(400)
            .json({
            message: `Invalid status transition: ${previousStatus} → ${newStatus}`,
        });
        return; // ✅ return void
    }
    next();
};
exports.statusTransitionValidator = statusTransitionValidator;
