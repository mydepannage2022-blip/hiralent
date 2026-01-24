# app/diagram_generator/diagram_renderer.py
"""
Rend les diagrammes Mermaid en images PNG/SVG
Utilise mermaid-cli (mmdc) - Compatible Windows/macOS/Linux
"""

import os
import subprocess
import tempfile
import platform
import shutil
import logging
from typing import Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

class DiagramRenderer:
    """Convertit le code Mermaid en images - Multi-plateforme"""
    
    def __init__(self):
        """Vérifie que mermaid-cli est installé"""
        self.system = platform.system()
        self.mmdc_command = self._get_mmdc_command()
        self.mmdc_available = self._verify_installation()
        
        if not self.mmdc_available:
            logger.warning("⚠️ WARNING: mermaid-cli (mmdc) not found")
            logger.warning("💡 Install with: npm install -g @mermaid-js/mermaid-cli")
            print("⚠️ WARNING: mermaid-cli (mmdc) not found. Install with: npm install -g @mermaid-js/mermaid-cli")
    
    def _get_mmdc_command(self) -> str:
        """
        Détermine la commande mmdc selon l'OS
        """
        if self.system == "Windows":
            # Sur Windows, npm installe des .cmd
            return "mmdc.cmd"
        else:
            # Sur macOS/Linux
            return "mmdc"
    
    def _verify_installation(self) -> bool:
        """
        Vérifie que mermaid-cli est installé et accessible
        """
        try:
            # Méthode 1: Utiliser shutil.which (cross-platform)
            mmdc_path = shutil.which(self.mmdc_command)
            
            if mmdc_path:
                logger.info(f"✅ Found mmdc at: {mmdc_path}")
                print(f"✅ Found mmdc at: {mmdc_path}")
                
                # Vérifier que la commande fonctionne
                result = subprocess.run(
                    [self.mmdc_command, "--version"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    shell=(self.system == "Windows")
                )
                
                if result.returncode == 0:
                    version = result.stdout.strip()
                    logger.info(f"✅ mermaid-cli version: {version}")
                    print(f"✅ mermaid-cli version: {version}")
                    return True
                else:
                    logger.error(f"❌ mmdc command failed: {result.stderr}")
                    return False
            else:
                logger.error(f"❌ {self.mmdc_command} not found in PATH")
                return False
                
        except FileNotFoundError:
            logger.error(f"❌ {self.mmdc_command} not found")
            return False
        except Exception as e:
            logger.error(f"❌ Error verifying mmdc: {e}")
            return False
    
    async def render_to_png(
        self,
        mermaid_code: str,
        output_format: str = 'png'
    ) -> Optional[Tuple[bytes, str]]:
        """
        Rend un diagramme Mermaid en image
        
        Args:
            mermaid_code: Code Mermaid à rendre
            output_format: 'png' ou 'svg'
        
        Returns:
            Tuple (image_bytes, mime_type) ou None si échec
        """
        if not self.mmdc_available:
            logger.error("❌ mermaid-cli not available")
            print("❌ mermaid-cli not available")
            return None
        
        # Créer fichiers temporaires
        with tempfile.TemporaryDirectory() as temp_dir:
            input_file = Path(temp_dir) / 'diagram.mmd'
            output_file = Path(temp_dir) / f'diagram.{output_format}'
            
            try:
                # Écrire le code Mermaid
                input_file.write_text(mermaid_code, encoding='utf-8')
                
                logger.info(f"🎨 Rendering diagram to {output_format}...")
                logger.info(f"📥 Input: {input_file}")
                logger.info(f"📤 Output: {output_file}")
                
                # ✅ Commande mmdc avec chemins absolus
                cmd = [
                    self.mmdc_command,
                    '-i', str(input_file.resolve()),
                    '-o', str(output_file.resolve()),
                    '-t', 'default',
                    '-b', 'white',
                    '-w', '1920',
                    '-H', '1080'
                ]
                
                logger.info(f"🔧 Command: {' '.join(cmd)}")
                
                # ✅ Exécuter avec shell=True sur Windows
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=30,
                    shell=(self.system == "Windows")
                )
                
                # Vérifier le résultat
                if result.returncode != 0:
                    logger.error(f"❌ mmdc command failed with code {result.returncode}")
                    logger.error(f"STDOUT: {result.stdout}")
                    logger.error(f"STDERR: {result.stderr}")
                    print(f"❌ mmdc error: {result.stderr}")
                    return None
                
                # Vérifier que le fichier existe
                if not output_file.exists():
                    logger.error("❌ Output file not created")
                    print("❌ Output file not created")
                    return None
                
                # Lire l'image générée
                image_bytes = output_file.read_bytes()
                
                if len(image_bytes) == 0:
                    logger.error("❌ Output file is empty")
                    print("❌ Output file is empty")
                    return None
                
                mime_type = 'image/png' if output_format == 'png' else 'image/svg+xml'
                
                logger.info(f"✅ Diagram rendered: {len(image_bytes)} bytes")
                print(f"✅ Diagram rendered: {len(image_bytes)} bytes")
                
                return (image_bytes, mime_type)
                
            except subprocess.TimeoutExpired:
                logger.error("❌ Rendering timeout (>30s)")
                print("❌ Rendering timeout")
                return None
            except Exception as e:
                logger.error(f"❌ Rendering error: {e}", exc_info=True)
                print(f"❌ Rendering error: {e}")
                return None
    
    def validate_installation(self) -> bool:
        """Vérifie que mmdc fonctionne"""
        return self.mmdc_available


# Singleton instance
diagram_renderer = DiagramRenderer()