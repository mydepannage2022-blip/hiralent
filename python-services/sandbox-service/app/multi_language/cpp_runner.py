"""C++ runner placeholder: compile and run C++ code."""
import subprocess
from typing import Tuple


def run_cpp(source_path: str, timeout: int = 5) -> Tuple[int, str, str]:
    try:
        out_bin = source_path.rsplit('.', 1)[0]
        compile_p = subprocess.run(["g++", source_path, "-o", out_bin], capture_output=True, text=True, timeout=timeout)
        if compile_p.returncode != 0:
            return compile_p.returncode, "", compile_p.stderr
        run_p = subprocess.run([out_bin], capture_output=True, text=True, timeout=timeout)
        return run_p.returncode, run_p.stdout, run_p.stderr
    except Exception as e:
        return -1, "", str(e)
