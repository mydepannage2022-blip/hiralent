"""Python execution runner skeleton."""
import subprocess
from typing import Tuple


def run_python(code_path: str, timeout: int = 5) -> Tuple[int, str, str]:
    """Run python code in a secure environment. Returns (exit_code, stdout, stderr).

    NOTE: This is a local, insecure placeholder. Replace with containerized execution.
    """
    try:
        p = subprocess.run(["python", code_path], capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout, p.stderr
    except Exception as e:
        return -1, "", str(e)
