"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRequests = void 0;
const logRequests = (req, _res, next) => {
    const user = req.user?.user_id || "anonymous";
    console.log(`[${req.method}] ${req.originalUrl} by ${user}`);
    next();
};
exports.logRequests = logRequests;
