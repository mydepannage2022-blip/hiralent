"""S3/MinIO client helper for storing execution artifacts."""
from typing import Optional


class S3Client:
    def __init__(self, endpoint: str, access_key: str, secret_key: str, bucket: str):
        self.endpoint = endpoint
        self.access_key = access_key
        self.secret_key = secret_key
        self.bucket = bucket

    def upload_file(self, local_path: str, key: str) -> Optional[str]:
        # Placeholder: integrate with boto3 or minio client
        return f"s3://{self.bucket}/{key}"
