import subprocess, time, psutil, sys

PYTHON_BIN = sys.executable

def _python_cmd(code_path: str):
    # -I isolate: ignore user site, env vars
    # -S do not import site at startup
    # -B no .pyc bytecode files
    return [PYTHON_BIN, "-I", "-S", "-B", code_path]

def run_case(code_path: str, input_data: str, timeout_s: float):
    """
    Runs candidate code with stdin=input_data.
    Returns: (returncode, stdout, stderr, time_ms, peak_mem_kb)
    """
    cmd = _python_cmd(code_path)
    start = time.perf_counter()
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    p = psutil.Process(proc.pid)
    peak_mem_kb = 0

    try:
        out, err = proc.communicate(input=input_data, timeout=timeout_s)
    except subprocess.TimeoutExpired:
        # kill children then parent
        for ch in p.children(recursive=True):
            try: ch.kill()
            except Exception: pass
        try: p.kill()
        except Exception: pass
        return (124, "", "TIMEOUT", int((time.perf_counter()-start)*1000), peak_mem_kb)

    # sample RSS (heuristic, not true peak)
    try:
        rss_total = p.memory_info().rss
        for ch in p.children(recursive=True):
            try:
                rss_total += ch.memory_info().rss
            except Exception:
                pass
        peak_mem_kb = int(rss_total / 1024)
    except Exception:
        peak_mem_kb = 0

    rc = proc.returncode
    time_ms = int((time.perf_counter() - start) * 1000)
    return (rc, out, err, time_ms, peak_mem_kb)
