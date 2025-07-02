export const extractFileMetadata = (file: Express.Multer.File, user_id: string) => ({
  filename: file.originalname,
  mimetype: file.mimetype,
  size: file.size,
  path: file.path,
  uploaded_by: user_id,
  uploaded_at: new Date(),
});
