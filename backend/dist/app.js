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
    origin: function (origin, callback) {
        // allow requests like Postman or server-to-server without origin
        if (!origin)
            return callback(null, true);
        if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
            return callback(null, true);
        }
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express_1.default.json()); // parse JSON body
// Routes
const agency_routes_1 = __importDefault(require("./routes/agency.routes"));
const admin_agency_routes_1 = __importDefault(require("./routes/admin.agency.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth/auth.routes"));
const candidate_routes_1 = __importDefault(require("./routes/candidate.routes"));
const company_routes_1 = __importDefault(require("./routes/company.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const ocr_routes_1 = __importDefault(require("./routes/ocr.routes"));
const verification_run_routes_1 = __importDefault(require("./routes/verification.run.routes"));
const admin_auth_routes_1 = __importDefault(require("./routes/admin.auth.routes"));
const admin_verification_routes_1 = __importDefault(require("./routes/admin.verification.routes"));
const question_routes_1 = __importDefault(require("./routes/questions/question.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const submissions_1 = __importDefault(require("./routes/submissions"));
const execution_routes_1 = __importDefault(require("./routes/execution.routes"));
const insights_routes_1 = __importDefault(require("./routes/insights.routes"));
const job_routes_1 = __importDefault(require("./routes/job.routes"));
const employerAssessment_routes_1 = __importDefault(require("./routes/employerAssessment.routes"));
// Mount routes
app.use("/api/v1/agency", agency_routes_1.default);
app.use('/api/v1/admin', admin_agency_routes_1.default);
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/candidates', candidate_routes_1.default);
app.use('/api/v1/company', company_routes_1.default);
app.use('/api/v1/uploads', upload_routes_1.default);
app.use('/api/ocr', ocr_routes_1.default);
app.use('/api/v1/verification/run', verification_run_routes_1.default);
app.use('/api/v1/auth/sessions', auth_routes_1.default);
app.use('/api/v1/messages', message_routes_1.default);
//Question Bank
app.use('/api/questions', question_routes_1.default);
// Submission endpoints (create, fetch)
app.use('/api/v1/submissions', submissions_1.default);
// Execution-related endpoints (SSE stream, convenience fetch)
app.use('/api/v1', execution_routes_1.default);
// Mount dev routes only in non-production to avoid touching production behavior
if (process.env.NODE_ENV !== 'production') {
    try {
        // require here so production bundles don't include dev-only code
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const devRoutes = require('./routes/dev.routes').default;
        app.use('/dev', devRoutes);
    }
    catch (e) {
        console.warn('Dev routes not available:', e.message);
    }
}
// ✅ Admin routes ONLY here (use ADMIN_JWT_SECRET internally)
app.use('/api/v1/admin', admin_auth_routes_1.default);
app.use('/api/v1/admin', admin_verification_routes_1.default);
app.use('/api/v1', insights_routes_1.default);
app.use('/api/v1', insights_routes_1.default);
app.use('/api/v1', job_routes_1.default);
app.use('/api/v1/employer-assessments', employerAssessment_routes_1.default);
app.get('/', (req, res) => {
    res.send("Backend running successfully");
});
exports.default = app;
