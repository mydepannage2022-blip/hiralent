# app/diagram_generator/cloudinary_uploader.py
"""
Upload les diagrammes vers Cloudinary
"""

import os
import cloudinary
import cloudinary.uploader
from typing import Optional, Dict


class CloudinaryUploader:
    """Gère l'upload des images vers Cloudinary"""
    
    def __init__(self):
        """Configure Cloudinary"""
        cloudinary_url = os.getenv('CLOUDINARY_URL')
        
        if not cloudinary_url:
            print("⚠️ WARNING: CLOUDINARY_URL not set in environment")
            self.configured = False
        else:
            cloudinary.config(cloudinary_url=cloudinary_url)
            self.configured = True
    
    async def upload_diagram(
        self,
        image_bytes: bytes,
        question_id: str,
        diagram_type: str
    ) -> Optional[str]:
        """
        Upload un diagramme vers Cloudinary
        
        Args:
            image_bytes: Bytes de l'image
            question_id: ID de la question
            diagram_type: Type de diagramme (er, class, etc.)
        
        Returns:
            URL publique de l'image ou None si échec
        """
        if not self.configured:
            print("❌ Cloudinary not configured")
            return None
        
        try:
            # Upload vers Cloudinary
            result = cloudinary.uploader.upload(
                image_bytes,
                folder='question-diagrams',
                public_id=f'{question_id}_{diagram_type}',
                resource_type='image',
                overwrite=True,
                format='png'
            )
            
            url = result.get('secure_url')
            
            if url:
                print(f"✅ Diagram uploaded: {url}")
                return url
            else:
                print("❌ No URL in upload response")
                return None
                
        except Exception as e:
            print(f"❌ Cloudinary upload error: {e}")
            return None
    
    def delete_diagram(self, question_id: str, diagram_type: str) -> bool:
        """Supprime un diagramme de Cloudinary"""
        if not self.configured:
            return False
        
        try:
            public_id = f'question-diagrams/{question_id}_{diagram_type}'
            result = cloudinary.uploader.destroy(public_id)
            return result.get('result') == 'ok'
        except Exception as e:
            print(f"❌ Delete error: {e}")
            return False


# Singleton instance
cloudinary_uploader = CloudinaryUploader()