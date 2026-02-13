import pytesseract
from PIL import Image
import io
from typing import List, Optional
from dataclasses import dataclass
import logging

from app.config import settings
from app.core.ocr.preprocessor import ImagePreprocessor

logger = logging.getLogger(__name__)


@dataclass
class OCRResult:
    """Result of OCR extraction."""
    text: str
    confidence: float
    page_count: int
    page_texts: List[str]
    word_confidences: List[float]


class OCREngine:
    """OCR engine with Tesseract and EasyOCR support."""

    def __init__(self):
        self.preprocessor = ImagePreprocessor()
        self.langs = settings.OCR_LANGS
        self.confidence_threshold = settings.OCR_CONFIDENCE_THRESHOLD
        self._easyocr_reader = None  # Lazy initialization

    async def extract_text(self, file_buffer: bytes, mime_type: str) -> OCRResult:
        """
        Extract text from document with confidence scoring.

        Args:
            file_buffer: File contents as bytes
            mime_type: MIME type of the file

        Returns:
            OCRResult with text and confidence
        """
        if mime_type == "application/pdf":
            return await self._process_pdf(file_buffer)
        else:
            return await self._process_image(file_buffer)

    async def _process_pdf(self, file_buffer: bytes) -> OCRResult:
        """Process PDF by converting to images."""
        try:
            from pdf2image import convert_from_bytes

            images = convert_from_bytes(file_buffer, dpi=300)
            logger.info(f"PDF converted to {len(images)} pages")

            all_text = []
            all_confidences = []
            page_texts = []

            for page_num, image in enumerate(images):
                page_result = await self._ocr_image(image)
                page_texts.append(page_result.text)
                all_text.append(page_result.text)
                all_confidences.extend(page_result.word_confidences)
                logger.debug(f"Page {page_num + 1} OCR confidence: {page_result.confidence:.2f}")

            # Calculate average confidence
            avg_confidence = (
                sum(all_confidences) / len(all_confidences)
                if all_confidences else 0
            )

            return OCRResult(
                text="\n\n".join(all_text),
                confidence=avg_confidence,
                page_count=len(images),
                page_texts=page_texts,
                word_confidences=all_confidences
            )

        except Exception as e:
            logger.error(f"PDF processing failed: {e}")
            # Try to extract embedded text as fallback
            return await self._extract_pdf_text(file_buffer)

    async def _extract_pdf_text(self, file_buffer: bytes) -> OCRResult:
        """Extract embedded text from PDF (fallback for OCR failure)."""
        try:
            import pdfplumber

            with pdfplumber.open(io.BytesIO(file_buffer)) as pdf:
                texts = []
                for page in pdf.pages:
                    text = page.extract_text() or ""
                    texts.append(text)

                full_text = "\n\n".join(texts)

                # If we got text, assume high confidence
                if full_text.strip():
                    return OCRResult(
                        text=full_text,
                        confidence=0.95,  # Embedded text is reliable
                        page_count=len(pdf.pages),
                        page_texts=texts,
                        word_confidences=[95.0] * len(full_text.split())
                    )

        except Exception as e:
            logger.warning(f"PDF text extraction fallback failed: {e}")

        # Return empty result
        return OCRResult(
            text="",
            confidence=0.0,
            page_count=0,
            page_texts=[],
            word_confidences=[]
        )

    async def _process_image(self, file_buffer: bytes) -> OCRResult:
        """Process single image file."""
        image = Image.open(io.BytesIO(file_buffer))
        return await self._ocr_image(image)

    async def _ocr_image(self, image: Image.Image) -> OCRResult:
        """
        Run OCR with selected engine (EasyOCR or Tesseract).

        Args:
            image: PIL Image to process

        Returns:
            OCRResult with extracted text and confidence
        """
        # Use EasyOCR if enabled (better for phone photos with glare)
        if settings.USE_EASYOCR:
            logger.info("Using EasyOCR engine (deep learning)")
            return await self._ocr_image_easyocr(image)

        # Fallback to Tesseract (faster but struggles with phone photos)
        logger.info("Using Tesseract engine (traditional OCR)")
        return await self._ocr_image_tesseract(image)

    async def _ocr_image_tesseract(self, image: Image.Image) -> OCRResult:
        """
        Run OCR on a single image with multiple preprocessing variants.
        Select the variant with highest confidence.
        """
        # Create preprocessing variants
        variants = self.preprocessor.create_variants(image)

        best_result = None
        best_confidence = 0

        for variant_name, processed_image in variants:
            try:
                # Get OCR data with confidence
                data = pytesseract.image_to_data(
                    processed_image,
                    lang=self.langs,
                    output_type=pytesseract.Output.DICT
                )

                # Extract text and confidences
                text_parts = []
                confidences = []

                for i, conf in enumerate(data["conf"]):
                    if conf > 0:  # Valid confidence (-1 means no confidence)
                        confidences.append(conf)
                        word = data["text"][i].strip()
                        if word:
                            text_parts.append(word)

                # Calculate average confidence
                avg_conf = sum(confidences) / len(confidences) if confidences else 0
                avg_conf = avg_conf / 100  # Normalize to 0-1

                if avg_conf > best_confidence:
                    best_confidence = avg_conf
                    best_result = OCRResult(
                        text=" ".join(text_parts),
                        confidence=avg_conf,
                        page_count=1,
                        page_texts=[" ".join(text_parts)],
                        word_confidences=[c / 100 for c in confidences]
                    )

                logger.debug(f"Variant '{variant_name}' confidence: {avg_conf:.2f}")

            except Exception as e:
                logger.warning(f"OCR variant '{variant_name}' failed: {e}")
                continue

        if best_result is None:
            # Fallback to basic OCR
            text = pytesseract.image_to_string(image, lang=self.langs)
            return OCRResult(
                text=text,
                confidence=0.5,  # Unknown confidence
                page_count=1,
                page_texts=[text],
                word_confidences=[]
            )

        logger.info(f"Best OCR confidence: {best_confidence:.2f}")
        return best_result

    async def _ocr_image_easyocr(self, image: Image.Image) -> OCRResult:
        """
        Run OCR using EasyOCR (deep learning model, better for phone photos).

        Args:
            image: PIL Image to process

        Returns:
            OCRResult with extracted text and confidence
        """
        try:
            import easyocr
            import numpy as np

            # Initialize EasyOCR reader (lazy initialization for performance)
            if self._easyocr_reader is None:
                logger.info("Initializing EasyOCR reader (first time only, may take 10-20 seconds)...")

                # Map our language codes to EasyOCR codes
                lang_map = {
                    'eng': 'en',
                    'fra': 'fr',
                    'ara': 'ar',
                    'spa': 'es'
                }

                # Parse OCR_LANGS (e.g., "eng+fra+ara+spa")
                tesseract_langs = self.langs.split('+')
                easyocr_langs = []
                for lang in tesseract_langs:
                    if lang in lang_map:
                        easyocr_langs.append(lang_map[lang])

                # Default to English if no valid languages
                if not easyocr_langs:
                    easyocr_langs = ['en']

                # EasyOCR constraint: Arabic is only compatible with English
                # English model reads all Latin-script text (covers French too)
                if 'ar' in easyocr_langs:
                    easyocr_langs = ['ar', 'en']

                logger.info(f"EasyOCR languages: {easyocr_langs}")

                # Initialize reader (downloads models on first run)
                self._easyocr_reader = easyocr.Reader(
                    easyocr_langs,
                    gpu=False,  # Set to True if GPU available
                    verbose=False
                )
                logger.info("EasyOCR reader initialized successfully")

            # Convert PIL Image to numpy array
            img_array = np.array(image)

            # Run EasyOCR
            logger.info("Running EasyOCR text detection...")
            results = self._easyocr_reader.readtext(img_array, detail=1)

            # Extract text and confidence
            texts = []
            confidences = []
            for (bbox, text, conf) in results:
                texts.append(text)
                confidences.append(conf)

            # Calculate average confidence
            avg_conf = sum(confidences) / len(confidences) if confidences else 0

            # Join all text with spaces
            full_text = " ".join(texts)

            logger.info(f"EasyOCR extracted {len(texts)} text blocks, avg confidence: {avg_conf:.2f}")
            logger.info(f"EasyOCR Text Preview: {full_text[:200]}...")

            return OCRResult(
                text=full_text,
                confidence=avg_conf,
                page_count=1,
                page_texts=[full_text],
                word_confidences=confidences
            )

        except ImportError as e:
            logger.error(f"EasyOCR not installed: {e}")
            logger.warning("Falling back to Tesseract OCR")
            return await self._ocr_image_tesseract(image)

        except Exception as e:
            logger.error(f"EasyOCR failed: {e}")
            logger.warning("Falling back to Tesseract OCR")
            return await self._ocr_image_tesseract(image)

    async def get_page_count(self, file_buffer: bytes, mime_type: str) -> int:
        """Get page count without full OCR."""
        if mime_type == "application/pdf":
            try:
                from pdf2image import convert_from_bytes
                images = convert_from_bytes(file_buffer, dpi=72)  # Low DPI for speed
                return len(images)
            except Exception:
                try:
                    import pdfplumber
                    with pdfplumber.open(io.BytesIO(file_buffer)) as pdf:
                        return len(pdf.pages)
                except Exception:
                    return 0
        else:
            return 1  # Single image = 1 page
