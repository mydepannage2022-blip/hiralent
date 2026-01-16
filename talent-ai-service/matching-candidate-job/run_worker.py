from app.core.logging_config import setup_logging
from app.workers.worker import run

if __name__ == "__main__":
    setup_logging()
    run()
