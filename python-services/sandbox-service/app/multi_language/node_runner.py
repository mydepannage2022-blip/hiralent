"""Node.js execution runner placeholder."""
import subprocess
from typing import Tuple


def run_node(script_path: str, timeout: int = 5) -> Tuple[int, str, str]:
    try:
        p = subprocess.run(["node", script_path], capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout, p.stderr
    except Exception as e:
        return -1, "", str(e)
