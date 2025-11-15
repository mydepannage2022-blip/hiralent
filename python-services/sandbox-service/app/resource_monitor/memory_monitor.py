"""Memory monitoring utilities (placeholder)."""
import psutil


def memory_info(pid: int = None):
    if pid:
        try:
            p = psutil.Process(pid)
            return p.memory_info().rss
        except Exception:
            return 0
    return psutil.virtual_memory().used
