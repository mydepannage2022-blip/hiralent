import time
from dataclasses import dataclass


@dataclass
class TokenBucket:
    rate_per_sec: float
    burst: int
    tokens: float
    last: float

    @classmethod
    def create(cls, rate_per_sec: float, burst: int):
        return cls(rate_per_sec=rate_per_sec, burst=burst, tokens=float(burst), last=time.time())

    def take(self, amount: float = 1.0):
        now = time.time()
        elapsed = now - self.last
        self.last = now

        self.tokens = min(float(self.burst), self.tokens + elapsed * self.rate_per_sec)
        if self.tokens >= amount:
            self.tokens -= amount
            return

        # need to wait
        missing = amount - self.tokens
        wait_s = missing / self.rate_per_sec if self.rate_per_sec > 0 else 0.0
        if wait_s > 0:
            time.sleep(wait_s)
        self.tokens = 0.0
