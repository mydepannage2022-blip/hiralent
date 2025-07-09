import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { validateDocument } from '../utils/documentParser.util';

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create user-specific directory
    const userId = (req as any).user?.user_id || 'anonymous';
    const userUploadDir = path.join(uploadDir, 'candidates', userId);
    
    if (!fs.existsSync(userUploadDir)) {
      fs.mkdirSync(userUploadDir, { recursive: true });
    }
    
    cb(null, userUploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `cv-${uniqueSuffix}${extension}`);
  }
});

// File filter for CV uploads
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const validation = validateDocument(file);
  
  if (validation.isValid) {
    cb(null, true);
  } else {
    cb(new Error(validation.error || 'Invalid file'));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 1 // Only one file at a time
  }
});

// Middleware for single CV upload
export const uploadCVMiddleware = upload.single('cv');

// Error handling middleware for multer
export const handleUploadError = (err: any, req: Request, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file allowed.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name. Use "cv" as field name.'
      });
    }
  }
  
  if (err.message.includes('Invalid file')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next(err);
};

export default { uploadCVMiddleware, handleUploadError };
