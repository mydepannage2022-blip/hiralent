import multer from "multer";

// Video files can be large - allow up to 500MB
const MAX_VIDEO_BYTES = Number(
  process.env.MAX_VIDEO_UPLOAD_BYTES ??
    500_000_000 // fallback 500 MB
);

// Only allow video file types
const videoFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimesPrefixes = [
    'video/webm',
    'video/mp4',
    'video/ogg',
    'video/quicktime',
  ];

  // Log what we receive for debugging
  console.log(`📹 Upload file filter: filename=${file.originalname}, mimetype=${file.mimetype}`);

  // Check if mimetype starts with any allowed prefix
  // This handles cases like 'video/webm;codecs=vp9,opus'
  const isAllowed = allowedMimesPrefixes.some(prefix =>
    file.mimetype.startsWith(prefix)
  );

  // Also allow by file extension as fallback (browser might send wrong mimetype)
  const hasVideoExtension = file.originalname?.match(/\.(webm|mp4|ogg|mov)$/i);

  if (isAllowed || hasVideoExtension) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowedMimesPrefixes.join(', ')}`));
  }
};

export const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES },
  fileFilter: videoFileFilter,
});
