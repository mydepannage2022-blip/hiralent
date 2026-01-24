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
    
    def _validate_mermaid_syntax(self, mermaid_code: str) -> Tuple[bool, str]:
        """
        Valide la syntaxe Mermaid avant rendu
        Retourne (is_valid, error_message)
        """
        try:
            lines = mermaid_code.strip().split('\n')
            
            # Vérifier si le code commence par erDiagram
            if not lines[0].strip().startswith('erDiagram'):
                return False, "Missing 'erDiagram' declaration"
            
            # Vérifier la structure des entités
            brace_stack = []
            in_entity = False
            current_entity = ""
            
            for i, line in enumerate(lines):
                stripped = line.strip()
                
                # Détection d'ouverture d'entité
                if stripped.endswith('{'):
                    brace_stack.append('{')
                    in_entity = True
                    current_entity = stripped[:-1].strip()
                    
                    # Vérifier que l'entité a un nom
                    if not current_entity:
                        return False, f"Empty entity name at line {i+1}"
                    
                    # Vérifier le format de l'entité
                    if ' ' in current_entity:
                        return False, f"Entity name '{current_entity}' contains spaces at line {i+1}"
                
                # Détection de fermeture d'entité
                elif stripped == '}':
                    if not brace_stack:
                        return False, f"Unmatched '}}' at line {i+1}"
                    brace_stack.pop()
                    in_entity = False
                    current_entity = ""
                
                # Vérifier les attributs (lignes avec contenu dans une entité)
                elif stripped and in_entity and not stripped.startswith('#'):
                    # Les attributs devraient contenir un type (int, string, etc.)
                    if not any(word in stripped.lower() for word in ['int', 'string', 'varchar', 'date', 'bool', 'text', 'decimal']):
                        logger.warning(f"⚠️ Possible invalid attribute at line {i+1}: '{stripped}'")
            
            # Vérifier les accolades non fermées
            if brace_stack:
                return False, f"Unclosed braces: {len(brace_stack)}"
            
            return True, "Valid syntax"
            
        except Exception as e:
            return False, f"Validation error: {str(e)}"
    
    def _fix_common_mermaid_errors(self, mermaid_code: str) -> str:
        """
        Corrige les erreurs courantes dans le code Mermaid généré par Gemini
        """
        lines = mermaid_code.strip().split('\n')
        fixed_lines = []
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # CORRECTION 1: Fix }ENTITÉ { en } suivi de ENTITÉ {
            # Exemple: "}CATEGORY {" devient "}\nCATEGORY {"
            if '}{' in stripped:
                # Séparer les entités collées
                parts = stripped.split('}{')
                if len(parts) == 2:
                    fixed_lines.append(parts[0] + '}')
                    fixed_lines.append(parts[1] + '{')
                    continue
            
            # CORRECTION 2: Fix }ENTITÉ{ (sans espace)
            if stripped and stripped[0] == '}' and len(stripped) > 1 and stripped[1].isalpha():
                # Séparer la fermeture et l'ouverture
                fixed_lines.append('}')
                fixed_lines.append(stripped[1:])
                continue
            
            # CORRECTION 3: Ajouter un espace après {
            if stripped.endswith('{') and not stripped.endswith(' {'):
                # S'assurer qu'il y a un espace avant {
                entity_name = stripped[:-1].strip()
                fixed_lines.append(f"{entity_name} {{")
                continue
            
            # CORRECTION 4: Nettoyer les lignes vides multiples
            if not stripped and fixed_lines and not fixed_lines[-1].strip():
                continue  # Skip les lignes vides consécutives
            
            fixed_lines.append(line)
        
        # S'assurer qu'il y a exactement une ligne vide entre les entités
        result_lines = []
        for i in range(len(fixed_lines)):
            current = fixed_lines[i].strip()
            if i > 0:
                prev = fixed_lines[i-1].strip()
                # Si on ferme une entité et qu'on ouvre une nouvelle, ajouter une ligne vide
                if prev == '}' and current and current.endswith('{'):
                    result_lines.append('')
            
            result_lines.append(fixed_lines[i])
        
        return '\n'.join(result_lines)
    
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
        
        # 1. Valider et corriger la syntaxe Mermaid
        logger.info("🔍 Validating Mermaid syntax...")
        is_valid, error_msg = self._validate_mermaid_syntax(mermaid_code)
        
        if not is_valid:
            logger.warning(f"⚠️ Invalid Mermaid syntax: {error_msg}")
            logger.info("🛠️ Attempting to fix common errors...")
            
            # Essayer de corriger
            fixed_code = self._fix_common_mermaid_errors(mermaid_code)
            
            # Re-valider après correction
            is_valid_fixed, fixed_error = self._validate_mermaid_syntax(fixed_code)
            
            if is_valid_fixed:
                logger.info("✅ Successfully fixed Mermaid syntax")
                mermaid_code = fixed_code
            else:
                logger.error(f"❌ Failed to fix Mermaid syntax: {fixed_error}")
                # Log le code problématique pour debug
                logger.info("📝 Problematic code (first 1000 chars):")
                logger.info(mermaid_code[:1000])
                return None
        
        # 2. Log un aperçu du code
        logger.info(f"📝 Mermaid code preview (first 500 chars):")
        preview = mermaid_code[:500].replace('\n', '\\n')
        logger.info(f"{preview}...")
        
        # 3. Créer fichiers temporaires
        with tempfile.TemporaryDirectory() as temp_dir:
            input_file = Path(temp_dir) / 'diagram.mmd'
            output_file = Path(temp_dir) / f'diagram.{output_format}'
            
            try:
                # Écrire le code Mermaid
                input_file.write_text(mermaid_code, encoding='utf-8')
                
                # Log le chemin pour debug
                logger.info(f"🎨 Rendering diagram to {output_format}...")
                logger.info(f"📥 Input file: {input_file}")
                logger.info(f"📤 Output file: {output_file}")
                
                # Vérifier la taille du fichier
                file_size = input_file.stat().st_size
                logger.info(f"📏 Mermaid file size: {file_size} bytes")
                
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
                    
                    # Essayer une commande plus simple
                    logger.info("🔄 Trying alternative mmdc command...")
                    cmd_simple = [
                        self.mmdc_command,
                        '-i', str(input_file.resolve()),
                        '-o', str(output_file.resolve())
                    ]
                    
                    result_simple = subprocess.run(
                        cmd_simple,
                        capture_output=True,
                        text=True,
                        timeout=30,
                        shell=(self.system == "Windows")
                    )
                    
                    if result_simple.returncode != 0:
                        logger.error(f"❌ Alternative command also failed: {result_simple.stderr}")
                        print(f"❌ mmdc error: {result_simple.stderr}")
                        return None
                    else:
                        result = result_simple
                
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
                
                logger.info(f"✅ Diagram rendered successfully: {len(image_bytes)} bytes")
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