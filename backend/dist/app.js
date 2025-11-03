"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// ——— CORS ———
// ⚠️ Une seule configuration CORS, AVANT les routes
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://hiralent.vercel.app',
];
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true, // indispensable pour envoyer/recevoir les cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
    ],
}));
// ——— Middlewares globaux ———
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Important derrière un proxy/CDN (Vercel, Nginx) pour que cookie { secure: true } fonctionne
app.set('trust proxy', 1);
// ——— Routes ———
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const candidate_routes_1 = __importDefault(require("./routes/candidate.routes"));
const company_routes_1 = __importDefault(require("./routes/company.routes"));
const ocr_routes_1 = __importDefault(require("./routes/ocr.routes"));
const verification_run_routes_1 = __importDefault(require("./routes/verification.run.routes"));
const submissions_1 = __importDefault(require("./routes/submissions"));
const execution_routes_1 = __importDefault(require("./routes/execution.routes"));
const metrics_1 = require("./lib/metrics");
app.get('/', (_req, res) => {
    res.send('backend running successfully');
});
app.use('/api/ocr', ocr_routes_1.default);
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/candidates', candidate_routes_1.default);
app.use('/api/v1/company', company_routes_1.default);
// Verification run endpoints (create/finalize) used by the company dashboard
app.use('/api/v1/verification/run', verification_run_routes_1.default);
// Code submission routes (code execution submissions)
app.use('/api/submissions', submissions_1.default);
app.use('/api/v1', execution_routes_1.default);
// Prometheus metrics endpoint (optional)
app.get('/metrics', async (_req, res) => {
    try {
        const body = await metrics_1.register.metrics();
        res.setHeader('Content-Type', metrics_1.register.contentType);
        res.send(body);
    }
    catch (e) {
        res.status(500).send('error');
    }
});
exports.default = app;
