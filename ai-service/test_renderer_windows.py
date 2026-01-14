# test_renderer_simple.py
"""
Test simple du renderer sans dépendances Gemini
"""
import asyncio
import subprocess
import tempfile
import platform
import shutil
from pathlib import Path

def test_mmdc_installation():
    """Test 1: Vérifier que mmdc est installé"""
    print("🧪 Test 1: Checking mmdc installation\n")
    
    system = platform.system()
    mmdc_cmd = "mmdc.cmd" if system == "Windows" else "mmdc"
    
    print(f"OS: {system}")
    print(f"Command: {mmdc_cmd}")
    
    # Méthode 1: shutil.which
    mmdc_path = shutil.which(mmdc_cmd)
    
    if mmdc_path:
        print(f"✅ Found mmdc at: {mmdc_path}\n")
    else:
        print(f"❌ mmdc not found in PATH\n")
        return False
    
    # Méthode 2: Test version
    try:
        result = subprocess.run(
            [mmdc_cmd, "--version"],
            capture_output=True,
            text=True,
            timeout=5,
            shell=(system == "Windows")
        )
        
        if result.returncode == 0:
            print(f"✅ Version: {result.stdout.strip()}\n")
            return True
        else:
            print(f"❌ Version check failed: {result.stderr}\n")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False

async def test_render_diagram():
    """Test 2: Rendre un diagramme simple"""
    print("🧪 Test 2: Rendering simple diagram\n")
    
    system = platform.system()
    mmdc_cmd = "mmdc.cmd" if system == "Windows" else "mmdc"
    
    # Diagramme Mermaid simple
    mermaid_code = """graph TD
    A[Start] --> B[Process]
    B --> C[End]
"""
    
    with tempfile.TemporaryDirectory() as temp_dir:
        input_file = Path(temp_dir) / 'diagram.mmd'
        output_file = Path(temp_dir) / 'diagram.png'
        
        try:
            # Écrire le code Mermaid
            input_file.write_text(mermaid_code, encoding='utf-8')
            print(f"📥 Input: {input_file}")
            print(f"📤 Output: {output_file}\n")
            
            # Commande mmdc
            cmd = [
                mmdc_cmd,
                '-i', str(input_file.resolve()),
                '-o', str(output_file.resolve()),
                '-t', 'default',
                '-b', 'white'
            ]
            
            print(f"🔧 Command: {' '.join(cmd)}\n")
            
            # Exécuter
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,
                shell=(system == "Windows")
            )
            
            # Vérifier résultat
            if result.returncode != 0:
                print(f"❌ Command failed:")
                print(f"STDOUT: {result.stdout}")
                print(f"STDERR: {result.stderr}\n")
                return False
            
            # Vérifier fichier
            if not output_file.exists():
                print("❌ Output file not created\n")
                return False
            
            file_size = output_file.stat().st_size
            
            if file_size == 0:
                print("❌ Output file is empty\n")
                return False
            
            print(f"✅ Rendering successful!")
            print(f"   Size: {file_size} bytes")
            
            # Sauvegarder pour vérification
            import shutil as sh
            sh.copy(output_file, "test_diagram_output.png")
            print(f"   Saved to: test_diagram_output.png\n")
            
            return True
            
        except subprocess.TimeoutExpired:
            print("❌ Rendering timeout\n")
            return False
        except Exception as e:
            print(f"❌ Error: {e}\n")
            return False

async def main():
    """Exécuter tous les tests"""
    print("=" * 60)
    print("🎨 MERMAID-CLI RENDERER TEST")
    print("=" * 60 + "\n")
    
    # Test 1: Installation
    install_ok = test_mmdc_installation()
    
    if not install_ok:
        print("\n❌ FAILED: mermaid-cli not properly installed")
        print("\n📋 Installation Steps:")
        print("1. npm install -g @mermaid-js/mermaid-cli")
        print("2. Verify: mmdc.cmd --version (Windows) or mmdc --version (Mac/Linux)")
        print("3. Add npm to PATH if needed")
        return
    
    # Test 2: Rendering
    render_ok = await test_render_diagram()
    
    print("=" * 60)
    if install_ok and render_ok:
        print("✅ ALL TESTS PASSED!")
        print("\nYou can now use diagram rendering in the AI service.")
    else:
        print("❌ SOME TESTS FAILED")
        print("\nCheck the errors above and fix before using diagram rendering.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())