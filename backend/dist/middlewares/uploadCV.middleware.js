"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUploadError = exports.uploadCVMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const documentParser_util_1 = require("../utils/documentParser.util");
// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        // Create user-specific directory
        const userId = req.user?.user_id || 'anonymous';
        const userUploadDir = path_1.default.join(uploadDir, 'candidates', userId);
        if (!fs_1.default.existsSync(userUploadDir)) {
            fs_1.default.mkdirSync(userUploadDir, { recursive: true });
        }
        cb(null, userUploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path_1.default.extname(file.originalname);
        cb(null, `cv-${uniqueSuffix}${extension}`);
    }
});
// File filter for CV uploads
const fileFilter = (req, file, cb) => {
    const validation = (0, documentParser_util_1.validateDocument)(file);
    if (validation.isValid) {
        cb(null, true);
    }
    else {
        cb(new Error(validation.error || 'Invalid file'));
    }
};
// Configure multer
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
        files: 1 // Only one file at a time
    }
});
// Middleware for single CV upload
exports.uploadCVMiddleware = upload.single('cv');
// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 10MB.'
            });
            return;
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            res.status(400).json({
                success: false,
                message: 'Too many files. Only one file allowed.'
            });
            return;
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            res.status(400).json({
                success: false,
                message: 'Unexpected field name. Use "cv" as field name.'
            });
            return;
        }
    }
    if (err && err.message && err.message.includes('Invalid file')) {
        res.status(400).json({
            success: false,
            message: err.message
        });
        return;
    }
    next(err);
};
exports.handleUploadError = handleUploadError;
exports.default = { uploadCVMiddleware: exports.uploadCVMiddleware, handleUploadError: exports.handleUploadError };
