"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const allowedOrigins = [
    'http://localhost:3000',
    'https://hiralent.vercel.app'
];
app.use((0, cors_1.default)({
    origin: allowedOrigins
}));
app.use(express_1.default.json()); // for JSON request body
// routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const candidate_routes_1 = __importDefault(require("./routes/candidate.routes"));
const company_routes_1 = __importDefault(require("./routes/company.routes"));
// Use routes
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/candidates', candidate_routes_1.default);
app.use('/api/v1/company', company_routes_1.default);
app.get('/', (req, res) => {
    res.send("backend running successfully");
});
exports.default = app;
