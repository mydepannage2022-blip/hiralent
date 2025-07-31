// middlewares/uploadImage.middleware.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// Create upload directory if it doesn't exist
const createUploadDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
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
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imageUploadConfig.uploadPath);
  },
  filename: (req, file, cb) => {
    const userId = (req as any).user?.user_id || 'unknown';
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname).toLowerCase();
    
    // Format: profilepic_userId_timestamp_random.ext
    const filename = `profilepic_${userId}_${timestamp}_${randomString}${extension}`;
    cb(null, filename);
  }
});

// File filter for images only
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Check MIME type
  if (imageUploadConfig.allowedTypes.includes(file.mimetype)) {
    // Double check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_EXTENSION'), false);
    }
  } else {
    cb(new Error('INVALID_FILE_TYPE'), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: imageUploadConfig.maxSize,
    files: 1 // Only one file at a time
  },
  fileFilter: fileFilter
});

// Main middleware for single image upload
export const uploadImageMiddleware = upload.single('profilePicture');

// Error handling middleware
export const handleImageUploadError = (
  error: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  console.error('Image upload error:', error);

  // Handle Multer errors
  if (error instanceof multer.MulterError) {
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

// Optional: Middleware to validate file after upload
export const validateUploadedImage = (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file uploaded. Please select an image file.',
      error_code: 'NO_FILE_UPLOADED'
    });
  }

  // Additional file validation can be added here
  // e.g., check if file actually exists on disk
  if (!fs.existsSync(req.file.path)) {
    return res.status(500).json({
      success: false,
      message: 'Upload failed. File not found on server.',
      error_code: 'FILE_NOT_FOUND'
    });
  }

  next();
};

// Export configuration for use in other modules
export const imageUploadConfigExport = imageUploadConfig;
