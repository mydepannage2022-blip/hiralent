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
    """Tesseract OCR engine with confidence scoring."""

    def __init__(self):
        self.preprocessor = ImagePreprocessor()
        self.langs = settings.OCR_LANGS
        self.confidence_threshold = settings.OCR_CONFIDENCE_THRESHOLD

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
