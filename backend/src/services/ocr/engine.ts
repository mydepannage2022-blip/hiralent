import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import pdfParse from 'pdf-parse';

// ---------- PSM constants (numériques) ----------
const PSM = {
  OSD_ONLY: 1,
  AUTO: 3,
  SINGLE_COLUMN: 4,
  SINGLE_BLOCK: 6,
  SINGLE_LINE: 7,
  SPARSE_TEXT: 11,
  SPARSE_TEXT_OSD: 13,
} as const;

// Use lib enum if present, else our constants
const LibPSM = (Tesseract as any)?.PSM ?? {};
const DEFAULT_PSM: number = LibPSM.SPARSE_TEXT ?? PSM.SPARSE_TEXT;

// ---------- ENV options ----------
const OCR_LANG = process.env.OCR_LANGS || 'eng+fra';   // ex: eng+fra
const HANDWRITING_MODE = process.env.OCR_HANDWRITING === '1'; // active nuances manuscrites
const TARGET_MIN_WIDTH = Number(process.env.OCR_TARGET_MIN_W || 1800); // upscaling cible

// ---------- Helpers ----------
type PrepOpts = {
  threshold?: number | null;   // 0..255, null => pas de binarisation
  invert?: boolean;            // inversion des couleurs
  blur?: number;               // léger flou avant threshold (ex: 0.3)
  sharpen?: boolean;           // sharpen final
  upscaleMinWidth?: number;    // upscale si image trop petite
};

async function preprocessImageVariant(inputPath: string, opts: PrepOpts): Promise<string> {
  const outPath = `${inputPath}-${opts.threshold ?? 'nt'}${opts.invert ? '-inv' : ''}.png`;
  const meta = await sharp(inputPath).metadata();
  const needsUpscale = (meta.width || 0) < (opts.upscaleMinWidth || TARGET_MIN_WIDTH);

  let pipe = sharp(inputPath).rotate().grayscale().normalize();

  if (needsUpscale) {
    pipe = pipe.resize({
      width: Math.max(opts.upscaleMinWidth || TARGET_MIN_WIDTH, meta.width || TARGET_MIN_WIDTH),
      withoutEnlargement: false,
      kernel: 'lanczos3',
    });
  }

  // Lissage léger avant seuillage
  if (opts.blur && opts.blur > 0) {
    pipe = pipe.blur(opts.blur);
  }

  if (typeof opts.threshold === 'number') {
    pipe = pipe.threshold(opts.threshold);
  }

  if (opts.invert) {
    pipe = pipe.negate();
  }

  if (opts.sharpen) {
    pipe = pipe.sharpen();
  }

  await pipe.png().toFile(outPath);
  return outPath;
}

function tesseractOptions(psm: number = DEFAULT_PSM) {
  return {
    tessedit_pageseg_mode: psm,
    preserve_interword_spaces: '1',
    // @ts-ignore
    user_defined_dpi: 300,
    // @ts-ignore
    oem: 1, // LSTM
  } as any;
}

async function runRecognize(imagePath: string, psm: number, lang: string) {
  const { data } = await Tesseract.recognize(imagePath, lang, tesseractOptions(psm));
  // data.confidence: moyenne globale (0..100)
  return {
    text: data.text || '',
    confidence: typeof data.confidence === 'number' ? data.confidence : 0,
  };
}

// ---------- OCR Image : multi-variants + sélection du meilleur ----------
export async function ocrImage(filePath: string, lang = OCR_LANG): Promise<string> {
  // Définir un petit set de variantes :
  // - thresholds différents (170/190/210)
  // - inversion possible (utile quand manuscrit pâle sur fond sombre)
  // - PSM adaptés (sparse pour CV/justifs, single_block pour paragraphes, single_line pour manuscrit)
  const variants: { prep: PrepOpts; psm: number; label: string }[] = [
    { prep: { threshold: 190, blur: 0.3, sharpen: true, upscaleMinWidth: TARGET_MIN_WIDTH }, psm: PSM.SPARSE_TEXT, label: 'bin190_sparse' },
    { prep: { threshold: 210, blur: 0.3, sharpen: true, upscaleMinWidth: TARGET_MIN_WIDTH }, psm: PSM.SINGLE_BLOCK, label: 'bin210_block' },
    { prep: { threshold: 170, blur: 0.2, sharpen: true, upscaleMinWidth: TARGET_MIN_WIDTH }, psm: PSM.SINGLE_COLUMN, label: 'bin170_column' },
    { prep: { threshold: null, blur: 0,   sharpen: true, upscaleMinWidth: TARGET_MIN_WIDTH }, psm: PSM.SPARSE_TEXT, label: 'noThresh_sparse' },
  ];

  // En mode manuscrit, on ajoute deux variantes plus agressives :
  if (HANDWRITING_MODE) {
    variants.push(
      { prep: { threshold: 180, blur: 0.2, sharpen: true, upscaleMinWidth: TARGET_MIN_WIDTH, invert: false }, psm: PSM.SINGLE_BLOCK, label: 'hw_bin180_block' },
      { prep: { threshold: 200, blur: 0.1, sharpen: true, upscaleMinWidth: TARGET_MIN_WIDTH, invert: false }, psm: PSM.SINGLE_LINE,  label: 'hw_bin200_line' },
    );
  }

  let best = { text: '', confidence: -1, label: '' };

  for (const v of variants) {
    try {
      const cleaned = await preprocessImageVariant(filePath, v.prep);
      const { text, confidence } = await runRecognize(cleaned, v.psm, lang);
      if (confidence > best.confidence && (text?.trim()?.length || 0) > 0) {
        best = { text, confidence, label: v.label };
      }
    } catch {
      // on ignore les erreurs d’une variante et on continue
    }
  }

  // Si toutes les variantes échouent, tentative "simple" par défaut
  if (best.confidence < 0) {
    try {
      const cleaned = await preprocessImageVariant(filePath, { threshold: 190, blur: 0.3, sharpen: true });
      const { text } = await runRecognize(cleaned, DEFAULT_PSM, lang);
      return text;
    } catch {
      return '';
    }
  }

  return best.text;
}

// ---------- OCR PDF : embedded text d'abord, puis fallback ----------
export async function ocrPdf(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);

  // 1) Try to extract embedded text
  try {
    const parsed = await pdfParse(buf);
    if (parsed.text && parsed.text.trim().length > 20) {
      return parsed.text;
    }
  } catch (pdfError: any) {
    console.warn('[ocrPdf] pdf-parse failed, will convert to image:', pdfError.message);
  }

  // 2) PDF is scanned or corrupted - convert to images and OCR each page
  try {
    // Convert PDF to images using pdf-to-png or similar
    // For now, let's use a simpler approach with pdf2pic
    const { fromPath } = await import('pdf2pic');
    
    const options = {
      density: 300,
      saveFilename: `pdf_page`,
      savePath: './uploads/temp',
      format: 'png',
      width: 2000,
      height: 2000
    };

    const converter = fromPath(filePath, options);
    const pageToConvertAsImage = 1; // Start with first page
    
    const result = await converter(pageToConvertAsImage, { responseType: 'image' });
    
    if (result && result.path) {
      // OCR the converted image
      const { data } = await Tesseract.recognize(result.path, OCR_LANG, tesseractOptions(DEFAULT_PSM));
      
      // Clean up temp file
      try {
        await fs.unlink(result.path);
      } catch {}
      
      return data.text || '';
    }
  } catch (conversionError: any) {
    console.error('[ocrPdf] PDF conversion failed:', conversionError.message);
  }

  // 3) Last resort: return empty string
  return '';
}

// ---------- Switch PDF vs Image ----------
export async function ocrFromFile(filePath: string, declaredMime?: string): Promise<string> {
  let mime = declaredMime || '';

  if (!mime) {
    try {
      const { fileTypeFromBuffer } = await import('file-type');
      const buf = await fs.readFile(filePath);
      const detected = await fileTypeFromBuffer(buf);
      if (detected?.mime) mime = detected.mime;
    } catch {
      // ignore
    }
  }

  if (mime === 'application/pdf' || mime.endsWith('/pdf')) {
    return ocrPdf(filePath);
  }
  return ocrImage(filePath);
}
