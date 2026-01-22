import cv2
import numpy as np
from PIL import Image
from typing import List, Tuple
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class ImagePreprocessor:
    """Image preprocessing for OCR optimization."""

    def __init__(self, target_min_width: int = None):
        self.target_min_width = target_min_width or settings.OCR_TARGET_MIN_WIDTH

    def preprocess(self, image: Image.Image) -> Image.Image:
        """
        Apply preprocessing to optimize image for OCR.

        Args:
            image: PIL Image

        Returns:
            Preprocessed PIL Image
        """
        # Convert to numpy array
        img_array = np.array(image)

        # Convert to grayscale if needed
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array

        # Upscale if too small
        gray = self._upscale_if_needed(gray)

        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, h=10)

        # Apply adaptive thresholding for better text contrast
        thresh = cv2.adaptiveThreshold(
            denoised,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            2
        )

        return Image.fromarray(thresh)

    def _upscale_if_needed(self, img: np.ndarray) -> np.ndarray:
        """Upscale image if width is below target minimum."""
        height, width = img.shape[:2]

        if width < self.target_min_width:
            scale = self.target_min_width / width
            new_width = int(width * scale)
            new_height = int(height * scale)
            img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
            logger.debug(f"Upscaled image from {width}x{height} to {new_width}x{new_height}")

        return img

    def create_variants(self, image: Image.Image) -> List[Tuple[str, Image.Image]]:
        """
        Create multiple preprocessing variants for robust OCR.

        Args:
            image: Original PIL Image

        Returns:
            List of (variant_name, processed_image) tuples
        """
        variants = []
        img_array = np.array(image)

        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array

        # Upscale
        gray = self._upscale_if_needed(gray)

        # Variant 1: Simple threshold
        _, thresh1 = cv2.threshold(gray, 170, 255, cv2.THRESH_BINARY)
        variants.append(("threshold_170", Image.fromarray(thresh1)))

        # Variant 2: Higher threshold
        _, thresh2 = cv2.threshold(gray, 190, 255, cv2.THRESH_BINARY)
        variants.append(("threshold_190", Image.fromarray(thresh2)))

        # Variant 3: Adaptive threshold
        adaptive = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        variants.append(("adaptive", Image.fromarray(adaptive)))

        # Variant 4: Denoised + threshold
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        _, thresh_denoised = cv2.threshold(denoised, 180, 255, cv2.THRESH_BINARY)
        variants.append(("denoised", Image.fromarray(thresh_denoised)))

        # Variant 5: Sharpened
        kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
        sharpened = cv2.filter2D(gray, -1, kernel)
        _, thresh_sharp = cv2.threshold(sharpened, 170, 255, cv2.THRESH_BINARY)
        variants.append(("sharpened", Image.fromarray(thresh_sharp)))

        return variants

    def deskew(self, image: Image.Image) -> Image.Image:
        """Deskew a rotated image."""
        img_array = np.array(image)

        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array

        # Find edges
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)

        # Detect lines
        lines = cv2.HoughLinesP(
            edges, 1, np.pi / 180, threshold=100, minLineLength=100, maxLineGap=10
        )

        if lines is None:
            return image

        # Calculate average angle
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi
            if -45 < angle < 45:  # Only consider near-horizontal lines
                angles.append(angle)

        if not angles:
            return image

        median_angle = np.median(angles)

        # Rotate to correct skew
        if abs(median_angle) > 0.5:  # Only correct if skew is significant
            height, width = img_array.shape[:2]
            center = (width // 2, height // 2)
            rotation_matrix = cv2.getRotationMatrix2D(center, median_angle, 1.0)
            rotated = cv2.warpAffine(
                img_array, rotation_matrix, (width, height),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )
            logger.debug(f"Deskewed image by {median_angle:.2f} degrees")
            return Image.fromarray(rotated)

        return image
