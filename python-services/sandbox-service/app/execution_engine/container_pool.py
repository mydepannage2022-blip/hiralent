"""Container pool to reuse or limit concurrent containers."""
from queue import Queue
from threading import Lock


class ContainerPool:
    def __init__(self, max_size: int = 10):
        self.max_size = max_size
        self.pool = Queue(max_size)
        self.lock = Lock()

    def acquire(self):
        # placeholder: in production return an actual container
        return self.pool.get() if not self.pool.empty() else None

    def release(self, container):
        try:
            self.pool.put_nowait(container)
        except Exception:
            pass
