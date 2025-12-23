"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const mongo_1 = require("./lib/mongo");
const devStubs_1 = require("./bootstrap/devStubs");
const Socket_messaging_1 = require("./realtime/Socket.messaging");
// Load dev stubs if we're in local/dev mode
if (process.env.NODE_ENV !== 'production') {
    (0, devStubs_1.loadDevStubs)();
}
(async () => {
    try {
        const mongo = await (0, mongo_1.connectDB)();
        app_1.default.locals.mongo = mongo;
        const server = http_1.default.createServer(app_1.default);
        const io = (0, Socket_messaging_1.setupSocketIO)(server);
        app_1.default.set('socketio', io);
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`🚀 Server listening on port ${PORT}`);
        });
    }
    catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
})();
