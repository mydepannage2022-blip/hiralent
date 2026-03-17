from minio import Minio
from io import BytesIO
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """MinIO/S3 storage client for document retrieval."""

    def __init__(self):
        endpoint = settings.S3_ENDPOINT.replace("http://", "").replace("https://", "")
        self.client = Minio(
            endpoint,
            access_key=settings.S3_ACCESS_KEY,
            secret_key=settings.S3_SECRET_KEY,
            secure=settings.S3_SECURE
        )
        self.bucket = settings.S3_BUCKET

    async def download_file(self, storage_key: str) -> bytes:
        """
        Download a file from MinIO/S3 storage.

        Args:
            storage_key: The object key in the bucket

        Returns:
            File contents as bytes
        """
        try:
            response = self.client.get_object(self.bucket, storage_key)
            data = response.read()
            response.close()
            response.release_conn()
            logger.info(f"Downloaded file: {storage_key} ({len(data)} bytes)")
            return data
        except Exception as e:
            logger.error(f"Failed to download {storage_key}: {e}")
            raise FileNotFoundError(f"Could not retrieve document: {storage_key}")

    async def file_exists(self, storage_key: str) -> bool:
        """Check if a file exists in storage."""
        try:
            self.client.stat_object(self.bucket, storage_key)
            return True
        except Exception:
            return False

    async def get_file_info(self, storage_key: str) -> dict:
        """Get metadata about a file."""
        try:
            stat = self.client.stat_object(self.bucket, storage_key)
            return {
                "size": stat.size,
                "content_type": stat.content_type,
                "last_modified": stat.last_modified.isoformat() if stat.last_modified else None,
                "etag": stat.etag
            }
        except Exception as e:
            logger.error(f"Failed to get file info for {storage_key}: {e}")
            raise FileNotFoundError(f"Could not get file info: {storage_key}")


# Singleton instance
storage_service = StorageService()
