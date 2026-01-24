# app/diagram_generator/diagram_renderer.py
"""
Rend les diagrammes Mermaid en images PNG/SVG
Compatible Windows/macOS/Linux avec détection automatique du PATH
"""

import os
import subprocess
import tempfile
import platform
import shutil
import logging
import json
from typing import Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

class DiagramRenderer:
    """Convertit le code Mermaid en images - Multi-plateforme"""
    
    def __init__(self):
        """Vérifie que mermaid-cli est installé"""
        self.system = platform.system()
        
        # ✅ CRITICAL: Ensure npm is in PATH on Windows
        self._ensure_npm_in_path()
        
        # Determine mmdc command
        self.mmdc_command = self._get_mmdc_command()
        
        # Verify installation
        self.mmdc_available = self._verify_installation()
        
        if not self.mmdc_available:
            logger.error("❌ mermaid-cli (mmdc) NOT available")
            print("❌ mermaid-cli (mmdc) NOT available")
            print("💡 Install: npm install -g @mermaid-js/mermaid-cli")
        else:
            logger.info(f"✅ mermaid-cli ready: {self.mmdc_command}")
            print(f"✅ mermaid-cli ready: {self.mmdc_command}")
    
    def _ensure_npm_in_path(self):
        """
        Ensure npm is in PATH (critical for Windows)
        """
        if self.system == "Windows":
            npm_paths = [
                os.path.expandvars(r"%APPDATA%\npm"),
                os.path.expanduser(r"~\AppData\Roaming\npm"),
                r"C:\Program Files\nodejs",
            ]
            
            current_path = os.environ.get('PATH', '')
            path_added = False
            
            for npm_path in npm_paths:
                if os.path.exists(npm_path) and npm_path not in current_path:
                    logger.info(f"📌 Adding to PATH: {npm_path}")
                    os.environ['PATH'] = npm_path + os.pathsep + current_path
                    path_added = True
            
            if path_added:
                logger.info("✅ npm PATH updated for this session")
    
    def _get_mmdc_command(self) -> str:
        """
        Get mmdc command - tries absolute path first on Windows
        """
        if self.system == "Windows":
            # Try to find mmdc.cmd
            cmd = "mmdc.cmd"
            
            # Method 1: Use shutil.which
            found_path = shutil.which(cmd)
            if found_path:
                logger.info(f"✅ Found via shutil.which: {found_path}")
                return found_path
            
            # Method 2: Try common paths
            possible_paths = [
                os.path.expandvars(r"%APPDATA%\npm\mmdc.cmd"),
                os.path.expanduser(r"~\AppData\Roaming\npm\mmdc.cmd"),
                r"C:\Users\ADMIN\AppData\Roaming\npm\mmdc.cmd",
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    logger.info(f"✅ Found at: {path}")
                    return path
            
            # Fallback
            logger.warning(f"⚠️ mmdc.cmd not found in common locations, using command name")
            return cmd
        else:
            return "mmdc"
    
    def _verify_installation(self) -> bool:
        """
        Verify that mermaid-cli works
        """
        try:
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
                return True
            else:
                logger.error(f"❌ mmdc command failed: {result.stderr}")
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
        Render Mermaid diagram to image
        """
        if not self.mmdc_available:
            logger.error("❌ mermaid-cli not available")
            print("❌ mermaid-cli not available")
            return None
        
        with tempfile.TemporaryDirectory() as temp_dir:
            input_file = Path(temp_dir) / 'diagram.mmd'
            output_file = Path(temp_dir) / f'diagram.{output_format}'
            
            try:
                # Write Mermaid code
                input_file.write_text(mermaid_code, encoding='utf-8')
                
                logger.info(f"🎨 Rendering diagram to {output_format}...")
                logger.info(f"📥 Input: {input_file}")
                logger.info(f"📤 Output: {output_file}")
                
                # UML-style CSS
                css_file = Path(__file__).parent / "styles" / "uml.css"

                # Build command (UML-style rendering)
                cmd = [
                    self.mmdc_command,
                    "-i", str(input_file.resolve()),
                    "-o", str(output_file.resolve()),
                    "-t", "neutral",
                    "-b", "white",
                    "--cssFile", str(css_file.resolve()),
                    "-w", "3000",                 #  AUGMENTÉ pour plus d'espace
                    "-H", "2000",                 #  AUGMENTÉ pour plus d'espace
                    "-s", "2",
                    "--backgroundColor", "white",
                    "--configFile", str(self._get_mermaid_config()),
                    "--puppeteerConfigFile", str((Path(__file__).parent / "styles" / "puppeteer-config.json").resolve()),

                    "--pdfFit"                    #  Force fit all content
                ]
                
                logger.info(f"🔧 Command: {' '.join(cmd)}")
                
                # Execute
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=30,
                    shell=(self.system == "Windows")
                )
                
                # Check result
                if result.returncode != 0:
                    logger.error(f"❌ mmdc command failed with code {result.returncode}")
                    logger.error(f"STDOUT: {result.stdout}")
                    logger.error(f"STDERR: {result.stderr}")
                    print(f"❌ mmdc error: {result.stderr}")
                    return None
                
                # Verify output
                if not output_file.exists():
                    logger.error("❌ Output file not created")
                    print("❌ Output file not created")
                    return None
                
                # Read image
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
        """Check if mmdc works"""
        return self.mmdc_available
    
    def _get_mermaid_config(self) -> Path:
        """
        Create Mermaid config for professional UML rendering
        FORCE ALL ATTRIBUTES VISIBLE
        """
        config_file = Path(__file__).parent / "styles" / "mermaid-config.json"
        
        if not config_file.exists():
            config = {
                "theme": "neutral",
                "themeVariables": {
                    "primaryColor": "#ffffff",
                    "primaryTextColor": "#000000",
                    "primaryBorderColor": "#000000",
                    "lineColor": "#000000",
                    "secondaryColor": "#f5f5f5",
                    "tertiaryColor": "#ffffff",
                    "background": "#ffffff",
                    "mainBkg": "#ffffff",
                    "secondBkg": "#f5f5f5",
                    "labelBackground": "#ffffff",
                    "labelTextColor": "#000000",
                    "actorBkg": "#ffffff",
                    "actorBorder": "#000000",
                    "actorTextColor": "#000000",
                    "actorLineColor": "#000000",
                    "signalColor": "#000000",
                    "signalTextColor": "#000000",
                    "labelBoxBkgColor": "#ffffff",
                    "labelBoxBorderColor": "#000000",
                    "noteBackgroundColor": "#ffffff",
                    "noteBorderColor": "#000000",
                    "noteTextColor": "#000000",
                    "attributeBackgroundColorOdd": "#f5f5f5",
                    "attributeBackgroundColorEven": "#ffffff"
                },
                "er": {
                    "layoutDirection": "TB",
                    "minEntityWidth": 250,
                    "minEntityHeight": 100,
                    "entityPadding": 20,
                    "stroke": "black",
                    "fill": "white",
                    "fontSize": 14,
                    "useMaxWidth": True,
                    "diagramPadding": 20
                },
                "class": {
                    "hideEmptyMembersBox": False
                },
                "flowchart": {
                    "htmlLabels": False,
                    "curve": "linear",
                    "useMaxWidth": True
                }
            }
            
            config_file.parent.mkdir(parents=True, exist_ok=True)
            config_file.write_text(json.dumps(config, indent=2))
        
        return config_file


# Singleton instance
diagram_renderer = DiagramRenderer()