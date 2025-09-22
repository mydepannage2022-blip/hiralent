import { Router, Request, Response } from 'express';
import multer from 'multer';
import { ocrFromFile } from '../services/ocr/engine';

const router = Router();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// POST /api/ocr  (form-data with field "document")
router.post('/', upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded' });

    const { path: filePath, mimetype } = req.file;
    const text = await ocrFromFile(filePath, mimetype);

    return res.json({ ok: true, ocrText: text });
  } catch (err) {
    console.error('[OCR] error:', err);
    return res.status(500).json({ ok: false, error: 'OCR failed' });
  }
});

export default router;
