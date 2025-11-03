"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const mongo_1 = require("./lib/mongo");
const devStubs_1 = require("./bootstrap/devStubs");
// Load dev stubs if we’re in local/dev mode
if (process.env.NODE_ENV !== 'production') {
    (0, devStubs_1.loadDevStubs)();
}
(async () => {
    try {
        const mongo = await (0, mongo_1.connectDB)();
        app_1.default.locals.mongo = mongo;
        const PORT = process.env.PORT || 5000;
        app_1.default.listen(PORT, () => {
            console.log(`🚀 Server listening on port ${PORT}`);
        });
    }
    catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
})();
