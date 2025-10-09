"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFileMetadata = void 0;
const extractFileMetadata = (file, user_id) => ({
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    uploaded_by: user_id,
    uploaded_at: new Date(),
});
exports.extractFileMetadata = extractFileMetadata;
