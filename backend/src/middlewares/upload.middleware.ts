import { upload } from './multer.middleware'; // Use existing multer config
import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Allowed file types for case documents
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Check file extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }
  
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid MIME type. File type not allowed.`));
  }
  
  cb(null, true);
};

// Use existing multer config with file filter
export const uploadDocumentMiddleware = upload.single('document');

// Error handler for multer
export const handleDocumentUploadError = (err: any, req: Request, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.',
        error_code: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
      error_code: 'UPLOAD_ERROR',
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed',
      error_code: 'UPLOAD_FAILED',
    });
  }
  
  next();
};