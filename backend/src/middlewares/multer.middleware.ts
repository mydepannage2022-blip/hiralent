import multer from "multer";

const MAX_BYTES = Number(
  process.env.MAX_UPLOAD_BYTES ??
    10_000_000 // fallback 10 MB
);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
});
