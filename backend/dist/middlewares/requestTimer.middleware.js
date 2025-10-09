"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestTimer = void 0;
const requestTimer = (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`⏱️ ${req.method} ${req.originalUrl} - ${duration}ms`);
    });
    next();
};
exports.requestTimer = requestTimer;
