"""Timeout manager for execution tasks."""
import threading
from typing import Callable


def run_with_timeout(func: Callable, args=(), kwargs=None, timeout: int = 5):
    kwargs = kwargs or {}
    result = {"done": False, "value": None}

    def target():
        try:
            result["value"] = func(*args, **kwargs)
        finally:
            result["done"] = True

    t = threading.Thread(target=target)
    t.start()
    t.join(timeout)
    if t.is_alive():
        return False, None
    return True, result["value"]
