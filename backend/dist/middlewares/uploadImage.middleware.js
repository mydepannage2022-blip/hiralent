"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageUploadConfigExport = exports.validateUploadedImage = exports.handleImageUploadError = exports.uploadImageMiddleware = void 0;
// middlewares/uploadImage.middleware.ts
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Create upload directory if it doesn't exist
const createUploadDir = (dir) => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
};
// Image upload configuration
const imageUploadConfig = {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    uploadPath: 'uploads/images/profile-pictures'
};
// Ensure upload directory exists
createUploadDir(imageUploadConfig.uploadPath);
// Storage configuration
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imageUploadConfig.uploadPath);
    },
    filename: (req, file, cb) => {
        const userId = req.user?.user_id || 'unknown';
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = path_1.default.extname(file.originalname).toLowerCase();
        // Format: profilepic_userId_timestamp_random.ext
        const filename = `profilepic_${userId}_${timestamp}_${randomString}${extension}`;
        cb(null, filename);
    }
});
// File filter for images only
const fileFilter = (req, file, cb) => {
    // Check MIME type
    if (imageUploadConfig.allowedTypes.includes(file.mimetype)) {
        // Double check file extension
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error('INVALID_FILE_EXTENSION'), false);
        }
    }
    else {
        cb(new Error('INVALID_FILE_TYPE'), false);
    }
};
// Create multer instance
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: imageUploadConfig.maxSize,
        files: 1 // Only one file at a time
    },
    fileFilter: fileFilter
});
// Main middleware for single image upload
exports.uploadImageMiddleware = upload.single('profilePicture');
// Error handling middleware
const handleImageUploadError = (error, req, res, next) => {
    console.error('Image upload error:', error);
    // Handle Multer errors
    if (error instanceof multer_1.default.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: 'Image file too large. Maximum size allowed is 5MB.',
                    error_code: 'FILE_TOO_LARGE'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Too many files. Only one image allowed.',
                    error_code: 'TOO_MANY_FILES'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: 'Unexpected field name. Use "profilePicture" as field name.',
                    error_code: 'UNEXPECTED_FIELD'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: 'File upload error occurred.',
                    error_code: 'UPLOAD_ERROR'
                });
        }
    }
    // Handle custom validation errors
    if (error.message === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
            success: false,
            message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
            error_code: 'INVALID_FILE_TYPE'
        });
    }
    if (error.message === 'INVALID_FILE_EXTENSION') {
        return res.status(400).json({
            success: false,
            message: 'Invalid file extension. Only .jpg, .jpeg, .png, .gif, .webp are allowed.',
            error_code: 'INVALID_FILE_EXTENSION'
        });
    }
    // Pass other errors to global error handler
    next(error);
};
exports.handleImageUploadError = handleImageUploadError;
// Optional: Middleware to validate file after upload
const validateUploadedImage = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No image file uploaded. Please select an image file.',
            error_code: 'NO_FILE_UPLOADED'
        });
    }
    // Additional file validation can be added here
    // e.g., check if file actually exists on disk
    if (!fs_1.default.existsSync(req.file.path)) {
        return res.status(500).json({
            success: false,
            message: 'Upload failed. File not found on server.',
            error_code: 'FILE_NOT_FOUND'
        });
    }
    next();
};
exports.validateUploadedImage = validateUploadedImage;
// Export configuration for use in other modules
exports.imageUploadConfigExport = imageUploadConfig;
