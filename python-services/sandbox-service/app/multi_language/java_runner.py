"""Java runner placeholder: compile and run Java code."""
import subprocess
from typing import Tuple


def run_java(source_path: str, timeout: int = 5) -> Tuple[int, str, str]:
    try:
        compile_p = subprocess.run(["javac", source_path], capture_output=True, text=True, timeout=timeout)
        if compile_p.returncode != 0:
            return compile_p.returncode, "", compile_p.stderr
        # assume class name equals filename without extension
        class_name = source_path.rsplit("/", 1)[-1].rsplit(".", 1)[0]
        run_p = subprocess.run(["java", class_name], capture_output=True, text=True, timeout=timeout)
        return run_p.returncode, run_p.stdout, run_p.stderr
    except Exception as e:
        return -1, "", str(e)
