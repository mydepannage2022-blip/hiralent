"""CPU usage monitoring utilities (placeholder)."""
import psutil


def cpu_percent(pid: int = None):
    if pid:
        try:
            p = psutil.Process(pid)
            return p.cpu_percent(interval=0.1)
        except Exception:
            return 0.0
    return psutil.cpu_percent(interval=0.1)
